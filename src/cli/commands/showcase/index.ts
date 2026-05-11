import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync } from "node:fs";
import os from "node:os";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { App, AppShowcaseTab } from "src/app/App";
import {
    ShowcaseCategory,
    ShowcaseGroup,
    SHOWCASE_CATEGORY_ORDER,
    SHOWCASE_GROUP_ORDER,
    ShowcaseTokenRecord,
    toDynamicPreviewRule,
} from "src/app/ShowcasePage";
import { CliInputError } from "src/core/input/types";
import { assertFileExists, readTextFile, writeTextFile } from "src/utils/fileSystem";
import { logError, logInfo } from "src/utils/logger";

/**
 * Опции команды showcase
 */
export interface ShowcaseCommandOptions {
    /**
     * Путь к выходному html-файлу
     */
    outFile?: string;
    /**
     * Внутренний контент CSS для пайплайна build -> showcase
     */
    stdinCssContent?: string;
    /**
     * Внутреннее имя источника для вкладки/футера
     */
    stdinSourceName?: string;
}

interface ShowcaseRenderInput extends AppShowcaseTab {
    absolutePath: string;
    cssContent: string;
}

function safeStyleText(cssText: string): string {
    return cssText.replace(/<\/style/gi, "<\\/style");
}

function toCliErrorMessage(error: unknown): string {
    if (error instanceof CliInputError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected CLI error.";
}

function detectCategory(cssVariableName: string): ShowcaseCategory {
    const normalizedName = cssVariableName.toLowerCase();

    if (normalizedName.includes("typography")) {
        return "typography";
    }
    if (normalizedName.includes("font-family") || normalizedName.includes("fontfamily")) {
        return "fontFamily";
    }
    if (normalizedName.includes("font-size") || normalizedName.includes("fontsize")) {
        return "fontSize";
    }
    if (normalizedName.includes("font-weight") || normalizedName.includes("fontweight")) {
        return "fontWeight";
    }
    if (normalizedName.includes("line-height") || normalizedName.includes("lineheight")) {
        return "lineHeight";
    }
    if (normalizedName.includes("letter-spacing") || normalizedName.includes("letterspacing")) {
        return "letterSpacing";
    }
    if (normalizedName.includes("color")) {
        return "color";
    }
    if (normalizedName.includes("spacing") || normalizedName.includes("space")) {
        return "spacing";
    }
    if (normalizedName.includes("radius") || normalizedName.includes("radii")) {
        return "radius";
    }
    if (normalizedName.includes("shadow")) {
        return "shadow";
    }
    if (
        normalizedName.includes("transition")
        || normalizedName.includes("duration")
        || normalizedName.includes("easing")
    ) {
        return "transition";
    }
    if (normalizedName.includes("z-index") || normalizedName.includes("zindex")) {
        return "zIndex";
    }
    return "other";
}

function detectGroup(cssVariableName: string): ShowcaseGroup {
    const normalizedName = cssVariableName.toLowerCase();
    if (normalizedName.startsWith("primitive-")) {
        return "primitive";
    }
    if (normalizedName.startsWith("semantic-")) {
        return "semantic";
    }
    if (normalizedName.startsWith("component-")) {
        return "component";
    }
    return "other";
}

const TYPOGRAPHY_PART_SUFFIXES = [
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
] as const;

type TypographyPartName = `fontFamily-${number}` | (typeof TYPOGRAPHY_PART_SUFFIXES)[number];

function toTypographyPart(cssVariableName: string): { baseName: string; partName: TypographyPartName } | undefined {
    const fontFamilyMatch = cssVariableName.match(/^(.*)-fontFamily-(\d+)$/);
    if (fontFamilyMatch) {
        const fontFamilyIndex = Number(fontFamilyMatch[2]);
        return {
            baseName: fontFamilyMatch[1],
            partName: `fontFamily-${fontFamilyIndex}`,
        };
    }

    for (const suffix of TYPOGRAPHY_PART_SUFFIXES) {
        const suffixWithDash = `-${suffix}`;
        if (cssVariableName.endsWith(suffixWithDash)) {
            return {
                baseName: cssVariableName.slice(0, -suffixWithDash.length),
                partName: suffix,
            };
        }
    }

    return undefined;
}

function collectTypographyParts(variableMap: Map<string, string>): Map<string, Map<TypographyPartName, string>> {
    const typographyGroups = new Map<string, Map<TypographyPartName, string>>();

    for (const [name, value] of variableMap) {
        const part = toTypographyPart(name);
        if (!part) {
            continue;
        }

        if (!typographyGroups.has(part.baseName)) {
            typographyGroups.set(part.baseName, new Map());
        }
        typographyGroups.get(part.baseName)!.set(part.partName, value);
    }

    return typographyGroups;
}

function buildTypographyValue(typographyParts: Map<TypographyPartName, string>): string {
    const parts: string[] = [];

    const fontFamilyParts = [...typographyParts.entries()]
        .filter(([partName]) => partName.startsWith("fontFamily-"))
        .sort((left, right) => {
            const leftIndex = Number(left[0].replace("fontFamily-", ""));
            const rightIndex = Number(right[0].replace("fontFamily-", ""));
            return leftIndex - rightIndex;
        })
        .map(([, value]) => value);

    if (fontFamilyParts.length > 0) {
        const fontFamily = fontFamilyParts.join(", ");
        parts.push(`font-family: ${fontFamily}`);
    }

    const fontSize = typographyParts.get("fontSize");
    if (fontSize) {
        parts.push(`font-size: ${fontSize}`);
    }

    const fontWeight = typographyParts.get("fontWeight");
    if (fontWeight) {
        const weightMap: Record<string, string> = {
            regular: "400",
            medium: "500",
            semibold: "600",
            bold: "700",
        };
        const normalized = weightMap[fontWeight.toLowerCase().trim()] ?? fontWeight;
        parts.push(`font-weight: ${normalized}`);
    }

    const lineHeight = typographyParts.get("lineHeight");
    if (lineHeight) {
        parts.push(`line-height: ${lineHeight}`);
    }

    const letterSpacing = typographyParts.get("letterSpacing");
    if (letterSpacing) {
        parts.push(`letter-spacing: ${letterSpacing}`);
    }

    return parts.length > 0 ? `${parts.join("; ")};` : "";
}

function extractCssVariables(cssContent: string): ShowcaseTokenRecord[] {
    const variablePattern = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
    const variableMap = new Map<string, string>();
    let match = variablePattern.exec(cssContent);

    while (match) {
        const cssVariableName = match[1].trim();
        const cssValue = match[2].trim();
        variableMap.set(cssVariableName, cssValue);
        match = variablePattern.exec(cssContent);
    }

    if (variableMap.size === 0) {
        throw new CliInputError("No CSS variables found in input file.");
    }

    const typographyGroups = collectTypographyParts(variableMap);

    const records: ShowcaseTokenRecord[] = [];

    for (const [cssVariableName, cssValue] of variableMap) {
        if (toTypographyPart(cssVariableName)) {
            continue;
        }

        records.push({
            cssVariableName,
            cssValue,
            group: detectGroup(cssVariableName),
            category: detectCategory(cssVariableName),
        });
    }

    for (const [tyId, parts] of typographyGroups.entries()) {
        const typographyValue = buildTypographyValue(parts);
        if (!typographyValue) {
            continue;
        }
        records.push({
            cssVariableName: tyId,
            cssValue: typographyValue,
            group: detectGroup(tyId),
            category: "typography",
        });
    }

    records.sort((left, right) => {
        const groupDiff = SHOWCASE_GROUP_ORDER.indexOf(left.group)
            - SHOWCASE_GROUP_ORDER.indexOf(right.group);
        if (groupDiff !== 0) {
            return groupDiff;
        }

        const categoryDiff = SHOWCASE_CATEGORY_ORDER.indexOf(left.category)
            - SHOWCASE_CATEGORY_ORDER.indexOf(right.category);
        if (categoryDiff !== 0) {
            return categoryDiff;
        }
        return left.cssVariableName.localeCompare(right.cssVariableName);
    });

    return records;
}

async function readStdinText(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let buffer = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk: string) => {
            buffer += chunk;
        });
        process.stdin.on("end", () => {
            resolve(buffer);
        });
        process.stdin.on("error", (error) => {
            reject(error);
        });
    });
}

