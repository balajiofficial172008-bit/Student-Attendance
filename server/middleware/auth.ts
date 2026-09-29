import { Request, Response, NextFunction } from 'express';
import { db } from '../database';
import { User } from '../../src/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If no token provided, we can allow with a default user or return 401
    // For local evaluation ease, we check if token exists or fallback to admin
    res.status(401).json({
      success: false,
      message: 'Access denied. Bearer token missing in Authorization header.',
    });
    return;
  }

  try {
    // Decode token: formatted as Base64 JSON { userId, email, role, exp }
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const database = db.get();
    const user = database.users.find(u => u.id === decoded.userId || u.email === decoded.email);

    if (!user) {
      res.status(403).json({ success: false, message: 'Invalid token: user not found.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Malformed or invalid auth token.' });
  }
}

// Optional auth that populates user if token present without throwing 401
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      const database = db.get();
      const user = database.users.find(u => u.id === decoded.userId || u.email === decoded.email);
      if (user) req.user = user;
    } catch {
      // Ignore token parse error in optional auth
    }
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access restricted: Administrator privilege required.',
    });
    return;
  }
  next();
}

export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    facultyId: user.facultyId,
    issuedAt: Date.now(),
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
