import { build, css } from "dispersa";
import {
    colorToHex,
    dimensionToPx,
    durationToMs,
    fontWeightToNumber,
    nameKebabCase,
} from "dispersa/transforms";
import path from "node:path";
import { ValidationSource } from "src/core/input/types";
import { CssConversionResult, CssConverter } from "src/core/conversion/types";

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
 * Преобразует путь к файлу в ссылку для резолвера
 * @param filePath - Абсолютный путь к файлу
 * @returns Относительная ссылка для резолвера
 */
function toResolverSourceReference(filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath);
    const normalized = relativePath.split(path.sep).join("/");
    if (normalized.startsWith("../") || normalized.startsWith("./")) {
        return normalized;
    }
    return `./${normalized}`;
}

/**
 * Преобразует ошибки в массив сообщений
 * @param errors - Массив ошибок или undefined
 * @returns Массив сообщений об ошибках
 */
function toErrorMessages(errors: CssConversionResult["errors"] | undefined): string[] {
    return errors && errors.length > 0 ? errors : ["CSS conversion failed."];
}

/** Конвертер в CSS на основе библиотеки Dispersa */
export const dispersaCssConverter: CssConverter = {
    name: "dispersa",

    /**
     * Конвертирует источники в CSS с помощью Dispersa
     * @param sources - Массив источников для конвертации
     * @returns Результат конвертации
     */
    async convert(sources: ValidationSource[]): Promise<CssConversionResult> {
        const resolver: ResolverSourceDocument = {
            version: "2025.10",
            sets: {
                base: {
                    sources: sources.map((source) => ({
                        $ref: toResolverSourceReference(source.tempPath),
                    })),
                },
            },
            resolutionOrder: [{ $ref: "#/sets/base" }],
        };

        const result = await build({
            resolver,
            outputs: [
                css({
                    name: "css",
                    preset: "bundle",
                    selector: ":root",
                    transforms: [
                        nameKebabCase(),
                        colorToHex(),
                        dimensionToPx(),
                        durationToMs(),
                        fontWeightToNumber(),
                    ],
                }),
            ],
            validation: { mode: "error" },
        });

        if (!result.success) {
            return {
                engineName: "dispersa",
                success: false,
                css: "",
                errors: toErrorMessages(result.errors?.map((error) => error.message)),
            };
        }

        return {
            engineName: "dispersa",
            success: true,
            css: result.outputs.map((output) => output.content).join("\n"),
            errors: [],
        };
    },
};
