import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('SUPERADMIN'));

// GET /api/admin/workspaces
router.get('/workspaces', async (req, res) => {
  const workspaces = await prisma.workspace.findMany({
    include: {
      _count: { select: { users: true, invoices: true, clients: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(workspaces);
});

// POST /api/admin/workspaces
router.post('/workspaces', async (req, res) => {
  const { nombre, rfc, direccion, telefono, adminNombre, adminEmail, adminPassword } = req.body;

  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre de empresa es requerido' });
  if (!adminEmail?.trim()) return res.status(400).json({ error: 'El email del admin es requerido' });
  if (!adminPassword || adminPassword.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail.trim().toLowerCase() } });
  if (existingUser) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const workspace = await prisma.workspace.create({
    data: {
      nombre: nombre.trim(),
      rfc: rfc?.trim() || null,
      direccion: direccion?.trim() || null,
      telefono: telefono?.trim() || null,
      users: {
        create: {
          nombre: adminNombre?.trim() || 'Administrador',
          email: adminEmail.trim().toLowerCase(),
          passwordHash,
          role: 'ADMIN',
        },
      },
    },
    include: {
      users: { select: { id: true, email: true, nombre: true, role: true } },
      _count: { select: { users: true, invoices: true, clients: true } },
    },
  });

  res.status(201).json(workspace);
});

export default router;
