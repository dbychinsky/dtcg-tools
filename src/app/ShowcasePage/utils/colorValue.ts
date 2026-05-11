/**
 * RegExp для проверки hex-цвета (3, 4, 6 или 8 символов).
 */
const HEX_COLOR_REGEXP = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Проверяет, что значение является только hex-цветом (без дополнительных токенов).
 */
export function isPureHexColorValue(value: string): boolean {
    return HEX_COLOR_REGEXP.test(value.trim());
}