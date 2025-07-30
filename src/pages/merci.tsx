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

      {status === 'loading' && <p style={styles.text}>Confirmation du mandat en cours...</p>}
      {status === 'success' && (
        <>
          <p style={styles.text}>✅ Votre mandat a bien été confirmé. Votre licence est maintenant active.</p>
          <a
            href="opticom://merci"
            style={styles.button}
          >
            Ouvrir l'application
          </a>
        </>
      )}
      {status === 'error' && (
        <p style={{ ...styles.text, color: 'red' }}>❌ Une erreur est survenue lors de la confirmation du mandat.</p>
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
  button: {
    display: 'inline-block',
    backgroundColor: '#00BFFF',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '16px',
  },
};
