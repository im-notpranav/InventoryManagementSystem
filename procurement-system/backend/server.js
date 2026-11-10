require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const bootStart = Date.now();
const prisma = require('./src/config/db');
// Open the DB connection while the routes load, so the first request after a
// restart does not pay for it (~0.5 s).
const dbReady = prisma.$connect().catch((err) => console.error('[DB] Connection failed:', err.message));

const routes = require('./src/routes/index');
const { errorMiddleware } = require('./src/middleware/error.middleware');
const { startScheduler } = require('./src/utils/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
    ];
    // In development Vite moves to the next free port (5174, 5175, …) when 5173 is
    // taken, so accept any localhost port outside production.
    const isLocalDev = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    if (!origin || allowed.includes(origin) || isLocalDev) callback(null, true);
    else callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// One page view fires 5-8 calls (data + sidebar badge + notifications), so a
// low cap turned quick navigation into 429 errors. Login has its own limiter.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded.' }
});

app.use('/api/', apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', routes);

app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorMiddleware);

app.listen(PORT, async () => {
  await dbReady;
  console.log(`Backend running on http://localhost:${PORT} (ready in ${Date.now() - bootStart} ms)`);
  startScheduler();
});
