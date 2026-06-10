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

  const passwordHash = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@serviciosasencio.com',
      passwordHash,
    },
  });

  console.log(`✓ Usuario admin creado: ${user.email}`);
  console.log('  Contraseña: admin123  (cámbiala en producción)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
