import { CssConversionResult, CssConverter } from "src/core/conversion/types";
import { ValidationSource } from "src/core/input/types";

/**
 * Результат прогона конвертации всеми движками
 */
export interface ConversionRunResult {
    /** 
     * Массив результатов от каждого движка 
     */
    results: CssConversionResult[];

    /** 
     * Флаг успешности всех движков 
     */
    success: boolean;
}

/**
 * Запускает конвертацию источников на всех указанных конвертерах
 * @param converters - Массив конвертеров
 * @param sources - Массив источников для конвертации
 * @returns Результат прогона конвертации
 */
export async function convertSources(
    converters: CssConverter[],
    sources: ValidationSource[],
): Promise<ConversionRunResult> {
    const results = await Promise.all(converters.map((converter) => converter.convert(sources)));
    return {
        results,
        success: results.every((result) => result.success),
    };
}
