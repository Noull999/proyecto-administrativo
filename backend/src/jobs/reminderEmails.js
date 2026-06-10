import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { sendReminderEmail } from '../lib/email.js';
import { syncEstadoVencidas } from './syncEstados.js';

const REMINDER_DAYS = Number(process.env.REMINDER_DAYS) || 3;

async function runReminders() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + REMINDER_DAYS);

  // Facturas enviadas que vencen en los próximos REMINDER_DAYS días
  const proximas = await prisma.invoice.findMany({
    where: {
      estado: 'enviada',
      fechaVencimiento: { gte: hoy, lte: limite },
    },
    include: { client: true, workspace: true },
  });

  // Facturas vencidas (estado ya actualizado por syncEstadoVencidas)
  const vencidas = await prisma.invoice.findMany({
    where: { estado: 'vencida' },
    include: { client: true, workspace: true },
  });

  const todas = [
    ...proximas.map((inv) => ({ inv, diasRestantes: Math.ceil((new Date(inv.fechaVencimiento) - hoy) / 86400000) })),
    ...vencidas.map((inv) => ({ inv, diasRestantes: Math.ceil((new Date(inv.fechaVencimiento) - hoy) / 86400000) })),
  ];

  if (todas.length === 0) return;

  // Agrupar por workspace para buscar destinatarios una sola vez
  const byWorkspace = new Map();
  for (const { inv, diasRestantes } of todas) {
    if (!byWorkspace.has(inv.workspaceId)) byWorkspace.set(inv.workspaceId, []);
    byWorkspace.get(inv.workspaceId).push({ inv, diasRestantes });
  }

  for (const [workspaceId, items] of byWorkspace) {
    const usuarios = await prisma.user.findMany({
      where: { workspaceId, role: { in: ['ADMIN', 'CONTABLE'] }, activo: true },
      select: { email: true },
    });
    const recipients = usuarios.map((u) => u.email).filter(Boolean);
    if (recipients.length === 0) continue;

    for (const { inv, diasRestantes } of items) {
      try {
        await sendReminderEmail({ invoice: inv, recipients, diasRestantes });
      } catch (err) {
        console.error(`Reminder email error (factura ${inv.folio}):`, err.message);
      }
    }
  }

  console.log(`Recordatorios enviados: ${todas.length} factura(s)`);
}

export function startCronJobs() {
  // Sincronizar estados vencidos todos los días a las 7:00 AM
  cron.schedule('0 7 * * *', async () => {
    console.log('Cron: sincronizando estados vencidos...');
    await syncEstadoVencidas();
  });

  // Enviar recordatorios todos los días a las 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Cron: enviando recordatorios de facturas...');
    await runReminders();
  });

  console.log('Cron jobs iniciados (sync vencidas 7am, recordatorios 8am)');
}
