// Seed de datos DE DEMOSTRACIÓN (no confundir con src/seed.js, que crea el
// workspace real "Servicios Asencio"). Este crea un workspace ficticio con
// clientes, productos y facturas de ejemplo, pensado para grabar un video
// mostrando la app sin exponer nada del cliente real.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma.js';

async function main() {
  let workspace = await prisma.workspace.findFirst({ where: { nombre: 'Taller Demo' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        nombre: 'Taller Demo',
        rfc: 'DEMO010101XXX',
        telefono: '+56 9 0000 0000',
        email: 'contacto@tallerdemo.cl',
      },
    });
    console.log(`✓ Workspace creado: ${workspace.nombre} (ID: ${workspace.id})`);
  }

  const demoEmail = 'demo@tallerdemo.cl';
  let user = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!user) {
    const passwordHash = await bcrypt.hash('Demo2026!', 10);
    user = await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        nombre: 'Usuario Demo',
        email: demoEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`✓ Usuario demo: ${demoEmail} / Demo2026!`);
  }

  const clientesData = [
    { nombre: 'María González', email: 'maria@example.cl', telefono: '+56 9 1111 1111' },
    { nombre: 'Constructora Los Andes', email: 'contacto@losandes.cl', telefono: '+56 9 2222 2222' },
    { nombre: 'Panadería El Trigal', email: 'ventas@eltrigal.cl', telefono: '+56 9 3333 3333' },
  ];
  const clientes = [];
  for (const c of clientesData) {
    let cli = await prisma.client.findFirst({ where: { workspaceId: workspace.id, nombre: c.nombre } });
    if (!cli) cli = await prisma.client.create({ data: { ...c, workspaceId: workspace.id } });
    clientes.push(cli);
  }
  console.log(`✓ ${clientes.length} clientes`);

  const productosData = [
    { nombre: 'Mantenimiento mensual', precio: 45000 },
    { nombre: 'Instalación eléctrica', precio: 120000 },
    { nombre: 'Consultoría técnica (hora)', precio: 25000 },
  ];
  const productos = [];
  for (const p of productosData) {
    let prod = await prisma.product.findFirst({ where: { workspaceId: workspace.id, nombre: p.nombre } });
    if (!prod) prod = await prisma.product.create({ data: { ...p, workspaceId: workspace.id } });
    productos.push(prod);
  }
  console.log(`✓ ${productos.length} productos`);

  const facturasExistentes = await prisma.invoice.count({ where: { workspaceId: workspace.id } });
  if (facturasExistentes === 0) {
    const estados = ['pagada', 'pendiente', 'vencida', 'pagada', 'pendiente'];
    for (let i = 0; i < 5; i++) {
      const cliente = clientes[i % clientes.length];
      const producto = productos[i % productos.length];
      const cantidad = 1 + (i % 3);
      const subtotal = producto.precio * cantidad;
      const impuesto = Math.round(subtotal * 0.19);
      const total = subtotal + impuesto;
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - (i * 7));

      const factura = await prisma.invoice.create({
        data: {
          workspaceId: workspace.id,
          clientId: cliente.id,
          tipo: 'factura',
          folio: `DEMO-${String(i + 1).padStart(4, '0')}`,
          fecha,
          fechaVencimiento: new Date(fecha.getTime() + 30 * 24 * 60 * 60 * 1000),
          estado: estados[i],
          subtotal,
          impuesto,
          total,
          items: {
            create: [
              {
                productId: producto.id,
                descripcion: producto.nombre,
                cantidad,
                precioUnitario: producto.precio,
                importe: subtotal,
              },
            ],
          },
        },
      });

      if (estados[i] === 'pagada') {
        await prisma.payment.create({
          data: { invoiceId: factura.id, monto: total, metodo: 'transferencia' },
        });
      }
    }
    console.log('✓ 5 facturas de ejemplo creadas');
  } else {
    console.log('Ya hay facturas, no se duplican.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
