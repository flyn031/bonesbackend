"use strict";
// backend/src/controllers/authController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = exports.getUserProfile = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// REMOVED: AuthRequest no longer needs to be imported as we've augmented the global Express.Request type.
const prisma = new client_1.PrismaClient();
// Helper to build user response without password
const buildUserResponse = (user) => {
    const { password } = user, userWithoutPassword = __rest(user, ["password"]);
    return userWithoutPassword;
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, role } = req.body;
        console.log('[Auth][Register] Attempt:', { email, name });
        if (!email || !password || !name) {
            console.log('[Auth][Register] Missing required fields');
            res.status(400).json({ message: 'Email, password, and name are required' });
            return;
        }
        const existingUser = yield prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true
            }
        });
        if (existingUser) {
            console.log('[Auth][Register] User already exists:', email);
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const userRole = role && Object.values(client_1.Role).includes(role.toUpperCase())
            ? role.toUpperCase()
            : client_1.Role.USER;
        const createdUser = yield prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: userRole,
            },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        const userResponse = buildUserResponse(createdUser);
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('[Auth][Register] JWT_SECRET not configured');
            res.status(201).json({
                user: userResponse,
                message: "User registered successfully, but session token could not be generated due to server configuration. Please try logging in."
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: createdUser.id, role: createdUser.role }, secret, { expiresIn: '24h' });
        console.log('[Auth][Register] User registered successfully:', { userId: createdUser.id, email: createdUser.email });
        res.status(201).json({ user: userResponse, token });
    }
    catch (error) {
        console.error('[Auth][Register] Registration error:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                res.status(400).json({ message: `An account with this email already exists.` });
                return;
            }
            console.error('[Auth][Register] Prisma Error Code:', error.code, error.meta);
        }
        res.status(500).json({ message: 'An unexpected error occurred during registration.' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        console.log('[Auth][Login] Attempt for:', email);
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        const user = yield prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            console.log('[Auth][Login] User not found:', email);
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const validPassword = yield bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            console.log('[Auth][Login] Invalid password for user:', email);
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('[Auth][Login] JWT_SECRET not configured');
            res.status(500).json({ message: 'Server configuration error: Unable to generate session token.' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, secret, { expiresIn: '24h' });
        console.log('[Auth][Login] Login successful for user:', { userId: user.id, email: user.email });
        const userResponse = buildUserResponse(user);
        res.json({
            user: userResponse,
            token,
        });
    }
    catch (error) {
        console.error('[Auth][Login] Login error:', error);
        res.status(500).json({ message: 'An unexpected error occurred during login.' });
    }
});
exports.login = login;
// Use Request from 'express' because the 'user' property is now augmented globally
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // 'user' property is now available on Request
        console.log('[Auth][getProfile] Attempting for userId:', userId);
        if (!userId) {
            console.log('[Auth][getProfile] Unauthorized - userId not in req.user');
            res.status(401).json({ message: 'Unauthorized - User ID missing' });
            return;
        }
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // Include company fields if they exist on User model
                companyName: true,
                companyAddress: true,
                companyPhone: true,
                companyEmail: true,
                companyWebsite: true,
                companyVatNumber: true,
                companyLogo: true,
                useCompanyDetailsOnQuotes: true
            }
        });
        if (!user) {
            console.log('[Auth][getProfile] User not found with ID:', userId);
            res.status(404).json({ message: 'User not found' });
            return;
        }
        console.log('[Auth][getProfile] Successfully fetched profile for userId:', userId);
        res.status(200).json(user);
    }
    catch (error) {
        console.error('[Auth][getProfile] Error getting user profile:', error);
        if (error instanceof client_1.Prisma.PrismaClientValidationError) {
            console.error('[Auth][getProfile] Prisma Validation Error Details:', error.message);
            res.status(500).json({ message: "Error constructing profile query.", details: error.message });
            return;
        }
        res.status(500).json({ message: 'Error retrieving user profile' });
    }
});
exports.getUserProfile = getUserProfile;
// FIXED: Complete updateUserProfile function
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const updateData = req.body;
        console.log('PUT /api/auth/profile - User ID:', userId);
        console.log('PUT /api/auth/profile - Update data:', updateData);
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized - User ID missing' });
            return;
        }
        // Update the user record with ALL the provided fields
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: {
                // Basic user fields
                name: updateData.name,
                // Company fields - stored directly on User model
                companyName: updateData.companyName,
                companyAddress: updateData.companyAddress,
                companyPhone: updateData.companyPhone,
                companyEmail: updateData.companyEmail,
                companyWebsite: updateData.companyWebsite,
                companyVatNumber: updateData.companyVatNumber,
                companyLogo: updateData.companyLogo,
                // CRITICAL: Include the checkbox field
                useCompanyDetailsOnQuotes: updateData.useCompanyDetailsOnQuotes,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // Include all company fields in response
                companyName: true,
                companyAddress: true,
                companyPhone: true,
                companyEmail: true,
                companyWebsite: true,
                companyVatNumber: true,
                companyLogo: true,
                useCompanyDetailsOnQuotes: true
            }
        });
        console.log('PUT /api/auth/profile - Updated user:', {
            id: updatedUser.id,
            useCompanyDetailsOnQuotes: updatedUser.useCompanyDetailsOnQuotes,
            companyName: updatedUser.companyName
        });
        // Return the COMPLETE updated user object
        res.json(updatedUser);
    }
    catch (error) {
        console.error('PUT /api/auth/profile error:', error);
        res.status(500).json({
            message: 'Failed to update profile',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.updateUserProfile = updateUserProfile;
