// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLoginPage from './pages/AdminLoginPage';
import OptiComAdmin from './pages/OptiComAdmin';
import OptiMesureAdmin from './pages/OptiMesureAdmin';

// Garde très simple basée sur le token côté client
function isLoggedIn() {
  return !!localStorage.getItem('ADMIN_JWT');
}

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;

export default function App() {
  return (
    <Routes>
      {/* page d’accueil → connexion */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* publique */}
      <Route path="/login" element={<AdminLoginPage />} />

      {/* zones protégées */}
      <Route
        path="/admin/*"
        element={
          <RequireAdmin>
            <OptiComAdmin />
          </RequireAdmin>
        }
      />
      <Route
        path="/mesure/*"
        element={
          <RequireAdmin>
            <OptiMesureAdmin />
          </RequireAdmin>
        }
      />

      {/* catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
