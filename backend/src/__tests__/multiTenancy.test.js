/**
 * Tests de aislamiento multi-tenant.
 *
 * Verifica que ninguna ruta permita leer ni escribir datos de otro workspace.
 * Usa mocks de Prisma para no necesitar base de datos real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted es necesario para usar variables en factories de vi.mock
// (las factories se elevan antes de los imports)
const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  invoice: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }));

// El router usa requireAuth internamente; lo reemplazamos por un no-op
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (_req, _res, next) => next(),
}));

// --- Importar rutas DESPUÉS del mock ---
import express from 'express';
import request from 'supertest';
import clientRoutes from '../routes/clients.js';
import productRoutes from '../routes/products.js';

// Middleware que simula un usuario autenticado del workspace 1
function asWorkspace(workspaceId, role = 'ADMIN') {
  return (req, _res, next) => {
    req.userId = 1;
    req.workspaceId = workspaceId;
    req.userRole = role;
    next();
  };
}

function buildApp(routes, path, workspaceId, role) {
  const app = express();
  app.use(express.json());
  app.use(asWorkspace(workspaceId, role));
  app.use(path, routes);
  return app;
}

// -------------------------------------------------------------------
describe('Aislamiento multi-tenant — Clientes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /clients solo consulta el workspaceId del usuario', async () => {
    mockPrisma.client.findMany.mockResolvedValue([]);
    mockPrisma.client.count.mockResolvedValue(0);

    const app = buildApp(clientRoutes, '/clients', 42);
    await request(app).get('/clients');

    const callArgs = mockPrisma.client.findMany.mock.calls[0][0];
    expect(callArgs.where.workspaceId).toBe(42);
  });

  it('GET /clients/:id rechaza un registro de otro workspace', async () => {
    // findFirst devuelve null (el cliente no pertenece al workspace 42)
    mockPrisma.client.findFirst.mockResolvedValue(null);

    const app = buildApp(clientRoutes, '/clients', 42);
    const res = await request(app).get('/clients/99');

    expect(res.status).toBe(404);
  });

  it('GET /clients/:id con workspaceId correcto devuelve el cliente', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: 1, workspaceId: 42, nombre: 'Acme' });

    const app = buildApp(clientRoutes, '/clients', 42);
    const res = await request(app).get('/clients/1');

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Acme');
    // Confirmamos que la query incluyó workspaceId
    const callArgs = mockPrisma.client.findFirst.mock.calls[0][0];
    expect(callArgs.where.workspaceId).toBe(42);
  });

  it('POST /clients inyecta workspaceId del token, no del body', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null); // no existe duplicate
    mockPrisma.client.create.mockResolvedValue({ id: 10, workspaceId: 42, nombre: 'Nuevo' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const app = buildApp(clientRoutes, '/clients', 42);
    // El atacante manda workspaceId: 99 en el body — debe ignorarse
    const res = await request(app)
      .post('/clients')
      .send({ nombre: 'Nuevo', email: 'test@test.com', workspaceId: 99 });

    expect(res.status).toBe(201);
    const createArgs = mockPrisma.client.create.mock.calls[0][0];
    expect(createArgs.data.workspaceId).toBe(42);
    expect(createArgs.data.workspaceId).not.toBe(99);
  });

  it('LECTOR no puede crear clientes (403)', async () => {
    const app = buildApp(clientRoutes, '/clients', 42, 'LECTOR');
    const res = await request(app)
      .post('/clients')
      .send({ nombre: 'Nuevo' });

    expect(res.status).toBe(403);
    expect(mockPrisma.client.create).not.toHaveBeenCalled();
  });

  it('solo ADMIN puede eliminar clientes', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: 5, workspaceId: 42 });
    mockPrisma.client.update.mockResolvedValue({ id: 5, activo: false });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const appAdmin = buildApp(clientRoutes, '/clients', 42, 'ADMIN');
    const resAdmin = await request(appAdmin).delete('/clients/5');
    expect(resAdmin.status).toBe(200);

    const appContable = buildApp(clientRoutes, '/clients', 42, 'CONTABLE');
    const resContable = await request(appContable).delete('/clients/5');
    expect(resContable.status).toBe(403);
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------
describe('Aislamiento multi-tenant — Productos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /products solo consulta el workspaceId del usuario', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const app = buildApp(productRoutes, '/products', 7);
    await request(app).get('/products');

    const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
    expect(callArgs.where.workspaceId).toBe(7);
  });

  it('PUT /products/:id rechaza actualizar producto de otro workspace', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null); // no existe en workspace 7

    const app = buildApp(productRoutes, '/products', 7);
    const res = await request(app)
      .put('/products/99')
      .send({ nombre: 'Hack', precio: 0 });

    expect(res.status).toBe(404);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });
});
