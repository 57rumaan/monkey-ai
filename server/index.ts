import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { existsSync } from 'fs';
import './providers/index.js';

export { requireAuth, optionalAuth } from './middleware.js';

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_API || '60', 10),
  message: { success: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH || '10', 10),
  message: { success: false, error: 'Too many auth attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_UPLOAD || '10', 10),
  message: { success: false, error: 'Too many upload attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/upload/', uploadLimiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

import authRoutes from './routes/auth.js';
import bundleRoutes from './routes/bundles.js';
import providerRoutes from './routes/providers.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';

app.use('/api/auth', authRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

const clientDistPath = join(
  import.meta.dirname ? join(import.meta.dirname, '../../..') : process.cwd(),
  'dist',
  'client',
);
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(join(clientDistPath, 'index.html'));
  });
}

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;