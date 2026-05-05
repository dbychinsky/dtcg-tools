import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { CliInputError } from "src/core/input/types";

/**
 * Читает текстовый файл и возвращает его содержимое в виде строки.
 * @param filePath - Путь к файлу
 * @returns Содержимое файла в виде строки
 */
export async function readTextFile(filePath: string): Promise<string> {
    return readFile(filePath, "utf8");
}

/**
 * Записывает текстовое содержимое в файл.
 * Создаёт все необходимые директории, если они не существуют.
 * @param filePath - Путь к файлу
 * @param content - Текстовое содержимое для записи
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
}

/**
 * Проверяет существование файла.
 * Выбрасывает ошибку CliInputError, если файл не найден.
 * @param filePath - Путь к файлу
 * @throws CliInputError если файл не существует
 */
export async function assertFileExists(filePath: string): Promise<void> {
    try {
        await access(filePath, fsConstants.F_OK);
    } catch {
        throw new CliInputError(`File not found: ${filePath}`);
    }
}

/**
 * Проверяет, что файл имеет расширение .json.
 * Выбрасывает ошибку CliInputError, если расширение неверное.
 * @param filePath - Путь к файлу
 * @throws CliInputError если файл не имеет расширение .json
 */
export function assertJsonFilePath(filePath: string): void {
    if (!filePath.toLowerCase().endsWith(".json")) {
        throw new CliInputError(`Expected .json file: ${filePath}`);
    }
}

/**
 * Рекурсивно собирает все файлы в директории и её поддиректориях.
 * @param directoryPath - Путь к директории
 * @returns Массив абсолютных путей к файлам
 */
export async function listFilesRecursively(directoryPath: string): Promise<string[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            const nestedFiles = await listFilesRecursively(entryPath);
            files.push(...nestedFiles);
            continue;
        }
        if (entry.isFile()) {
            files.push(entryPath);
        }
    }

    return files;
}

/**
 * Проверяет, является ли путь директорией.
 * @param directoryPath - Путь для проверки
 * @returns true если путь является директорией, иначе false
 */
export async function isDirectory(directoryPath: string): Promise<boolean> {
    try {
        return (await stat(directoryPath)).isDirectory();
    } catch {
        return false;
    }
}
