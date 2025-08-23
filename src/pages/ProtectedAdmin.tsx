import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Props = { children: React.ReactNode };

export default function ProtectedAdmin({ children }: Props) {
  const [state, setState] = useState<'checking'|'ok'|'ko'>('checking');

  useEffect(() => {
    const token = localStorage.getItem('opti_admin_token') || '';
    if (!token) { setState('ko'); return; }
    (async () => {
      try {
        const r = await fetch(api('/admin/me'), { headers:{ Authorization: `Bearer ${token}` }});
        setState(r.ok ? 'ok' : 'ko');
      } catch { setState('ko'); }
    })();
  }, []);

  if (state === 'checking') return <div style={{padding:16}}>Vérification…</div>;
  if (state === 'ko') { window.location.href = '/login'; return null; }
  return <>{children}</>;
}
