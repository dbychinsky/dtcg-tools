import { dispersaCssConverter } from "src/core/conversion/dispersaCssConverter";
import { CssConverter } from "src/core/conversion/types";
import { CliInputError } from "src/core/input/types";

/** Все доступные конвертеры */
const ALL_CONVERTERS: CssConverter[] = [dispersaCssConverter];

/**
 * Возвращает массив конвертеров по их именам
 * @param engineInputs - Массив имён конвертеров или "all"
 * @returns Массив конвертеров
 * @throws CliInputError если указано неизвестное имя конвертера
 */
export function resolveConverters(engineInputs: string[]): CssConverter[] {
    if (engineInputs.length === 0 || engineInputs.includes("all")) {
        return ALL_CONVERTERS;
    }

    const selected = new Map<string, CssConverter>();
    for (const engineInput of engineInputs) {
        const converter = ALL_CONVERTERS.find((candidate) => candidate.name === engineInput);
        if (!converter) {
            throw new CliInputError(
                `Unknown conversion engine "${engineInput}". Allowed values: dispersa, all.`,
            );
        }
        selected.set(converter.name, converter);
    }

    return [...selected.values()];
}

