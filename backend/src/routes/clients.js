import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../lib/audit.js';
import { parsePagination, paginatedResponse } from '../lib/pagination.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { search = '', all } = req.query;
  const where = {
    workspaceId: req.workspaceId,
    activo: true,
    ...(search && {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rfc: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  if (all === 'true') {
    const clients = await prisma.client.findMany({ where, orderBy: { nombre: 'asc' } });
    return res.json(clients);
  }

  const { skip, take, page, limit } = parsePagination(req.query);
  const [clients, total] = await Promise.all([
    prisma.client.findMany({ where, orderBy: { nombre: 'asc' }, skip, take }),
    prisma.client.count({ where }),
  ]);
  res.json(paginatedResponse(clients, total, page, limit));
});

router.get('/:id', async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(client);
});

router.post('/', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const { nombre, email, telefono, direccion, rfc } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

  const client = await prisma.client.create({
    data: {
      workspaceId: req.workspaceId,
      nombre: nombre.trim().slice(0, 200),
      email: email?.slice(0, 200),
      telefono: telefono?.slice(0, 30),
      direccion: direccion?.slice(0, 500),
      rfc: rfc?.slice(0, 20),
    },
  });
  await logAudit(req, { accion: 'CREATE', entidad: 'Client', entidadId: client.id });
  res.status(201).json(client);
});

router.put('/:id', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const { nombre, email, telefono, direccion, rfc } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

  const existing = await prisma.client.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

  const client = await prisma.client.update({
    where: { id: Number(req.params.id) },
    data: {
      nombre: nombre.trim().slice(0, 200),
      email: email?.slice(0, 200),
      telefono: telefono?.slice(0, 30),
      direccion: direccion?.slice(0, 500),
      rfc: rfc?.slice(0, 20),
    },
  });
  await logAudit(req, { accion: 'UPDATE', entidad: 'Client', entidadId: client.id });
  res.json(client);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const existing = await prisma.client.findFirst({
    where: { id: Number(req.params.id), workspaceId: req.workspaceId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

  await prisma.client.update({
    where: { id: Number(req.params.id) },
    data: { activo: false },
  });
  await logAudit(req, { accion: 'DELETE', entidad: 'Client', entidadId: Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
