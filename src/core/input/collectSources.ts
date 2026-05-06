import path from "node:path";
import { CliInputError, SourceInput } from "./types";
import { assertFileExists, assertJsonFilePath, readTextFile } from "src/utils/fileSystem";

/**
 * Опции для сбора источников входных данных
 */
export interface CollectSourcesOptions {
    /** 
     * Позиционные файловые аргументы 
     */
    positionalFiles: string[];

    /** 
     * Флаг использования stdin 
     */
    useStdin: boolean;

    /** 
     * Имя для виртуального файла из stdin 
     */
    stdinName?: string;
}

const NO_INPUT_MESSAGE = [
    "No input provided.",
    "Use files or stdin:",
    "",
    "dtcg-tools validate tokens.json",
    "dtcg-tools validate tokens.json dark.tokens.json",
    "cat tokens.json | dtcg-tools validate",
].join("\n");

/**
 * Читает текст из stdin
 * @returns Содержимое stdin в виде строки
 */
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

/**
 * Собирает источники входных данных из файлов и/или stdin
 * @param options - Опции сбора источников
 * @returns Массив источников входных данных
 */
export async function collectSources(options: CollectSourcesOptions): Promise<SourceInput[]> {
    const fileInputs = [...options.positionalFiles];
    const shouldReadStdin = options.useStdin || (fileInputs.length === 0 && !process.stdin.isTTY);

    const sources: SourceInput[] = [];

    for (const fileInput of fileInputs) {
        const absolutePath = path.resolve(fileInput);
        await assertFileExists(absolutePath);
        assertJsonFilePath(absolutePath);

        const fileContent = await readTextFile(absolutePath);
        try {
            JSON.parse(fileContent);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
            throw new CliInputError(`Invalid JSON file "${fileInput}": ${message}`);
        }

        sources.push({
            type: "file",
            name: path.basename(absolutePath),
            filePath: absolutePath,
        });
    }

    if (shouldReadStdin) {
        const stdinContent = (await readStdinText()).trim();
        if (!stdinContent) {
            if (sources.length === 0) {
                throw new CliInputError(NO_INPUT_MESSAGE);
            }
        } else {
            try {
                JSON.parse(stdinContent);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
                throw new CliInputError(`Invalid JSON from stdin: ${message}`);
            }

            sources.push({
                type: "content",
                name: options.stdinName?.trim() || "stdin.json",
                content: stdinContent,
            });
        }
    }

    if (sources.length === 0) {
        throw new CliInputError(NO_INPUT_MESSAGE);
    }

    return sources;
}

