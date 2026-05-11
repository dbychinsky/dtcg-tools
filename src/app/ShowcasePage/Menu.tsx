/**
 * Компонент меню навигации страницы Showcase.
 */
import { ReactElement, useId } from "react";
import "src/app/ShowcasePage/Menu.css";
import {
    toCategoryLabel,
    toCategorySectionId,
    toExistingCategoriesInGroup,
    toExistingGroups,
    toGroupLabel,
    toTokensByGroupAndCategory,
} from "src/app/ShowcasePage/utils";
import { ShowcaseGroup, ShowcaseTokenRecord } from "src/app/ShowcasePage/types";

/**
 * Пропсы меню навигации по категориям.
 */
type ShowcasePageMenuProps = {
    tokens?: ShowcaseTokenRecord[];
};

/**
 * Компонент бокового меню навигации.
 * Отображает список категорий токенов со ссылками на соответствующие секции.
 */
export default function Menu(props: ShowcasePageMenuProps): ReactElement {
    const menuId = useId();

    const { tokens } = props;
    const tokensByGroupAndCategory = toTokensByGroupAndCategory(tokens ?? []);
    const groups = toExistingGroups(tokensByGroupAndCategory);
    const defaultOpenGroup: ShowcaseGroup | undefined = groups.includes("primitive")
        ? "primitive"
        : groups[0];

    return (
        <aside className="showcase-page__menu">
            <nav className="showcase-page__menu-nav">
                {groups.map((group) => (
                    <div key={group} className="showcase-page__menu-group">
                        <input
                            id={`showcase-menu-group-${menuId}-${group}`}
                            className="showcase-page__menu-group-toggle"
                            type="radio"
                            name={`showcase-menu-group-${menuId}`}
                            defaultChecked={group === defaultOpenGroup}
                        />
                        <label
                            className="showcase-page__menu-group-link"
                            htmlFor={`showcase-menu-group-${menuId}-${group}`}
                        >
                            {toGroupLabel(group)}
                        </label>
                        <div className="showcase-page__menu-group-content">
                            {toExistingCategoriesInGroup(tokensByGroupAndCategory, group).map((category) => (
                                <a
                                    key={`${group}-${category}`}
                                    className="showcase-page__menu-link"
                                    href={`#${toCategorySectionId(group, category)}`}
                                >
                                    {toCategoryLabel(category)}
                                </a>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
}