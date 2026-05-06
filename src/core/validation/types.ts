import { ValidationSource } from "src/core/input/types";

/**
 * Имя движка валидации
 */
export type EngineName = "ajv" | "terrazzo" | "dispersa";

/**
 * Уровень серьёзности диагностики
 */
export type DiagnosticSeverity = "error" | "warning";

/**
 * Диагностика (ошибка или предупреждение) от движка валидации
 */
export interface Diagnostic {
    /** 
     * Имя файла-источника 
     */
    sourceName: string;

    /** 
     * Текст сообщения 
     */
    message: string;

    /** 
     * Уровень серьёзности 
     */
    severity: DiagnosticSeverity;

    /** 
     * Номер строки (если доступен) 
     */
    line?: number;

    /** 
     * Номер колонки (если доступен) 
     */
    column?: number;

    /** 
     * Сырые данные для отладки 
     */
    raw?: unknown;
}

/**
 * Результат валидации от одного движка
 */
export interface EngineValidationResult {
    /** 
     * Имя движка 
     */
    engineName: EngineName;

    /** 
     * Флаг успешности валидации 
     */
    success: boolean;

    /** 
     * Массив диагностик 
     */
    diagnostics: Diagnostic[];
}

/**
 * Интерфейс движка валидации
 */
export interface ValidationEngine {
    /** 
     * Имя движка 
     */
    name: EngineName;

    /**
     * Валидирует массив источников
     * @param sources - Массив источников для валидации
     * @returns Результат валидации
     */
    validate(sources: ValidationSource[]): Promise<EngineValidationResult>;
}

/**
 * Результат прогона валидации всеми движками
 */
export interface ValidationRunResult {
    /** 
     * Массив результатов от каждого движка 
     */
    results: EngineValidationResult[];

    /** 
     * Флаг успешности всех движков 
     */
    success: boolean;
}

