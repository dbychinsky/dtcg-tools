import { ReactElement } from "react";
import Category from "src/app/ShowcasePage/Category";
import {
    toExistingCategoriesInGroup,
    toExistingGroups,
    toGroupLabel,
    toGroupSectionId,
    toTokensByGroupAndCategory,
} from "src/app/ShowcasePage/utils";
import { ShowcaseTokenRecord } from "src/app/ShowcasePage/types";

/**
 * Пропсы контента страницы Showcase.
 */
type ShowcasePageContentProps = {
    tokens?: ShowcaseTokenRecord[];
};

/**
 * Компонент основного контента страницы Showcase.
 * Отображает все категории токенов в виде секций с карточками токенов.
 */
export default function Content(props: ShowcasePageContentProps): ReactElement {
    const { tokens } = props;
    const tokensByGroupAndCategory = toTokensByGroupAndCategory(tokens ?? []);
    const groups = toExistingGroups(tokensByGroupAndCategory);

    return (
        <section className="showcase-page__content">
            {groups.map((group) => (
                <section key={group} id={toGroupSectionId(group)} className="showcase-page__group">
                    <h2 className="showcase-page__group-title">{toGroupLabel(group)}</h2>
                    {toExistingCategoriesInGroup(tokensByGroupAndCategory, group).map((category) => (
                        <Category
                            key={`${group}-${category}`}
                            group={group}
                            category={category}
                            tokens={tokensByGroupAndCategory.get(group)?.get(category) ?? []}
                        />
                    ))}
                </section>
            ))}
        </section>
    );
}