function resolveStyleDirectoryCandidates(): string[] {
    const currentFileDirectoryPath = path.dirname(process.argv[1] ?? "");
    const moduleDirectoryPath = __dirname;
    const cwdPath = process.cwd();
    return [
        path.resolve(cwdPath, "src", "app", "style"),
        path.resolve(cwdPath, "designtokens-tools", "src", "app", "style"),
        path.resolve(currentFileDirectoryPath, "..", "..", "src", "app", "style"),
        path.resolve(moduleDirectoryPath, "..", "src", "app", "style"),
    ];
}

function resolveBundledCssCandidates(): string[] {
    const cwdPath = process.cwd();
    return [
        path.resolve(__dirname, "index.css"),
        path.resolve(cwdPath, "dist-cli", "index.css"),
        path.resolve(cwdPath, "designtokens-tools", "dist-cli", "index.css"),
    ];
}

function readCssWithImports(entryCssPath: string, visited = new Set<string>()): string {
    const resolvedPath = path.resolve(entryCssPath);
    if (visited.has(resolvedPath)) {
        return "";
    }
    visited.add(resolvedPath);

    const css = readFileSync(resolvedPath, "utf8");
    const importPattern = /@import\s+(?:url\()?["']([^"']+)["']\)?\s*;?/g;

    let result = "";
    let lastIndex = 0;
    let match = importPattern.exec(css);
    while (match) {
        result += css.slice(lastIndex, match.index);

        const importPath = match[1];
        if (/^https?:\/\//i.test(importPath)) {
            result += match[0];
        } else {
            const candidatePaths = importPath.startsWith("src/")
                ? [
                    path.resolve(process.cwd(), importPath),
                    path.resolve(process.cwd(), "designtokens-tools", importPath),
                ]
                : [path.resolve(path.dirname(resolvedPath), importPath)];

            const resolvedChildPath = candidatePaths.find((candidatePath) => existsSync(candidatePath));
            if (resolvedChildPath) {
                result += readCssWithImports(resolvedChildPath, visited);
            }
        }

        lastIndex = importPattern.lastIndex;
        match = importPattern.exec(css);
    }
    result += css.slice(lastIndex);

    return result.trim();
}

