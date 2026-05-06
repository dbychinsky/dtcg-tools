import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import path from "node:path";
import { readTextFile, isDirectory, listFilesRecursively } from "src/utils/fileSystem";
import { Diagnostic, EngineValidationResult, ValidationEngine } from "src/core/engines/types";
import { ValidationSource } from "src/core/input/types";

/** Путь к директории со схемами относительно репозитория */
const SCHEMA_DIRECTORY_FROM_REPO = "src/dtcg/schema/2025.10";

/** Идентификатор главной схемы формата DTCG */
const FORMAT_SCHEMA_ID = "https://www.designtokens.org/schemas/2025.10/format.json";

/**
 * Интерфейс JSON-схемы
 */
interface JsonSchema {
    /** Идентификатор схемы */
    $id?: string;
    /** Дополнительные свойства */
    [key: string]: unknown;
}

/**
 * Загружает AJV-валидатор со всеми DTCG-схемами
 * @returns Экземпляр AJV или null если директория схем не найдена
 */
async function loadAjvValidator(): Promise<Ajv | null> {
    const executionEntryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
    const executionDirectory = executionEntryPath ? path.dirname(executionEntryPath) : null;
    const schemaDirectoryCandidates = process.env.DT_TOOLS_DTCG_SCHEMA_DIR
        ? [path.resolve(process.env.DT_TOOLS_DTCG_SCHEMA_DIR)]
        : [
              path.resolve(process.cwd(), SCHEMA_DIRECTORY_FROM_REPO),
              ...(executionDirectory
                  ? [path.resolve(executionDirectory, "../src/dtcg/schema/2025.10")]
                  : []),
          ];

    let schemaDirectoryPath: string | null = null;
    for (const candidatePath of schemaDirectoryCandidates) {
        if (await isDirectory(candidatePath)) {
            schemaDirectoryPath = candidatePath;
            break;
        }
    }

    if (!schemaDirectoryPath) {
        return null;
    }

    const schemaFilePaths = (await listFilesRecursively(schemaDirectoryPath)).filter((filePath) =>
        filePath.toLowerCase().endsWith(".json"),
    );
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    for (const schemaFilePath of schemaFilePaths) {
        const rawSchema = await readTextFile(schemaFilePath);
        const schema = JSON.parse(rawSchema) as JsonSchema;
        const schemaKey = schema.$id ?? schemaFilePath;
        ajv.addSchema(schema, schemaKey);
    }

    return ajv;
}

/**
 * Преобразует ошибку AJV в диагностику
 * @param sourceName - Имя файла-источника
 * @param error - Объект ошибки AJV
 * @returns Диагностика
 */
function toAjvDiagnostic(sourceName: string, error: ErrorObject): Diagnostic {
    const instancePath = error.instancePath || "/";
    const message = error.message ?? "Validation error.";
    return {
        sourceName,
        severity: "error",
        message: `${instancePath}: ${message}`,
        raw: error,
    };
}

/** Движок валидации на основе AJV и JSON Schema */
export const ajvEngine: ValidationEngine = {
    name: "ajv",

    /**
     * Валидирует источники с помощью AJV и DTCG JSON Schema
     * @param sources - Массив источников для валидации
     * @returns Результат валидации
     */
    async validate(sources: ValidationSource[]): Promise<EngineValidationResult> {
        const ajv = await loadAjvValidator();
        if (!ajv) {
            return {
                engineName: "ajv",
                success: false,
                diagnostics: [
                    {
                        sourceName: sources[0]?.name ?? "unknown",
                        severity: "error",
                        message:
                            "DTCG schema directory was not found. Set DT_TOOLS_DTCG_SCHEMA_DIR or use repository schema path.",
                    },
                ],
            };
        }

        const validate = ajv.getSchema(FORMAT_SCHEMA_ID);
        if (!validate) {
            return {
                engineName: "ajv",
                success: false,
                diagnostics: [
                    {
                        sourceName: sources[0]?.name ?? "unknown",
                        severity: "error",
                        message: `AJV schema "${FORMAT_SCHEMA_ID}" was not loaded.`,
                    },
                ],
            };
        }

        const diagnostics: Diagnostic[] = [];
        for (const source of sources) {
            const sourceContent = await readTextFile(source.tempPath);
            const sourceJson = JSON.parse(sourceContent) as unknown;
            const isValid = validate(sourceJson);
            if (isValid) {
                continue;
            }
            const errors = validate.errors ?? [];
            for (const error of errors) {
                diagnostics.push(toAjvDiagnostic(source.name, error));
            }
        }

        return {
            engineName: "ajv",
            success: diagnostics.length === 0,
            diagnostics,
        };
    },
};

