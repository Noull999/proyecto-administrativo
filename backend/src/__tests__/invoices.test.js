/**
 * Tests de rutas de facturas.
 *
 * Cubre: aislamiento multi-tenant, validaciones de negocio,
 * cálculo de totales, RBAC y transiciones de estado.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  invoice: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  client: {
    findFirst: vi.fn(),
  },
  invoiceItem: {
    deleteMany: vi.fn(),
  },
  payment: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }));
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (_req, _res, next) => next(),
}));

// nextFolio usa prisma internamente — lo mockeamos para aislar tests
vi.mock('../lib/invoiceHelpers.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    nextFolio: vi.fn().mockResolvedValue('F-0001'),
  };
});

import express from 'express';
import request from 'supertest';
import invoiceRoutes from '../routes/invoices.js';

function buildApp(workspaceId, role = 'ADMIN') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = 1;
    req.workspaceId = workspaceId;
    req.userRole = role;
    next();
  });
  app.use('/invoices', invoiceRoutes);
  return app;
}

// items de prueba reutilizables
const sampleItems = [
  { descripcion: 'Servicio A', cantidad: 2, precioUnitario: 100 },
];

// factura base que devuelven los mocks
const baseInvoice = {
  id: 1,
  workspaceId: 10,
  clientId: 5,
  tipo: 'cotizacion',
  folio: 'C-0001',
  estado: 'borrador',
  subtotal: 200,
  impuesto: 32,
  total: 232,
  items: [],
  payments: [],
  client: { nombre: 'Acme' },
};

// ─────────────────────────────────────────────
describe('GET /invoices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filtra por workspaceId del token', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([]);
    mockPrisma.invoice.count.mockResolvedValue(0);

    const app = buildApp(10);
    await request(app).get('/invoices');

    const call = mockPrisma.invoice.findMany.mock.calls[0][0];
    expect(call.where.workspaceId).toBe(10);
  });

  it('responde con formato paginado', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([baseInvoice]);
    mockPrisma.invoice.count.mockResolvedValue(1);

    const app = buildApp(10);
    const res = await request(app).get('/invoices');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination.total).toBe(1);
  });

  it('filtra por estado en BD (estado=pagada)', async () => {
    // El filtro ahora va directo a SQL — el mock devuelve solo las facturas ya filtradas
    const pagada = { ...baseInvoice, payments: [{ monto: 232 }], estado: 'pagada' };
    mockPrisma.invoice.findMany.mockResolvedValue([pagada]);
    mockPrisma.invoice.count.mockResolvedValue(1);

    const app = buildApp(10);
    const res = await request(app).get('/invoices?estado=pagada');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // Verificamos que el where incluyó estado en la query
    const call = mockPrisma.invoice.findMany.mock.calls[0][0];
    expect(call.where.estado).toBe('pagada');
  });
});

// ─────────────────────────────────────────────
describe('GET /invoices/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filtra por workspaceId', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    const app = buildApp(10);
    await request(app).get('/invoices/stats');

    const call = mockPrisma.invoice.findMany.mock.calls[0][0];
    expect(call.where.workspaceId).toBe(10);
  });

  it('cuenta estados correctamente', async () => {
    const facturas = [
      { ...baseInvoice, total: 100, payments: [{ monto: 100 }], estado: 'enviada' }, // pagada
      { ...baseInvoice, id: 2, total: 200, payments: [], estado: 'borrador' },
    ];
    mockPrisma.invoice.findMany.mockResolvedValue(facturas);

    const app = buildApp(10);
    const res = await request(app).get('/invoices/stats');

    expect(res.status).toBe(200);
    expect(res.body.conteo.pagada).toBe(1);
    expect(res.body.conteo.borrador).toBe(1);
    expect(res.body.montoPagado).toBe(100);
  });
});

// ─────────────────────────────────────────────
describe('GET /invoices/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('devuelve 404 si la factura es de otro workspace', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    const app = buildApp(10);
    const res = await request(app).get('/invoices/99');

    expect(res.status).toBe(404);
    const call = mockPrisma.invoice.findFirst.mock.calls[0][0];
    expect(call.where.workspaceId).toBe(10);
  });

  it('incluye estadoReal en la respuesta', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({
      ...baseInvoice,
      payments: [{ monto: 232 }],
    });

    const app = buildApp(10);
    const res = await request(app).get('/invoices/1');

    expect(res.status).toBe(200);
    expect(res.body.estadoReal).toBe('pagada');
  });
});

// ─────────────────────────────────────────────
describe('POST /invoices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rechaza si no hay clientId', async () => {
    const app = buildApp(10);
    const res = await request(app).post('/invoices').send({ items: sampleItems });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cliente/i);
  });

  it('rechaza si no hay items', async () => {
    const app = buildApp(10);
    const res = await request(app).post('/invoices').send({ clientId: 5, items: [] });
    expect(res.status).toBe(400);
  });

  it('rechaza si el cliente es de otro workspace (fuga cross-tenant)', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null); // cliente no pertenece a este workspace

    const app = buildApp(10);
    const res = await request(app)
      .post('/invoices')
      .send({ clientId: 5, items: sampleItems });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cliente inválido');
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });

  it('crea la factura con workspaceId del token, no del body', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: 5 });
    mockPrisma.invoice.create.mockResolvedValue({ ...baseInvoice, payments: [] });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const app = buildApp(10);
    const res = await request(app)
      .post('/invoices')
      .send({ clientId: 5, items: sampleItems, workspaceId: 999 });

    expect(res.status).toBe(201);
    const createArgs = mockPrisma.invoice.create.mock.calls[0][0];
    expect(createArgs.data.workspaceId).toBe(10);
    expect(createArgs.data.workspaceId).not.toBe(999);
  });

  it('calcula totales con IVA 16% correctamente', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: 5 });
    mockPrisma.invoice.create.mockResolvedValue({ ...baseInvoice, payments: [] });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const app = buildApp(10);
    await request(app)
      .post('/invoices')
      .send({ clientId: 5, items: [{ descripcion: 'X', cantidad: 1, precioUnitario: 500 }] });

    const createArgs = mockPrisma.invoice.create.mock.calls[0][0];
    expect(createArgs.data.subtotal).toBe(500);
    expect(createArgs.data.impuesto).toBe(80);  // 500 * 0.16
    expect(createArgs.data.total).toBe(580);
  });

  it('LECTOR no puede crear facturas (403)', async () => {
    const app = buildApp(10, 'LECTOR');
    const res = await request(app)
      .post('/invoices')
      .send({ clientId: 5, items: sampleItems });

    expect(res.status).toBe(403);
    expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
describe('PUT /invoices/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no permite editar una factura de otro workspace', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    const app = buildApp(10);
    const res = await request(app)
      .put('/invoices/99')
      .send({ clientId: 5, items: sampleItems });

    expect(res.status).toBe(404);
  });

  it('no permite editar una factura ya pagada', async () => {
    const pagada = { ...baseInvoice, payments: [{ monto: 232 }], estado: 'enviada' };
    mockPrisma.invoice.findFirst.mockResolvedValue(pagada);

    const app = buildApp(10);
    const res = await request(app)
      .put('/invoices/1')
      .send({ clientId: 5, items: sampleItems });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pagada/i);
  });

  it('valida que el nuevo clientId pertenezca al workspace', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, payments: [] });
    mockPrisma.client.findFirst.mockResolvedValue(null); // clientId no válido

    const app = buildApp(10);
    const res = await request(app)
      .put('/invoices/1')
      .send({ clientId: 999, items: sampleItems });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cliente inválido');
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
describe('DELETE /invoices/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('solo elimina facturas en borrador', async () => {
    const enviada = { ...baseInvoice, estado: 'enviada' };
    mockPrisma.invoice.findFirst.mockResolvedValue(enviada);

    const app = buildApp(10);
    const res = await request(app).delete('/invoices/1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/borrador/i);
    expect(mockPrisma.invoice.delete).not.toHaveBeenCalled();
  });

  it('elimina correctamente una factura en borrador', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, estado: 'borrador' });
    mockPrisma.invoice.delete.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const app = buildApp(10);
    const res = await request(app).delete('/invoices/1');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('CONTABLE no puede eliminar (403)', async () => {
    const app = buildApp(10, 'CONTABLE');
    const res = await request(app).delete('/invoices/1');

    expect(res.status).toBe(403);
    expect(mockPrisma.invoice.delete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
describe('POST /invoices/:id/send', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cambia estado de borrador a enviada', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, estado: 'borrador' });
    const enviada = { ...baseInvoice, estado: 'enviada', payments: [] };
    mockPrisma.invoice.update.mockResolvedValue(enviada);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const app = buildApp(10);
    const res = await request(app).post('/invoices/1/send');

    expect(res.status).toBe(200);
    const updateArgs = mockPrisma.invoice.update.mock.calls[0][0];
    expect(updateArgs.data.estado).toBe('enviada');
  });

  it('rechaza enviar una factura ya enviada', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, estado: 'enviada' });

    const app = buildApp(10);
    const res = await request(app).post('/invoices/1/send');

    expect(res.status).toBe(400);
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
describe('POST /invoices/:id/convert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('convierte cotización a factura con nuevo folio', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, tipo: 'cotizacion' });
    const convertida = { ...baseInvoice, tipo: 'factura', folio: 'F-0001', payments: [] };
    mockPrisma.invoice.update.mockResolvedValue(convertida);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const app = buildApp(10);
    const res = await request(app).post('/invoices/1/convert');

    expect(res.status).toBe(200);
    const updateArgs = mockPrisma.invoice.update.mock.calls[0][0];
    expect(updateArgs.data.tipo).toBe('factura');
    expect(updateArgs.data.estado).toBe('enviada');
    expect(updateArgs.data.folio).toBe('F-0001');
  });

  it('rechaza convertir algo que ya es factura', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, tipo: 'factura' });

    const app = buildApp(10);
    const res = await request(app).post('/invoices/1/convert');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cotizacion/i);
  });
});

// ─────────────────────────────────────────────
describe('POST /invoices/:id/payments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rechaza monto inválido (0 o negativo)', async () => {
    const app = buildApp(10);
    const res = await request(app)
      .post('/invoices/1/payments')
      .send({ monto: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/monto/i);
  });

  it('rechaza pago en factura ya pagada', async () => {
    const pagada = { ...baseInvoice, payments: [{ monto: 232 }], estado: 'pagada' };
    mockPrisma.invoice.findFirst.mockResolvedValue(pagada);

    const app = buildApp(10);
    const res = await request(app)
      .post('/invoices/1/payments')
      .send({ monto: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ya está pagada/i);
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('registra el pago en la factura correcta del workspace', async () => {
    const factura = { ...baseInvoice, payments: [], estado: 'enviada' };
    mockPrisma.invoice.findFirst
      .mockResolvedValueOnce(factura)    // primera llamada: validar factura
      .mockResolvedValueOnce({ ...factura, payments: [{ monto: 100 }] }); // segunda: invoice actualizada
    mockPrisma.payment.create.mockResolvedValue({ id: 1, monto: 100 });
    mockPrisma.invoice.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const app = buildApp(10);
    const res = await request(app)
      .post('/invoices/1/payments')
      .send({ monto: 100, metodo: 'transferencia' });

    expect(res.status).toBe(201);
    // El pago debe estar vinculado al invoiceId correcto
    const paymentArgs = mockPrisma.payment.create.mock.calls[0][0];
    expect(paymentArgs.data.invoiceId).toBe(1);
    expect(paymentArgs.data.monto).toBe(100);
  });

  it('rechaza pago en factura de otro workspace (findFirst devuelve null)', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(null); // no pertenece al workspace

    const app = buildApp(10);
    const res = await request(app)
      .post('/invoices/1/payments')
      .send({ monto: 100 });

    expect(res.status).toBe(404);
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });
});
