import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// ID du fichier sur Google Drive (licences.json partagé)
const FILE_ID = '1CH4Sc1dCm8UcARIJ48piCS7feI77Cqch';

// Chemin vers la clé du compte de service
const KEY_PATH = path.join(__dirname, 'credentials.json');

// Charger les identifiants du compte de service
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function uploadLicence() {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });

  const filePath = path.join(__dirname, 'licences.json');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Erreur : Le fichier licences.json est introuvable.');
    return;
  }

  try {
    const fileMetadata = {
      name: 'licences.json',
    };

    const media = {
      mimeType: 'application/json',
      body: fs.createReadStream(filePath),
    };

    const updateResponse = await drive.files.update({
      fileId: FILE_ID,
      media: media,
      requestBody: fileMetadata,
    });

    console.log('✅ Fichier mis à jour avec succès :', updateResponse.data.name);
  } catch (error) {
    console.error('❌ Erreur :', error.message);
  }
}

uploadLicence();
