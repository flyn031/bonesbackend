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
import inventoryRoutes from './routes/inventory';
import employeeRoutes from './routes/employeeRoutes';
import timeEntryRoutes from './routes/timeEntries';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use((req, res, next) => {
  console.log('🔍 Origin:', req.headers.origin);
  next();
});

const allowedOrigins = [
  'http://localhost:5173',
  'https://bones-frontend-9u58.vercel.app',
  'https://bones-frontend-9u58-o1l0858u1-james-oflynn-s-projects.vercel.app',
  'https://bones-frontend-9u58-git-main-james-oflynn-s-projects.vercel.app'
];

// --- START OF THE ONLY MODIFIED SECTION ---
app.use(cors({
  origin: (origin, callback) => {
    // This new logic allows requests from your hardcoded list OR any Vercel preview URL for your project.
    const isAllowed = !origin || allowedOrigins.includes(origin) || origin.endsWith('-james-oflynn-s-projects.vercel.app');
    
    console.log(`🔍 CORS Check: Origin "${origin}" - Is Allowed: ${isAllowed}`);

    if (isAllowed) {
      callback(null, true); // Allow the request
    } else {
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
console.log('🔧 [SERVER] Registering inventory routes...');
app.use('/api/inventory', inventoryRoutes);
console.log('🔧 [SERVER] Registering dashboard routes...');
app.use('/api/dashboard', dashboardRoutes);
console.log('🔧 [SERVER] Registering job routes...');
app.use('/api/jobs', jobRoutes);
console.log('🔧 [SERVER] Registering job material routes (ALSO /api/jobs)...');
app.use('/api/jobs', jobMaterialRoutes);
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
console.log('🔧 [SERVER] Registering time entry routes (HMRC R&D)...');
app.use('/api/time-entries', timeEntryRoutes);

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({ status: 'error', database: 'disconnected', message: 'Failed to connect to database.' });
  }
});

app.use((req, res, next) => {
  console.log(`❌ [SERVER] Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

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
  allowedOrigins.forEach(origin => {
    console.log(`  - ${origin}`);
  });
  console.log('🔧 [SERVER] All routes registered. Server ready.');
});

export { app, prisma };