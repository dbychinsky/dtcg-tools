import { ReactElement } from "react";
import Menu from "src/app/ShowcasePage/Menu";
import Content from "src/app/ShowcasePage/Content";
import Footer from "src/app/ShowcasePage/Footer";
import Header from "src/app/ShowcasePage/Header";
import { ShowcaseTokenRecord } from "src/app/ShowcasePage/types";
import "src/app/ShowcasePage/ShowcasePage.css";

/**
 * Пропсы главной страницы Showcase.
 */
export interface ShowcasePageProps {
    tokens?: ShowcaseTokenRecord[];
}

/**
 * Главный компонент страницы Showcase.
 * Собирает все части страницы: заголовок, меню, контент и футер.
 */
export default function ShowcasePage(props: ShowcasePageProps): ReactElement {

    const { tokens } = props;

    return (
        <div className="showcase-page">
            <Header/>
            <section className="showcase-page__layout">
                <Menu tokens={tokens}/>
                <Content tokens={tokens}/>
            </section>
            <Footer/>
        </div>
    );
}
