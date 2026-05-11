import { ReactElement } from "react";
import { ShowcasePage, ShowcasePageProps } from "src/app/ShowcasePage";
import { AppShowcaseTab, Tabs } from "src/app/ShowcasePage/Tabs";
import "src/app/style/styles.css";

export type { AppShowcaseTab } from "src/app/ShowcasePage/Tabs";

export interface AppProps extends ShowcasePageProps {
    /**
     * Список вкладок для отображения нескольких наборов токенов.
     * Если вкладки не переданы, отображается обычная ShowcasePage.
     */
    tabs?: AppShowcaseTab[];
}

/**
 * Корневой компонент приложения.
 */
export function App(props: AppProps): ReactElement {
    const { tabs, tokens } = props;
    const hasTabs = tabs && tabs.length > 0;

    return (
        <main className="page">
            {hasTabs ? (
                <Tabs tabs={tabs}/>
            ) : (
                <ShowcasePage tokens={tokens}/>
            )}
        </main>
    );
}
