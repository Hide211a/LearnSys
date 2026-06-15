import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import sharedRoutes from './routes/shared.js';
import { bootstrapDatabase } from './lib/bootstrap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST ?? '0.0.0.0';

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const extraOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultOrigins, ...extraOrigins];

app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  })
);
app.use(express.json());

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const healthPayload = () => ({
  status: 'ok',
  school: 'Кузьмівська гімназія',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});

const apiInfo = () => ({
  name: 'LearnSys API',
  school: 'Кузьмівська гімназія',
  status: 'running',
  health: '/api/health',
  login: '/api/auth/login',
  hint: 'Це API-сервер. Для входу відкрийте веб-додаток (frontend), а не це посилання.',
});

app.get('/', (_req, res) => res.status(200).json(apiInfo()));
app.get('/health', (_req, res) => res.status(200).json(healthPayload()));
app.get('/api', (_req, res) => res.status(200).json(apiInfo()));
app.get('/api/health', (_req, res) => res.status(200).json(healthPayload()));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', sharedRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

await bootstrapDatabase();

app.listen(PORT, HOST, () => {
  console.log(`API listening on ${HOST}:${PORT}`);
  console.log(`Health: /api/health`);
  if (extraOrigins.length) {
    console.log(`CORS origins: ${extraOrigins.join(', ')}`);
  }
});
