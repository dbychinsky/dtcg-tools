/**
 * Компонент превью токена для отображения значения в карточке.
 */
import type { ReactNode } from "react";

import type { ShowcaseCategory } from "src/app/ShowcasePage/types";
import { isPureHexColorValue } from "src/app/ShowcasePage/utils/colorValue";

/**
 * Пропсы компонента превью токена.
 */
type TokenPreviewProps = {
    category: ShowcaseCategory;
    value: string;
};

const PREVIEW_TEXT = "The quick brown fox jumps over the lazy dog.";

/**
 * Карта компонентов превью по категориям.
 * Каждая категория имеет свой уникальный рендеринг.
 */
const PREVIEW_BY_CATEGORY: Partial<Record<ShowcaseCategory, ReactNode>> = {
    color: <div className="preview-swatch" />,

    spacing: (
        <>
            <div className="preview-spacing-bar" />
        </>
    ),

    radius: <div className="preview-shape" />,

    shadow: <div className="preview-shadow-shape" />,

    transition: (
        <div className="preview-transition">
            <div className="preview-transition-line" />
            <div className="preview-transition-dot preview-transition-dot--start" />
            <div className="preview-transition-dot preview-transition-dot--moving" />
            <div className="preview-transition-dot preview-transition-dot--end" />
        </div>
    ),
    zIndex: (
        <div className="preview-zindex">
            <div className="preview-zindex-axis" />
            <div className="preview-zindex-bar" />
        </div>
    ),

    fontFamily: <p className="preview-font">{PREVIEW_TEXT}</p>,
    fontSize: <p className="preview-font">{PREVIEW_TEXT}</p>,
    fontWeight: <p className="preview-font">{PREVIEW_TEXT}</p>,
    lineHeight: <p className="preview-font">{PREVIEW_TEXT}</p>,
    letterSpacing: <p className="preview-font">{PREVIEW_TEXT}</p>,
    typography: <p className="preview-font">{PREVIEW_TEXT}</p>,
};

/**
 * Компонент превью токена дизайна.
 * Рендерит визуальное представление значения токена в зависимости от его категории.
 */
export default function TokenPreview({ category, value }: TokenPreviewProps): ReactNode {
    if (category === "other" && isPureHexColorValue(value)) {
        return <div className="preview-swatch" />;
    }

    return PREVIEW_BY_CATEGORY[category] ?? <p className="preview-value">{value}</p>;
}
