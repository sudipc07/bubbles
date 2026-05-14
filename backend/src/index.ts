import express from 'express';
import { env } from './config/env.js';
import { health } from './api/routes/health.js';
import { auth } from './api/routes/auth.js';
import { projects } from './api/routes/projects.js';
import { pipeline } from './api/routes/pipeline.js';
import { admin } from './api/routes/admin.js';
import { events } from './api/sse/events.js';
import { attachUser } from './api/middleware/session.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(attachUser);

app.use('/api', health);
app.use('/api/auth', auth);
app.use('/api/projects', projects);
app.use('/api/pipeline', pipeline);
app.use('/api/admin', admin);
app.use('/api/events', events);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// Generic error sink — keeps stack traces out of responses but logs them.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
});

app.listen(env.PORT, () => {
  console.log(`[bubbles-api] listening on :${env.PORT} (${env.NODE_ENV})`);
});
