import { Router } from 'express';
import { subscribe } from '../../lib/eventBus.js';
import { findProjectByIdForMember } from '../../db/repos/projects.js';
import { requireUser } from '../middleware/session.js';

export const events = Router();

events.use(requireUser);

// GET /api/events/:projectId  — Server-Sent Events stream of pipeline events.
events.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user!.id;

  const allowed = await findProjectByIdForMember(projectId, userId);
  if (!allowed) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Initial hello so the client knows the stream is open.
  res.write(`event: hello\ndata: ${JSON.stringify({ projectId })}\n\n`);

  const unsubscribe = subscribe(projectId, (e) => {
    res.write(`event: pipeline\ndata: ${JSON.stringify(e)}\n\n`);
  });

  // Periodic comment to keep proxies from closing the connection.
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});
