import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

/**
 * Создаёт временную директорию с указанным префиксом.
 * @param prefix - Префикс для названия директории
 * @returns Путь к созданной временной директории
 */
export async function createTempDirectory(prefix: string): Promise<string> {
    const localPrefix = path.join(process.cwd(), `.tmp-${prefix}`);
    return mkdtemp(localPrefix);
}

/**
 * Удаляет директорию и всё её содержимое.
 * @param directoryPath - Путь к директории для удаления
 */
export async function removeDirectory(directoryPath: string): Promise<void> {
    await rm(directoryPath, { recursive: true, force: true });
}

