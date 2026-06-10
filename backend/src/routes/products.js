import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../lib/audit.js';
import { parsePagination, paginatedResponse } from '../lib/pagination.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { search = '', activo, all } = req.query;
  const where = {
    workspaceId: req.workspaceId,
    ...(activo !== undefined && { activo: activo === 'true' }),
    ...(search && {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  if (all === 'true') {
    const products = await prisma.product.findMany({ where, orderBy: { nombre: 'asc' } });
    return res.json(products);
  }

  const { skip, take, page, limit } = parsePagination(req.query);
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { nombre: 'asc' }, skip, take }),
    prisma.product.count({ where }),
  ]);
  res.json(paginatedResponse(products, total, page, limit));
});

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(product);
});

router.post('/', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const { nombre, descripcion, precio } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'El precio debe ser un número positivo' });
  }

  const product = await prisma.product.create({
    data: {
      workspaceId: req.workspaceId,
      nombre: nombre.trim().slice(0, 200),
      descripcion: descripcion?.trim().slice(0, 500) || null,
      precio: Number(precio),
    },
  });
  await logAudit(req, { accion: 'CREATE', entidad: 'Product', entidadId: product.id });
  res.status(201).json(product);
});

router.put('/:id', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const { nombre, descripcion, precio, activo } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'El precio debe ser un número positivo' });
  }

  const existing = await prisma.product.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: {
      nombre: nombre.trim().slice(0, 200),
      descripcion: descripcion?.trim().slice(0, 500) || null,
      precio: Number(precio),
      ...(activo !== undefined && { activo: Boolean(activo) }),
    },
  });
  await logAudit(req, { accion: 'UPDATE', entidad: 'Product', entidadId: product.id });
  res.json(product);
});

router.patch('/:id/toggle', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const updated = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: { activo: !product.activo },
  });
  await logAudit(req, { accion: 'UPDATE', entidad: 'Product', entidadId: updated.id, detalle: { activo: updated.activo } });
  res.json(updated);
});

export default router;
