import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import productRoutes from './routes/products.js';
import invoiceRoutes from './routes/invoices.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 404 para rutas inexistentes
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler global — Express 5 reenvía rechazos async aquí automáticamente
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message || 'Error interno del servidor';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
