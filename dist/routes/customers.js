"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/customers.ts
const express_1 = require("express");
// Import controller functions
const customerController_1 = require("../controllers/customerController");
// TEMPORARILY use direct imports instead of contactRoutes
const contactController_1 = require("../controllers/contactController");
// Assuming authenticateToken expects (req: Request, res: Response, next: NextFunction)
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Apply authentication middleware to all customer routes
router.use(authMiddleware_1.authenticateToken);
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
