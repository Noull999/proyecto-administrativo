import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../lib/audit.js';

const router = Router();
router.use(requireAuth);

// GET /api/workspace
router.get('/', async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.workspaceId },
  });
  if (!workspace) return res.status(404).json({ error: 'Empresa no encontrada' });
  res.json(workspace);
});

// PUT /api/workspace
router.put('/', requireRole('ADMIN'), async (req, res) => {
  const { nombre, rfc, direccion, telefono } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre de empresa es requerido' });

  const workspace = await prisma.workspace.update({
    where: { id: req.workspaceId },
    data: {
      nombre: nombre.trim().slice(0, 200),
      rfc: rfc?.trim().slice(0, 20) || null,
      direccion: direccion?.trim().slice(0, 500) || null,
      telefono: telefono?.trim().slice(0, 30) || null,
    },
  });

  await logAudit(req, { accion: 'UPDATE', entidad: 'Workspace', entidadId: workspace.id });
  res.json(workspace);
});

// GET /api/workspace/audit  (log de auditoría — solo ADMIN)
router.get('/audit', requireRole('ADMIN'), async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { workspaceId: req.workspaceId },
      include: { user: { select: { nombre: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.auditLog.count({ where: { workspaceId: req.workspaceId } }),
  ]);

  res.json({ data: logs, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
});

export default router;
