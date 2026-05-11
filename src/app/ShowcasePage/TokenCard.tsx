import { ReactElement } from "react";
import TokenPreview from "src/app/ShowcasePage/TokenPreview";
import { ShowcaseRenderToken } from "src/app/ShowcasePage/types";

/**
 * Пропсы карточки токена.
 */
type ShowcasePageTokenCardProps = {
    tokenWithId: ShowcaseRenderToken;
};

/**
 * Компонент карточки токена дизайна.
 * Отображает превью токена, его имя и значение.
 */
export default function TokenCard(props: ShowcasePageTokenCardProps): ReactElement {
    const { tokenWithId } = props;
    const { token, tokenId } = tokenWithId;

    return (
        <article key={token.cssVariableName} className="showcase-page__token-card">
            <div className={`showcase-page__token-preview ${tokenId}`}>
                <TokenPreview category={token.category} value={token.cssValue}/>
            </div>
            <div className="showcase-page__token-meta">
                <h3 className="showcase-page__token-name">--{token.cssVariableName}</h3>
                <p className="showcase-page__token-value">{token.cssValue}</p>
            </div>
        </article>
    );
}