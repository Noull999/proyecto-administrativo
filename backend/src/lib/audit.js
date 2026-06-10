import prisma from './prisma.js';

export async function logAudit(req, { accion, entidad, entidadId, detalle }) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: req.workspaceId,
        userId: req.userId,
        accion,
        entidad,
        entidadId: entidadId ?? null,
        detalle: detalle ? JSON.stringify(detalle) : null,
        ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      },
    });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}
