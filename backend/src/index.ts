import express from 'express';
import { env } from './config/env.js';
import { health } from './api/routes/health.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use('/api', health);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(env.PORT, () => {
  console.log(`[bubbles-api] listening on :${env.PORT} (${env.NODE_ENV})`);
});
