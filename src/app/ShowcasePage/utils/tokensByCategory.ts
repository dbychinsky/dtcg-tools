import {
    SHOWCASE_CATEGORY_ORDER,
    SHOWCASE_GROUP_ORDER,
    type ShowcaseCategory,
    type ShowcaseGroup,
    type ShowcaseRenderToken,
    type ShowcaseTokenRecord,
} from "src/app/ShowcasePage/types";

/**
 * Возвращает список групп, которые содержат токены.
 */
export function toExistingGroups(
    tokensByGroupAndCategory: Map<ShowcaseGroup, Map<ShowcaseCategory, ShowcaseRenderToken[]>>,
): ShowcaseGroup[] {
    return SHOWCASE_GROUP_ORDER.filter((group) =>
        SHOWCASE_CATEGORY_ORDER.some(
            (category) => (tokensByGroupAndCategory.get(group)?.get(category)?.length ?? 0) > 0,
        ),
    );
}

/**
 * Возвращает список категорий внутри группы, которые содержат токены.
 */
export function toExistingCategoriesInGroup(
    tokensByGroupAndCategory: Map<ShowcaseGroup, Map<ShowcaseCategory, ShowcaseRenderToken[]>>,
    group: ShowcaseGroup,
): ShowcaseCategory[] {
    return SHOWCASE_CATEGORY_ORDER.filter(
        (category) => (tokensByGroupAndCategory.get(group)?.get(category)?.length ?? 0) > 0,
    );
}

/**
 * Группирует токены по группам и категориям.
 */
export function toTokensByGroupAndCategory(
    tokens: ShowcaseTokenRecord[],
): Map<ShowcaseGroup, Map<ShowcaseCategory, ShowcaseRenderToken[]>> {
    const tokensByGroupAndCategory = new Map<ShowcaseGroup, Map<ShowcaseCategory, ShowcaseRenderToken[]>>();

    for (const group of SHOWCASE_GROUP_ORDER) {
        const categoryMap = new Map<ShowcaseCategory, ShowcaseRenderToken[]>();
        for (const category of SHOWCASE_CATEGORY_ORDER) {
            categoryMap.set(category, []);
        }
        tokensByGroupAndCategory.set(group, categoryMap);
    }

    for (const [index, token] of tokens.entries()) {
        const groupMap = tokensByGroupAndCategory.get(token.group);
        const categoryTokens = groupMap?.get(token.category);

        if (!categoryTokens) {
            continue;
        }

        categoryTokens.push({
            token,
            tokenId: `token-preview-${index}`,
        });
    }

    return tokensByGroupAndCategory;
}