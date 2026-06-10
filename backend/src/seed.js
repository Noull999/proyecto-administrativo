import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma.js';

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@serviciosasencio.com' },
  });

  if (existing) {
    console.log('Usuario admin ya existe, saltando seed.');
    return;
  }

  const workspace = await prisma.workspace.create({
    data: {
      nombre: 'Servicios Asencio',
      rfc: 'AEXE000101ABC',
      telefono: '+52 55 0000-0000',
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      nombre: 'Administrador',
      email: 'admin@serviciosasencio.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`✓ Workspace creado: ${workspace.nombre} (ID: ${workspace.id})`);
  console.log(`✓ Usuario admin creado: ${user.email}`);
  console.log('  Contraseña: admin123  ← CÁMBIALA EN PRODUCCIÓN');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
