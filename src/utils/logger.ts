/**
 * Выводит информационное сообщение в stdout.
 * @param message - Сообщение для вывода
 */
export function logInfo(message: string): void {
    console.log(message);
}

/**
 * Выводит сообщение об ошибке в stderr.
 * @param message - Сообщение об ошибке для вывода
 */
export function logError(message: string): void {
    console.error(message);
}
