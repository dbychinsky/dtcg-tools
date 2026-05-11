/**
 * Главный компонент страницы Showcase.
 */
export { default as ShowcasePage } from "src/app/ShowcasePage/ShowcasePage";

/**
 * Пропсы страницы Showcase.
 */
export type { ShowcasePageProps } from "src/app/ShowcasePage/ShowcasePage";

/**
 * Порядок отображения групп и категорий.
 */
export {
    SHOWCASE_CATEGORY_ORDER,
    SHOWCASE_GROUP_ORDER,
} from "src/app/ShowcasePage/types";

/**
 * Генерирует CSS правило для превью токена.
 */
export { toDynamicPreviewRule } from "src/app/ShowcasePage/utils";

/**
 * Типы токенов для Showcase.
 */
export type {
    ShowcaseCategory,
    ShowcaseGroup,
    ShowcaseRenderToken,
    ShowcaseTokenRecord,
} from "src/app/ShowcasePage/types";
