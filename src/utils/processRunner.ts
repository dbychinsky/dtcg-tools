import { spawn } from "node:child_process";

/**
 * Результат выполнения внешнего процесса.
 */
export interface ProcessResult {
    /** 
     * Стандартный вывод процесса 
     */
    stdout: string;

    /** 
     * Стандартный поток ошибок процесса 
     */
    stderr: string;

    /** 
     * Код завершения процесса (null если процесс не завершился) 
     */
    exitCode: number | null;

    /** 
     * Флаг, указывающий на то, что процесс не удалось запустить 
     */
    failedToStart: boolean;

    /** 
     * Сообщение об ошибке при запуске процесса (если процесс не удалось запустить) 
     */
    startErrorMessage?: string;
}

/**
 * Запускает внешний процесс и ожидает его завершения.
 * @param command - Имя команды для запуска
 * @param args - Массив аргументов команды
 * @returns Promise с результатом выполнения процесса
 */
export function runProcess(command: string, args: string[]): Promise<ProcessResult> {
    return new Promise<ProcessResult>((resolve) => {
        const childProcess = spawn(command, args, {
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let failedToStart = false;
        let startErrorMessage: string | undefined;

        childProcess.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString("utf8");
        });
        childProcess.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        childProcess.on("error", (error: Error) => {
            failedToStart = true;
            startErrorMessage = error.message;
        });
        childProcess.on("close", (exitCode: number | null) => {
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode,
                failedToStart,
                startErrorMessage,
            });
        });
    });
}
