import prisma from './prisma.js';

export async function nextFolio(tipo) {
  const prefix = tipo === 'factura' ? 'F' : 'C';
  const last = await prisma.invoice.findFirst({
    where: { tipo },
    orderBy: { id: 'desc' },
  });
  const num = last ? parseInt(last.folio.split('-')[1]) + 1 : 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

export function computeStatus(invoice) {
  if (!invoice.payments) return invoice.estado;
  const totalPagado = invoice.payments.reduce((sum, p) => sum + p.monto, 0);
  if (totalPagado >= invoice.total && invoice.total > 0) return 'pagada';
  if (
    invoice.estado !== 'pagada' &&
    invoice.fechaVencimiento &&
    new Date(invoice.fechaVencimiento) < new Date()
  ) {
    return 'vencida';
  }
  return invoice.estado;
}

export function calcTotals(items, taxRate = 0.16) {
  const subtotal = items.reduce((sum, item) => sum + item.importe, 0);
  const impuesto = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + impuesto) * 100) / 100;
  return { subtotal, impuesto, total };
}
