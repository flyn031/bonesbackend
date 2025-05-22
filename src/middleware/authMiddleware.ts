// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Define UserPayload here if it's not globally declared elsewhere for this file's context,
// or ensure src/types/express.d.ts is correctly extending the Request type for 'user'.
// For now, I'll assume 'UserPayload' is handled by src/types/express.d.ts correctly,
// which extends Express.Request.
interface UserPayload {
  id: string;
  role: string;
  [key: string]: any;
}

// Extend the Request type for this file's context if not already done globally
// This is typically handled by src/types/express.d.ts with `declare global { namespace Express { interface Request { user?: UserPayload; } } }`
// But defining it here helps TypeScript understand `req.user` within this file if global declaration isn't fully picked up yet.
export interface AuthRequest extends Request {
  user?: UserPayload;
}


/**
 * Express middleware to authenticate requests using a JWT Bearer token.
 * - Extracts the token from the 'Authorization: Bearer <token>' header.
 * - Verifies the token using the JWT_SECRET from environment variables.
 * - Attaches the decoded payload to req.user on success.
 * - Sends 401 (Unauthorized) if the token is missing or the header format is wrong.
 * - Sends 403 (Forbidden) if the token is invalid (bad signature, expired, etc.).
 * - Sends 500 (Server Error) if JWT_SECRET is not configured.
 */
export const authenticateToken: RequestHandler = (
  req: AuthRequest, // Use AuthRequest here for type safety
  res: Response,
  next: NextFunction
): void => {
  console.log('\n-------------------- Auth Middleware Start --------------------');
  console.log(`[Auth Middleware] Path: ${req.method} ${req.originalUrl}`);
  // Removed logging sensitive headers for production safety, uncomment if needed for debugging
  // console.log('[Auth Middleware] Incoming Headers:', JSON.stringify(req.headers, null, 2));

  try {
    const authHeader = req.headers.authorization;
    // console.log('[Auth Middleware] Value of req.headers.authorization:', authHeader ? `Present (starts with: ${authHeader.substring(0, 10)}...)` : '!!! Header NOT FOUND or undefined !!!');

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      // console.log('[Auth Middleware] Bearer token extracted successfully.');
    } else {
      console.log('[Auth Middleware] Authorization header missing or not in Bearer format.');
    }

    if (!token) {
      console.log('[Auth Middleware] No valid token extracted. Sending 401.');
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('[Auth Middleware] FATAL: JWT_SECRET environment variable is not set!');
        res.status(500).json({ error: 'Server configuration error: Missing authentication secret' });
        return;
      }

      // Verify the token and cast the payload directly to UserPayload
      // This works assuming the JWT payload matches the UserPayload structure
      const decodedPayload = jwt.verify(token, secret) as UserPayload;
      // console.log('[Auth Middleware] Token VERIFIED successfully. Decoded payload:', { userId: decodedPayload?.id, role: decodedPayload?.role });

      // Assign the decoded payload to req.user
      req.user = decodedPayload;

      console.log('[Auth Middleware] Authentication successful. Calling next().');
      console.log('-------------------- Auth Middleware End ----------------------\n');
      next();

    } catch (jwtError: any) {
      console.error('[Auth Middleware] Token verification FAILED:', jwtError.name, '-', jwtError.message);
      res.status(403).json({ error: 'Forbidden: Invalid or expired token', details: jwtError.name });
    }

  } catch (error) {
    console.error('[Auth Middleware] UNEXPECTED internal error:', error);
    res.status(500).json({ error: 'Internal server error during authentication check' });
  }
};

/**
 * Express middleware to authorize requests based on user roles.
 * Must be used after authenticateToken middleware.
 * - Checks if req.user exists and has a 'role' property.
 * - Checks if the user's role is included in the allowedRoles array.
 * - Sends 403 (Forbidden) if the user is not authorized.
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    console.log(`[Auth Middleware][authorizeRole] Checking roles for user: ${req.user?.id}, current role: ${req.user?.role}`);

    if (!req.user || !req.user.role) {
      console.log('[Auth Middleware][authorizeRole] User or user role not found on request after authentication.');
      res.status(403).json({ error: 'Forbidden: Role information missing.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[Auth Middleware][authorizeRole] User ${req.user.id} with role "${req.user.role}" is not authorized for this action. Allowed roles: ${allowedRoles.join(', ')}`);
      res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
      return;
    }

    console.log(`[Auth Middleware][authorizeRole] User ${req.user.id} with role "${req.user.role}" is authorized. Calling next().`);
    next();
  };
};

// Also export UserPayload interface for convenience
export { UserPayload };