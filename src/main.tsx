import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { bootstrapContainer } from "./core/di";
import "./shared/styles/globals.css";

bootstrapContainer();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
