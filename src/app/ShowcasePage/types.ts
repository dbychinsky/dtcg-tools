/**
 * Карта соответствия категорий токенов их читаемым названиям.
 * Используется для отображения в UI.
 */
export const SHOWCASE_CATEGORY_LABELS = {
    color: "Color",

    fontFamily: "Font Family",
    fontSize: "Font Size",
    fontWeight: "Font Weight",
    lineHeight: "Line Height",
    letterSpacing: "Letter Spacing",

    typography: "Composite Typography",

    spacing: "Spacing",
    radius: "Radius",
    shadow: "Shadow",
    transition: "Transition",
    zIndex: "Z Index",
    other: "Other",
} as const;

/**
 * Категория токена.
 */
export type ShowcaseCategory = keyof typeof SHOWCASE_CATEGORY_LABELS;

/**
 * Группа токенов (уровень абстракции).
 */
export const SHOWCASE_GROUP_LABELS = {
    primitive: "Primitive",
    semantic: "Semantic",
    component: "Component",
    other: "Other",
} as const;

export type ShowcaseGroup = keyof typeof SHOWCASE_GROUP_LABELS;

export const SHOWCASE_GROUP_ORDER: ShowcaseGroup[] = [
    "primitive",
    "semantic",
    "component",
    "other",
];

/**
 * Порядок отображения категорий в UI.
 */
export const SHOWCASE_CATEGORY_ORDER: ShowcaseCategory[] = [
    "color",

    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",

    "typography",

    "spacing",
    "radius",
    "shadow",
    "transition",
    "zIndex",
    "other",
];

/**
 * Запись токена дизайна для отображения на странице.
 */
export interface ShowcaseTokenRecord {
    cssVariableName: string;
    cssValue: string;
    group: ShowcaseGroup;
    category: ShowcaseCategory;
}

/**
 * Токен с идентификатором для рендеринга.
 */
export interface ShowcaseRenderToken {
    token: ShowcaseTokenRecord;
    tokenId: string;
}

/**
 * Псевдоним типа ShowcaseTokenRecord для удобства.
 */
export type Token = ShowcaseTokenRecord;

/**
 * Пропсы главной страницы ShowcasePage.
 */
export interface ShowcasePageProps {
    tokens?: ShowcaseTokenRecord[];
}
