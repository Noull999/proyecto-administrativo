import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma.js';

async function main() {
  // Crear workspace + admin inicial si no existe
  let workspace = await prisma.workspace.findFirst({ where: { nombre: 'Servicios Asencio' } });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        nombre: 'Servicios Asencio',
        rfc: 'AEXE000101ABC',
        telefono: '+52 55 0000-0000',
      },
    });
    console.log(`✓ Workspace creado: ${workspace.nombre} (ID: ${workspace.id})`);
  }

  const adminEmail = 'admin@serviciosasencio.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        nombre: 'Administrador',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`✓ Usuario admin creado: ${adminEmail}`);
    console.log('  Contraseña: admin123  ← CÁMBIALA EN PRODUCCIÓN');
  }

  // Crear SUPERADMIN si no existe
  const superEmail = 'superadmin@serviciosasencio.com';
  const existingSuper = await prisma.user.findUnique({ where: { email: superEmail } });
  if (!existingSuper) {
    const passwordHash = await bcrypt.hash('super123', 10);
    await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        nombre: 'Super Admin',
        email: superEmail,
        passwordHash,
        role: 'SUPERADMIN',
      },
    });
    console.log(`✓ Super admin creado: ${superEmail}`);
    console.log('  Contraseña: super123  ← CÁMBIALA EN PRODUCCIÓN');
  } else {
    console.log('Super admin ya existe, saltando.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
