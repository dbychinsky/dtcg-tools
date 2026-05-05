import { ajvEngine } from "src/core/engines/ajvEngine";
import { dispersaEngine } from "src/core/engines/dispersaEngine";
import { terrazzoEngine } from "src/core/engines/terrazzoEngine";
import { ValidationEngine } from "src/core/engines/types";
import { CliInputError } from "src/core/input/types";

/** Все доступные движки валидации */
const ALL_ENGINES: ValidationEngine[] = [ajvEngine, terrazzoEngine, dispersaEngine];

/**
 * Возвращает массив движков валидации по их именам
 * @param engineInputs - Массив имён движков или "all"
 * @returns Массив движков валидации
 * @throws CliInputError если указано неизвестное имя движка
 */
export function resolveEngines(engineInputs: string[]): ValidationEngine[] {
    if (engineInputs.length === 0 || engineInputs.includes("all")) {
        return ALL_ENGINES;
    }

    const selected = new Map<string, ValidationEngine>();
    for (const engineInput of engineInputs) {
        const engine = ALL_ENGINES.find((candidate) => candidate.name === engineInput);
        if (!engine) {
            throw new CliInputError(
                `Unknown engine "${engineInput}". Allowed values: ajv, terrazzo, dispersa, all.`,
            );
        }
        selected.set(engine.name, engine);
    }

    return [...selected.values()];
}
