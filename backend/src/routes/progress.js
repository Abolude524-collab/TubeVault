import express from 'express';
import { progressMap } from '../services/state.js';

const router = express.Router();

/**
 * GET /api/progress?id=<download-id>
 */
router.get('/', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing ?id=' });

    const progress = progressMap.get(id);
    if (progress === undefined) {
        return res.json({ progress: 0, status: 'not_found' });
    }

    res.json(progress);
});

export default router;
