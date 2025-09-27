import React from "react";
import ReactDOM from "react-dom/client";
import AccountClientPortal from "./components/AccountClientPortal"; // ajuste le chemin si besoin
import "./index.css"; // optionnel si tu as des styles globaux

const root = document.getElementById("root-compte")!;
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AccountClientPortal apiBase="/api" />
  </React.StrictMode>
);
