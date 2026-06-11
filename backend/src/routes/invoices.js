import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../lib/audit.js';
import { parsePagination, paginatedResponse } from '../lib/pagination.js';
import { nextFolio, computeStatus, calcTotals } from '../lib/invoiceHelpers.js';
import { buildPdfBuffer } from '../lib/pdfBuilder.js';
import { sendInvoiceEmail } from '../lib/email.js';

const router = Router();
router.use(requireAuth);

const TAX_RATE = 0.16;

const includeAll = {
  client: true,
  items: { include: { product: true } },
  payments: { orderBy: { fecha: 'asc' } },
};

// GET /api/invoices?tipo=&estado=&clientId=&search=&page=&limit=
router.get('/', async (req, res) => {
  const { tipo, estado, clientId, search } = req.query;

  const where = { workspaceId: req.workspaceId };
  if (tipo) where.tipo = tipo;
  if (estado) where.estado = estado;
  if (clientId) where.clientId = Number(clientId);
  if (search) where.folio = { contains: search, mode: 'insensitive' };

  const { skip, take, page, limit } = parsePagination(req.query);

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true, payments: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.invoice.count({ where }),
  ]);

  const data = invoices.map((inv) => ({ ...inv, estadoReal: computeStatus(inv) }));
  res.json(paginatedResponse(data, total, page, limit));
});

