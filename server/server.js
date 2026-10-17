const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

// Load env vars first so everything below can read them
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const originGuard = require('./middleware/originGuard');

const isProd = process.env.NODE_ENV === 'production';

// Fail fast on missing config in production
if (isProd) {
  const required = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_ORIGIN', 'ORIGIN_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }
}

connectDB();

// Route files
const auth = require('./routes/authRoutes');
const artisans = require('./routes/artisanRoutes');
const products = require('./routes/productRoutes');
const orders = require('./routes/orderRoutes');

const app = express();

// Behind Cloudflare + the host's load balancer: trust forwarded headers
// so req.ip (rate limiting) and secure cookies work correctly.
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(helmet());

// Only accept traffic that came through the Cloudflare Worker (when ORIGIN_SECRET is set)
app.use(originGuard);

// Health check (used by the host and uptime monitors) - no DB auth, no rate limit
app.get('/healthz', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({ ok: dbReady });
});

// Body parser (with a size cap) and cookies
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// CORS: the browser talks to the same origin via the Cloudflare Worker, so
// CORS is only needed for local dev or if you ever call the API directly.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate limits: tight on auth (brute force), looser on the rest of the API
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true });
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Mount routers
app.use('/api/auth', auth);
app.use('/api/artisans', artisans);
app.use('/api/products', products);
app.use('/api/orders', orders);

// Unknown API routes -> JSON 404
app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// Error handler middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown so deploys don't drop in-flight requests
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
