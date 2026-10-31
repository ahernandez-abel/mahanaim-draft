import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { timingSafeEqual } from 'node:crypto';

function safeEqual(value, expected) {
  if (typeof value !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(value, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function getAdminApp() {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || typeof raw !== 'string') {
    throw new Error('Falta FIREBASE_SERVICE_ACCOUNT en las variables de entorno de Vercel.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no contiene JSON válido. Pega el JSON completo, incluyendo las llaves inicial y final.');
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no contiene project_id, client_email o private_key.');
  }

  // Acepta tanto saltos de línea JSON normales como \n escapados.
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  try {
    const { code, role, playerId } = req.body || {};
    const app = getAdminApp();
    const auth = getAuth(app);
    const expectedAdmin = process.env.ADMIN_CODE;
    const expectedPlayer = process.env.PLAYER_CODE;

    if (!expectedAdmin || !expectedPlayer) {
      throw new Error('Faltan ADMIN_CODE o PLAYER_CODE en las variables de entorno de Vercel.');
    }

    if (role === 'admin') {
      if (!safeEqual(code, expectedAdmin)) {
        return res.status(401).json({ error: 'Código de organizador incorrecto.' });
      }

      const token = await auth.createCustomToken('mahanaim-organizer', { role: 'admin' });
      return res.status(200).json({ token });
    }

    if (role === 'player') {
      if (!safeEqual(code, expectedPlayer)) {
        return res.status(401).json({ error: 'Código de jugador incorrecto.' });
      }

      if (typeof playerId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(playerId)) {
        return res.status(400).json({ error: 'Jugador no válido.' });
      }

      const roster = await getFirestore(app).doc('public/mahanaim-roster').get();
      const rosterData = roster.exists ? roster.data() : null;
      const players = Array.isArray(rosterData?.players) ? rosterData.players : [];

      if (!players.some((player) => player && player.id === playerId)) {
        return res.status(404).json({ error: 'Ese jugador no está en el listado publicado.' });
      }

      const token = await auth.createCustomToken(`player_${playerId}`, {
        role: 'player',
        playerId,
      });
      return res.status(200).json({ token });
    }

    return res.status(400).json({ error: 'Tipo de acceso no válido.' });
  } catch (error) {
    // No registrar secretos ni el contenido de las variables de entorno.
    console.error('Mahanaim auth error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Error interno al validar el código.' });
  }
}
