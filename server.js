// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http'); // Import http
const { Server } = require('socket.io'); // Import Socket.io
require('dotenv').config();

// Import modular routes
const apiRoutes = require('./routes');
const checkExpiredSubscriptions = require('./cron/checkSubscriptions');
const { getExerciseVideo } = require('./services/youtubeSearchService');
const { resolveExerciseLocale } = require('./utils/exercise-language');

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, { // Initialize Socket.io
  cors: {
    origin: "*", // Allow all origins for now (or strictly set to allowedOrigins)
    methods: ["GET", "POST"]
  }
});

// Attach io to request for use in controllers (optional)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their own room for private messages
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.set('trust proxy', 1); // Required for Railway/Heroku to key rate limiting off IP

// Initialize Cron Jobs
checkExpiredSubscriptions();
const PORT = process.env.PORT || 3000;
// Boot timestamp: the `startedAt` reported by `/version` and the fallback build
// id when the platform does not inject a commit SHA.
const STARTED_AT = new Date().toISOString();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Sets various HTTP headers for security
app.use(compression()); // Compress responses

// Rate limiting configuration
// General API rate limiter - 10000 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication endpoints - 20 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login attempts per windowMs
  message: {
    error: 'Too Many Login Attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});


// Stricter rate limiter for the YouTube exercise video lookup - 120 lookups per 15 minutes
const videoLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: {
    error: 'Too Many Requests',
    message: 'Too many exercise video lookups from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


// Middleware
// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://duplagym.vercel.app', // Your Vercel frontend
  'http://localhost:8081', // Expo Go default
  'fit.dupla.app', // Mobile app scheme
  'http://192.168.1.13:8081' // Local IP
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow any origin for development/testing ease with this new feature, 
    // strictly normally we check allowedOrigins
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token']
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional: serve the exercises-dataset media straight from disk (local dev or a
// self-hosted deployment). Production pins a jsDelivr commit SHA in
// EXERCISE_MEDIA_BASE instead; both bases expose the same `/gif` and `/thumb`
// folders, so the URLs composed by withExerciseMedia() stay identical.
// Mounted before the API rate limiter so thumbnails do not eat the request budget.
const EXERCISE_DATASET_DIR = String(process.env.EXERCISE_DATASET_DIR || '').trim();
if (EXERCISE_DATASET_DIR) {
  const staticOptions = { maxAge: '7d', immutable: true };
  app.use('/media/gif', express.static(path.join(EXERCISE_DATASET_DIR, 'videos'), staticOptions));
  app.use('/media/thumb', express.static(path.join(EXERCISE_DATASET_DIR, 'images'), staticOptions));
  console.log(`Exercise dataset media served from ${EXERCISE_DATASET_DIR}`);
}

// ── Caching policy ─────────────────────────────────────────────────────────
//
// Three classes of response live behind this API:
//
//   1. Personal data (plans, logs, payments, notifications) — never cached. The
//      web client also sends `cache: "no-store"` on every GET for this reason.
//   2. Catalogs (exercise library, muscle categories, release notes) — same
//      bytes for every user and only edited from the admin panel. They are
//      stored but always revalidated: the client echoes the ETag Express
//      already generates and gets a 304 when nothing changed, so a tab left
//      open can never show a stale catalog yet pays one header round-trip
//      instead of re-downloading the whole exercise list.
//   3. Static media (/uploads, /media) — served by express.static, which already
//      sends its own ETag/Last-Modified validators (and `immutable` for the
//      exercise dataset). Nothing to do here.
const REVALIDATED_CATALOGS = [/^\/exercises(\/|$)/, /^\/release-notes(\/|$)/];

app.use('/api/v1', (req, res, next) => {
  if (req.method === 'GET') {
    if (REVALIDATED_CATALOGS.some((pattern) => pattern.test(req.path))) {
      res.set('Cache-Control', 'no-cache, must-revalidate');
    } else {
      // Personal data: stored nowhere, by no one (this also covers a tab that
      // reloads right after saving, which is how edits used to look reverted).
      res.set('Cache-Control', 'no-store');
    }
  }
  next();
});

// Build identity so a browser tab can notice that a new backend build shipped.
// A tab keeps running the bundles it booted with; polling this endpoint is the
// only way for it to find out.
const BUILD_ID =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT_SHA ||
  process.env.npm_package_version ||
  `started-${STARTED_AT}`;

app.get('/api/v1/version', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ build: BUILD_ID, api: 'v1', startedAt: STARTED_AT });
});

