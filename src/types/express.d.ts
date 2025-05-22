// src/types/express.d.ts
import { Request } from 'express';

// Define the user payload type that can be attached to requests
export interface UserPayload {
  id: string;
  role: string;  // Required
}

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Export a properly typed AuthRequest interface
export type AuthRequest = Request;
