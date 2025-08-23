import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './HomePage';
import LoginPage from './pages/Login';
import ProtectedAdmin from './pages/ProtectedAdmin';

const OptiComAdmin = lazy(() => import('./pages/OptiComAdmin'));
const OptiMesureAdmin = lazy(() => import('./pages/OptiMesureAdmin'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 16 }}>Chargement…</div>}>
        <Routes>
          {/* Page de login accessible sans token */}
          <Route path="/login" element={<LoginPage />} />

          {/* Toute la zone admin est protégée */}
          <Route
            path="/admin/*"
            element={
              <ProtectedAdmin>
                <OptiComAdmin />
              </ProtectedAdmin>
            }
          />

          {/* OptiMesure si tu veux aussi le protéger : remets-le dans ProtectedAdmin */}
          <Route
            path="/mesure/*"
            element={<ProtectedAdmin><OptiMesureAdmin /></ProtectedAdmin>}
          />

          {/* Page publique d’essai: essai.html (hébergée telle quelle) */}

          {/* Accueil par défaut */}
          <Route path="/" element={<HomePage onSelect={() => { window.location.href = '/login'; }} />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
