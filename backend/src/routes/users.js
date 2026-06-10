import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

const ROLES = ['ADMIN', 'CONTABLE', 'LECTOR'];

// GET /api/users
router.get('/', requireRole('ADMIN', 'CONTABLE'), async (req, res) => {
  const users = await prisma.user.findMany({
    where: { workspaceId: req.workspaceId },
    select: {
      id: true,
      nombre: true,
      email: true,
      role: true,
      activo: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

// POST /api/users
router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { nombre, email, password, role = 'LECTOR' } = req.body;

  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  if (!email?.trim()) return res.status(400).json({ error: 'El email es requerido' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      workspaceId: req.workspaceId,
      nombre: nombre.trim().slice(0, 200),
      email: email.trim().toLowerCase().slice(0, 200),
      passwordHash,
      role,
    },
    select: { id: true, nombre: true, email: true, role: true, activo: true, createdAt: true },
  });

  await logAudit(req, { accion: 'CREATE', entidad: 'User', entidadId: user.id });
  res.status(201).json(user);
});

// PUT /api/users/:id
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { nombre, role, activo } = req.body;
  const id = Number(req.params.id);

  if (id === req.userId) {
    return res.status(400).json({ error: 'No puedes modificar tu propio usuario desde aquí' });
  }

  const existing = await prisma.user.findFirst({
    where: { id, workspaceId: req.workspaceId },
  });
  if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(nombre && { nombre: nombre.trim().slice(0, 200) }),
      ...(role && { role }),
      ...(activo !== undefined && { activo: Boolean(activo) }),
    },
    select: { id: true, nombre: true, email: true, role: true, activo: true, createdAt: true },
  });

  await logAudit(req, { accion: 'UPDATE', entidad: 'User', entidadId: user.id });
  res.json(user);
});

// DELETE /api/users/:id  (desactivar)
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.userId) {
    return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
  }

  const existing = await prisma.user.findFirst({
    where: { id, workspaceId: req.workspaceId },
  });
  if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

  await prisma.user.update({ where: { id }, data: { activo: false } });
  await logAudit(req, { accion: 'DELETE', entidad: 'User', entidadId: id });
  res.json({ ok: true });
});

export default router;