// Apply rate limiting to all API routes
app.use('/api/v1', apiLimiter);

// Mount API routes
app.use('/api/v1', apiRoutes);

// ============================================
// EXERCISE ROUTES (Temporary - until refactored)
// ============================================

// Resolve a YouTube reference video for an exercise that has no usable video attached
app.get('/api/v1/exercises/video', videoLookupLimiter, async (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'Bad Request', message: 'The name query parameter is required.' });
  }

  try {
    const video = await getExerciseVideo(name);
    res.json(video);
  } catch (err) {
    console.error('Exercise video lookup error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Could not resolve a YouTube video for this exercise.' });
  }
});

// ── Exercise catalog ────────────────────────────────────────────────────────
// The catalog mixes the original coach-facing rows (`source = 'catalog'`) with
// the imported exercises-dataset rows (`source = 'dataset'`). The list endpoint
// stays light so the pickers can search/filter server side; the full record
// (muscles, instructions, media) comes from /exercises/lookup.

// Pinned jsDelivr mirror of the public `Dupla-exercises-media` repository. It is
// only the default, so a fresh deploy serves media without any dashboard setup:
// `EXERCISE_MEDIA_BASE` overrides it (production may point at its own CDN and
// local development uses `http://localhost:3001/media` with `EXERCISE_DATASET_DIR`).
const EXERCISE_MEDIA_FALLBACK_BASE =
  'https://cdn.jsdelivr.net/gh/vcmxs/Dupla-exercises-media@d3e64b9f1e1dab64150e81b845f0e30e88dd719a';

const EXERCISE_MEDIA_BASE = String(process.env.EXERCISE_MEDIA_BASE || EXERCISE_MEDIA_FALLBACK_BASE)
  .replace(/\/+$/, '');

const EXERCISE_LIST_COLUMNS = `
  el.id,
  COALESCE(t.name, el.name) AS name,
  el.name AS name_canonical,
  el.muscle_category, el.body_part, el.target_muscle, el.muscle_group, el.equipment,
  el.source, el.dataset_id, el.gif_file, el.thumb_file
`;

/** Same normalization as frontend/lib/exercise-media.ts — keep both in sync. */
function normalizeExerciseName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Turns the stored media file name into a public CDN URL (null when unset). */
function withExerciseMedia(row) {
  if (!row) return null;
  return {
    ...row,
    gif_url: row.gif_file && EXERCISE_MEDIA_BASE ? `${EXERCISE_MEDIA_BASE}/gif/${row.gif_file}` : null,
    thumb_url: row.thumb_file && EXERCISE_MEDIA_BASE ? `${EXERCISE_MEDIA_BASE}/thumb/${row.thumb_file}` : null,
  };
}

