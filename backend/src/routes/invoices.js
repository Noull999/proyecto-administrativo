import { Router } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { nextFolio, computeStatus, calcTotals } from '../lib/invoiceHelpers.js';

const router = Router();
router.use(requireAuth);

const includeAll = {
  client: true,
  items: { include: { product: true } },
  payments: { orderBy: { fecha: 'asc' } },
};

// GET /api/invoices?tipo=&estado=&clientId=&search=
router.get('/', async (req, res) => {
  const { tipo, estado, clientId, search } = req.query;

  const where = {};
  if (tipo) where.tipo = tipo;
  if (clientId) where.clientId = Number(clientId);
  if (search) where.folio = { contains: search };

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: true, payments: true },
    orderBy: { createdAt: 'desc' },
  });

  const result = invoices
    .map((inv) => ({ ...inv, estadoReal: computeStatus(inv) }))
    .filter((inv) => !estado || inv.estadoReal === estado);

  res.json(result);
});

// GET /api/invoices/stats
router.get('/stats', async (req, res) => {
  const all = await prisma.invoice.findMany({ include: { payments: true } });

  const stats = { borrador: 0, enviada: 0, pagada: 0, vencida: 0 };
  let montoPagado = 0;
  let montoPendiente = 0;
  let montoVencido = 0;

  for (const inv of all) {
    const estado = computeStatus(inv);
    stats[estado] = (stats[estado] ?? 0) + 1;
    if (estado === 'pagada') montoPagado += inv.total;
    if (estado === 'enviada') montoPendiente += inv.total;
    if (estado === 'vencida') montoVencido += inv.total;
  }

  const recientes = await prisma.invoice.findMany({
    include: { client: true, payments: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  res.json({
    conteo: stats,
    total: all.length,
    montoPagado: Math.round(montoPagado * 100) / 100,
    montoPendiente: Math.round(montoPendiente * 100) / 100,
    montoVencido: Math.round(montoVencido * 100) / 100,
    recientes: recientes.map((inv) => ({ ...inv, estadoReal: computeStatus(inv) })),
  });
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: Number(req.params.id) },
    include: includeAll,
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json({ ...invoice, estadoReal: computeStatus(invoice) });
});

// POST /api/invoices
router.post('/', async (req, res) => {
  const { clientId, tipo = 'cotizacion', fechaVencimiento, notas, items = [], taxRate = 0.16 } = req.body;

  if (!clientId) return res.status(400).json({ error: 'El cliente es requerido' });
  if (items.length === 0) return res.status(400).json({ error: 'Agrega al menos una línea' });

  const parsedItems = items.map((item) => ({
    productId: item.productId || null,
    descripcion: item.descripcion,
    cantidad: Number(item.cantidad),
    precioUnitario: Number(item.precioUnitario),
    importe: Math.round(Number(item.cantidad) * Number(item.precioUnitario) * 100) / 100,
  }));

  const { subtotal, impuesto, total } = calcTotals(parsedItems, taxRate);
  const folio = await nextFolio(tipo);

  const invoice = await prisma.invoice.create({
    data: {
      clientId: Number(clientId),
      tipo,
      folio,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      notas,
      subtotal,
      impuesto,
      total,
      items: { create: parsedItems },
    },
    include: includeAll,
  });

  res.status(201).json({ ...invoice, estadoReal: computeStatus(invoice) });
});

// PUT /api/invoices/:id
router.put('/:id', async (req, res) => {
  const existing = await prisma.invoice.findUnique({
    where: { id: Number(req.params.id) },
    include: { payments: true },
  });
  if (!existing) return res.status(404).json({ error: 'Factura no encontrada' });
  if (computeStatus(existing) === 'pagada') {
    return res.status(400).json({ error: 'No se puede editar una factura pagada' });
  }

  const { clientId, fechaVencimiento, notas, items = [], taxRate = 0.16 } = req.body;
  if (items.length === 0) return res.status(400).json({ error: 'Agrega al menos una línea' });

  const parsedItems = items.map((item) => ({
    productId: item.productId || null,
    descripcion: item.descripcion,
    cantidad: Number(item.cantidad),
    precioUnitario: Number(item.precioUnitario),
    importe: Math.round(Number(item.cantidad) * Number(item.precioUnitario) * 100) / 100,
  }));

  const { subtotal, impuesto, total } = calcTotals(parsedItems, taxRate);

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: Number(req.params.id) } });

  const invoice = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: {
      clientId: Number(clientId),
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      notas,
      subtotal,
      impuesto,
      total,
      items: { create: parsedItems },
    },
    include: includeAll,
  });

  res.json({ ...invoice, estadoReal: computeStatus(invoice) });
});

// POST /api/invoices/:id/send  →  borrador → enviada
router.post('/:id/send', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: Number(req.params.id) } });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  if (invoice.estado !== 'borrador') {
    return res.status(400).json({ error: 'Solo se pueden enviar facturas en borrador' });
  }

  const updated = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: { estado: 'enviada' },
    include: includeAll,
  });
  res.json({ ...updated, estadoReal: computeStatus(updated) });
});

// POST /api/invoices/:id/convert  →  cotizacion → factura
router.post('/:id/convert', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: Number(req.params.id) } });
  if (!invoice) return res.status(404).json({ error: 'Cotización no encontrada' });
  if (invoice.tipo !== 'cotizacion') {
    return res.status(400).json({ error: 'Solo se pueden convertir cotizaciones' });
  }

  const newFolio = await nextFolio('factura');

  const updated = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: { tipo: 'factura', folio: newFolio, estado: 'enviada' },
    include: includeAll,
  });
  res.json({ ...updated, estadoReal: computeStatus(updated) });
});

