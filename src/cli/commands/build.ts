import path from "node:path";
import { runConvertCommand } from "src/cli/commands/convert";
import { runShowcaseCommand } from "src/cli/commands/showcase";
import { runValidateCommand } from "src/cli/commands/validate";
import { CliInputError } from "src/core/input/types";
import { readTextFile, writeTextFile } from "src/utils/fileSystem";
import { createTempDirectory, removeDirectory } from "src/utils/tempDirectory";
import { logError } from "src/utils/logger";

export interface BuildCommandOptions {
    outFile?: string;
}

interface ResolvedBuildInputs {
    inputJsonFiles: string[];
    stdinInputName?: string;
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

async function resolveInputJsonFiles(
    positionalFiles: string[],
    tempDirectoryPath: string,
): Promise<ResolvedBuildInputs> {
    if (positionalFiles.length > 0) {
        return { inputJsonFiles: positionalFiles };
    }

    if (process.stdin.isTTY) {
        throw new CliInputError(
            "No input provided. Usage: dtcg-tools build [tokens.json ...] or cat tokens.json | dtcg-tools build",
        );
    }

    const stdinContent = (await readStdinText()).trim();
    if (!stdinContent) {
        throw new CliInputError(
            "No input provided. Usage: dtcg-tools build [tokens.json ...] or cat tokens.json | dtcg-tools build",
        );
    }

    const stdinInputPath = path.join(tempDirectoryPath, "build-tokens.json");
    await writeTextFile(stdinInputPath, stdinContent);
    return {
        inputJsonFiles: [stdinInputPath],
        stdinInputName: "build.css",
    };
}

export async function runBuildCommand(
    positionalFiles: string[],
    options: BuildCommandOptions,
): Promise<number> {
    let tempDirectoryPath: string | undefined;

    try {
        tempDirectoryPath = await createTempDirectory("dtcg-tools-build-");
        const resolvedInputs = await resolveInputJsonFiles(positionalFiles, tempDirectoryPath);
        const inputJsonFiles = resolvedInputs.inputJsonFiles;

        const validateExitCode = await runValidateCommand(inputJsonFiles, {
            engines: [],
            useStdin: false,
            stdinName: undefined,
        });
        if (validateExitCode !== 0) {
            return validateExitCode;
        }

        const convertedCssPaths = inputJsonFiles.map((inputJsonFile, index) => {
            const baseName = path.parse(inputJsonFile).name || `build-output-${index + 1}`;
            return path.join(tempDirectoryPath!, `${baseName}.css`);
        });
        const convertExitCode = await runConvertCommand(inputJsonFiles, {
            outFile: convertedCssPaths.length === 1 ? convertedCssPaths[0] : convertedCssPaths,
        });
        if (convertExitCode !== 0) {
            return convertExitCode;
        }

        const showcaseExitCode = convertedCssPaths.length === 1
            ? await (async () => {
                const convertedCss = await readTextFile(convertedCssPaths[0]);
                return runShowcaseCommand([], {
                    outFile: options.outFile,
                    stdinCssContent: convertedCss,
                    stdinSourceName: resolvedInputs.stdinInputName ?? "build.css",
                });
            })()
            : await runShowcaseCommand(convertedCssPaths, {
                outFile: options.outFile,
            });
        return showcaseExitCode;
    } catch (error) {
        logError(toCliErrorMessage(error));
        return 2;
    } finally {
        if (tempDirectoryPath) {
            await removeDirectory(tempDirectoryPath);
        }
    }
}
