/**
 * Тип источника входных данных
 */
export type SourceInputType = "file" | "content";

/**
 * Входные данные для валидации (из CLI)
 */
export interface SourceInput {
    /** 
     * Тип источника: файл или содержимое 
     */
    type: SourceInputType;

    /** 
     * Имя источника (имя файла или виртуальное имя) 
     */
    name: string;

    /** 
     * Содержимое (для типа "content") 
     */
    content?: string;

    /** 
     * Путь к файлу (для типа "file") 
     */
    filePath?: string;
}

/**
 * Подготовленный источник для валидации
 */
export interface ValidationSource {
    /** 
     * Имя источника 
     */
    name: string;

    /** 
     * Оригинальный тип источника 
     */
    originalType: SourceInputType;

    /** 
     * Оригинальный путь к файлу 
     */
    originalPath?: string;

    /** 
     * Путь к временному файлу для валидации 
     */
    tempPath: string;
}

/**
 * Ошибка ввода CLI
 */
export class CliInputError extends Error {
    /**
     * Создаёт новую ошибку ввода CLI
     * @param message - Сообщение об ошибке
     */
    constructor(message: string) {
        super(message);
        this.name = "CliInputError";
    }
}
