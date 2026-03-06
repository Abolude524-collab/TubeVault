import express from 'express';
import mongoose from 'mongoose';
import { getVideoInfo, spawnDownload } from '../services/ytdlp.js';
import Download from '../models/Download.js';

import { progressMap } from '../services/state.js';

const router = express.Router();

/**
 * GET /api/download?url=<youtube-url>&format=mp4&quality=720&id=<download-id>
 * Streams the downloaded file directly to the client.
 */
router.get('/', async (req, res) => {
    const { url, format = 'mp4', quality = '720', id } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing ?url= parameter' });
    }

    if (!['mp4', 'mp3'].includes(format)) {
        return res.status(400).json({ error: 'Invalid format. Use mp4 or mp3.' });
    }

    let info;
    try {
        info = await getVideoInfo(url);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch video info', details: err.message });
    }

    // Sanitize filename
    const safeTitle = info.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 100);
    const filename = `${safeTitle}.${format}`;

    // Set headers for file download
    const contentType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Transfer-Encoding', 'chunked');

    // Initialize progress if ID is provided
    if (id) {
        progressMap.set(id, { progress: 0, status: 'starting' });
    }

    // Spawn yt-dlp and pipe stdout → response
    const proc = spawnDownload(url, format, quality, (percent) => {
        if (id) {
            progressMap.set(id, {
                progress: percent,
                status: 'downloading',
                title: info.title,
                thumbnail: info.thumbnail
            });
        }
    });


    proc.stdout.pipe(res);

    proc.stderr.on('data', (data) => {
        const msg = data.toString();
        // Log everything to help diagnose 0-byte downloads (e.g. missing ffmpeg)
        console.log('[yt-dlp]', msg);
    });

    proc.on('error', (err) => {
        console.error('[yt-dlp spawn error]', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'yt-dlp process failed', details: err.message });
        }
    });

    proc.on('close', async (code) => {
        if (code !== 0) {
            console.error(`[yt-dlp] exited with code ${code}`);
            if (id) progressMap.set(id, { progress: 0, status: 'error' });
        } else {
            if (id) progressMap.set(id, { progress: 100, status: 'done' });
            // Save to MongoDB if connected
            if (mongoose.connection.readyState === 1) {
                try {
                    await Download.create({
                        videoId: info.id,
                        title: info.title,
                        url,
                        format,
                        quality: `${quality}p`,
                        thumbnail: info.thumbnail,
                        uploader: info.uploader,
                    });
                } catch (dbErr) {
                    console.warn('[MongoDB] Failed to save download record:', dbErr.message);
                }
            }
            // Cleanup progress after some time
            if (id) {
                setTimeout(() => progressMap.delete(id), 10000);
            }
        }
    });

    // If client disconnects, kill yt-dlp
    req.on('close', () => {
        if (!proc.killed) {
            proc.kill('SIGTERM');
            if (id) progressMap.delete(id);
        }
    });

});

export default router;
