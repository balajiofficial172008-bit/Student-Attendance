import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { Notification } from '../../src/types';

const router = Router();

router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { userId } = req.query;
  const database = db.get();
  let notifs = [...database.notifications];
  if (userId) {
    notifs = notifs.filter(n => n.userId === userId || n.userId === 'u1');
  }
  res.json({
    success: true,
    unreadCount: notifs.filter(n => !n.read).length,
    data: notifs,
  });
});

router.post('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { title, message, type = 'info', userId } = req.body;
  const database = db.get();

  const newNotif: Notification = {
    id: `notif_${Date.now()}`,
    userId: userId || req.user?.id || 'u1',
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  };

  database.notifications.unshift(newNotif);
  if (database.notifications.length > 100) database.notifications = database.notifications.slice(0, 100);
  db.save(database);

  res.status(201).json({ success: true, data: newNotif });
});

router.patch('/:id/read', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const notif = database.notifications.find(n => n.id === id);
  if (notif) notif.read = true;
  db.save(database);
  res.json({ success: true });
});

router.post('/mark-all-read', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const database = db.get();
  database.notifications.forEach(n => { n.read = true; });
  db.save(database);
  res.json({ success: true, message: 'All notifications marked as read.' });
});

router.delete('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  database.notifications = database.notifications.filter(n => n.id !== id);
  db.save(database);
  res.json({ success: true, message: 'Notification removed.' });
});

export default router;
