import React, { useState } from 'react';
import HomePage from './HomePage';
import OptiComAdmin from "./pages/OptiComAdmin"
import OptiMesureAdmin from "./pages/OptiMesureAdmin"


export default function App() {
  const [selectedApp, setSelectedApp] = useState<'OptiCOM' | 'OptiMesure' | null>(null);

  if (!selectedApp) {
    return <HomePage onSelect={setSelectedApp} />;
  }

  if (selectedApp === 'OptiCOM') {
    return <OptiComAdmin />;
  }

  if (selectedApp === 'OptiMesure') {
    return <OptiMesureAdmin />;
  }

  return null;
}
