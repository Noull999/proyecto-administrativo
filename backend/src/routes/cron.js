// En Railway esto corria como node-cron adentro del propio proceso (que
// vivia 24/7). En Vercel serverless no hay proceso de fondo persistente,
// asi que Vercel Cron llama a estas rutas por HTTP en el horario
// configurado (vercel.json). timingSafeEqual + comparacion de longitud
// primero, mismo patron ya usado en otros proyectos para evitar timing
// attacks sobre el secreto.
import { timingSafeEqual } from 'crypto';
import { Router } from 'express';
import { syncEstadoVencidas } from '../jobs/syncEstados.js';
import { runReminders } from '../jobs/reminderEmails.js';

const router = Router();

function isValidCronSecret(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers['authorization'] || '';
  const provided = header.replace(/^Bearer\s+/i, '');
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

router.get('/sync-vencidas', async (req, res) => {
  if (!isValidCronSecret(req)) return res.status(401).json({ error: 'No autorizado.' });
  try {
    const count = await syncEstadoVencidas();
    res.json({ ok: true, actualizadas: count });
  } catch (err) {
    console.error('cron sync-vencidas error:', err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

router.get('/reminders', async (req, res) => {
  if (!isValidCronSecret(req)) return res.status(401).json({ error: 'No autorizado.' });
  try {
    await runReminders();
    res.json({ ok: true });
  } catch (err) {
    console.error('cron reminders error:', err);
    res.status(500).json({ error: 'Error interno.' });
  }
});

export default router;
