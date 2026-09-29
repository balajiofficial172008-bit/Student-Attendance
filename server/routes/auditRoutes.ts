import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/audit-logs
router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { entityType, limit = '50', search } = req.query;
  const database = db.get();
  let logs = [...database.auditLogs];

  if (entityType) {
    logs = logs.filter(l => l.entityType === entityType);
  }

  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter(l =>
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q)
    );
  }

  const parsedLimit = Math.min(Number(limit) || 50, 200);

  res.json({
    success: true,
    total: logs.length,
    data: logs.slice(0, parsedLimit),
  });
});

export default router;