function readShowcaseStyles(): string {
    for (const bundledCssPath of resolveBundledCssCandidates()) {
        if (existsSync(bundledCssPath)) {
            return readFileSync(bundledCssPath, "utf8");
        }
    }

    for (const styleDirectoryPath of resolveStyleDirectoryCandidates()) {
        const showcaseEntryPath = path.join(styleDirectoryPath, "showcase.css");
        if (existsSync(showcaseEntryPath)) {
            return readCssWithImports(showcaseEntryPath);
        }
    }

    throw new CliInputError("Unable to locate showcase styles. Make sure package includes dist-cli/index.css.");
}

function resolveOutputPath(outFile: string): string {
    const parsedOutFile = path.parse(outFile);
    if (parsedOutFile.dir.length === 0) {
        const tempDirectoryPath = mkdtempSync(path.join(os.tmpdir(), "dtcg-tools-showcase-"));
        return path.join(tempDirectoryPath, outFile);
    }

    return path.resolve(outFile);
}

function writeToStdout(content: string): void {
    process.stdout.write(content.endsWith("\n") ? content : `${content}\n`);
}

async function writeShowcaseOutput(showcaseHtml: string, outFile?: string): Promise<void> {
    if (!outFile) {
        writeToStdout(showcaseHtml);
        return;
    }

    const outputHtmlPath = resolveOutputPath(outFile);
    await writeTextFile(outputHtmlPath, showcaseHtml);
    openInDefaultBrowser(outputHtmlPath);
    logInfo(`Generated showcase: ${outputHtmlPath}`);
}

function scopeCssRootVariables(cssContent: string, scopeClass: string): string {
    return cssContent.replace(/:root\b/g, `.${scopeClass}`);
}

function buildScopedPreviewRules(tokens: ShowcaseTokenRecord[], scopeClass: string): string {
    return tokens
        .map((token, index) => toDynamicPreviewRule(token, `token-preview-${index}`))
        .filter((rule) => rule.length > 0)
        .map((rule) => `.${scopeClass} ${rule}`)
        .join("\n");
}

function createTabsScript(): string {
    return [
        "(function () {",
        "  var buttons = Array.prototype.slice.call(document.querySelectorAll('.showcase-tabs__button'));",
        "  var panels = Array.prototype.slice.call(document.querySelectorAll('.showcase-tab-panel'));",
        "  if (buttons.length === 0 || panels.length === 0) { return; }",
        "  function setActive(index) {",
        "    buttons.forEach(function (button, buttonIndex) {",
        "      button.classList.toggle('active', buttonIndex === index);",
        "    });",
        "    panels.forEach(function (panel, panelIndex) {",
        "      panel.classList.toggle('active', panelIndex === index);",
        "    });",
        "  }",
        "  buttons.forEach(function (button, index) {",
        "    button.addEventListener('click', function () { setActive(index); });",
        "  });",
        "  setActive(0);",
        "}());",
    ].join("\n");
}

