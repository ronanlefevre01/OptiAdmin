import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import HomePage from "./HomePage";
import Login from "./pages/Login";
import RequireAdminAuth from "./routes/RequireAdminAuth";

const OptiComAdmin = lazy(() => import("./pages/OptiComAdmin"));
const OptiMesureAdmin = lazy(() => import("./pages/OptiMesureAdmin"));
const OptiRHAdmin   = lazy(() => import("./pages/OptiRHAdmin"));   // <— AJOUT

function HomeRoute() {
  const nav = useNavigate();
  return (
    <HomePage
      onSelect={(app) => {
        if (app === "OptiCOM") nav("/admin");
        else if (app === "OptiMesure") nav("/mesure");
        else if (app === "OptiRH") nav("/optirh");                 // <— AJOUT
      }}
    />
  );
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Chargement…</div>}>
      <Routes>
        {/* public */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />

        {/* protégé */}
        <Route element={<RequireAdminAuth />}>
          <Route path="/admin" element={<OptiComAdmin />} />
          <Route path="/mesure" element={<OptiMesureAdmin />} />
          <Route path="/optirh" element={<OptiRHAdmin />} />       {/* <— AJOUT */}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
