// src/App.tsx
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import HomePage from "./HomePage";
import RequireAdminAuth from "./routes/RequireAdminAuth"; // <— le garde
import Login from "./pages/Login";                       // <— la page de connexion

// Lazy load des gros écrans
const OptiComAdmin = lazy(() => import("./pages/OptiComAdmin"));
const OptiMesureAdmin = lazy(() => import("./pages/OptiMesureAdmin"));

// HomePage attend onSelect(app). On utilise le router pour naviguer.
function HomeRoute() {
  const navigate = useNavigate();
  return (
    <HomePage
      onSelect={(app: "OptiCOM" | "OptiMesure") =>
        navigate(app === "OptiCOM" ? "/opticom" : "/optimesure")
      }
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 16 }}>Chargement…</div>}>

        <Routes>
          {/* Publique */}
          <Route path="/login" element={<Login />} />

          {/* Tout le reste est protégé */}
          <Route element={<RequireAdminAuth />}>
            <Route index element={<HomeRoute />} />
            <Route path="/opticom" element={<OptiComAdmin />} />
            <Route path="/optimesure" element={<OptiMesureAdmin />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      </Suspense>
    </BrowserRouter>
  );
}
