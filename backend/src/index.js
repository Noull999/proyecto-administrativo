import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import productRoutes from './routes/products.js';
import invoiceRoutes from './routes/invoices.js';
import userRoutes from './routes/users.js';
import workspaceRoutes from './routes/workspaces.js';
import adminRoutes from './routes/admin.js';
import { startCronJobs } from './jobs/reminderEmails.js';
import { syncEstadoVencidas } from './jobs/syncEstados.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está configurado en las variables de entorno.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(helmet());
app.disable('x-powered-by');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  const smtp = {
    host: process.env.SMTP_HOST || '(no configurado)',
    port: process.env.SMTP_PORT || '(no configurado)',
    user: process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(?<=.{3}).(?=.*@)/g, '*') : '(no configurado)',
    passLen: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
  };
  res.json({ ok: true, ts: new Date().toISOString(), smtp });
});

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? err.statusCode ?? 500;
  const message = status < 500
    ? (err.message || 'Error en la solicitud')
    : 'Error interno del servidor';
  res.status(status).json({ error: message });
});

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  // Sincronizar estados vencidos al arrancar (sin esperar a que llegue el cron)
  try { await syncEstadoVencidas(); } catch (e) { console.error('syncEstadoVencidas error:', e.message); }
  startCronJobs();
});
