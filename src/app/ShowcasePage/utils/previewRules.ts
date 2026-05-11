import type {
    ShowcaseCategory,
    ShowcaseTokenRecord,
} from "src/app/ShowcasePage/types";
import { isPureHexColorValue } from "src/app/ShowcasePage/utils/colorValue";

/**
 * Конфигурация правила превью для категории токенов.
 */
type PreviewRuleConfig = {
    className: string;
    property: string;
    toValue?: (_token: ShowcaseTokenRecord) => string;
};

/**
 * Правила превью для каждой категории токенов.
 */
const CATEGORY_PREVIEW_RULES: Partial<Record<ShowcaseCategory, PreviewRuleConfig>> = {
    color: {
        className: "preview-swatch",
        property: "background",
    },

    fontFamily: {
        className: "preview-font",
        property: "font-family",
    },
    fontSize: {
        className: "preview-font",
        property: "font-size",
    },
    fontWeight: {
        className: "preview-font",
        property: "font-weight",
    },
    lineHeight: {
        className: "preview-font",
        property: "line-height",
    },
    letterSpacing: {
        className: "preview-font",
        property: "letter-spacing",
    },

    spacing: {
        className: "preview-spacing-bar",
        property: "width",
        toValue: (token) => `min(42px, max(0px, ${toCssVariable(token.cssVariableName)}))`,
    },

    radius: {
        className: "preview-shape",
        property: "border-radius",
    },
    shadow: {
        className: "preview-shadow-shape",
        property: "box-shadow",
    },
    zIndex: {
        className: "preview-zindex-bar",
        property: "width",
        toValue: (token) => toZIndexBarWidth(token.cssValue),
    },
};

/**
 * Конфигурация правила превью для transition.
 */
type TransitionPreviewRuleConfig = {
    className: string;
    property: string;
    toValue: (_token: ShowcaseTokenRecord) => string;
};

/**
 * Правила превью для transition токенов.
 */
const TRANSITION_PREVIEW_RULES: TransitionPreviewRuleConfig[] = [
    {
        className: "preview-transition-dot--moving",
        property: "animation-duration",
        toValue: (token) => toTransitionDuration(token.cssValue),
    },
    {
        className: "preview-transition-dot--moving",
        property: "animation-timing-function",
        toValue: (token) => toTransitionTimingFunction(token.cssValue),
    },
];

/**
 * Возвращает CSS переменную для значения токена.
 */
function toCssVariable(cssVariableName: string): string {
    return `var(--${cssVariableName})`;
}

/**
 * Возвращает селектор превью для токена.
 */
function toPreviewSelector(tokenId: string, className: string): string {
    return `.${tokenId} .${className}`;
}

/**
 * Возвращает CSS правило для превью.
 */
function toCssRule(selector: string, property: string, value: string): string {
    return `${selector} { ${property}: ${value}; }`;
}

/**
 * Возвращает значение по умолчанию для превью.
 */
function toDefaultRuleValue(token: ShowcaseTokenRecord): string {
    return toCssVariable(token.cssVariableName);
}

/**
 * Преобразует значение transition в длительность анимации.
 */
function toTransitionDuration(cssValue: string): string {
    const durationMatch = cssValue.match(/(\d*\.?\d+)\s*(ms|s)/i);
    if (!durationMatch) {
        return "200ms";
    }

    const value = Number(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    const milliseconds = unit === "s" ? value * 1000 : value;
    const normalized = Math.min(2000, Math.max(100, milliseconds));
    return `${Math.round(normalized)}ms`;
}

/**
 * Преобразует значение transition в timing function.
 */
function toTransitionTimingFunction(cssValue: string): string {
    const cubicBezierMatch = cssValue.match(/cubic-bezier\([^)]+\)/i);
    if (cubicBezierMatch) {
        return cubicBezierMatch[0];
    }
    if (cssValue.toLowerCase().includes("linear")) {
        return "linear";
    }
    if (cssValue.toLowerCase().includes("ease-in-out")) {
        return "ease-in-out";
    }
    if (cssValue.toLowerCase().includes("ease-in")) {
        return "ease-in";
    }
    if (cssValue.toLowerCase().includes("ease-out")) {
        return "ease-out";
    }
    return "ease";
}

/**
 * Преобразует значение z-index в ширину бара.
 */
function toZIndexBarWidth(cssValue: string): string {
    const parsed = Number.parseFloat(cssValue);
    if (!Number.isFinite(parsed)) {
        return "28%";
    }

    const normalized = Math.min(1, Math.max(0, (parsed - 1000) / 60));
    const widthPercent = 24 + (normalized * 44);
    return `${widthPercent.toFixed(1)}%`;
}

/**
 * Генерирует CSS правило для превью typography токена.
 */
function toTypographyPreviewRule(token: ShowcaseTokenRecord, tokenId: string): string {
    if (!token.cssValue) {
        return "";
    }

    const cssBlock = token.cssValue.trim().replace(/;+$/g, "");
    if (cssBlock.length === 0) {
        return "";
    }

    return `${toPreviewSelector(tokenId, "preview-font")} { ${cssBlock}; }`;
}

/**
 * Генерирует CSS правило для превью transition токена.
 */
function toTransitionPreviewRule(token: ShowcaseTokenRecord, tokenId: string): string {
    return TRANSITION_PREVIEW_RULES
        .map((rule) => toCssRule(
            toPreviewSelector(tokenId, rule.className),
            rule.property,
            rule.toValue(token),
        ))
        .join(" ");
}

/**
 * Генерирует CSS правило для динамического превью токена.
 */
export function toDynamicPreviewRule(token: ShowcaseTokenRecord, tokenId: string): string {
    if (token.category === "typography") {
        return toTypographyPreviewRule(token, tokenId);
    }
    if (token.category === "other" && isPureHexColorValue(token.cssValue)) {
        return toCssRule(
            toPreviewSelector(tokenId, "preview-swatch"),
            "background",
            token.cssValue.trim(),
        );
    }
    if (token.category === "transition") {
        return toTransitionPreviewRule(token, tokenId);
    }

    const rule = CATEGORY_PREVIEW_RULES[token.category];

    if (!rule) {
        return "";
    }

    const value = rule.toValue ? rule.toValue(token) : toDefaultRuleValue(token);

    return toCssRule(
        toPreviewSelector(tokenId, rule.className),
        rule.property,
        value,
    );
}