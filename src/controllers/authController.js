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
                id: true, email: true, name: true, role: true, createdAt: true,
            }
        });
        if (!user) {
            console.log('[Auth][getProfile] User not found with ID:', userId);
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const companySettings = yield prisma.companySettings.findFirst();
        const userProfileResponse = Object.assign(Object.assign({}, user), { companyName: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyName) || null, companyAddress: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyAddress) || null, companyPhone: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyPhone) || null, companyEmail: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyEmail) || null, companyWebsite: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyWebsite) || null, companyVatNumber: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyVatNumber) || null, companyLogo: (companySettings === null || companySettings === void 0 ? void 0 : companySettings.companyLogo) || null });
        console.log('[Auth][getProfile] Successfully fetched profile for userId:', userId);
        res.status(200).json(userProfileResponse);
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
// Use Request from 'express' because the 'user' property is now augmented globally
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // 'user' property is now available on Request
        console.log(`[Auth][updateProfile] Attempting for userId: ${userId} with body:`, req.body);
        if (!userId) {
            console.log('[Auth][updateProfile] Unauthorized - userId not in req.user');
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { name } = req.body;
        const { companyName, companyAddress, companyPhone, companyEmail, companyWebsite, companyVatNumber, companyLogo, 
        // Extracted for clarity, they will be used in createData for new settings
        quoteReferencePrefix, lastQuoteReferenceSeq } = req.body;
        const userDataToUpdate = {};
        if (name !== undefined)
            userDataToUpdate.name = name;
        let updatedUserFromDb;
        if (Object.keys(userDataToUpdate).length > 0) {
            updatedUserFromDb = yield prisma.user.update({
                where: { id: userId },
                data: userDataToUpdate,
            });
            console.log(`[Auth][updateProfile] User details updated for userId: ${userId}`);
        }
        else {
            // If no user-specific data to update, just fetch the current user to build the response
            updatedUserFromDb = yield prisma.user.findUnique({ where: { id: userId } });
        }
        if (!updatedUserFromDb) {
            res.status(404).json({ message: "User to update not found." });
            return;
        }
        const userResponse = buildUserResponse(updatedUserFromDb);
        const companySettingsDataToUpdate = {};
        if (companyName !== undefined)
            companySettingsDataToUpdate.companyName = companyName;
        if (companyAddress !== undefined)
            companySettingsDataToUpdate.companyAddress = companyAddress;
        if (companyPhone !== undefined)
            companySettingsDataToUpdate.companyPhone = companyPhone;
        if (companyEmail !== undefined)
            companySettingsDataToUpdate.companyEmail = companyEmail;
        if (companyWebsite !== undefined)
            companySettingsDataToUpdate.companyWebsite = companyWebsite;
        if (companyVatNumber !== undefined)
            companySettingsDataToUpdate.companyVatNumber = companyVatNumber;
        if (companyLogo !== undefined)
            companySettingsDataToUpdate.companyLogo = companyLogo;
        // Handle quoteReferencePrefix and lastQuoteReferenceSeq as update inputs
        if (quoteReferencePrefix !== undefined)
            companySettingsDataToUpdate.quoteReferencePrefix = quoteReferencePrefix;
        if (lastQuoteReferenceSeq !== undefined)
            companySettingsDataToUpdate.lastQuoteReferenceSeq = lastQuoteReferenceSeq;
        let currentCompanySettings = yield prisma.companySettings.findFirst();
        if (Object.keys(companySettingsDataToUpdate).length > 0) {
            if (currentCompanySettings) {
                currentCompanySettings = yield prisma.companySettings.update({
                    where: { id: currentCompanySettings.id },
                    data: companySettingsDataToUpdate,
                });
                console.log(`[Auth][updateProfile] CompanySettings updated (ID: ${currentCompanySettings.id}).`);
            }
            else {
                // Create CompanySettings if they don't exist and there's data for them
                // Ensure values for createData are plain strings/numbers, not update inputs
                const createData = {
                    // Extract actual values from potentially Prisma update inputs
                    quoteReferencePrefix: (typeof quoteReferencePrefix === 'object' && quoteReferencePrefix !== null && 'set' in quoteReferencePrefix)
                        ? quoteReferencePrefix.set
                        : quoteReferencePrefix, // Cast directly if it's already a string or undefined
                    lastQuoteReferenceSeq: (typeof lastQuoteReferenceSeq === 'object' && lastQuoteReferenceSeq !== null && 'set' in lastQuoteReferenceSeq)
                        ? lastQuoteReferenceSeq.set
                        : lastQuoteReferenceSeq, // Cast directly if it's already a number or undefined
                    // Carry over other explicitly handled simple properties for creation
                    companyName: companySettingsDataToUpdate.companyName,
                    companyAddress: companySettingsDataToUpdate.companyAddress,
                    companyPhone: companySettingsDataToUpdate.companyPhone,
                    companyEmail: companySettingsDataToUpdate.companyEmail,
                    companyWebsite: companySettingsDataToUpdate.companyWebsite,
                    companyVatNumber: companySettingsDataToUpdate.companyVatNumber,
                    companyLogo: companySettingsDataToUpdate.companyLogo,
                    // Add more fields here if they are simple types and should be part of creation
                    // and you aren't already handling them above.
                };
                // Provide default values if required fields are still undefined for creation
                if (createData.quoteReferencePrefix === undefined) {
                    createData.quoteReferencePrefix = 'QR';
                }
                if (createData.lastQuoteReferenceSeq === undefined) {
                    createData.lastQuoteReferenceSeq = 0;
                }
                // Filter out undefined values from createData if needed by Prisma's create method
                const filteredCreateData = Object.fromEntries(Object.entries(createData).filter(([, value]) => value !== undefined));
                if (Object.keys(filteredCreateData).length > 0) {
                    currentCompanySettings = yield prisma.companySettings.create({ data: filteredCreateData });
                    console.log(`[Auth][updateProfile] CompanySettings created as none existed (ID: ${currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.id}).`);
                }
            }
        }
        const profileResponse = Object.assign(Object.assign({}, userResponse), { companyName: (currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.companyName) || null, companyAddress: (currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.companyAddress) || null, companyPhone: (currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.companyPhone) || null, companyEmail: (currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.companyEmail) || null, companyWebsite: (currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.companyWebsite) || null, companyVatNumber: (currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.companyVatNumber) || null, companyLogo: (currentCompanySettings === null || currentCompanySettings === void 0 ? void 0 : currentCompanySettings.companyLogo) || null });
        console.log(`[Auth][updateProfile] Profile update processed successfully for userId: ${userId}`);
        res.status(200).json(profileResponse);
    }
    catch (error) {
        console.error('[Auth][updateProfile] Error updating user profile:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') { // "Record to update not found"
                res.status(404).json({ message: "Record to update not found." });
                return;
            }
            console.error('[Auth][updateProfile] Prisma Error Code:', error.code, error.meta);
        }
        res.status(500).json({ message: 'Error updating user profile' });
    }
});
exports.updateUserProfile = updateUserProfile;
