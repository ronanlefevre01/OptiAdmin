import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const newLicence = req.body;

  if (!newLicence || !newLicence.opticien?.id) {
    return res.status(400).json({ error: 'Licence invalide ou incomplète' });
  }

  const filePath = path.join(process.cwd(), 'data', 'licences.json');

  // Lire le fichier existant ou créer une liste vide
  let licences = [];
  if (fs.existsSync(filePath)) {
    licences = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  // Empêcher les doublons (même opticien.id)
  const exists = licences.some(l => l.opticien?.id === newLicence.opticien.id);
  if (exists) {
    return res.status(409).json({ error: 'Licence déjà existante' });
  }

  // Ajouter la nouvelle licence et sauvegarder
  licences.push(newLicence);
  fs.writeFileSync(filePath, JSON.stringify(licences, null, 2));

  return res.status(200).json({ success: true, licence: newLicence });
}
