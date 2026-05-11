import { ReactElement } from "react";
import TokenCard from "src/app/ShowcasePage/TokenCard";
import { toCategoryLabel, toCategorySectionId } from "src/app/ShowcasePage/utils";
import { ShowcaseCategory, ShowcaseGroup, ShowcaseRenderToken } from "src/app/ShowcasePage/types";

/**
 * Пропсы секции категории.
 */
type ShowcasePageCategoryProps = {
    group: ShowcaseGroup;
    category: ShowcaseCategory;
    tokens: ShowcaseRenderToken[];
};

/**
 * Компонент секции категории токенов.
 * Отображает все токены одной категории в виде сетки карточек.
 */
export default function Category(props: ShowcasePageCategoryProps): ReactElement {
    const { group, category, tokens } = props;

    return (
        <section key={`${group}-${category}`} id={toCategorySectionId(group, category)}>
            <h3 className="showcase-page__section-title">{toCategoryLabel(category)}</h3>
            <div className="showcase-page__token-grid">
                {tokens.map((tokenWithId) => (
                    <TokenCard
                        key={tokenWithId.token.cssVariableName}
                        tokenWithId={tokenWithId}/>
                ))}
            </div>
        </section>
    );
}