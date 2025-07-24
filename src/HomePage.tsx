import React from 'react';

const HomePage = ({ onSelect }: { onSelect: (app: 'OptiCOM' | 'OptiMesure') => void }) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Bienvenue dans OptiAdmin</h1>
      <p style={styles.subtitle}>Choisissez l’application à gérer :</p>

      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={() => onSelect('OptiCOM')}>
          🟦 Gérer OptiCOM
        </button>
        <button style={styles.button} onClick={() => onSelect('OptiMesure')}>
          🟩 Gérer OptiMesure
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
    gap: '40px',
  },
  button: {
    fontSize: '18px',
    padding: '20px 40px',
    borderRadius: '10px',
    cursor: 'pointer',
    border: 'none',
    color: '#fff',
    background: '#007bff',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    transition: 'background 0.3s',
  },
};

export default HomePage;
