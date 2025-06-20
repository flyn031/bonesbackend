import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';
import pdfRoutes from './routes/pdf';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import orderRoutes from './routes/orders';
import financialRoutes from './routes/financial';
import supplierRoutes from './routes/suppliers';
import materialRoutes from './routes/materials';
import dashboardRoutes from './routes/dashboard';
import jobRoutes from './routes/jobs';
import jobCostRoutes from './routes/jobCosts';
import quotesRouter from './routes/quotes';
import jobMaterialRoutes from './routes/jobMaterials';
import auditRoutes from './routes/audit';

// Import the fixed inventory routes
import inventoryRoutes from './routes/inventory';

// ADD THIS LINE: Import employee routes
import employeeRoutes from './routes/employeeRoutes';

// 🚀 NEW: Import time entry routes for HMRC R&D
import timeEntryRoutes from './routes/timeEntries';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

// Middleware order is important!
// 1. Body parsing middleware must come first - UPDATED: Increased payload limits for logo uploads
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// 2. Add debugging middleware to log origins
app.use((req, res, next) => {
  console.log('🔍 Origin:', req.headers.origin);
  next();
});

// 3. CORS with callback function for better control
const allowedOrigins = [
  'http://localhost:5173',
  'https://bones-frontend-9u58.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    console.log(`🔍 CORS Check: Origin "${origin}" - Allowed: ${!origin || allowedOrigins.includes(origin)}`);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 4. Enhanced logging middleware
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

// 5. Routes - DEBUGGING EACH REGISTRATION
console.log('🔧 [SERVER] Registering auth routes...');
app.use('/api/auth', authRoutes);

console.log('🔧 [SERVER] Registering customer routes...');
app.use('/api/customers', customerRoutes);

console.log('🔧 [SERVER] Registering order routes...');
app.use('/api/orders', orderRoutes);

console.log('🔧 [SERVER] Registering financial routes...');
app.use('/api/financial', financialRoutes);

console.log('🔧 [SERVER] Registering pdf routes...');
app.use('/api/pdf', pdfRoutes);

console.log('🔧 [SERVER] Registering supplier routes...');
app.use('/api/suppliers', supplierRoutes);

console.log('🔧 [SERVER] Registering material routes...');
app.use('/api/materials', materialRoutes);

// Updated: Route for dual-purpose inventory items
console.log('🔧 [SERVER] Registering inventory routes...');
app.use('/api/inventory', inventoryRoutes);

console.log('🔧 [SERVER] Registering dashboard routes...');
app.use('/api/dashboard', dashboardRoutes);

console.log('🔧 [SERVER] Registering job routes...');
app.use('/api/jobs', jobRoutes);

console.log('🔧 [SERVER] Registering job material routes (ALSO /api/jobs)...');
app.use('/api/jobs', jobMaterialRoutes); // 🚨 POTENTIAL CONFLICT!

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
app.use('/api/quotes', quotesRouter);

console.log('🔧 [SERVER] Registering audit routes...');
app.use('/api/audit', auditRoutes);

console.log('🔧 [SERVER] Registering employee routes...');
app.use('/api/employees', employeeRoutes);

// 🚀 NEW: Register time entry routes for HMRC R&D functionality
console.log('🔧 [SERVER] Registering time entry routes (HMRC R&D)...');
app.use('/api/time-entries', timeEntryRoutes);

// Basic health check endpoint
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({ status: 'error', database: 'disconnected', message: 'Failed to connect to database.' });
  }
});

// 🔧 DEBUGGING: Catch unhandled routes
app.use((req, res, next) => {
  console.log(`❌ [SERVER] Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler MUST come AFTER all routes
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 [SERVER] Global error handler caught:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error occurred.' });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for:`);
  console.log(`  - Development: http://localhost:5173`);
  console.log(`  - Production: https://bones-frontend-9u58.vercel.app`);
  console.log('🔧 [SERVER] All routes registered. Server ready.');
});

// Export the app for testing
export { app, prisma };// Force complete rebuild Mon Jun 16 21:29:52 BST 2025