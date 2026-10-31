import admin from 'firebase-admin';
import { timingSafeEqual } from 'node:crypto';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function getAdminApp() {
  if (admin.apps.length > 0) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Falta FIREBASE_SERVICE_ACCOUNT en las variables de entorno de Vercel.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no contiene JSON válido.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.app();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  try {
    const { code, role, playerId } = req.body || {};
    const app = getAdminApp();
    const expectedAdmin = process.env.ADMIN_CODE;
    const expectedPlayer = process.env.PLAYER_CODE;

    if (role === 'admin') {
      if (!safeEqual(code, expectedAdmin)) {
        return res.status(401).json({ error: 'Código de organizador incorrecto.' });
      }

      const token = await admin.auth(app).createCustomToken('mahanaim-organizer', {
        role: 'admin',
      });
      return res.status(200).json({ token });
    }

    if (role === 'player') {
      if (!safeEqual(code, expectedPlayer)) {
        return res.status(401).json({ error: 'Código de jugador incorrecto.' });
      }

      if (typeof playerId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(playerId)) {
        return res.status(400).json({ error: 'Jugador no válido.' });
      }

      const roster = await admin.firestore(app).doc('public/mahanaim-roster').get();
      const players = roster.exists && Array.isArray(roster.data()?.players)
        ? roster.data().players
        : [];

      if (!players.some((player) => player && player.id === playerId)) {
        return res.status(404).json({ error: 'Ese jugador no está en el listado publicado.' });
      }

      const token = await admin.auth(app).createCustomToken(`player_${playerId}`, {
        role: 'player',
        playerId,
      });
      return res.status(200).json({ token });
    }

    return res.status(400).json({ error: 'Tipo de acceso no válido.' });
  } catch (error) {
    console.error('Mahanaim auth error:', error);
    return res.status(500).json({
      error: error?.message || 'Error interno al validar el código.',
    });
  }
}
