import { Router } from 'express';
import { pool } from '../../db/index.js';

export const health = Router();

health.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'bubbles-api' });
});

health.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', error: (err as Error).message });
  }
});
