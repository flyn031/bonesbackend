"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const pdfController_1 = require("../controllers/pdfController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/quote/:orderId', (req, res) => (0, pdfController_1.generateQuote)(req, res));
exports.default = router;
