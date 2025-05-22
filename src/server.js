"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pdf_1 = __importDefault(require("./routes/pdf"));
const auth_1 = __importDefault(require("./routes/auth"));
const customers_1 = __importDefault(require("./routes/customers"));
const orders_1 = __importDefault(require("./routes/orders"));
const financial_1 = __importDefault(require("./routes/financial"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const materials_1 = __importDefault(require("./routes/materials"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const jobCosts_1 = __importDefault(require("./routes/jobCosts"));
const quotes_1 = __importDefault(require("./routes/quotes"));
const jobMaterials_1 = __importDefault(require("./routes/jobMaterials"));
const audit_1 = __importDefault(require("./routes/audit"));
// Import the fixed inventory routes
const inventory_1 = __importDefault(require("./routes/inventory"));
// ADD THIS LINE: Import employee routes
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
// Middleware order is important!
// 1. Body parsing middleware must come first
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// --- DEBUGGING: Explicit OPTIONS handler ---
// Add this BEFORE app.use(cors({...})) to see if OPTIONS requests are handled
app.options('*', (req, res) => {
    console.log(`>>> Explicit OPTIONS handler hit for path: ${req.path}`);
    // Manually set CORS headers that the browser expects for preflight
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Must allow Authorization
    res.header('Access-Control-Allow-Credentials', 'true');
    console.log('>>> Responding to OPTIONS request with status 204');
    res.status(204).send(); // Respond with 204 No Content - Standard for preflight success
});
// --- END DEBUGGING ---
// 2. CORS - Keep this AFTER the explicit OPTIONS handler
// The cors() middleware should normally handle OPTIONS automatically,
// but we added the above handler for debugging.
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173', // Your confirmed frontend port
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Fixed missing quotes
    allowedHeaders: ['Content-Type', 'Authorization'], // <<< Explicitly allow Authorization header
    credentials: true // Recommended for auth flows with cookies/tokens
}));
// 3. Enhanced logging middleware
app.use((req, res, next) => {
    // Log details for non-OPTIONS requests
    if (req.method !== 'OPTIONS') {
        const authHeader = req.headers.authorization;
        const authLog = authHeader
            ? authHeader.startsWith('Bearer ')
                ? `Bearer token present: ${authHeader.substring(0, 20)}...`
                : 'Authorization header present but not Bearer'
            : 'No Authorization header';
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
            body: req.body, // Be careful logging bodies in production
            auth: authLog,
            query: req.query,
            params: req.params
        });
    }
    else {
        // Optionally log that an OPTIONS request passed through (if the explicit handler above was commented out)
        // console.log(`[${new Date().toISOString()}] OPTIONS request for ${req.path} passed through CORS middleware`);
    }
    next();
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error caught by global handler:', err);
    res.status(500).json({ error: 'Internal server error occurred.' });
});
// 4. Routes
app.use('/api/auth', auth_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/financial', financial_1.default);
app.use('/api/pdf', pdf_1.default);
app.use('/api/suppliers', suppliers_1.default);
app.use('/api/materials', materials_1.default);
// Updated: Route for dual-purpose inventory items
// Now our special inventory endpoints are available under /api/inventory
app.use('/api/inventory', inventory_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/jobs', jobs_1.default);
app.use('/api/jobs', jobMaterials_1.default);
app.use('/api', jobCosts_1.default);
app.use('/api/quotes', quotes_1.default);
// ADD AUDIT ROUTES - These provide audit trail functionality
app.use('/api/audit', audit_1.default);
// ADD THIS LINE: Register employee routes
app.use('/api/employees', employeeRoutes_1.default);
// Basic health check endpoint
app.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'healthy', database: 'connected' });
    }
    catch (error) {
        console.error("Database health check failed:", error);
        res.status(500).json({ status: 'error', database: 'disconnected', message: 'Failed to connect to database.' });
    }
}));
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
