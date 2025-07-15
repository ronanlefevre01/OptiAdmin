import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import cors from 'cors';


const app = express();
app.use(cors());
const port = 3001;

// Répertoire de destination des licences
const licencesFolder = path.join(__dirname, 'licences');
if (!fs.existsSync(licencesFolder)) fs.mkdirSync(licencesFolder);

// Multer pour gérer l'upload du zip
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload-licence', upload.single('zip'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Aucun fichier reçu.');
    }

    const zip = await JSZip.loadAsync(req.file.buffer);

    // Lire licence.json pour récupérer licenceId
    const licenceJson = await zip.file('licence.json')?.async('string');
    if (!licenceJson) {
      return res.status(400).send('Fichier licence.json manquant dans le zip.');
    }

    const licenceData = JSON.parse(licenceJson);
    const licenceId = licenceData.licenceId || 'opticien';

    // Créer un sous-dossier pour cette licence
    const licencePath = path.join(licencesFolder, licenceId);
    if (!fs.existsSync(licencePath)) fs.mkdirSync(licencePath);

    // Extraire tous les fichiers
    await Promise.all(
      Object.keys(zip.files).map(async (filename) => {
        const file = zip.file(filename);
        if (file) {
          const content = await file.async('nodebuffer');
          fs.writeFileSync(path.join(licencePath, filename), content);
        }
      })
    );

    res.send(`✅ Licence ${licenceId} reçue et enregistrée.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Erreur lors du traitement du fichier.');
  }
});

app.listen(port, () => {
  console.log(`🚀 Serveur en écoute sur http://localhost:${port}`);
});