// POST /api/invoices/:id/payments
router.post('/:id/payments', async (req, res) => {
  const { monto, metodo, referencia, fecha } = req.body;

  if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo' });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: Number(req.params.id) },
    include: { payments: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  if (computeStatus(invoice) === 'pagada') {
    return res.status(400).json({ error: 'La factura ya está pagada' });
  }

  await prisma.payment.create({
    data: {
      invoiceId: Number(req.params.id),
      monto: Number(monto),
      metodo: metodo || null,
      referencia: referencia || null,
      fecha: fecha ? new Date(fecha) : new Date(),
    },
  });

  const updated = await prisma.invoice.findUnique({
    where: { id: Number(req.params.id) },
    include: includeAll,
  });

  const estadoReal = computeStatus(updated);

  if (estadoReal === 'pagada' && updated.estado !== 'pagada') {
    await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { estado: 'pagada' },
    });
  }

  res.status(201).json({ ...updated, estadoReal });
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: Number(req.params.id) },
    include: { client: true, items: true, payments: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  const estadoReal = computeStatus(invoice);
  const totalPagado = invoice.payments.reduce((s, p) => s + p.monto, 0);
  const tipo = invoice.tipo === 'factura' ? 'FACTURA' : 'COTIZACIÓN';
  const fmtMXN = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const filename = `${invoice.folio}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // ── Encabezado empresa ────────────────────────────────────────────────
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text('Servicios Asencio', 50, 50);
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text('servicios@asencio.com  |  +52 55 0000-0000', 50, 75);

  // Tipo + folio (derecha)
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e293b')
    .text(tipo, 400, 50, { width: 160, align: 'right' });
  doc.fontSize(12).font('Helvetica').fillColor('#374151')
    .text(invoice.folio, 400, 78, { width: 160, align: 'right' });

  // Línea separadora
  doc.moveTo(50, 100).lineTo(562, 100).strokeColor('#e5e7eb').lineWidth(1).stroke();

  // ── Info cliente / fechas ─────────────────────────────────────────────
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('CLIENTE', 50, 115);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(invoice.client?.nombre ?? '—', 50, 128);
  if (invoice.client?.rfc) doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`RFC: ${invoice.client.rfc}`, 50, 143);
  if (invoice.client?.email) doc.fontSize(9).font('Helvetica').fillColor('#374151').text(invoice.client.email, 50, 155);

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('FECHA EMISIÓN', 400, 115, { width: 160, align: 'right' });
  doc.fontSize(10).font('Helvetica').fillColor('#374151').text(fmtDate(invoice.fecha), 400, 128, { width: 160, align: 'right' });
  if (invoice.fechaVencimiento) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('VENCIMIENTO', 400, 145, { width: 160, align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#374151').text(fmtDate(invoice.fechaVencimiento), 400, 157, { width: 160, align: 'right' });
  }

  // ── Tabla de conceptos ────────────────────────────────────────────────
  let y = 195;
  doc.rect(50, y, 512, 18).fill('#1e293b');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('DESCRIPCIÓN', 56, y + 5);
  doc.text('CANT.', 330, y + 5, { width: 50, align: 'right' });
  doc.text('PRECIO UNIT.', 385, y + 5, { width: 85, align: 'right' });
  doc.text('IMPORTE', 473, y + 5, { width: 85, align: 'right' });

  y += 18;
  let rowBg = false;
  for (const item of invoice.items) {
    if (rowBg) doc.rect(50, y, 512, 18).fill('#f9fafb');
    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    doc.text(item.descripcion, 56, y + 4, { width: 268 });
    doc.text(String(item.cantidad), 330, y + 4, { width: 50, align: 'right' });
    doc.text(fmtMXN(item.precioUnitario), 385, y + 4, { width: 85, align: 'right' });
    doc.text(fmtMXN(item.importe), 473, y + 4, { width: 85, align: 'right' });
    y += 18;
    rowBg = !rowBg;
  }

  doc.moveTo(50, y).lineTo(562, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

  // ── Totales ───────────────────────────────────────────────────────────
  y += 12;
  const totX = 380;
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    .text('Subtotal', totX, y, { width: 90, align: 'right' })
    .text(fmtMXN(invoice.subtotal), 473, y, { width: 85, align: 'right' });
  y += 14;
  doc.text('IVA (16%)', totX, y, { width: 90, align: 'right' })
    .text(fmtMXN(invoice.impuesto), 473, y, { width: 85, align: 'right' });
  y += 14;
  doc.moveTo(380, y).lineTo(562, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  y += 6;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
    .text('TOTAL', totX, y, { width: 90, align: 'right' })
    .text(fmtMXN(invoice.total), 473, y, { width: 85, align: 'right' });

  // ── Estado de pago ────────────────────────────────────────────────────
  y += 30;
  const estadoColors = { pagada: '#166534', enviada: '#1d4ed8', vencida: '#991b1b', borrador: '#6b7280' };
  doc.rect(50, y, 200, 30).fill(estadoColors[estadoReal] ?? '#6b7280');
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
    .text(`Estado: ${estadoReal.toUpperCase()}`, 60, y + 10, { width: 180 });

  if (estadoReal !== 'pagada' && totalPagado > 0) {
    doc.fontSize(9).font('Helvetica').fillColor('#374151')
      .text(`Pagado: ${fmtMXN(totalPagado)}  |  Saldo: ${fmtMXN(invoice.total - totalPagado)}`, 260, y + 10);
  }

  // Notas
  if (invoice.notas) {
    y += 45;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('NOTAS', 50, y);
    doc.fontSize(9).font('Helvetica').fillColor('#374151').text(invoice.notas, 50, y + 12, { width: 512 });
  }

  doc.end();
});

export default router;
