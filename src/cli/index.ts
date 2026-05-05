import { Command, CommanderError } from "commander";
import { runConvertCommand } from "src/cli/commands/convert";
import { runValidateCommand } from "src/cli/commands/validate";
import { logError } from "src/utils/logger";

/**
 * Добавляет значение в массив (колбэк для commander)
 * @param value - Добавляемое значение
 * @param previous - Предыдущий массив
 * @returns Обновлённый массив
 */
function appendValue(value: string, previous: string[]): string[] {
    previous.push(value);
    return previous;
}

/**
 * Нормализованные аргументы команды validate
 */
interface NormalizedValidateArguments {
    /** 
     * Массив имён движков 
     */
    engines: string[];

    /** 
     * Флаг использования stdin 
     */
    useStdin: boolean;

    /** 
     * Имя для виртуального файла из stdin 
     */
    stdinName?: string;
}

interface NormalizedConvertArguments {
    useStdin: boolean;
    stdinName?: string;
    outFile?: string;
    useStdout: boolean;
}

/**
 * Нормализует аргументы команды validate
 * @param positionalInputs - Позиционные входные данные
 * @param optionEngines - Опция движков из CLI
 * @param useStdin - Флаг использования stdin
 * @param stdinName - Имя для stdin
 * @returns Нормализованные файлы и опции
 */
function normalizeValidateArguments(
    positionalInputs: string[],
    optionEngines: string[],
    useStdin: boolean,
    stdinName?: string,
): { positionalFiles: string[]; normalizedOptions: NormalizedValidateArguments } {
    const positionalFiles: string[] = [];
    const engines = [...optionEngines];

    for (const positionalInput of positionalInputs) {
        if (
            positionalInput === "ajv" ||
            positionalInput === "terrazzo" ||
            positionalInput === "dispersa" ||
            positionalInput === "all"
        ) {
            engines.push(positionalInput);
            continue;
        }

        positionalFiles.push(positionalInput);
    }

    return {
        positionalFiles,
        normalizedOptions: {
            engines,
            useStdin,
            stdinName,
        },
    };
}

function normalizeConvertArguments(
    positionalInputs: string[],
    useStdin: boolean,
    stdinName?: string,
    outFile?: string,
    useStdout?: boolean,
): { positionalFiles: string[]; normalizedOptions: NormalizedConvertArguments } {
    const positionalFiles: string[] = [];
    let normalizedOutFile = outFile;
    const normalizedUseStdout = Boolean(useStdout);

    for (const positionalInput of positionalInputs) {
        if (!normalizedOutFile && positionalInput.toLowerCase().endsWith(".css")) {
            normalizedOutFile = positionalInput;
            continue;
        }

        positionalFiles.push(positionalInput);
    }

    return {
        positionalFiles,
        normalizedOptions: {
            useStdin,
            stdinName,
            outFile: normalizedOutFile,
            useStdout: normalizedUseStdout,
        },
    };
}

/**
 * Запускает CLI-приложение
 */
async function run(): Promise<void> {
    const program = new Command();
    program.name("dt-tools");

    program
        .command("validate")
        .description("Validate DTCG tokens using configured engines")
        .argument("[files...]", "Positional JSON files")
        .option("--stdin [name]", "Read JSON from stdin with optional virtual file name")
        .option(
            "--engine <name>",
            "Validation engine: ajv|terrazzo|dispersa|all (repeatable)",
            appendValue,
            [],
        )
        .action(async (positionalInputs: string[], options: Record<string, unknown>) => {
            const normalized = normalizeValidateArguments(
                positionalInputs,
                (options.engine as string[] | undefined) ?? [],
                Boolean(options.stdin),
                typeof options.stdin === "string" ? options.stdin : undefined,
            );
            const exitCode = await runValidateCommand(normalized.positionalFiles, {
                engines: normalized.normalizedOptions.engines,
                useStdin: normalized.normalizedOptions.useStdin,
                stdinName: normalized.normalizedOptions.stdinName,
            });
            process.exitCode = exitCode;
        });

    program
        .command("convert")
        .description("Convert valid DTCG JSON tokens to CSS")
        .argument("[files...]", "Positional JSON files")
        .option("--stdin [name]", "Read JSON from stdin with optional virtual file name")
        .option("--stdout", "Print generated CSS to stdout")
        .option("-o, --out <file>", "Write generated CSS to a file instead of stdout")
        .option("--output <file>", "Write generated CSS to a file instead of stdout")
        .action(async (positionalInputs: string[], options: Record<string, unknown>) => {
            const normalized = normalizeConvertArguments(
                positionalInputs,
                Boolean(options.stdin),
                typeof options.stdin === "string" ? options.stdin : undefined,
                typeof options.output === "string"
                    ? options.output
                    : typeof options.out === "string"
                      ? options.out
                      : undefined,
                Boolean(options.stdout),
            );
            const exitCode = await runConvertCommand(normalized.positionalFiles, {
                useStdin: normalized.normalizedOptions.useStdin,
                stdinName: normalized.normalizedOptions.stdinName,
                outFile: normalized.normalizedOptions.outFile,
                useStdout: normalized.normalizedOptions.useStdout,
            });
            process.exitCode = exitCode;
        });

    try {
        await program.parseAsync(process.argv);
    } catch (error) {
        if (error instanceof CommanderError) {
            if (error.code === "commander.help" || error.code === "commander.helpDisplayed") {
                process.exitCode = 0;
                return;
            }
            logError(error.message);
            process.exitCode = typeof error.exitCode === "number" ? error.exitCode : 2;
            return;
        }
        throw error;
    }
}

run().catch((error) => {
    if (error instanceof Error) {
        logError(error.message);
    } else {
        logError("Unexpected CLI error.");
    }
    process.exitCode = 2;
});
