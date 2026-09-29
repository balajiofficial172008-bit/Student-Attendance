import { Router, Response } from 'express';
import { db } from '../database';
import { generateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { seedPasswords, seedSettings, seedUsers } from '../../src/data/seedData';

const router = Router();

// POST /api/auth/login
router.post('/login', (req: AuthenticatedRequest, res: Response): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  const database = db.get();
  const user = database.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    res.status(404).json({ success: false, message: 'No registered account found with this email.' });
    return;
  }

  const storedPassword = database.passwords[user.email] || seedPasswords[user.email];
  if (storedPassword !== password) {
    db.log('FAILED_LOGIN_ATTEMPT', 'auth', `Failed password attempt for ${email}`, undefined, undefined, req.ip);
    res.status(401).json({ success: false, message: 'Invalid credentials. Password did not match.' });
    return;
  }

  const token = generateToken(user);
  const userWithToken = { ...user, token };

  db.log('USER_LOGIN', 'auth', `User ${user.name} (${user.role}) logged in successfully`, user, user.id, req.ip);

  res.json({
    success: true,
    message: 'Authentication successful.',
    data: userWithToken,
  });
});

// GET /api/auth/me
router.get('/me', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated.' });
    return;
  }
  res.json({ success: true, data: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { userId, currentPassword, newPassword } = req.body;
  const targetId = userId || req.user?.id;

  if (!targetId || !currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Missing required password change fields.' });
    return;
  }

  const database = db.get();
  const user = database.users.find(u => u.id === targetId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  if (database.passwords[user.email] !== currentPassword) {
    res.status(400).json({ success: false, message: 'Current password does not match records.' });
    return;
  }

  database.passwords[user.email] = newPassword;
  db.save(database);
  db.log('PASSWORD_CHANGED', 'auth', `Password changed for user ${user.name}`, user, user.id, req.ip);

  res.json({ success: true, message: 'Password updated successfully.' });
});

// PUT /api/auth/profile
router.put('/profile', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { userId, updates } = req.body;
  const targetId = userId || req.user?.id;

  if (!targetId) {
    res.status(400).json({ success: false, message: 'Target user ID is required.' });
    return;
  }

  const database = db.get();
  const idx = database.users.findIndex(u => u.id === targetId);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'User profile not found.' });
    return;
  }

  database.users[idx] = { ...database.users[idx], ...updates };
  db.save(database);
  db.log('PROFILE_UPDATED', 'auth', `Profile details updated for ${database.users[idx].name}`, database.users[idx], targetId, req.ip);

  res.json({ success: true, message: 'Profile updated.', data: database.users[idx] });
});

// POST /api/auth/reset
router.post('/reset', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const database = db.get();
  database.users = seedUsers;
  database.passwords = seedPasswords;
  database.settings = seedSettings;
  db.save(database);
  db.log('DATA_RESET', 'system', 'Authentication and system settings reset to initial seed values', req.user, undefined, req.ip);

  res.json({ success: true, message: 'System credentials reset to default factory seeds.' });
});

export default router;
