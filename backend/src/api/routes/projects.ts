import { Router } from 'express';
import { z } from 'zod';
import { createProject, findProjectByIdForMember, listProjectsForUser } from '../../db/repos/projects.js';
import { requireUser } from '../middleware/session.js';

export const projects = Router();

projects.use(requireUser);

projects.get('/', async (req, res) => {
  const items = await listProjectsForUser(req.user!.id);
  res.json({ projects: items });
});

const createSchema = z.object({ name: z.string().trim().min(2).max(80) });

projects.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
    return;
  }
  const project = await createProject({ name: parsed.data.name, ownerUserId: req.user!.id });
  res.status(201).json({ project: { ...project, role: 'owner' as const } });
});

projects.get('/:id', async (req, res) => {
  const project = await findProjectByIdForMember(req.params.id, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ project });
});
