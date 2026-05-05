import { ValidationSource } from "src/core/input/types";

/** Имя движка конвертации */
export type ConvertEngineName = "dispersa";

/**
 * Результат конвертации в CSS
 */
export interface CssConversionResult {
    /** 
     * Имя движка 
     */
    engineName: ConvertEngineName;

    /** 
     * Флаг успешности конвертации 
     */
    success: boolean;

    /** 
     * Сгенерированный CSS 
     */
    css: string;

    /** 
     * Массив ошибок 
     */
    errors: string[];
}

/**
 * Интерфейс конвертера в CSS
 */
export interface CssConverter {
    /** 
     * Имя движка 
     */
    name: ConvertEngineName;

    /**
     * Конвертирует источники в CSS
     * @param sources - Массив источников для конвертации
     * @returns Результат конвертации
     */
    convert(sources: ValidationSource[]): Promise<CssConversionResult>;
}
