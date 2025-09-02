"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/customers.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
// Import controller functions
const customerController_1 = require("../controllers/customerController");
// TEMPORARILY use direct imports instead of contactRoutes
const contactController_1 = require("../controllers/contactController");
// Assuming authenticateToken expects (req: Request, res: Response, next: NextFunction)
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// Apply authentication middleware to all customer routes
router.use(authMiddleware_1.authenticateToken);
// --- Customer Import Route ---
router.post('/import', upload.single('customers'), customerController_1.importCustomers);
// --- Standard Customer Routes ---
router.route('/')
    .post(customerController_1.createCustomer)
    .get(customerController_1.getCustomers);
router.route('/:id')
    .get(customerController_1.getCustomer)
    .put(customerController_1.updateCustomer)
    .delete(customerController_1.deleteCustomer);
// --- Route for getting orders for a specific customer ---
router.get('/:customerId/orders', customerController_1.getCustomerOrders);
// DIRECT CONTACT ROUTES (temporary until we implement modular approach)
// Fix: Use RequestHandler pattern instead of async arrow functions
router.post('/:customerId/contacts', (req, res, next) => {
    (0, contactController_1.createContactPerson)(req, res)
        .catch(next);
});
router.get('/:customerId/contacts', (req, res, next) => {
    (0, contactController_1.getContactPersonsForCustomer)(req, res)
        .catch(next);
});
router.put('/:customerId/contacts/:contactId/set-primary', (req, res, next) => {
    (0, contactController_1.setPrimaryContactPerson)(req, res)
        .catch(next);
});
exports.default = router;