// GET /api/invoices/stats
router.get('/stats', async (req, res) => {
  const all = await prisma.invoice.findMany({
    where: { workspaceId: req.workspaceId },
    include: { payments: true },
  });

  const stats = { borrador: 0, enviada: 0, pagada: 0, vencida: 0 };
  let montoPagado = 0;
  let montoPendiente = 0;
  let montoVencido = 0;

  for (const inv of all) {
    const estado = computeStatus(inv);
    stats[estado] = (stats[estado] ?? 0) + 1;
    if (estado === 'pagada') montoPagado += inv.total;
    else if (estado === 'vencida') montoVencido += inv.total;
    else montoPendiente += inv.total;
  }

  const recientes = await prisma.invoice.findMany({
    where: { workspaceId: req.workspaceId },
    include: { client: true, payments: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  res.json({
    conteo: stats,
    total: all.length,
    montoPagado,
    montoPendiente,
    montoVencido,
    recientes: recientes.map((inv) => ({ ...inv, estadoReal: computeStatus(inv) })),
  });
});

// GET /api/invoices/export?formato=csv
router.get('/export', async (req, res) => {
  const { tipo, estado } = req.query;

  const where = { workspaceId: req.workspaceId };
  if (tipo) where.tipo = tipo;
  if (estado) where.estado = estado;

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });

  const rows = invoices.map((inv) => {
    const estadoReal = computeStatus(inv);
    const totalPagado = inv.payments.reduce((s, p) => s + p.monto, 0);
    const fecha = new Date(inv.fecha).toLocaleDateString('es-MX');
    const venc = inv.fechaVencimiento ? new Date(inv.fechaVencimiento).toLocaleDateString('es-MX') : '';
    return [
      inv.folio,
      inv.tipo,
      inv.client?.nombre ?? '',
      inv.client?.rfc ?? '',
      fecha,
      venc,
      estadoReal,
      inv.subtotal.toFixed(2),
      inv.impuesto.toFixed(2),
      inv.total.toFixed(2),
      totalPagado.toFixed(2),
      (inv.total - totalPagado).toFixed(2),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const header = [
    'Folio', 'Tipo', 'Cliente', 'RFC Cliente',
    'Fecha', 'Vencimiento', 'Estado',
    'Subtotal', 'IVA', 'Total', 'Pagado', 'Saldo',
  ].map((v) => `"${v}"`).join(',');

  const csv = [header, ...rows].join('\r\n');
  const fecha = new Date().toISOString().split('T')[0];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="facturas-${fecha}.csv"`);
  res.send('﻿' + csv); // BOM para compatibilidad con Excel
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
    include: includeAll,
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json({ ...invoice, estadoReal: computeStatus(invoice) });
});

// POST /api/invoices
router.post('/', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const { clientId, tipo = 'cotizacion', fechaVencimiento, notas, items = [] } = req.body;

  if (!clientId) return res.status(400).json({ error: 'El cliente es requerido' });
  if (items.length === 0) return res.status(400).json({ error: 'Agrega al menos una línea' });

  const clientOk = await prisma.client.findFirst({
    where: { id: Number(clientId), workspaceId: req.workspaceId },
    select: { id: true },
  });
  if (!clientOk) return res.status(400).json({ error: 'Cliente inválido' });

  const parsedItems = items.map((item) => ({
    productId: item.productId ? Number(item.productId) : null,
    descripcion: item.descripcion,
    cantidad: Number(item.cantidad),
    precioUnitario: Number(item.precioUnitario),
    importe: Math.round(Number(item.cantidad) * Number(item.precioUnitario) * 100) / 100,
  }));

  const { subtotal, impuesto, total } = calcTotals(parsedItems, TAX_RATE);
  const folio = await nextFolio(tipo, req.workspaceId);

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: req.workspaceId,
      clientId: Number(clientId),
      tipo,
      folio,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      notas: notas?.slice(0, 1000),
      subtotal,
      impuesto,
      total,
      items: { create: parsedItems },
    },
    include: includeAll,
  });

  await logAudit(req, { accion: 'CREATE', entidad: 'Invoice', entidadId: invoice.id });
  res.status(201).json({ ...invoice, estadoReal: computeStatus(invoice) });
});

// PUT /api/invoices/:id
router.put('/:id', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const existing = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
    include: { payments: true },
  });
  if (!existing) return res.status(404).json({ error: 'Factura no encontrada' });
  if (computeStatus(existing) === 'pagada') {
    return res.status(400).json({ error: 'No se puede editar una factura pagada' });
  }

  const { clientId, fechaVencimiento, notas, items = [] } = req.body;
  if (items.length === 0) return res.status(400).json({ error: 'Agrega al menos una línea' });

  const clientOk = await prisma.client.findFirst({
    where: { id: Number(clientId), workspaceId: req.workspaceId },
    select: { id: true },
  });
  if (!clientOk) return res.status(400).json({ error: 'Cliente inválido' });

  const parsedItems = items.map((item) => ({
    productId: item.productId ? Number(item.productId) : null,
    descripcion: item.descripcion,
    cantidad: Number(item.cantidad),
    precioUnitario: Number(item.precioUnitario),
    importe: Math.round(Number(item.cantidad) * Number(item.precioUnitario) * 100) / 100,
  }));

  const { subtotal, impuesto, total } = calcTotals(parsedItems, TAX_RATE);

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: Number(req.params.id) } });

  const invoice = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: {
      clientId: Number(clientId),
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      notas: notas?.slice(0, 1000),
      subtotal,
      impuesto,
      total,
      items: { create: parsedItems },
    },
    include: includeAll,
  });

  await logAudit(req, { accion: 'UPDATE', entidad: 'Invoice', entidadId: invoice.id });
  res.json({ ...invoice, estadoReal: computeStatus(invoice) });
});

// DELETE /api/invoices/:id  (solo borradores)
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  if (invoice.estado !== 'borrador') {
    return res.status(400).json({ error: 'Solo se pueden eliminar facturas en borrador' });
  }

  await prisma.invoice.delete({ where: { id: Number(req.params.id) } });
  await logAudit(req, { accion: 'DELETE', entidad: 'Invoice', entidadId: Number(req.params.id) });
  res.json({ ok: true });
});

// POST /api/invoices/:id/send — cambia estado a enviada y manda email al cliente
router.post('/:id/send', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  if (invoice.estado !== 'borrador') {
    return res.status(400).json({ error: 'Solo se pueden enviar facturas en borrador' });
  }

  const updated = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: { estado: 'enviada' },
    include: { ...includeAll, workspace: true },
  });
  await logAudit(req, { accion: 'UPDATE', entidad: 'Invoice', entidadId: invoice.id, detalle: { estado: 'enviada' } });

  // Enviar email con PDF adjunto (falla silenciosamente si SMTP no está configurado)
  try {
    const pdfBuffer = await buildPdfBuffer(updated);
    await sendInvoiceEmail({ invoice: updated, pdfBuffer });
  } catch (err) {
    console.error('Error al enviar email de factura:', err.message);
  }

  res.json({ ...updated, estadoReal: computeStatus(updated) });
});

// POST /api/invoices/:id/convert
router.post('/:id/convert', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!invoice) return res.status(404).json({ error: 'Cotización no encontrada' });
  if (invoice.tipo !== 'cotizacion') {
    return res.status(400).json({ error: 'Solo se pueden convertir cotizaciones' });
  }

  const newFolio = await nextFolio('factura', req.workspaceId);

  const updated = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: { tipo: 'factura', folio: newFolio, estado: 'enviada' },
    include: includeAll,
  });
  await logAudit(req, { accion: 'UPDATE', entidad: 'Invoice', entidadId: invoice.id, detalle: { convertida: true, nuevoFolio: newFolio } });
  res.json({ ...updated, estadoReal: computeStatus(updated) });
});

// POST /api/invoices/:id/payments
router.post('/:id/payments', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const { monto, metodo, referencia, fecha } = req.body;

  if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo' });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
    include: { payments: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  if (computeStatus(invoice) === 'pagada') {
    return res.status(400).json({ error: 'La factura ya está pagada' });
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: Number(req.params.id),
      monto: Number(monto),
      metodo: metodo || null,
      referencia: referencia?.slice(0, 200) || null,
      fecha: fecha ? new Date(fecha) : new Date(),
    },
  });

  const updated = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
    include: includeAll,
  });

  const estadoReal = computeStatus(updated);

  if (estadoReal === 'pagada' && updated.estado !== 'pagada') {
    await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { estado: 'pagada' },
    });
  }

  await logAudit(req, { accion: 'CREATE', entidad: 'Payment', entidadId: payment.id, detalle: { monto: payment.monto } });
  res.status(201).json({ ...updated, estadoReal });
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
    include: { client: true, items: true, payments: true, workspace: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  const pdfBuffer = await buildPdfBuffer(invoice);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.folio}.pdf"`);
  res.send(pdfBuffer);
});

export default router;
