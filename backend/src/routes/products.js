import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/products?search=&activo=true
router.get('/', async (req, res) => {
  const { search = '', activo } = req.query;

  const products = await prisma.product.findMany({
    where: {
      ...(activo !== undefined && { activo: activo === 'true' }),
      OR: [
        { nombre: { contains: search } },
        { descripcion: { contains: search } },
      ],
    },
    orderBy: { nombre: 'asc' },
  });

  res.json(products);
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(product);
});

// POST /api/products
router.post('/', async (req, res) => {
  const { nombre, descripcion, precio } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'El precio debe ser un número positivo' });
  }

  const product = await prisma.product.create({
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      precio: Number(precio),
    },
  });
  res.status(201).json(product);
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const { nombre, descripcion, precio, activo } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'El precio debe ser un número positivo' });
  }

  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      precio: Number(precio),
      ...(activo !== undefined && { activo: Boolean(activo) }),
    },
  });
  res.json(product);
});

// PATCH /api/products/:id/toggle  — activa/desactiva
router.patch('/:id/toggle', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const updated = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: { activo: !product.activo },
  });
  res.json(updated);
});

export default router;
