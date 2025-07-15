import { google } from 'googleapis';
import { readFile } from 'fs/promises';
import path from 'path';

const SERVICE_ACCOUNT_KEY_FILE = path.join(__dirname, 'service-account-key.json');
const FILE_ID = '1CH4Sc1dCm8UcARIJ48piCS7feI77Cqch'; // <-- ID correct du fichier licences.json

async function updateLicenceFile() {
  try {
    // Authentification avec le compte de service
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Lecture du contenu local du fichier licences.json
    const filePath = path.join(__dirname, 'licences.json');
    const fileContent = await readFile(filePath, 'utf8');

    // Mise à jour du fichier sur Drive
    await drive.files.update({
      fileId: FILE_ID,
      media: {
        mimeType: 'application/json',
        body: fileContent,
      },
    });

    console.log('✅ Fichier "licences.json" mis à jour avec succès sur Google Drive.');
  } catch (error: any) {
    console.error('❌ Erreur :', error.message || error);
  }
}

updateLicenceFile();
