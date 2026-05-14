import { Router } from 'express';
import { z } from 'zod';
import {
  adminSetCostCeiling,
  adminSetProjectStatus,
  listAllTenants,
  platformSpendUsd,
} from '../../db/repos/admin.js';
import { requireAdmin } from '../middleware/session.js';

export const admin = Router();

admin.use(requireAdmin);

admin.get('/tenants', async (_req, res) => {
  const tenants = await listAllTenants();
  res.json({ tenants });
});

admin.get('/costs/summary', async (_req, res) => {
  const [last30d, last7d] = await Promise.all([platformSpendUsd(30), platformSpendUsd(7)]);
  res.json({ last30d, last7d });
});

const statusSchema = z.object({ status: z.enum(['active', 'paused', 'archived']) });

admin.patch('/tenants/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const project = await adminSetProjectStatus(req.params.id, parsed.data.status);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ project });
});

const ceilingSchema = z.object({ monthlyCostCeilingUsd: z.number().int().min(0).max(10_000) });

admin.patch('/tenants/:id/cost-ceiling', async (req, res) => {
  const parsed = ceilingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const project = await adminSetCostCeiling(req.params.id, parsed.data.monthlyCostCeilingUsd);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ project });
});
