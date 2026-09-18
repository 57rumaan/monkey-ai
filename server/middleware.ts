import express from 'express';
import { verifyToken } from './auth';

export function requireAuth(requiredRole?: 'user' | 'admin') {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies?.accessToken;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    if (requiredRole && payload.role !== requiredRole && payload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    (req as any).user = payload;
    next();
  };
}

export async function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.accessToken;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      (req as any).user = payload;
    }
  }
  next();
}
