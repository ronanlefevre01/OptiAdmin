import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// JSONBin (optionnel) pour stocker les demandes
const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
const JSONBIN_MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const JSONBIN_TRIAL_BIN_ID = process.env.JSONBIN_TRIAL_BIN_ID;

function setCors(res: VercelResponse, origin: string) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || '');
  setCors(res, origin);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { storeName, siret, phone, email, alias, source } = (req.body || {}) as Record<string,string>;
    if (!storeName || !siret || !phone || !email || !alias) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const record = {
      id: `${Date.now()}-${Math.random().toString
