"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Express middleware to authenticate requests using a JWT Bearer token.
 * - Extracts the token from the 'Authorization: Bearer <token>' header.
 * - Verifies the token using the JWT_SECRET from environment variables.
 * - Attaches the decoded payload to req.user on success.
 * - Sends 401 (Unauthorized) if the token is missing or the header format is wrong.
 * - Sends 403 (Forbidden) if the token is invalid (bad signature, expired, etc.).
 * - Sends 500 (Server Error) if JWT_SECRET is not configured.
 */
const authenticateToken = (req, // Use AuthRequest here for type safety
res, next) => {
    console.log('\n-------------------- Auth Middleware Start --------------------');
    console.log(`[Auth Middleware] Path: ${req.method} ${req.originalUrl}`);
    // Removed logging sensitive headers for production safety, uncomment if needed for debugging
    // console.log('[Auth Middleware] Incoming Headers:', JSON.stringify(req.headers, null, 2));
    try {
        const authHeader = req.headers.authorization;
        // console.log('[Auth Middleware] Value of req.headers.authorization:', authHeader ? `Present (starts with: ${authHeader.substring(0, 10)}...)` : '!!! Header NOT FOUND or undefined !!!');
        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            // console.log('[Auth Middleware] Bearer token extracted successfully.');
        }
        else {
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
            const decodedPayload = jsonwebtoken_1.default.verify(token, secret);
            // console.log('[Auth Middleware] Token VERIFIED successfully. Decoded payload:', { userId: decodedPayload?.id, role: decodedPayload?.role });
            // Assign the decoded payload to req.user
            req.user = decodedPayload;
            console.log('[Auth Middleware] Authentication successful. Calling next().');
            console.log('-------------------- Auth Middleware End ----------------------\n');
            next();
        }
        catch (jwtError) {
            console.error('[Auth Middleware] Token verification FAILED:', jwtError.name, '-', jwtError.message);
            res.status(403).json({ error: 'Forbidden: Invalid or expired token', details: jwtError.name });
        }
    }
    catch (error) {
        console.error('[Auth Middleware] UNEXPECTED internal error:', error);
        res.status(500).json({ error: 'Internal server error during authentication check' });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Express middleware to authorize requests based on user roles.
 * Must be used after authenticateToken middleware.
 * - Checks if req.user exists and has a 'role' property.
 * - Checks if the user's role is included in the allowedRoles array.
 * - Sends 403 (Forbidden) if the user is not authorized.
 */
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        var _a, _b;
        console.log(`[Auth Middleware][authorizeRole] Checking roles for user: ${(_a = req.user) === null || _a === void 0 ? void 0 : _a.id}, current role: ${(_b = req.user) === null || _b === void 0 ? void 0 : _b.role}`);
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
exports.authorizeRole = authorizeRole;
