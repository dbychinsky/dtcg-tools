import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

/**
 * Точка входа React-приложения
 * Монтирует корневой компонент App в DOM-элемент с id="root"
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
