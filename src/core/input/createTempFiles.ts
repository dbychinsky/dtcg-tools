import path from "node:path";
import { SourceInput, ValidationSource } from "src/core/input/types";
import { writeTextFile } from "src/utils/fileSystem";

/**
 * Преобразует имя файла в безопасное имя без спецсимволов
 * @param value - Исходное имя файла
 * @returns Безопасное имя файла
 */
function toSafeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Создаёт временные файлы из входных данных и возвращает источники для валидации
 * @param sourceInputs - Массив входных данных
 * @param tempDirectoryPath - Путь к временной директории
 * @returns Массив источников для валидации
 */
export async function createValidationSources(
    sourceInputs: SourceInput[],
    tempDirectoryPath: string,
): Promise<ValidationSource[]> {
    const validationSources: ValidationSource[] = [];
    let index = 0;

    for (const sourceInput of sourceInputs) {
        if (sourceInput.type === "file") {
            validationSources.push({
                name: sourceInput.name,
                originalType: "file",
                originalPath: sourceInput.filePath,
                tempPath: sourceInput.filePath!,
            });
            continue;
        }

        const fileBaseName = path.basename(sourceInput.name);
        const safeFileName = toSafeFileName(fileBaseName);
        const tempFilePath = path.join(tempDirectoryPath, `${index}-${safeFileName}`);

        await writeTextFile(tempFilePath, sourceInput.content!);
        validationSources.push({
            name: sourceInput.name,
            originalType: "content",
            tempPath: tempFilePath,
        });

        index += 1;
    }

    return validationSources;
}
