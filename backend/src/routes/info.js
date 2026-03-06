import express from 'express';
import { getVideoInfo, normalizeYtDlpError } from '../services/ytdlp.js';

const router = express.Router();

/**
 * GET /api/info?url=<youtube-url>
 * Returns video metadata and available quality/format options.
 */
router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing ?url= parameter' });
    }

    // Basic YouTube URL validation
    if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const info = await getVideoInfo(url);
        res.json(info);
    } catch (err) {
        const normalized = normalizeYtDlpError(err);
        console.error('[/api/info] Error:', normalized.details);
        res.status(normalized.status).json({ error: normalized.error, details: normalized.details });
    }
});

export default router;
