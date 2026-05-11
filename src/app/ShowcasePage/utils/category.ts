import {
    SHOWCASE_CATEGORY_LABELS,
    SHOWCASE_GROUP_LABELS,
    type ShowcaseCategory,
    type ShowcaseGroup,
} from "src/app/ShowcasePage/types";

/**
 * Возвращает ID секции для группы токенов.
 */
export function toGroupSectionId(group: ShowcaseGroup): string {
    return `group-${group}`;
}

/**
 * Возвращает ID секции для категории токенов.
 */
export function toCategorySectionId(group: ShowcaseGroup, category: ShowcaseCategory): string {
    return `group-${group}-${category}`;
}

/**
 * Возвращает отображаемое название категории.
 */
export function toCategoryLabel(category: ShowcaseCategory): string {
    return SHOWCASE_CATEGORY_LABELS[category];
}

/**
 * Возвращает отображаемое название группы.
 */
export function toGroupLabel(group: ShowcaseGroup): string {
    return SHOWCASE_GROUP_LABELS[group];
}