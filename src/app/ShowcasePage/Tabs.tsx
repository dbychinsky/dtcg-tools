import { ReactElement } from "react";
import { ShowcasePage } from "src/app/ShowcasePage";
import { ShowcaseTokenRecord } from "src/app/ShowcasePage";
import "src/app/ShowcasePage/Tabs.css";

/**
 * Компонент табов для отображения нескольких наборов токенов.
 */
interface ShowcaseTabsProps {
    /**
     * Список вкладок Showcase.
     */
    tabs: AppShowcaseTab[];
}

/**
 * Данные одной вкладки Showcase.
 */
export interface AppShowcaseTab {
    /**
     * Название вкладки, которое отображается в кнопке.
     */
    displayName: string;

    /**
     * CSS-класс области вкладки.
     * Используется для скоупа CSS-переменных конкретного файла.
     */
    scopeClass: string;

    /**
     * Список токенов, которые нужно отобразить внутри вкладки.
     */
    tokens: ShowcaseTokenRecord[];
}

/**
 * Отображает несколько ShowcasePage во вкладках.
 */
export function Tabs({ tabs }: ShowcaseTabsProps): ReactElement {
    return (
        <section className="showcase-tabs">
            <nav className="showcase-tabs__nav" aria-label="Showcase files">
                {tabs.map((tab, index) => (
                    <button
                        key={`button-${tab.scopeClass}`}
                        type="button"
                        className={`showcase-tabs__button${index === 0 ? " active" : ""}`}
                        data-tab-index={index}
                    >
                        {tab.displayName}
                    </button>
                ))}
            </nav>

            {tabs.map((tab, index) => (
                <section
                    key={`panel-${tab.scopeClass}`}
                    className={`showcase-tab-panel ${tab.scopeClass}${index === 0 ? " active" : ""}`}
                    data-tab-index={index}
                >
                    <ShowcasePage tokens={tab.tokens}/>
                </section>
            ))}
        </section>
    );
}
