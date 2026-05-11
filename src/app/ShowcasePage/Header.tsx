import { ReactElement } from "react";

/**
 * Компонент заголовка страницы Showcase.
 */

/**
 * Пропсы заголовка страницы Showcase.
 */
type ShowcasePageHeaderProps = {
    title?: string;
};

/**
 * Компонент заголовка страницы Showcase.
 * Отображает название страницы с опциональным кастомным заголовком.
 */
export default function Header(props: ShowcasePageHeaderProps): ReactElement {

    const { title = "Design Tokens Showcase" } = props;

    return (
        <header className="showcase-page__header">
            <h1 className="showcase-page__title">
                {title}
            </h1>
        </header>
    );
}