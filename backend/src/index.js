import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import infoRouter from './routes/info.js';
import downloadRouter from './routes/download.js';
import progressRouter from './routes/progress.js';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());

// Allow Chrome extension origins (chrome-extension://*) + localhost for dev
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith('chrome-extension://') ||
        origin.startsWith('http://localhost')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'OPTIONS'],
  })
);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/info', infoRouter);
app.use('/api/download', downloadRouter);
app.use('/api/progress', progressRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));


// ── MongoDB (optional) ──────────────────────────────────────────────────────
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.warn('⚠️  MongoDB not connected:', err.message));
}

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 YT Downloader backend running at http://localhost:${PORT}`);
});
