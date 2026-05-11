/**
 * RegExp для поиска закрывающего тега style в CSS.
 */
const STYLE_CLOSE_REGEXP = /<\/style/gi;

/**
 * Экранирует закрывающий тег style внутри CSS-текста.
 * Нужно, чтобы CSS безопасно вставлялся внутрь HTML.
 */
export function safeStyleText(cssText: string): string {
    return cssText.replace(STYLE_CLOSE_REGEXP, "<\\/style");
}