"use strict";
// backend/src/routes/timeEntries.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const timeEntryController_1 = require("../controllers/timeEntryController");
const router = express_1.default.Router();
// Protect all routes with authentication
router.use(authMiddleware_1.authenticateToken);
// Time entry CRUD routes
router.post('/', timeEntryController_1.createTimeEntry);
router.get('/', timeEntryController_1.getTimeEntries);
router.get('/rd-summary', timeEntryController_1.getRdSummary); // Must come before /:id route
router.get('/:id', timeEntryController_1.getTimeEntryById);
router.put('/:id', timeEntryController_1.updateTimeEntry);
router.delete('/:id', timeEntryController_1.deleteTimeEntry);
// Bulk operations
router.patch('/bulk/mark-rd', timeEntryController_1.bulkMarkAsRd);
// Employee-specific routes
router.get('/employee/:employeeId/timesheet', timeEntryController_1.getEmployeeTimesheet);
exports.default = router;
