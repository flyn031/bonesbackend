import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    console.log('[Auth] Checking authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'none');
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('[Auth] Extracted token:', token ? `${token.substring(0, 20)}...` : 'none');

    if (!token) {
      console.log('[Auth] No token provided');
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('[Auth] JWT_SECRET not configured');
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }

      const decoded = jwt.verify(token, secret);
      console.log('[Auth] Token verified successfully:', {
        userId: (decoded as any).id,
        role: (decoded as any).role
      });
      
      req.user = decoded as { id: string; role: string };
      next();
    } catch (jwtError) {
      console.error('[Auth] JWT verification failed:', jwtError);
      res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
};