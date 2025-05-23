"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express"); // <--- IMPORTANT: Ensure 'Request' is imported here
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // <--- REMOVED AuthRequest from this import
const router = (0, express_1.Router)();
// Auth routes
router.post('/login', authController_1.login);
router.post('/register', authController_1.register);
// User me route
router.get('/me', authMiddleware_1.authenticateToken, (req, res) => {
    res.json({ message: 'Protected route accessed successfully', user: req.user });
});
// User profile routes
router.get('/profile', authMiddleware_1.authenticateToken, authController_1.getUserProfile);
router.put('/profile', authMiddleware_1.authenticateToken, authController_1.updateUserProfile);
exports.default = router;
