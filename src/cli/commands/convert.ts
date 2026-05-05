import path from "node:path";
import { convertSources } from "src/core/conversion/convertSources";
import { dispersaCssConverter } from "src/core/conversion/dispersaCssConverter";
import { collectSources } from "src/core/input/collectSources";
import { createValidationSources } from "src/core/input/createTempFiles";
import { CliInputError, SourceInput } from "src/core/input/types";
import { logError, logInfo } from "src/utils/logger";
import { createTempDirectory, removeDirectory } from "src/utils/tempDirectory";
import { writeTextFile } from "src/utils/fileSystem";

/**
 * Опции команды convert
 */
export interface ConvertCommandOptions {
    /** 
     * Флаг чтения из stdin 
     */
    useStdin: boolean;

    /** 
     * Имя виртуального файла для stdin 
     */
    stdinName?: string;

    /** 
     * Путь к выходному файлу 
     */
    outFile?: string;

    /** 
     * Флаг вывода в stdout 
     */
    useStdout?: boolean;
}

/**
 * Возвращает порядок слоя для CSS-переменной
 * @param customPropertyName - Имя CSS-переменной
 * @returns Номер слоя (0 - primitive, 1 - semantic, 2 - component, 3 - other)
 */
function getLayerOrder(customPropertyName: string): number {
    if (customPropertyName.startsWith("--primitive-")) {
        return 0;
    }
    if (customPropertyName.startsWith("--semantic-")) {
        return 1;
    }
    if (customPropertyName.startsWith("--component-")) {
        return 2;
    }
    return 3;
}

/**
 * Переупорядочивает объявления в блоке :root по слоям токенов
 * @param rootBlockContent - Содержимое блока :root
 * @returns Переупорядоченное содержимое
 */
function reorderRootBlockDeclarations(rootBlockContent: string): string {
    const rawLines = rootBlockContent.split("\n");
    const declarations: Array<{ name: string; text: string; index: number }> = [];
    const nonDeclarationLines: Array<{ line: string; index: number }> = [];

    let currentDeclarationStart = -1;
    let currentDeclarationLines: string[] = [];

    for (let index = 0; index < rawLines.length; index += 1) {
        const line = rawLines[index];
        const trimmed = line.trim();

        if (currentDeclarationStart >= 0) {
            currentDeclarationLines.push(line);
            if (trimmed.endsWith(";")) {
                const declarationText = currentDeclarationLines.join("\n");
                const match = declarationText.match(/--[a-zA-Z0-9_-]+/);
                if (match) {
                    declarations.push({
                        name: match[0],
                        text: declarationText,
                        index: currentDeclarationStart,
                    });
                } else {
                    nonDeclarationLines.push({
                        line: declarationText,
                        index: currentDeclarationStart,
                    });
                }
                currentDeclarationStart = -1;
                currentDeclarationLines = [];
            }
            continue;
        }

        if (trimmed.startsWith("--")) {
            currentDeclarationStart = index;
            currentDeclarationLines = [line];
            if (trimmed.endsWith(";")) {
                const declarationText = currentDeclarationLines.join("\n");
                const match = declarationText.match(/--[a-zA-Z0-9_-]+/);
                if (match) {
                    declarations.push({
                        name: match[0],
                        text: declarationText,
                        index: currentDeclarationStart,
                    });
                } else {
                    nonDeclarationLines.push({
                        line: declarationText,
                        index: currentDeclarationStart,
                    });
                }
                currentDeclarationStart = -1;
                currentDeclarationLines = [];
            }
            continue;
        }

        nonDeclarationLines.push({ line, index });
    }

    if (currentDeclarationStart >= 0 && currentDeclarationLines.length > 0) {
        nonDeclarationLines.push({
            line: currentDeclarationLines.join("\n"),
            index: currentDeclarationStart,
        });
    }

    const sortedDeclarations = [...declarations].sort((left, right) => {
        const layerDiff = getLayerOrder(left.name) - getLayerOrder(right.name);
        if (layerDiff !== 0) {
            return layerDiff;
        }
        return left.name.localeCompare(right.name);
    });

    if (sortedDeclarations.length === 0) {
        return rootBlockContent;
    }

    const firstDeclarationIndex = Math.min(...sortedDeclarations.map((declaration) => declaration.index));
    const lastDeclarationIndex = Math.max(...sortedDeclarations.map((declaration) => declaration.index));

    const leading = nonDeclarationLines
        .filter((entry) => entry.index < firstDeclarationIndex)
        .sort((left, right) => left.index - right.index)
        .map((entry) => entry.line);

    const trailing = nonDeclarationLines
        .filter((entry) => entry.index > lastDeclarationIndex)
        .sort((left, right) => left.index - right.index)
        .map((entry) => entry.line);

    const sortedDeclarationTexts = sortedDeclarations.map((declaration) => declaration.text);
    return [...leading, ...sortedDeclarationTexts, ...trailing].join("\n");
}

