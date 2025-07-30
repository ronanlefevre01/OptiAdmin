// pages/validation-mandat.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ValidationMandat() {
  const router = useRouter()
  const { redirect_flow_id } = router.query

  useEffect(() => {
    if (redirect_flow_id) {
      fetch('https://opticom-sms-server.onrender.com/confirm-mandat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_flow_id }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            router.push('/merci')
          } else {
            alert('❌ Erreur confirmation mandat')
            router.push('/')
          }
        })
        .catch(() => {
          alert('❌ Erreur réseau')
          router.push('/')
        })
    }
  }, [redirect_flow_id])

  return <p style={{ padding: 40, fontSize: 18 }}>Validation du mandat en cours...</p>
}
