import { Command, CommanderError } from "commander";
import { readFileSync } from "node:fs";
import path from "node:path";
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
    const values = previous ?? [];
    values.push(value);
    return values;
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
    outFile?: string;
}

function resolveActionArguments(
    args: unknown[],
): { positionalInputs: string[]; options: Record<string, unknown> } {
    const command = args.at(-1);
    if (!(command instanceof Command)) {
        return { positionalInputs: [], options: {} };
    }

    const positionalInputs = Array.isArray(args[0])
        ? args[0].filter((value): value is string => typeof value === "string")
        : [];

    return {
        positionalInputs,
        options: command.opts<Record<string, unknown>>(),
    };
}

function buildRootHelpText(): string {
    const rows: string[] = [];
    const addRow = (left: string, right: string) => {
        rows.push(`${left.padEnd(42)}${right}`);
    };

    rows.push("Usage: dtcg-tools [options] [command]");
    rows.push("");
    rows.push("Validate DTCG JSON design tokens and convert them to CSS.");
    rows.push("");
    rows.push("Options:");
    addRow("  -h, --help", "display help for command");
    addRow("  -v, --version", "display version");
    rows.push("");
    rows.push("Commands:");
    addRow(
        "  validate [options] [files...]",
        "Validate DTCG tokens using configured engines and print errors to stdout.",
    );
    addRow("", "Accepts JSON via stdin when files are not provided.");
    addRow(
        "    --engine <engine>",
        "validation engine (ajv | terrazzo | dispersa | all). Default: dispersa.",
    );
    addRow("", "May be specified multiple times.");
    addRow("", "Reads from stdin automatically if no files are provided.");
    rows.push("");
    addRow("  convert [options] [files...]", "Convert valid DTCG JSON tokens to CSS");
    addRow("    --output <file>", "write CSS to the file (optional).");
    addRow("", "Print CSS to stdout if not specified.");
    addRow("", "Reads from stdin automatically and validates before conversion.");
    rows.push("");
    rows.push("");
    rows.push("Examples:");
    addRow("  Validate using default engine", "");
    addRow("    dtcg-tools validate tokens.json", "");
    rows.push("");
    addRow("  Accept tokens from stdin and validate using specific engines", "");
    addRow("    cat tokens.json | dtcg-tools validate --engine ajv --engine dispersa", "");
    rows.push("");
    addRow("  Convert tokens to CSS", "");
    addRow("    dtcg-tools convert tokens.json --output tokens.css", "");
    rows.push("");
    rows.push("Available validation engines:");
    rows.push("  ajv");
    rows.push("  terrazzo");
    rows.push("  dispersa");
    rows.push("  all");
    return rows.join("\n");
}

function resolveCliVersion(): string {
    if (process.env.npm_package_version) {
        return process.env.npm_package_version;
    }

    try {
        const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
        if (entryPath) {
            const packageJsonPath = path.resolve(path.dirname(entryPath), "..", "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
                version?: string;
            };
            if (packageJson.version) {
                return packageJson.version;
            }
        }
    } catch {
        // no-op
    }

    return "0.0.0";
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
    return {
        positionalFiles: positionalInputs,
        normalizedOptions: {
            engines: [...optionEngines],
            useStdin,
            stdinName,
        },
    };
}

function normalizeConvertArguments(
    positionalInputs: string[],
    outFile?: string,
): { positionalFiles: string[]; normalizedOptions: NormalizedConvertArguments } {
    return {
        positionalFiles: positionalInputs,
        normalizedOptions: {
            outFile,
        },
    };
}

/**
 * Запускает CLI-приложение
 */
async function run(): Promise<void> {
    const cliVersion = resolveCliVersion();
    if (process.argv.includes("--version") || process.argv.includes("-v")) {
        process.stdout.write(`${cliVersion}\n`);
        return;
    }
    if (process.argv.length >= 3 && process.argv[2] === "help") {
        process.stdout.write(`${buildRootHelpText()}\n`);
        return;
    }
    if (
        process.argv.length <= 2 ||
        (process.argv.length === 3 && (process.argv[2] === "--help" || process.argv[2] === "-h"))
    ) {
        process.stdout.write(`${buildRootHelpText()}\n`);
        return;
    }

    const program = new Command();
    program.name("dtcg-tools");
    program.description("Validate DTCG JSON design tokens and convert them to CSS.");
    program.showHelpAfterError();
    program.helpCommand(false);

    program
        .command("validate")
        .description("Validate DTCG tokens using configured engines and print errors to stdout.")
        .usage("[<file>...]")
        .argument("[files...]", "Positional JSON files")
        .option(
            "--engine <name>",
            "Validation engine (ajv | terrazzo | dispersa | all). Default: dispersa. May be specified multiple times.",
            appendValue,
        )
        .action(async (...args: unknown[]) => {
            const { positionalInputs, options } = resolveActionArguments(args);
            const normalized = normalizeValidateArguments(
                positionalInputs,
                (options.engine as string[] | undefined) ?? [],
                false,
                undefined,
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
        .option("--output <file>", "Write CSS to file. Print CSS to stdout if not specified.")
        .action(async (...args: unknown[]) => {
            const { positionalInputs, options } = resolveActionArguments(args);
            const normalized = normalizeConvertArguments(
                positionalInputs,
                typeof options.output === "string"
                    ? options.output
                    : undefined,
            );
            const exitCode = await runConvertCommand(normalized.positionalFiles, {
                outFile: normalized.normalizedOptions.outFile,
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

