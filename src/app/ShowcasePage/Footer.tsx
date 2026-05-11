import { ReactElement } from "react";

/**
 * Компонент футера страницы Showcase.
 * Отображает название проекта и текущий год.
 */
export default function Footer(): ReactElement {
    const year = new Date().getFullYear();

    return (
        <footer className="showcase-page__footer">
            Design Tokens Showcase {year}
        </footer>
    );
}