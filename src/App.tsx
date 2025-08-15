import { useState, lazy, Suspense } from 'react';
import HomePage from './HomePage';

// Lazy loading des pages
const OptiComAdmin = lazy(() => import('./pages/OptiComAdmin'));
const OptiMesureAdmin = lazy(() => import('./pages/OptiMesureAdmin'));

type SelectedApp = 'OptiCOM' | 'OptiMesure' | null;

export default function App() {
  const [selectedApp, setSelectedApp] = useState<SelectedApp>(null);

  if (!selectedApp) {
    // Home: passe le setter à HomePage comme avant
    return <HomePage onSelect={setSelectedApp} />;
  }

  const goBack = () => setSelectedApp(null);

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Chargement…</div>}>
      <div style={{ padding: 12 }}>
        <button onClick={goBack} style={{ marginBottom: 12 }}>
          ← Retour
        </button>

        {selectedApp === 'OptiCOM' ? (
          <OptiComAdmin />
        ) : (
          <OptiMesureAdmin />
        )}
      </div>
    </Suspense>
  );
}
