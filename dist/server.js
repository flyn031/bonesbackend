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
const inventory_1 = __importDefault(require("./routes/inventory"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const timeEntries_1 = __importDefault(require("./routes/timeEntries"));
// Smart Quote Builder imports
const quoteItemSearch_1 = __importDefault(require("./routes/quoteItemSearch"));
const customerIntelligence_1 = __importDefault(require("./routes/customerIntelligence"));
const customerPricing_1 = __importDefault(require("./routes/customerPricing"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ limit: '1mb', extended: true }));
app.use((req, res, next) => {
    console.log('🔍 Origin:', req.headers.origin);
    next();
});
const allowedOrigins = [
    'http://localhost:5173',
    'https://bones-frontend-exee.vercel.app',
    'https://bones-frontend-9u58.vercel.app',
    'https://bones-frontend-9u58-o1l0858u1-james-oflynn-s-projects.vercel.app',
    'https://bones-frontend-9u58-git-main-james-oflynn-s-projects.vercel.app'
];
// --- START OF THE ONLY MODIFIED SECTION ---
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // This new logic allows requests from your hardcoded list OR any Vercel preview URL for your project.
        const isAllowed = !origin || allowedOrigins.includes(origin) || origin.endsWith('-james-oflynn-s-projects.vercel.app');
        console.log(`🔍 CORS Check: Origin "${origin}" - Is Allowed: ${isAllowed}`);
        if (isAllowed) {
            callback(null, true); // Allow the request
        }
        else {
            callback(new Error(`Not allowed by CORS: ${origin}`)); // Block the request
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// --- END OF THE ONLY MODIFIED SECTION ---
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
app.use((req, res, next) => {
    console.log(`🔍 [SERVER] ${req.method} ${req.path} - Before route registration`);
    if (req.path.startsWith('/api/quotes')) {
        console.log(`🚨 [QUOTES DEBUG] ${req.method} ${req.path} detected - checking route conflict`);
        console.log(`🚨 [QUOTES DEBUG] Original URL: ${req.originalUrl}`);
        console.log(`🚨 [QUOTES DEBUG] Full path: ${req.path}`);
    }
    next();
});
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
console.log('🔧 [SERVER] Registering inventory routes...');
app.use('/api/inventory', inventory_1.default);
console.log('🔧 [SERVER] Registering dashboard routes...');
app.use('/api/dashboard', dashboard_1.default);
console.log('🔧 [SERVER] Registering job routes...');
app.use('/api/jobs', jobs_1.default);
console.log('🔧 [SERVER] Registering job material routes (ALSO /api/jobs)...');
app.use('/api/jobs', jobMaterials_1.default);
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
console.log('🔧 [SERVER] Registering time entry routes (HMRC R&D)...');
app.use('/api/time-entries', timeEntries_1.default);
// Smart Quote Builder routes
console.log('🔧 [SERVER] Registering smart quote routes...');
console.log('🔧 [SERVER] Registering quote item search routes...');
app.use('/api/quote-items', quoteItemSearch_1.default);
console.log('🔧 [SERVER] Registering customer intelligence routes...');
app.use('/api/customer-intelligence', customerIntelligence_1.default);
console.log('🔧 [SERVER] Registering customer pricing routes...');
app.use('/api/customer-pricing', customerPricing_1.default);
console.log('🚀 [SERVER] Smart Quote Builder routes ready!');
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
app.use((req, res, next) => {
    console.log(`❌ [SERVER] Unhandled route: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Route not found' });
});
app.use((err, req, res, next) => {
    console.error('🚨 [SERVER] Global error handler caught:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error occurred.' });
    }
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for:`);
    allowedOrigins.forEach(origin => {
        console.log(`  - ${origin}`);
    });
    console.log('🔧 [SERVER] All routes registered. Server ready.');
});
