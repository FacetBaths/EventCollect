import express, { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

const JWT_EXPIRES_IN = '7d';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

function sanitizeUser(user: any) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      getSecret(),
      { expiresIn: JWT_EXPIRES_IN },
    );

    logger.info('User logged in', { userId: user._id, email: user.email, role: user.role });

    return res.json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (err: any) {
    logger.error('Login error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', verifyToken as any, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: sanitizeUser(req.user!) });
});

// ─── PUT /api/auth/change-password ──────────────────────────────────────────
router.put('/change-password', verifyToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    // Re-fetch with password field
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ success: false, error: 'Current password is incorrect' });

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    logger.info('Password changed', { userId: user._id });
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    logger.error('Change password error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/auth/users (admin only) ────────────────────────────────────────
router.get('/users', verifyToken as any, requireAdmin as any, async (_req, res: Response) => {
  try {
    const users = await User.find({}).select('-password').sort({ name: 1 });
    res.json({ success: true, data: users });
  } catch (err: any) {
    logger.error('Get users error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── POST /api/auth/users (admin only) ───────────────────────────────────────
router.post('/users', verifyToken as any, requireAdmin as any, async (req, res: Response) => {
  try {
    const { name, email, password, role, leapRepId, leapCallCenterRepId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A user with that email already exists' });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'standard',
      leapRepId: leapRepId ?? null,
      leapCallCenterRepId: leapCallCenterRepId ?? null,
    });

    await user.save();
    logger.info('User created by admin', { newUserId: user._id, email: user.email });
    return res.status(201).json({ success: true, data: sanitizeUser(user) });
  } catch (err: any) {
    logger.error('Create user error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── PUT /api/auth/users/:id (admin only) ────────────────────────────────────
router.put('/users/:id', verifyToken as any, requireAdmin as any, async (req, res: Response) => {
  try {
    const { name, role, leapRepId, leapCallCenterRepId, isActive, newPassword } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) user.role = role;
    if (leapRepId !== undefined) user.leapRepId = leapRepId ?? null;
    if (leapCallCenterRepId !== undefined) user.leapCallCenterRepId = leapCallCenterRepId ?? null;
    if (isActive !== undefined) user.isActive = isActive;
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      }
      user.password = newPassword; // pre-save hook hashes it
    }

    await user.save();
    logger.info('User updated by admin', { userId: user._id });
    return res.json({ success: true, data: sanitizeUser(user) });
  } catch (err: any) {
    logger.error('Update user error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
