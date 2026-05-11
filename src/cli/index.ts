import { Command, CommanderError } from "commander";
import { readFileSync } from "node:fs";
import path from "node:path";
import { runBuildCommand } from "src/cli/commands/build";
import { runConvertCommand } from "src/cli/commands/convert";
import { runShowcaseCommand } from "src/cli/commands/showcase";
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
    outFile?: string | string[];
}

interface NormalizedShowcaseArguments {
    outFile?: string;
}

interface NormalizedBuildArguments {
    outFile?: string;
}

function resolveActionArguments(
    args: unknown[],
): { positionalInputs: string[]; options: Record<string, unknown> } {
    const command = args.at(-1);
    if (!(command instanceof Command)) {
        return { positionalInputs: [], options: {} };
    }

    const positionalInputArgument = args[0];
    const positionalInputs = Array.isArray(positionalInputArgument)
        ? positionalInputArgument.filter((value): value is string => typeof value === "string")
        : typeof positionalInputArgument === "string"
            ? [positionalInputArgument]
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
    rows.push("Dtcg-tools is a CLI for validating, converting, and previewing DTCG 2025.10 design tokens.");
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
    addRow("    --output <file>", "write CSS to file; repeat for per-input outputs.");
    addRow("", "Print CSS to stdout if not specified.");
    addRow("", "Reads from stdin automatically and validates before conversion.");
    rows.push("");
    addRow("  showcase [options] [files...]", "Generate static HTML showcase from CSS variables.");
    addRow("    --output <file>", "write showcase HTML to file and open it in default browser.");
    addRow("", "If only file name is provided, it is written to a temp directory.");
    addRow("", "Print HTML to stdout when --output is not specified.");
    addRow("", "Reads from stdin automatically if files are not provided.");
    rows.push("");
    addRow("  build [options] [files...]", "Validate -> convert -> showcase in one command");
    addRow("    --output <file>", "write showcase HTML to file and open it in default browser.");
    addRow("", "If only file name is provided, it is written to a temp directory.");
    addRow("", "Print HTML to stdout when --output is not specified.");
    addRow("", "Reads from stdin automatically if files are not provided.");
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
    addRow("    dtcg-tools convert tokens.json --output output.css", "");
    addRow("    dtcg-tools convert a.json b.json --output a.css --output b.css", "");
    rows.push("");
    addRow("  Generate showcase from CSS", "");
    addRow("    dtcg-tools showcase light.css dark.css", "");
    rows.push("");
    addRow("  Generate showcase to output file", "");
    addRow("    dtcg-tools showcase input.css --output showcase.html", "");
    rows.push("");
    addRow("  Generate showcase from stdin", "");
    addRow("    cat input.css | dtcg-tools showcase", "");
    rows.push("");
    addRow("  Build pipeline to showcase", "");
    addRow("    dtcg-tools build tokens.json --output showcase.html", "");
    rows.push("");
    addRow("  Build pipeline from stdin", "");
    addRow("    cat tokens.json | dtcg-tools build", "");
    rows.push("");
    rows.push("Available validation engines:");
    rows.push("  dispersa (default)");
    rows.push("  ajv");
    rows.push("  terrazzo");
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
    outFile?: string | string[],
): { positionalFiles: string[]; normalizedOptions: NormalizedConvertArguments } {
    return {
        positionalFiles: positionalInputs,
        normalizedOptions: {
            outFile,
        },
    };
}

function normalizeShowcaseArguments(
    positionalInputs: string[],
    outFile?: string,
): { positionalFiles: string[]; normalizedOptions: NormalizedShowcaseArguments } {
    return {
        positionalFiles: positionalInputs,
        normalizedOptions: {
            outFile,
        },
    };
}

function normalizeBuildArguments(
    positionalInputs: string[],
    outFile?: string,
): { positionalFiles: string[]; normalizedOptions: NormalizedBuildArguments } {
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
            [],
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
        .option(
            "--output <file>",
            "Write CSS to file. Repeat option for per-input output files.",
            appendValue,
            [],
        )
        .action(async (...args: unknown[]) => {
            const { positionalInputs, options } = resolveActionArguments(args);
            const normalized = normalizeConvertArguments(
                positionalInputs,
                Array.isArray(options.output)
                    ? options.output.filter((value): value is string => typeof value === "string")
                    : typeof options.output === "string"
                        ? options.output
                        : undefined,
            );
            const exitCode = await runConvertCommand(normalized.positionalFiles, {
                outFile: normalized.normalizedOptions.outFile,
            });
            process.exitCode = exitCode;
        });

    program
        .command("showcase")
        .description("Generate static HTML showcase from CSS variables")
        .argument("[files...]", "Input CSS file(s) with tokens")
        .option(
            "--output <file>",
            "Write showcase HTML to file (name -> temp dir, path -> exact location) and open in default browser.",
        )
        .action(async (...args: unknown[]) => {
            const { positionalInputs, options } = resolveActionArguments(args);
            const normalized = normalizeShowcaseArguments(
                positionalInputs,
                typeof options.output === "string"
                    ? options.output
                    : undefined,
            );
            const exitCode = await runShowcaseCommand(normalized.positionalFiles, {
                outFile: normalized.normalizedOptions.outFile,
            });
            process.exitCode = exitCode;
        });

    program
        .command("build")
        .description("Validate, convert and generate showcase in one command")
        .argument("[files...]", "Input JSON file(s) with DTCG tokens")
        .option(
            "--output <file>",
            "Write showcase HTML to file (name -> temp dir, path -> exact location) and open in default browser.",
        )
        .action(async (...args: unknown[]) => {
            const { positionalInputs, options } = resolveActionArguments(args);
            const normalized = normalizeBuildArguments(
                positionalInputs,
                typeof options.output === "string"
                    ? options.output
                    : undefined,
            );
            const exitCode = await runBuildCommand(normalized.positionalFiles, {
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

