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
app.options('*', (req, res) => {
    console.log(`>>> Explicit OPTIONS handler hit for path: ${req.path}`);
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    console.log('>>> Responding to OPTIONS request with status 204');
    res.status(204).send();
});
// 2. CORS
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// 3. Enhanced logging middleware
app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') {
        const authHeader = req.headers.authorization;
        const authLog = authHeader
            ? authHeader.startsWith('Bearer ')
                ? `Bearer token present: ${authHeader.substring(0, 20)}...`
                : 'Authorization header present but not Bearer'
            : 'No Authorization header';
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
            body: req.body,
            auth: authLog,
            query: req.query,
            params: req.params
        });
    }
    next();
});
// 🔧 DEBUGGING: Track request flow with detailed route checking
app.use((req, res, next) => {
    console.log(`🔍 [SERVER] ${req.method} ${req.path} - Before route registration`);
    // 🚨 SPECIAL DEBUG FOR QUOTES
    if (req.path.startsWith('/api/quotes')) {
        console.log(`🚨 [QUOTES DEBUG] ${req.method} ${req.path} detected - checking route conflict`);
        console.log(`🚨 [QUOTES DEBUG] Original URL: ${req.originalUrl}`);
        console.log(`🚨 [QUOTES DEBUG] Full path: ${req.path}`);
    }
    next();
});
// 4. Routes - DEBUGGING EACH REGISTRATION
console.log('🔧 [SERVER] Registering auth routes...');
app.use('/api/auth', auth_1.default);
console.log('🔧 [SERVER] Registering customer routes...');
app.use('/api/customers', customers_1.default);
console.log('🔧 [SERVER] Registering order routes...');
app.use('/api/orders', orders_1.default);
console.log('🔧 [SERVER] Registering financial routes...');
app.use('/api/financial', financial_1.default);
console.log('🔧 [SERVER] Registering pdf routes...');
app.use('/api/pdf', pdf_1.default);
console.log('🔧 [SERVER] Registering supplier routes...');
app.use('/api/suppliers', suppliers_1.default);
console.log('🔧 [SERVER] Registering material routes...');
app.use('/api/materials', materials_1.default);
// Updated: Route for dual-purpose inventory items
console.log('🔧 [SERVER] Registering inventory routes...');
app.use('/api/inventory', inventory_1.default);
console.log('🔧 [SERVER] Registering dashboard routes...');
app.use('/api/dashboard', dashboard_1.default);
console.log('🔧 [SERVER] Registering job routes...');
app.use('/api/jobs', jobs_1.default);
console.log('🔧 [SERVER] Registering job material routes (ALSO /api/jobs)...');
app.use('/api/jobs', jobMaterials_1.default); // 🚨 POTENTIAL CONFLICT!
// 🚨 FIXED: Commented out the problematic route that was intercepting all /api/* requests
// console.log('🔧 [SERVER] Registering job cost routes (ALSO /api)...');
// app.use('/api', jobCostRoutes); // 🚨 COMMENTED OUT - was intercepting all /api/* requests including /api/quotes
// 🎯 CRITICAL DEBUG: Add specific middleware RIGHT BEFORE quotes router
console.log('🔧 [SERVER] About to register quotes router...');
app.use('/api/quotes', (req, res, next) => {
    console.log(`🎯 [SERVER] Quotes middleware hit: ${req.method} ${req.path}`);
    console.log(`🎯 [SERVER] Original URL: ${req.originalUrl}`);
    console.log(`🎯 [SERVER] Query:`, req.query);
    next();
});
console.log('🔧 [SERVER] Registering quotes router...');
app.use('/api/quotes', quotes_1.default);
console.log('🔧 [SERVER] Registering audit routes...');
app.use('/api/audit', audit_1.default);
console.log('🔧 [SERVER] Registering employee routes...');
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
// 🔧 DEBUGGING: Catch unhandled routes
app.use((req, res, next) => {
    console.log(`❌ [SERVER] Unhandled route: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Route not found' });
});
// Global error handler MUST come AFTER all routes
app.use((err, req, res, next) => {
    console.error('🚨 [SERVER] Global error handler caught:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error occurred.' });
    }
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('🔧 [SERVER] All routes registered. Server ready.');
});
