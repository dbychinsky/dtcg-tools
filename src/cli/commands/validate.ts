import { resolveEngines } from "src/core/engines";
import { collectSources } from "src/core/input/collectSources";
import { createValidationSources } from "src/core/input/createTempFiles";
import { CliInputError, ValidationSource } from "src/core/input/types";
import { validateSources } from "src/core/validation/validateSources";
import { Diagnostic, EngineValidationResult } from "src/core/validation/types";
import { logError, logInfo } from "src/utils/logger";
import { createTempDirectory, removeDirectory } from "src/utils/tempDirectory";

/**
 * Опции команды validate
 */
export interface ValidateCommandOptions {
    /** 
     * Массив имён движков для использования 
     */
    engines: string[];

    /** 
     * Флаг чтения из stdin 
     */
    useStdin: boolean;

    /** 
     * Имя виртуального файла для stdin 
     */
    stdinName?: string;
}

/**
 * Группирует диагностики по имени файла-источника
 * @param diagnostics - Массив диагностик
 * @returns Карта источник -> диагностики
 */
function formatDiagnosticsBySource(diagnostics: Diagnostic[]): Map<string, Diagnostic[]> {
    const diagnosticsBySource = new Map<string, Diagnostic[]>();
    for (const diagnostic of diagnostics) {
        const sourceDiagnostics = diagnosticsBySource.get(diagnostic.sourceName) ?? [];
        sourceDiagnostics.push(diagnostic);
        diagnosticsBySource.set(diagnostic.sourceName, sourceDiagnostics);
    }
    return diagnosticsBySource;
}

/**
 * Выводит результаты валидации движка в консоль
 * @param result - Результат валидации движка
 * @param sources - Массив источников
 */
function printEngineResult(result: EngineValidationResult, sources: ValidationSource[]): void {
    const diagnosticsBySource = formatDiagnosticsBySource(result.diagnostics);
    for (const source of sources) {
        const sourceDiagnostics = diagnosticsBySource.get(source.name) ?? [];
        if (sourceDiagnostics.length === 0) {
            logInfo(`✓ ${result.engineName}: ${source.name} is valid`);
            continue;
        }

        logInfo(`✗ ${result.engineName}: ${source.name}`);
        for (const diagnostic of sourceDiagnostics) {
            logInfo(`  - ${diagnostic.message}`);
        }
    }
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
 * Запускает команду валидации
 * @param positionalFiles - Массив файлов для валидации
 * @param options - Опции команды
 * @returns Код завершения (0 - успех, 1 - ошибки валидации, 2 - ошибка CLI)
 */
export async function runValidateCommand(
    positionalFiles: string[],
    options: ValidateCommandOptions,
): Promise<number> {
    let tempDirectoryPath: string | undefined;

    try {
        const sourceInputs = await collectSources({
            positionalFiles,
            useStdin: options.useStdin,
            stdinName: options.stdinName,
        });
        const engines = resolveEngines(options.engines);

        tempDirectoryPath = await createTempDirectory("dt-tools-");
        const validationSources = await createValidationSources(sourceInputs, tempDirectoryPath);
        const runResult = await validateSources(engines, validationSources);

        for (const engineResult of runResult.results) {
            printEngineResult(engineResult, validationSources);
        }

        return runResult.success ? 0 : 1;
    } catch (error) {
        logError(toCliErrorMessage(error));
        return 2;
    } finally {
        if (tempDirectoryPath) {
            await removeDirectory(tempDirectoryPath);
        }
    }
}
