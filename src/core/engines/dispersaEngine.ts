import { resolveTokens } from "dispersa";
import { Diagnostic, EngineValidationResult, ValidationEngine } from "src/core/engines/types";
import { ValidationSource } from "src/core/input/types";
import path from "node:path";

/**
 * Структура резолвера источников для dispersa
 */
type ResolverSourceDocument = {
    /** Версия формата */
    version: "2025.10";
    /** Наборы токенов */
    sets: {
        base: {
            sources: Array<{ $ref: string }>;
        };
    };
    /** Порядок разрешения */
    resolutionOrder: Array<{ $ref: "#/sets/base" }>;
};

/**
 * Извлекает сообщение об ошибке из объекта
 * @param error - Объект ошибки
 * @returns Текст сообщения
 */
function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown dispersa error.";
}

/**
 * Удаляет дубликаты и пустые строки из массива сообщений
 * @param messages - Массив сообщений
 * @returns Уникальные непустые строки
 */
function uniqueNonEmptyLines(messages: string[]): string[] {
    const unique = new Set<string>();
    for (const message of messages) {
        const lines = message
            .split(/\r?\n/g)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        for (const line of lines) {
            unique.add(line);
        }
    }
    return [...unique];
}

/**
 * Собирает предупреждения от dispersa в режиме warn
 * @param resolver - Документ резолвера
 * @returns Массив предупреждений
 */
async function collectValidationMessages(resolver: ResolverSourceDocument): Promise<string[]> {
    const originalWarn = console.warn;
    const captured: string[] = [];

    console.warn = (...args: unknown[]) => {
        const text = args
            .map((arg) => {
                if (typeof arg === "string") {
                    return arg;
                }
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            })
            .join(" ")
            .trim();

        if (text.length > 0) {
            captured.push(text);
        }
    };

    try {
        await resolveTokens(resolver, undefined, { mode: "warn" });
    } finally {
        console.warn = originalWarn;
    }

    return uniqueNonEmptyLines(captured);
}

/**
 * Преобразует путь к файлу в ссылку для резолвера
 * @param filePath - Абсолютный путь к файлу
 * @returns Относительная ссылка для резолвера
 */
function toResolverSourceReference(filePath: string): string {
    if (path.isAbsolute(filePath)) {
        const normalizedAbsolutePath = filePath.split(path.sep).join("/");
        return normalizedAbsolutePath;
    }

    const relativePath = path.relative(process.cwd(), filePath);
    const normalized = relativePath.split(path.sep).join("/");
    if (normalized.startsWith("../") || normalized.startsWith("./")) {
        return normalized;
    }
    return `./${normalized}`;
}

/** Движок валидации на основе библиотеки Dispersa */
export const dispersaEngine: ValidationEngine = {
    name: "dispersa",

    /**
     * Валидирует источники с помощью библиотеки Dispersa
     * @param sources - Массив источников для валидации
     * @returns Результат валидации
     */
    async validate(sources: ValidationSource[]): Promise<EngineValidationResult> {
        const diagnostics: Diagnostic[] = [];

        for (const source of sources) {
            const resolver: ResolverSourceDocument = {
                version: "2025.10" as const,
                sets: {
                    base: {
                        sources: [{ $ref: toResolverSourceReference(source.tempPath) }],
                    },
                },
                resolutionOrder: [{ $ref: "#/sets/base" }],
            };

            try {
                await resolveTokens(resolver, undefined, { mode: "error" });
            } catch (error) {
                const validationMessages = await collectValidationMessages(resolver);

                if (validationMessages.length > 0) {
                    diagnostics.push(
                        ...validationMessages.map((message) => ({
                            sourceName: source.name,
                            severity: "error" as const,
                            message,
                            raw: error,
                        })),
                    );
                } else {
                    diagnostics.push({
                        sourceName: source.name,
                        severity: "error",
                        message: toErrorMessage(error),
                        raw: error,
                    });
                }
            }
        }

        return {
            engineName: "dispersa",
            success: diagnostics.length === 0,
            diagnostics,
        };
    },
};