/**
 * Переупорядочивает CSS по слоям токенов
 * @param css - Исходный CSS
 * @returns Переупорядоченный CSS
 */
function reorderCssByTokenLayer(css: string): string {
    return css.replace(/:root\s*\{([\s\S]*?)\}/g, (fullMatch, blockContent: string) => {
        const reordered = reorderRootBlockDeclarations(blockContent);
        return fullMatch.replace(blockContent, reordered);
    });
}

/**
 * Преобразует ошибку в строку для вывода в CLI
 * @param error - Объект ошибки
 * @returns Текст сообщения об ошибке
 */
function toCliErrorMessage(error: unknown): string {
    if (error instanceof CliInputError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected CLI error.";
}

/**
 * Форматирует объединённый CSS из результатов конвертеров
 * @param results - Результаты конвертеров
 * @returns Отформатированный CSS
 */
function formatCombinedCss(results: Awaited<ReturnType<typeof convertSources>>["results"]): string {
    if (results.length === 1) {
        return reorderCssByTokenLayer(results[0].css);
    }

    const combined = results
        .map((result) => [`/* Engine: ${result.engineName} */`, result.css].join("\n"))
        .join("\n\n");
    return reorderCssByTokenLayer(combined);
}

/**
 * Генерирует имя файла CSS по умолчанию
 * @param sourceInputs - Массив входных данных
 * @returns Имя CSS-файла
 */
function toDefaultCssFileName(sourceInputs: SourceInput[]): string {
    if (sourceInputs.length !== 1) {
        return "tokens.css";
    }
    const parsedName = path.parse(sourceInputs[0].name);
    const baseName = parsedName.name.trim().length > 0 ? parsedName.name : "tokens";
    return `${baseName}.css`;
}

/**
 * Определяет путь для вывода CSS
 * @param sourceInputs - Массив входных данных
 * @param outFile - Явно указанный путь к файлу
 * @returns Абсолютный путь для вывода
 */
function resolveOutputPath(sourceInputs: SourceInput[], outFile?: string): string {
    if (outFile) {
        return path.resolve(outFile);
    }
    const fileName = toDefaultCssFileName(sourceInputs);
    return path.resolve("src", "css", fileName);
}

/**
 * Запускает команду конвертации
 * @param positionalFiles - Массив файлов для конвертации
 * @param options - Опции команды
 * @returns Код завершения (0 - успех, 1 - ошибки конвертации, 2 - ошибка CLI)
 */
export async function runConvertCommand(
    positionalFiles: string[],
    options: ConvertCommandOptions,
): Promise<number> {
    let tempDirectoryPath: string | undefined;

    try {
        const sourceInputs = await collectSources({
            positionalFiles,
            useStdin: options.useStdin,
            stdinName: options.stdinName,
        });
        const converters = [dispersaCssConverter];

            tempDirectoryPath = await createTempDirectory("dtsg-tools-");
        const validationSources = await createValidationSources(sourceInputs, tempDirectoryPath);
        const runResult = await convertSources(converters, validationSources);

        if (!runResult.success) {
            for (const result of runResult.results) {
                for (const error of result.errors) {
                    logError(`${result.engineName}: ${error}`);
                }
            }
            return 1;
        }

        const css = formatCombinedCss(runResult.results);
        if (options.useStdout) {
            process.stdout.write(css.endsWith("\n") ? css : `${css}\n`);
        } else {
            const outputPath = resolveOutputPath(sourceInputs, options.outFile);
            await writeTextFile(outputPath, css);
            logInfo(`Generated CSS: ${outputPath}`);
        }

        return 0;
    } catch (error) {
        logError(toCliErrorMessage(error));
        return 2;
    } finally {
        if (tempDirectoryPath) {
            await removeDirectory(tempDirectoryPath);
        }
    }
}
