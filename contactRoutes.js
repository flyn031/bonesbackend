"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/contactRoutes.ts
const express_1 = __importDefault(require("express"));
// Fix import path to match project structure
const authMiddleware_1 = require("../../middleware/authMiddleware");
const contactController_1 = require("../../controllers/contactController");
const router = express_1.default.Router({ mergeParams: true });
// Get all contacts for a customer
router.get('/', authMiddleware_1.authenticateToken, contactController_1.getContactPersonsForCustomer);
// Create a new contact for a customer
router.post('/', authMiddleware_1.authenticateToken, contactController_1.createContactPerson);
// Update a contact
router.put('/:contactId', authMiddleware_1.authenticateToken, contactController_1.updateContactPerson);
// Delete a contact
router.delete('/:contactId', authMiddleware_1.authenticateToken, contactController_1.deleteContactPerson);
// Set a contact as primary
router.put('/:contactId/set-primary', authMiddleware_1.authenticateToken, contactController_1.setPrimaryContactPerson);
exports.default = router;
