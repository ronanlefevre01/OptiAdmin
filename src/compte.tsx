// src/compte.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import AccountClientPortal from "./components/AccountClientPortal"; // <= adapte si besoin
import "./index.css"; // si tu as des styles globaux

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AccountClientPortal apiBase="/api" />
  </React.StrictMode>
);
