import React from 'react';

type AppKey = 'OptiCOM' | 'OptiMesure' | 'OptiRH';

const HomePage = ({ onSelect }: { onSelect: (app: AppKey) => void }) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Bienvenue dans OptiAdmin</h1>
      <p style={styles.subtitle}>Choisissez l’application à gérer :</p>

      <div style={styles.buttonContainer}>
        <button
          style={{ ...styles.button, background: '#0d6efd' }}
          onClick={() => onSelect('OptiCOM')}
        >
          🟦 Gérer OptiCOM
        </button>

        <button
          style={{ ...styles.button, background: '#198754' }}
          onClick={() => onSelect('OptiMesure')}
        >
          🟩 Gérer OptiMesure
        </button>

        <button
          style={{ ...styles.button, background: '#6f42c1' }}
          onClick={() => onSelect('OptiRH')}
        >
          🟪 Gérer OptiRH
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '50px',
    textAlign: 'center',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '32px',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '18px',
    marginBottom: '40px',
    color: '#555',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  },
  button: {
    fontSize: '18px',
    padding: '16px 28px',
    borderRadius: '12px',
    cursor: 'pointer',
    border: 'none',
    color: '#fff',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
    transition: 'transform 0.08s ease-out',
  },
};

export default HomePage;
