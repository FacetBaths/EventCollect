import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

/**
 * Verify JWT and attach the full user document to req.user.
 * Returns 401 if no token or token is invalid/expired.
 */
export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getSecret()) as JwtPayload;
    const user = await User.findById(payload.id).select('-password');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Invalid or inactive user' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token is invalid or expired' });
  }
}

/**
 * Require the authenticated user to have the admin role.
 * Must be used after verifyToken.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}
