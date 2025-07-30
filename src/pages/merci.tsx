import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function MerciPage() {
  const router = useRouter();
  const { redirect_flow_id } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const confirmerMandat = async () => {
      if (!redirect_flow_id) return;

      try {
        const res = await fetch('https://opticom-sms-server.onrender.com/confirm-mandat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirect_flow_id }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus('success');

          // Redirection automatique après 3 secondes
          setTimeout(() => {
            window.location.href = 'opticom://merci';
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };

    confirmerMandat();
  }, [redirect_flow_id]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎉 Merci pour votre inscription</h1>

      {status === 'loading' && (
        <p style={styles.text}>Confirmation du mandat en cours...</p>
      )}

      {status === 'success' && (
        <>
          <p style={styles.text}>
            ✅ Votre mandat a bien été confirmé. Redirection vers l’application en cours...
          </p>
          <p style={{ fontSize: 14, opacity: 0.6 }}>
            Si rien ne se passe, <a href="opticom://merci" style={{ color: '#00BFFF' }}>cliquez ici</a>.
          </p>
        </>
      )}

      {status === 'error' && (
        <p style={{ ...styles.text, color: 'red' }}>
          ❌ Une erreur est survenue lors de la confirmation du mandat.
        </p>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000',
    color: '#fff',
    padding: '40px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    marginBottom: '30px',
    color: '#00BFFF',
  },
  text: {
    fontSize: '18px',
    marginBottom: '20px',
  },
};
