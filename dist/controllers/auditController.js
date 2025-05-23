"use strict";
// src/controllers/auditController.ts
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
exports.verifyDigitalSignature = exports.getAuditStatistics = exports.searchAuditHistory = exports.downloadEvidenceFile = exports.downloadEvidencePackage = exports.getLegalEvidencePackage = exports.getCompleteHistory = exports.getJobHistory = exports.getOrderHistory = exports.getQuoteHistory = void 0;
const auditService_1 = require("../services/auditService");
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getQuoteHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const quoteId = req.params.id;
        const history = yield prismaClient_1.default.quoteHistory.findMany({
            where: { quoteId },
            include: {
                changedByUser: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching quote history:', error);
        res.status(500).json({ error: 'Failed to fetch quote history' });
    }
});
exports.getQuoteHistory = getQuoteHistory;
const getOrderHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = req.params.id;
        const history = yield prismaClient_1.default.orderHistory.findMany({
            where: { orderId },
            include: {
                changedByUser: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ error: 'Failed to fetch order history' });
    }
});
exports.getOrderHistory = getOrderHistory;
const getJobHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jobId = req.params.id;
        const history = yield prismaClient_1.default.jobHistory.findMany({
            where: { jobId },
            include: {
                changedByUser: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching job history:', error);
        res.status(500).json({ error: 'Failed to fetch job history' });
    }
});
exports.getJobHistory = getJobHistory;
const getCompleteHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { quoteId, orderId, jobId } = req.query;
        if (!quoteId && !orderId && !jobId) {
            return res.status(400).json({ error: 'At least one ID must be provided' });
        }
        // For now, manually compile the history
        const history = [];
        if (quoteId) {
            const quoteHistory = yield prismaClient_1.default.quoteHistory.findMany({
                where: { quoteId: quoteId },
                include: {
                    changedByUser: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            if (quoteHistory.length > 0) {
                history.push({
                    entity: 'QUOTE',
                    entityId: quoteId,
                    history: quoteHistory
                });
            }
        }
        if (orderId) {
            const orderHistory = yield prismaClient_1.default.orderHistory.findMany({
                where: { orderId: orderId },
                include: {
                    changedByUser: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            if (orderHistory.length > 0) {
                history.push({
                    entity: 'ORDER',
                    entityId: orderId,
                    history: orderHistory
                });
            }
        }
        if (jobId) {
            const jobHistory = yield prismaClient_1.default.jobHistory.findMany({
                where: { jobId: jobId },
                include: {
                    changedByUser: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            if (jobHistory.length > 0) {
                history.push({
                    entity: 'JOB',
                    entityId: jobId,
                    history: jobHistory
                });
            }
        }
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching complete history:', error);
        res.status(500).json({ error: 'Failed to fetch complete history' });
    }
});
exports.getCompleteHistory = getCompleteHistory;
const getLegalEvidencePackage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Support both GET (query params) and POST (body params)
        const params = req.method === 'GET' ? req.query : req.body;
        // Log the access
        console.log(`Legal evidence accessed by ${(_a = req.user) === null || _a === void 0 ? void 0 : _a.id} for entityType:${params.entityType} entityId:${params.entityId}`);
        const { entityType, entityId, includeDocuments = true, format = 'PDF' } = params;
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                error: 'Entity type and ID must be provided'
            });
        }
        let quoteId, orderId, jobId;
        switch (entityType) {
            case 'QUOTE':
                quoteId = entityId;
                break;
            case 'ORDER':
                orderId = entityId;
                break;
            case 'JOB':
                jobId = entityId;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid entity type'
                });
        }
        // Generate the evidence package
        const exportFormat = format.toString().toLowerCase() === 'pdf' ? 'pdf' : 'csv';
        const result = yield auditService_1.AuditService.exportLegalHistory(quoteId, orderId, jobId, exportFormat);
        // Create download URL
        // The URL will use the downloadEvidenceFile controller
        const downloadUrl = `/api/audit/download/${result.filename}`;
        return res.json({
            success: true,
            data: {
                downloadUrl,
                format: exportFormat.toUpperCase(),
                generatedAt: new Date(),
                timeline: [], // Basic metadata only
                documents: [],
                signatures: []
            }
        });
    }
    catch (error) {
        console.error('Error generating legal evidence package:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate legal evidence package'
        });
    }
});
exports.getLegalEvidencePackage = getLegalEvidencePackage;
// Note: This function seems intended to generate a PDF directly for download,
// distinct from the getLegalEvidencePackage which provides a download URL.
// This might be a duplicate or serve a different purpose. Review your routes
// to see which one is used for direct PDF downloads.
const downloadEvidencePackage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entityType, entityId } = req.params;
        if (!entityType || !entityId) {
            return res.status(400).json({ error: 'Entity type and ID must be provided' });
        }
        // Fetch the entity details to use in the filename
        let entityTitle = "unknown";
        try {
            if (entityType === 'QUOTE') {
                const quote = yield prismaClient_1.default.quote.findUnique({
                    where: { id: entityId },
                    select: { quoteNumber: true, quoteReference: true }
                });
                if (quote) {
                    entityTitle = quote.quoteReference || quote.quoteNumber || entityId;
                }
            }
            else if (entityType === 'ORDER') {
                const order = yield prismaClient_1.default.order.findUnique({
                    where: { id: entityId },
                    select: { quoteRef: true }
                });
                if (order) {
                    entityTitle = order.quoteRef || entityId;
                }
            }
            else if (entityType === 'JOB') {
                const job = yield prismaClient_1.default.job.findUnique({
                    where: { id: entityId },
                    select: { title: true }
                });
                if (job) {
                    entityTitle = job.title || entityId;
                }
            }
        }
        catch (err) {
            console.error('Error getting entity details for filename:', err);
            // Continue with basic filename
        }
        // Use the new PDF generation from AuditService
        const result = yield auditService_1.AuditService.exportLegalHistory(entityType === 'QUOTE' ? entityId : undefined, entityType === 'ORDER' ? entityId : undefined, entityType === 'JOB' ? entityId : undefined, 'pdf' // Assuming this function is specifically for PDF download
        );
        // Set the appropriate headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`); // Use attachment for download
        // Stream the PDF file - with null check for filePath
        if (result.filePath) {
            const fileStream = fs_1.default.createReadStream(result.filePath);
            fileStream.pipe(res);
        }
        else {
            res.status(500).json({ error: 'File path not available' });
        }
    }
    catch (error) {
        console.error('Error generating PDF evidence package:', error);
        res.status(500).json({ error: 'Failed to generate PDF evidence package' });
    }
});
exports.downloadEvidencePackage = downloadEvidencePackage;
// Download a generated evidence file by filename
const downloadEvidenceFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        // Validate filename to prevent directory traversal attacks
        // Ensure filename doesn't contain path traversal sequences (.., /)
        if (!filename || filename.includes('..') || filename.includes('/') || path_1.default.basename(filename) !== filename) {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename'
            });
        }
        // Construct the full file path within the designated upload directory
        // Using path.join is safer than string concatenation
        const evidenceUploadsDir = path_1.default.join(__dirname, '../../uploads/evidence');
        const filePath = path_1.default.join(evidenceUploadsDir, filename);
        // Ensure the resolved path is actually within the uploads directory
        // This is an additional security check against directory traversal
        if (!filePath.startsWith(evidenceUploadsDir)) {
            console.warn(`Attempted directory traversal detected: ${filename}`);
            return res.status(400).json({
                success: false,
                error: 'Invalid filename path'
            });
        }
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        // Get file stats to check size and set Content-Length header
        try {
            const fileStats = fs_1.default.statSync(filePath);
            // Check file size - empty or very small files might be corrupt
            if (fileStats.size < 100) {
                console.warn(`Generated file appears small or corrupt: ${filename} (${fileStats.size} bytes)`);
                return res.status(500).json({
                    success: false,
                    error: 'Generated file appears to be corrupt or empty'
                });
            }
            // Determine content type based on file extension
            const ext = path_1.default.extname(filename).toLowerCase();
            let contentType;
            if (ext === '.pdf') {
                contentType = 'application/pdf';
            }
            else if (ext === '.csv') {
                contentType = 'text/csv';
            }
            else {
                // Default or error for unknown types
                console.warn(`Attempted to download file with unknown extension: ${filename}`);
                return res.status(400).json({
                    success: false,
                    error: 'Unsupported file type'
                });
            }
            // Set appropriate headers for PDF viewing
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', fileStats.size);
            // For PDFs, use 'inline' to make browsers display them directly
            // For other files like CSV, use 'attachment' to force download
            const disposition = ext === '.pdf' ? 'inline' : 'attachment';
            res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
            // Add cache control headers to prevent caching issues
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            // Stream the file to the response
            const fileStream = fs_1.default.createReadStream(filePath);
            // Handle stream errors
            fileStream.on('error', (streamError) => {
                console.error(`Error streaming file ${filename}:`, streamError);
            });
            fileStream.pipe(res);
        }
        catch (fileStatsError) {
            console.error('Error getting file stats:', fileStatsError);
            return res.status(500).json({
                success: false,
                error: 'Error accessing file information'
            });
        }
    }
    catch (error) {
        console.error('Unexpected error in downloadEvidenceFile:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to download file'
        });
    }
});
exports.downloadEvidenceFile = downloadEvidenceFile;
const searchAuditHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entityType, entityId, changeType, dateFrom, dateTo, changedBy, page = '1', limit = '50' } = req.query;
        const where = {};
        // Build filters
        if (changeType)
            where.changeType = changeType;
        if (changedBy)
            where.changedBy = changedBy;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = new Date(dateFrom);
            if (dateTo)
                where.createdAt.lte = new Date(dateTo);
        }
        const include = {
            changedByUser: {
                select: { id: true, name: true, email: true }
            }
        };
        let results = [];
        // Search based on entity type
        if (!entityType || entityType === 'QUOTE') {
            const quoteWhere = Object.assign({}, where);
            if (entityId)
                quoteWhere.quoteId = entityId;
            try {
                const quotes = yield prismaClient_1.default.quoteHistory.findMany({
                    where: quoteWhere,
                    include,
                    orderBy: { createdAt: 'desc' },
                    skip: (Number(page) - 1) * Number(limit),
                    take: Number(limit)
                });
                results.push(...quotes.map(q => (Object.assign(Object.assign({}, q), { entityType: 'QUOTE' }))));
            }
            catch (err) {
                console.error('Error fetching quote history:', err);
            }
        }
        if (!entityType || entityType === 'ORDER') {
            const orderWhere = Object.assign({}, where);
            if (entityId)
                orderWhere.orderId = entityId;
            try {
                const orders = yield prismaClient_1.default.orderHistory.findMany({
                    where: orderWhere,
                    include,
                    orderBy: { createdAt: 'desc' },
                    skip: (Number(page) - 1) * Number(limit),
                    take: Number(limit)
                });
                results.push(...orders.map(o => (Object.assign(Object.assign({}, o), { entityType: 'ORDER' }))));
            }
            catch (err) {
                console.error('Error fetching order history:', err);
            }
        }
        if (!entityType || entityType === 'JOB') {
            const jobWhere = Object.assign({}, where);
            if (entityId)
                jobWhere.jobId = entityId;
            try {
                const jobs = yield prismaClient_1.default.jobHistory.findMany({
                    where: jobWhere,
                    include,
                    orderBy: { createdAt: 'desc' },
                    skip: (Number(page) - 1) * Number(limit),
                    take: Number(limit)
                });
                results.push(...jobs.map(j => (Object.assign(Object.assign({}, j), { entityType: 'JOB' }))));
            }
            catch (err) {
                console.error('Error fetching job history:', err);
            }
        }
        // Sort all results by created date
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({
            results: results.slice(0, Number(limit)),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: results.length // Note: This total is only for the fetched batch, not the true total across all pages/filters without counting separately
            }
        });
    }
    catch (error) {
        console.error('Error searching audit history:', error);
        res.status(500).json({ error: 'Failed to search audit history' });
    }
});
exports.searchAuditHistory = searchAuditHistory;
const getAuditStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entityType, dateFrom, dateTo } = req.query;
        const dateFilter = dateFrom || dateTo ? {
            createdAt: Object.assign(Object.assign({}, (dateFrom && { gte: new Date(dateFrom) })), (dateTo && { lte: new Date(dateTo) }))
        } : {};
        // Initialize statistics object
        const statistics = {
            totalChanges: 0,
            changesByType: {},
            changesByUser: {},
            recentActivity: [],
            trendData: [] // Mock trend data
        };
        try {
            // Helper to fetch and process stats for a given history type
            const fetchAndProcessHistoryStats = (prismaModel, typePrefix) => __awaiter(void 0, void 0, void 0, function* () {
                const count = yield prismaModel.count({ where: dateFilter });
                const changeTypes = yield prismaModel.groupBy({
                    by: ['changeType'],
                    _count: true,
                    where: dateFilter
                });
                statistics.totalChanges += count;
                changeTypes.forEach((item) => {
                    statistics.changesByType[`${typePrefix}_${item.changeType}`] = item._count;
                });
                const recentActivity = yield prismaModel.findMany({
                    where: dateFilter,
                    include: {
                        changedByUser: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5 // Limit per type before final sorting
                });
                statistics.recentActivity.push(...recentActivity.map((item) => (Object.assign(Object.assign({}, item), { entityType: typePrefix }))));
            });
            // Get quote history stats if applicable
            if (!entityType || entityType === 'QUOTE') {
                yield fetchAndProcessHistoryStats(prismaClient_1.default.quoteHistory, 'QUOTE');
            }
            // Get order history stats if applicable
            if (!entityType || entityType === 'ORDER') {
                yield fetchAndProcessHistoryStats(prismaClient_1.default.orderHistory, 'ORDER');
            }
            // Get job history stats if applicable
            if (!entityType || entityType === 'JOB') {
                yield fetchAndProcessHistoryStats(prismaClient_1.default.jobHistory, 'JOB');
            }
            // Get user change counts (requires iterating through recent activity or separate query)
            // For simplicity, let's process from recentActivity for now
            const changesByUserMap = {};
            statistics.recentActivity.forEach((activity) => {
                var _a;
                const userId = activity.changedBy; // Assuming changedBy field exists on history models
                const userName = ((_a = activity.changedByUser) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown User';
                if (!changesByUserMap[userId]) {
                    changesByUserMap[userId] = { name: userName, count: 0 };
                }
                changesByUserMap[userId].count++;
            });
            statistics.changesByUser = Object.values(changesByUserMap);
            // Sort recent activity by date
            statistics.recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            // Limit to 10 most recent activity entries overall
            statistics.recentActivity = statistics.recentActivity.slice(0, 10);
            // Create trend data (mock data for now)
            // In a real app, you'd query grouped by date
            const today = new Date();
            statistics.trendData = []; // Reset mock data array
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                // Basic mock data: random number of changes per day
                const changesOnDay = Math.floor(Math.random() * (statistics.totalChanges / 7 || 1)); // Scale random by average changes per day
                statistics.trendData.push({
                    date: date.toISOString().split('T')[0],
                    changes: changesOnDay
                });
            }
            res.json(statistics);
        }
        catch (err) {
            console.error('Error building audit statistics:', err);
            res.status(500).json({ error: 'Failed to build audit statistics' });
        }
    }
    catch (error) {
        console.error('Error getting audit statistics:', error);
        res.status(500).json({ error: 'Failed to get audit statistics' });
    }
});
exports.getAuditStatistics = getAuditStatistics;
// Digital signature verification
const verifyDigitalSignature = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entityType, entityId, signatureData } = req.body;
        // TODO: Implement actual digital signature verification logic here
        // - Retrieve the relevant audit history entries for entityType/entityId
        // - Use a cryptography library (e.g., 'crypto' in Node.js) to verify the signatureData
        //   against the hash of the audit history data, using the expected public key.
        // - You will need to store/retrieve public keys associated with users or entities.
        // - You might need to define the exact data structure that was signed.
        // Return mock data for now
        res.json({
            verified: true, // Mock verification result
            signatureTimestamp: new Date().toISOString(), // Mock timestamp
            signatureVersion: 1, // Mock version
            message: 'Mock signature verification successful (replace with real logic)'
        });
    }
    catch (error) {
        console.error('Error verifying digital signature:', error);
        res.status(500).json({ error: 'Failed to verify digital signature' });
    }
});
exports.verifyDigitalSignature = verifyDigitalSignature;
