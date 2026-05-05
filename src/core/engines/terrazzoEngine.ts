import { Diagnostic, EngineValidationResult, ValidationEngine } from "src/core/engines/types";
import { ValidationSource } from "src/core/input/types";
import { runProcess } from "src/utils/processRunner";
import path from "node:path";

/**
 * Определяет команду npm для запуска
 * @returns Объект с именем команды и префиксом аргументов
 */
function resolveNpmCommand(): { command: string; argsPrefix: string[] } {
    const npmExecPath = process.env.npm_execpath;
    if (npmExecPath) {
        return {
            command: process.execPath,
            argsPrefix: [npmExecPath],
        };
    }
    return {
        command: process.platform === "win32" ? "npm.cmd" : "npm",
        argsPrefix: [],
    };
}

/**
 * Формирует сообщение об ошибке из stdout и stderr
 * @param stdout - Стандартный вывод
 * @param stderr - Поток ошибок
 * @returns Текст сообщения об ошибке
 */
function buildFailureMessage(stdout: string, stderr: string): string {
    if (stderr) {
        return stderr;
    }
    if (stdout) {
        return stdout;
    }
    return "terrazzo returned a non-zero exit code.";
}

/** Движок валидации на основе Terrazzo CLI */
export const terrazzoEngine: ValidationEngine = {
    name: "terrazzo",

    /**
     * Валидирует источники с помощью Terrazzo CLI
     * @param sources - Массив источников для валидации
     * @returns Результат валидации
     */
    async validate(sources: ValidationSource[]): Promise<EngineValidationResult> {
        const diagnostics: Diagnostic[] = [];
        const npmCommand = resolveNpmCommand();

        for (const source of sources) {
            const relativeSourcePath = path.relative(process.cwd(), source.tempPath) || source.tempPath;
            const result = await runProcess(npmCommand.command, [
                ...npmCommand.argsPrefix,
                "exec",
                "--no",
                "--",
                "tz",
                "check",
                relativeSourcePath,
            ]);
            if (result.failedToStart) {
                diagnostics.push({
                    sourceName: source.name,
                    severity: "error",
                    message:
                        `Failed to run local Terrazzo CLI. ` +
                        `Install it in devDependencies: npm i -D @terrazzo/cli. ` +
                        `Details: ${result.startErrorMessage ?? "unknown start error."}`,
                });
                continue;
            }

            if (result.exitCode !== 0) {
                diagnostics.push({
                    sourceName: source.name,
                    severity: "error",
                    message: buildFailureMessage(result.stdout, result.stderr),
                    raw: {
                        exitCode: result.exitCode,
                        stdout: result.stdout,
                        stderr: result.stderr,
                    },
                });
            }
        }

        return {
            engineName: "terrazzo",
            success: diagnostics.length === 0,
            diagnostics,
        };
    },
};
