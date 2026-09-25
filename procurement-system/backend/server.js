require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const routes = require('./src/routes/index');
const { errorMiddleware } = require('./src/middleware/error.middleware');
require('./src/utils/scheduler'); // Register cron jobs

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
    if (!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`));
