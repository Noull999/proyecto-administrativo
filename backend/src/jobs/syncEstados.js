import prisma from '../lib/prisma.js';

/**
 * Marca como "vencida" todas las facturas cuya fechaVencimiento ya pasó
 * y cuyo estado aún es borrador o enviada.
 * Se llama al iniciar el servidor y diariamente en el cron.
 */
export async function syncEstadoVencidas() {
  const result = await prisma.invoice.updateMany({
    where: {
      estado: { in: ['borrador', 'enviada'] },
      fechaVencimiento: { lt: new Date() },
    },
    data: { estado: 'vencida' },
  });
  if (result.count > 0) {
    console.log(`syncEstadoVencidas: ${result.count} factura(s) marcada(s) como vencidas`);
  }
  return result.count;
}
