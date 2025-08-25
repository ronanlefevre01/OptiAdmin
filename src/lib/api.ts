// src/lib/api.ts
export const API_BASE = (() => {
  const env = (import.meta as any).env || {};
  const base =
    env.VITE_SERVER_URL ||
    env.VITE_SERVER_BASE ||
    "https://opticom-sms-server.onrender.com";
  return String(base).replace(/\/$/, "");
})();

export const api = (path: string) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

// ✅ helper qui garantit le préfixe /api une seule fois
export const apiAdmin = (path: string) =>
  api(`/api/${path.replace(/^\/+/, "")}`);
