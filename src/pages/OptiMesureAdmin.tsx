import React, { useEffect, useState } from 'react';
import LicenceEditor from '../LicenceEditor';
import type { Licence } from '../types'; // ✅ utilise le type partagé (SelectedApp compris)

const App: React.FC = () => {
  const [licences, setLicences] = useState<Licence[]>([]);
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('licences');
    if (stored) {
      try {
        setLicences(JSON.parse(stored) as Licence[]);
      } catch {
        setLicences([]);
      }
    } else {
      fetch('/licences.json', { cache: 'no-store' })
        .then(res => res.json())
        .then((data: Licence[]) => {
          const list = Array.isArray(data) ? data : [];
          setLicences(list);
          localStorage.setItem('licences', JSON.stringify(list));
        })
        .catch(err => console.error('Erreur chargement licences.json', err));
    }
  }, []);

  const handleEdit = (index: number) => setEditing(index);

  const handleDelete = (index: number) => {
    if (!confirm('Supprimer cette licence ?')) return;
    const next = licences.filter((_, i) => i !== index);
    setLicences(next);
    localStorage.setItem('licences', JSON.stringify(next));
    setEditing(null);
  };

  const handleSave = (licence: Licence) => {
    const next = [...licences];
    if (editing !== null) next[editing] = licence;
    else next.push(licence);
    setLicences(next);
    localStorage.setItem('licences', JSON.stringify(next));
    setEditing(null);
  };

  const handleNew = () => setEditing(null);

  const downloadJson = () => {
    const json = JSON.stringify(licences, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'licences.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', gap: '40px', fontFamily: 'sans-serif', padding: '40px' }}>
      {/* Partie gauche - interface principale */}
      <div style={{ flex: 1, maxWidth: 800 }}>
        <h1>OptiAdmin</h1>
        <button onClick={handleNew}>➕ Nouvelle licence</button>{' '}
        <button onClick={downloadJson}>📥 Exporter JSON</button>
        <hr />
        {editing !== null ? (
          <LicenceEditor
            licence={licences[editing]}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <LicenceEditor onSave={handleSave} />
        )}
        <hr />
        <h2>Licences enregistrées</h2>
        <ul>
          {licences.map((lic, index) => (
            <li key={index} style={{ marginBottom: 10 }}>
              <strong>{lic.nom}</strong> – {lic.licenceId} ({lic.selectedApp}) – jusqu'au{' '}
              {lic.valideJusqu}
              <br />
              <button onClick={() => handleEdit(index)}>✏️ Modifier</button>{' '}
              <button onClick={() => handleDelete(index)}>🗑️ Supprimer</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Partie droite - aide */}
      <div
        style={{
          flex: 1,
          background: '#f8f9fa',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>📋 Marche à suivre</h3>
        <ol style={{ paddingLeft: '20px' }}>
          <li>Remplir le formulaire de licence</li>
          <li>
            Cliquer sur <strong>"Télécharger dossier .zip"</strong>
          </li>
          <li>
            Extraire le fichier <code>licences.json</code>
          </li>
          <li>
            Remplacer <code>public/licences.json</code> dans ton dossier local
          </li>
          <li>
            Ouvrir <strong>Git Bash</strong> dans ce dossier
          </li>
          <li>Exécuter les commandes suivantes :</li>
        </ol>

        <pre
          style={{
            background: '#eee',
            padding: '10px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
          }}
        >
{`git add public/licences.json
git commit -m "Mise à jour des licences"
git push origin main`}
        </pre>

        <button
          onClick={() => {
            const commands =
              `git add public/licences.json\n` +
              `git commit -m "Mise à jour des licences"\n` +
              `git push origin main`;
            navigator.clipboard
              .writeText(commands)
              .then(() => alert('✅ Commandes Git copiées dans le presse-papiers'))
              .catch(() => alert('❌ Échec de la copie dans le presse-papiers'));
          }}
          style={{ marginBottom: '15px', marginTop: '5px', padding: '10px 15px' }}
        >
          📋 Copier la commande Git
        </button>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() =>
              alert('📁 Ouvre manuellement ce dossier :\nC:\\\\Users\\\\TonNom\\\\Documents\\\\OptiAdmin\\\\public')
            }
            style={{ marginBottom: '10px', padding: '10px 15px' }}
          >
            📂 Ouvrir dossier licences.json
          </button>
          <br />
          <button
            onClick={() =>
              alert('💻 Ouvre Git Bash et colle cette commande :\ncd "C:/Users/TonNom/Documents/OptiAdmin"')
            }
            style={{ padding: '10px 15px' }}
          >
            💻 Ouvrir Git Bash dans le bon dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