// Get exercises (light list, server-side search/filter/pagination)
app.get('/api/v1/exercises', async (req, res) => {
  const pool = require('./config/database');

  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const source = typeof req.query.source === 'string' ? req.query.source.trim() : '';

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const offset = Number.isFinite(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
  // Searching returns a short ranked list; browsing a category returns the whole
  // group (capped so a bad query cannot dump the ~1.4k rows).
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 500)
    : (search ? 30 : 500);

  // `?lang=` / JWT / Accept-Language: the translation join is what localises the
  // card names and the search index together, so a Spanish query never misses a
  // row because its canonical name is English.
  const locale = resolveExerciseLocale(req);
  const conditions = [];
  const params = [locale];

  if (category) {
    params.push(category);
    conditions.push(`el.muscle_category = $${params.length}`);
  }

  if (source) {
    params.push(source);
    conditions.push(`el.source = $${params.length}`);
  }

  // Every token must appear in the normalized name ("curl barra" → both).
  const tokens = normalizeExerciseName(search).split(' ').filter(Boolean);
  for (const token of tokens) {
    params.push(`%${token}%`);
    conditions.push(`COALESCE(t.name_norm, el.name_norm) LIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    params.push(limit);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT ${EXERCISE_LIST_COLUMNS}
         FROM exercise_library el
         LEFT JOIN exercise_translations t
                ON t.exercise_id = el.id
               AND t.locale = $1
               AND t.status = 'published'
         ${where}
        ORDER BY (el.source = 'catalog') DESC, el.muscle_category, COALESCE(t.name, el.name)
        LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    res.json({
      exercises: result.rows.map(withExerciseMedia),
      limit,
      offset
    });
  } catch (err) {
    console.error('Get exercises error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Full exercise record used by the reference dialog (muscles, instructions, media)
app.get('/api/v1/exercises/lookup', async (req, res) => {
  const pool = require('./config/database');
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'Bad Request', message: 'The name query parameter is required.' });
  }

  const locale = resolveExerciseLocale(req);

  try {
    const lookupColumns = `
      el.*,
      COALESCE(t.name, el.name) AS display_name,
      el.name AS name_canonical,
      COALESCE(
        t.instructions,
        CASE WHEN $1 = 'en' THEN el.instructions_en ELSE el.instructions_es END
      ) AS instructions_resolved,
      COALESCE(
        NULLIF(t.instruction_steps, '[]'::jsonb),
        CASE WHEN $1 = 'en' THEN '[]'::jsonb ELSE el.instruction_steps_es END
      ) AS instruction_steps_resolved
    `;
    const lookupJoin = `
      LEFT JOIN exercise_translations t
             ON t.exercise_id = el.id
            AND t.locale = $1
            AND t.status = 'published'
    `;

    let result = await pool.query(
      `SELECT ${lookupColumns}
         FROM exercise_library el
         ${lookupJoin}
        WHERE el.name_norm = $2 OR t.name_norm = $2
        ORDER BY (el.name_norm = $2) DESC, (el.source = 'catalog') DESC
        LIMIT 1`,
      [locale, normalizeExerciseName(name)]
    );

    // Fallback for rows created before name_norm was backfilled.
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT ${lookupColumns}
           FROM exercise_library el
           ${lookupJoin}
          WHERE lower(btrim(el.name)) = lower(btrim($2))
             OR lower(btrim(t.name)) = lower(btrim($2))
          ORDER BY (lower(btrim(el.name)) = lower(btrim($2))) DESC,
                   (el.source = 'catalog') DESC
          LIMIT 1`,
        [locale, name]
      );
    }

    const exercise = result.rows[0] ?? null;
    if (exercise) {
      exercise.name = exercise.display_name ?? exercise.name;
      exercise.name_canonical = exercise.name_canonical ?? exercise.name;
      exercise.instructions = exercise.instructions_resolved ?? null;
      exercise.instruction_steps = exercise.instruction_steps_resolved ?? [];
      exercise.locale = locale;
    }

    res.json({ exercise: withExerciseMedia(exercise) });
  } catch (err) {
    console.error('Exercise lookup error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Get unique muscle categories
app.get('/api/v1/exercises/categories', async (req, res) => {
  const pool = require('./config/database');

  try {
    const result = await pool.query(
      'SELECT DISTINCT muscle_category FROM exercise_library WHERE muscle_category IS NOT NULL AND muscle_category != \'\' ORDER BY muscle_category'
    );

    const categories = result.rows.map(row => row.muscle_category);

    res.json({
      categories
    });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server (Using server.listen instead of app.listen)
server.listen(PORT, () => {
  console.log(`🚀 Gym Training API is running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/v1`);
  console.log(`🔌 Socket.io enabled`);
});

// Add a delay to ensure database connection is ready
setTimeout(() => {
  console.log('Server ready to accept requests');
}, 1000);