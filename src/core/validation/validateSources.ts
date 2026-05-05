import { ValidationEngine, ValidationRunResult } from "src/core/validation/types";
import { ValidationSource } from "src/core/input/types";

/**
 * Запускает валидацию источников на всех указанных движках
 * @param engines - Массив движков валидации
 * @param sources - Массив источников для валидации
 * @returns Результат прогона валидации
 */
export async function validateSources(
    engines: ValidationEngine[],
    sources: ValidationSource[],
): Promise<ValidationRunResult> {
    const results = await Promise.all(engines.map((engine) => engine.validate(sources)));
    return {
        results,
        success: results.every((result) => result.success),
    };
}
