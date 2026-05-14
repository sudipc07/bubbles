import { Router } from 'express';
import { listAllTenants, platformSpendUsd } from '../../db/repos/admin.js';
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