function renderShowcaseHtmlDocument(inputs: ShowcaseRenderInput[], showcaseStyles: string): string {
    const appNode = createElement(App, { tabs: inputs.map((input) => ({
        displayName: input.displayName,
        scopeClass: input.scopeClass,
        tokens: input.tokens,
    })) });

    const scopedSourceCss = inputs
        .map((input) => scopeCssRootVariables(input.cssContent, input.scopeClass))
        .join("\n\n");

    const scopedPreviewRules = inputs
        .map((input) => buildScopedPreviewRules(input.tokens, input.scopeClass))
        .join("\n\n");

    return [
        "<!doctype html>",
        "<html lang=\"en\">",
        "<head>",
        "  <meta charset=\"UTF-8\" />",
        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
        "  <title>Design Tokens Showcase</title>",
        "  <style>",
        safeStyleText(showcaseStyles),
        "  </style>",
        "  <style>",
        safeStyleText(scopedSourceCss),
        "  </style>",
        "  <style>",
        safeStyleText(scopedPreviewRules),
        "  </style>",
        "</head>",
        "<body>",
        renderToStaticMarkup(appNode),
        "  <script>",
        createTabsScript(),
        "  </script>",
        "</body>",
        "</html>",
        "",
    ].join("\n");
}

async function prepareInputsWithStdinOverride(
    positionalFiles: string[],
    stdinCssContent?: string,
    stdinSourceName?: string,
) : Promise<ShowcaseRenderInput[]> {
    const hasFileInputs = positionalFiles.length > 0;
    const shouldReadStdin = !hasFileInputs && (!process.stdin.isTTY || typeof stdinCssContent === "string");
    const inputs: ShowcaseRenderInput[] = [];

    if (hasFileInputs) {
        const absolutePaths = positionalFiles.map((filePath) => path.resolve(filePath));
        for (const [index, absolutePath] of absolutePaths.entries()) {
            await assertFileExists(absolutePath);
            if (!absolutePath.toLowerCase().endsWith(".css")) {
                throw new CliInputError(`Expected .css file: ${positionalFiles[index]}`);
            }
        }

        const cssContents = await Promise.all(absolutePaths.map((absolutePath) => readTextFile(absolutePath)));
        for (const [index, absolutePath] of absolutePaths.entries()) {
            inputs.push({
                absolutePath,
                cssContent: cssContents[index],
                displayName: path.basename(absolutePath),
                scopeClass: `showcase-scope-${index}`,
                tokens: extractCssVariables(cssContents[index]),
            });
        }
    }

    if (shouldReadStdin) {
        const rawStdinCss = typeof stdinCssContent === "string"
            ? stdinCssContent
            : await readStdinText();
        const stdinCss = rawStdinCss.trim();
        if (stdinCss.length === 0) {
            throw new CliInputError("No input provided. Usage: dtcg-tools showcase [input.css ...] or cat input.css | dtcg-tools showcase");
        }

        inputs.push({
            absolutePath: stdinSourceName ?? "stdin.css",
            cssContent: stdinCss,
            displayName: `showcase${inputs.length + 1}`,
            scopeClass: `showcase-scope-${inputs.length}`,
            tokens: extractCssVariables(stdinCss),
        });
    }

    if (inputs.length === 0) {
        throw new CliInputError("No input provided. Usage: dtcg-tools showcase [input.css ...] or cat input.css | dtcg-tools showcase");
    }

    return inputs;
}

function openInDefaultBrowser(filePath: string): void {
    const fileUrl = pathToFileURL(filePath).toString();
    const options = { detached: true, stdio: "ignore" as const };

    if (process.platform === "win32") {
        const child = spawn("rundll32", ["url.dll,FileProtocolHandler", fileUrl], options);
        child.unref();
        return;
    }
    if (process.platform === "darwin") {
        const child = spawn("open", [fileUrl], options);
        child.unref();
        return;
    }

    const child = spawn("xdg-open", [fileUrl], options);
    child.unref();
}

/**
 * Запускает команду showcase
 * @param positionalFiles - Позиционные аргументы с путями к css файлам
 * @param options - Опции команды
 * @returns Код завершения (0 - успех, 2 - ошибка CLI)
 */
export async function runShowcaseCommand(
    positionalFiles: string[],
    options: ShowcaseCommandOptions,
): Promise<number> {
    try {
        const inputs = await prepareInputsWithStdinOverride(
            positionalFiles,
            options.stdinCssContent,
            options.stdinSourceName,
        );
        const showcaseStyles = readShowcaseStyles();
        const showcaseHtml = renderShowcaseHtmlDocument(inputs, showcaseStyles);

        await writeShowcaseOutput(showcaseHtml, options.outFile);

        return 0;
    } catch (error) {
        logError(toCliErrorMessage(error));
        return 2;
    }
}
