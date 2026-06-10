import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/clients?search=&page=1
router.get('/', async (req, res) => {
  const { search = '' } = req.query;

  const clients = await prisma.client.findMany({
    where: {
      activo: true,
      OR: [
        { nombre: { contains: search } },
        { email: { contains: search } },
        { rfc: { contains: search } },
      ],
    },
    orderBy: { nombre: 'asc' },
  });

  res.json(clients);
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(client);
});

// POST /api/clients
router.post('/', async (req, res) => {
  const { nombre, email, telefono, direccion, rfc } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  const client = await prisma.client.create({
    data: { nombre: nombre.trim(), email, telefono, direccion, rfc },
  });
  res.status(201).json(client);
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  const { nombre, email, telefono, direccion, rfc } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  const client = await prisma.client.update({
    where: { id: Number(req.params.id) },
    data: { nombre: nombre.trim(), email, telefono, direccion, rfc },
  });
  res.json(client);
});

// DELETE /api/clients/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  await prisma.client.update({
    where: { id: Number(req.params.id) },
    data: { activo: false },
  });
  res.json({ ok: true });
});

export default router;
