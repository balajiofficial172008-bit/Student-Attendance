import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { Settings } from '../../src/types';

const router = Router();

router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const database = db.get();
  res.json({ success: true, data: database.settings });
});

router.put('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const updates: Partial<Settings> = req.body;
  const database = db.get();
  database.settings = { ...database.settings, ...updates };
  db.log('SETTINGS_UPDATED', 'settings', 'Academic and attendance rules updated', req.user, undefined, req.ip);
  db.save(database);
  res.json({ success: true, message: 'Settings saved.', data: database.settings });
});

export default router;
