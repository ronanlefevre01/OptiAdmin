// uploadServer.ts
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());

const FILE_ID = '1CH4Sc1dCm8UcARIJ48piCS7feI77Cqch';
const KEYFILEPATH = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

app.post('/api/upload', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });

    const drive = google.drive({ version: 'v3', auth });

    const filePath = path.join(__dirname, 'licences.json');
    const media = {
      mimeType: 'application/json',
      body: fs.createReadStream(filePath),
    };

    const result = await drive.files.update({
      fileId: FILE_ID,
      media,
    });

    res.json({ success: true, fileId: result.data.id });
  } catch (error) {
    console.error('Erreur lors de la mise à jour :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur d’upload démarré sur http://localhost:${PORT}`);
});
