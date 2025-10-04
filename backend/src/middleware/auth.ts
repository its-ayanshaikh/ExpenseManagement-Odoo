import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt';
import { User } from '../models/User';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      tokenPayload?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 * Extracts user information from token and attaches to request
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify the token
    let payload: JWTPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token verification failed';
      res.status(401).json({
        status: 'error',
        message,
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Fetch user from database to ensure they still exist and get latest data
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Verify that the token data matches current user data
    if (user.email !== payload.email || user.companyId !== payload.companyId) {
      res.status(401).json({
        status: 'error',
        message: 'Token data mismatch',
        code: 'TOKEN_MISMATCH'
      });
      return;
    }

    // Attach user and token payload to request
    req.user = user;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.userId);
      
      if (user && user.email === payload.email && user.companyId === payload.companyId) {
        req.user = user;
        req.tokenPayload = payload;
      }
    } catch (error) {
      // Token is invalid, but we continue without user for optional auth
      console.warn('Optional auth token verification failed:', error);
    }

    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    next(); // Continue even if there's an error
  }
}

/**
 * Middleware to require authentication
 * Should be used after authenticateToken middleware
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }
  
  next();
}