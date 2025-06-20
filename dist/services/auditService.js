"use strict";
// src/services/auditService.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.AuditService = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fsAsync = __importStar(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const pdfkit_1 = __importDefault(require("pdfkit"));
class AuditService {
    static createAuditEntry(entityType, entityId, changeType, data, // Raw object for snapshot
    version, status, context, additionalData) {
        return __awaiter(this, void 0, void 0, function* () {
            const auditData = Object.assign({ version,
                status, data: JSON.parse(JSON.stringify(data)), // Deep clone and cast to JsonValue
                changeType, changedBy: context.userId, changeReason: context.reason, createdAt: new Date(), ipAddress: context.ipAddress, userAgent: context.userAgent }, additionalData);
            switch (entityType) {
                case 'quote':
                    return yield prismaClient_1.default.quoteHistory.create({
                        data: Object.assign({ quoteId: entityId }, auditData)
                    });
                case 'order':
                    return yield prismaClient_1.default.orderHistory.create({
                        data: Object.assign({ orderId: entityId }, auditData)
                    });
                case 'job':
                    return yield prismaClient_1.default.jobHistory.create({
                        data: Object.assign({ jobId: entityId }, auditData)
                    });
                default:
                    throw new Error(`Unsupported entity type for audit: ${entityType}`);
            }
        });
    }
    static getAuditContext(req, reason) {
        var _a;
        return {
            userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            reason
        };
    }
    static auditQuoteChange(quoteId, changeType, context, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const quote = yield prismaClient_1.default.quote.findUnique({
                where: { id: quoteId },
                include: {
                    customer: true,
                    lineItems: {
                        include: { material: true }
                    },
                    createdBy: true,
                    documents: true
                }
            });
            if (!quote)
                throw new Error('Quote not found');
            let newVersion = typeof quote.currentVersion === 'number' ? quote.currentVersion : 0;
            if (['CREATE', 'UPDATE', 'STATUS_CHANGE', 'APPROVED', 'REJECTED', 'CLONE', 'CONVERT', 'DOCUMENT_UPLOADED'].includes(changeType)) {
                newVersion += 1;
                yield prismaClient_1.default.quote.update({
                    where: { id: quoteId },
                    data: { currentVersion: newVersion }
                });
            }
            return yield this.createAuditEntry('quote', quoteId, changeType, quote, newVersion, quote.status, Object.assign(Object.assign({}, context), { reason: reason || context.reason }));
        });
    }
    static auditOrderChange(orderId, changeType, context, customerApproval) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield prismaClient_1.default.order.findUnique({
                where: { id: orderId },
                include: {
                    customer: true,
                    createdBy: true,
                    projectOwner: true,
                    paymentMilestones: true,
                    documents: true
                }
            });
            if (!order)
                throw new Error('Order not found');
            let newVersion = typeof order.currentVersion === 'number' ? order.currentVersion : 0;
            if (['CREATE', 'UPDATE', 'STATUS_CHANGE', 'APPROVED', 'REJECTED', 'CLONE', 'CONVERT', 'DOCUMENT_UPLOADED'].includes(changeType)) {
                newVersion += 1;
                yield prismaClient_1.default.order.update({
                    where: { id: orderId },
                    data: { currentVersion: newVersion }
                });
            }
            return yield this.createAuditEntry('order', orderId, changeType, order, newVersion, order.status, context, {
                customerApproved: customerApproval === null || customerApproval === void 0 ? void 0 : customerApproval.approved,
                customerSignature: customerApproval === null || customerApproval === void 0 ? void 0 : customerApproval.signature,
                approvalTimestamp: customerApproval === null || customerApproval === void 0 ? void 0 : customerApproval.timestamp
            });
        });
    }
    static auditJobChange(jobId, changeType, context, materialChanges, // Use JsonValue for flexibility
    progressNotes, attachments // Use JsonValue for flexibility
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = yield prismaClient_1.default.job.findUnique({
                where: { id: jobId },
                include: {
                    customer: true,
                    // Assuming 'materials' is the correct relation name for material used in a job
                    materials: {
                        include: {
                            material: {
                                include: { supplier: true }
                            }
                        }
                    },
                    orders: true,
                    costs: true,
                    documents: true
                }
            });
            if (!job)
                throw new Error('Job not found');
            let newVersion = typeof job.currentVersion === 'number' ? job.currentVersion : 0;
            if (['CREATE', 'UPDATE', 'STATUS_CHANGE', 'MATERIAL_ADDED', 'MATERIAL_REMOVED', 'MATERIAL_UPDATED', 'DOCUMENT_UPLOADED'].includes(changeType)) {
                newVersion += 1;
                yield prismaClient_1.default.job.update({
                    where: { id: jobId },
                    data: { currentVersion: newVersion }
                });
            }
            return yield this.createAuditEntry('job', jobId, changeType, job, newVersion, job.status, context, {
                materialChanges: materialChanges !== undefined ? materialChanges : null,
                progressNotes: progressNotes !== undefined ? progressNotes : null,
                attachments: attachments !== undefined ? attachments : null
            });
        });
    }
    static fetchHistory(quoteId, orderId, jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            let history = [];
            if (quoteId) {
                try {
                    const quoteHistory = yield prismaClient_1.default.quoteHistory.findMany({
                        where: { quoteId },
                        include: { changedByUser: { select: { id: true, name: true, email: true } } },
                        orderBy: { createdAt: 'asc' }
                    });
                    // Fix the type issue by using 'as' to explicitly cast the entityType to the union type
                    history.push(...quoteHistory.map(h => (Object.assign(Object.assign({}, h), { entityType: 'QUOTE' }))));
                }
                catch (error) {
                    console.error(`Error fetching quote history for ID ${quoteId}:`, error.message);
                }
            }
            if (orderId) {
                try {
                    const orderHistory = yield prismaClient_1.default.orderHistory.findMany({
                        where: { orderId },
                        include: { changedByUser: { select: { id: true, name: true, email: true } } },
                        orderBy: { createdAt: 'asc' }
                    });
                    // Fix the type issue by using 'as' to explicitly cast the entityType to the union type
                    history.push(...orderHistory.map(h => (Object.assign(Object.assign({}, h), { entityType: 'ORDER' }))));
                }
                catch (error) {
                    console.error(`Error fetching order history for ID ${orderId}:`, error.message);
                }
            }
            if (jobId) {
                try {
                    const jobHistory = yield prismaClient_1.default.jobHistory.findMany({
                        where: { jobId },
                        include: { changedByUser: { select: { id: true, name: true, email: true } } },
                        orderBy: { createdAt: 'asc' }
                    });
                    // Fix the type issue by using 'as' to explicitly cast the entityType to the union type
                    history.push(...jobHistory.map(h => (Object.assign(Object.assign({}, h), { entityType: 'JOB' }))));
                }
                catch (error) {
                    console.error(`Error fetching job history for ID ${jobId}:`, error.message);
                }
            }
            history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            return history;
        });
    }
    static getCompleteHistory(quoteId, orderId, jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeline = yield this.fetchHistory(quoteId, orderId, jobId);
            const history = {
                quote: timeline.filter(h => h.entityType === 'QUOTE'),
                order: timeline.filter(h => h.entityType === 'ORDER'),
                job: timeline.filter(h => h.entityType === 'JOB'),
                timeline: timeline
            };
            return history;
        });
    }
    static getLegalEvidencePackage(quoteId, orderId, jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const evidence = yield this.getCompleteHistory(quoteId, orderId, jobId);
            const whereClause = {
                OR: []
            };
            if (quoteId)
                whereClause.OR.push({ quoteId });
            if (orderId)
                whereClause.OR.push({ orderId });
            if (jobId)
                whereClause.OR.push({ jobId });
            const documents = whereClause.OR.length > 0 ? yield prismaClient_1.default.document.findMany({
                where: whereClause,
                include: {
                    uploadedByUser: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            }) : [];
            const packageDataForHash = {
                historyTimeline: evidence.timeline.map((entry) => (Object.assign(Object.assign({}, entry), { createdAt: entry.createdAt.toISOString(), approvalTimestamp: entry.approvalTimestamp ? entry.approvalTimestamp.toISOString() : null, data: typeof entry.data === 'object' && entry.data !== null ? JSON.stringify(entry.data) : entry.data, materialChanges: typeof entry.materialChanges === 'object' && entry.materialChanges !== null ? JSON.stringify(entry.materialChanges) : entry.materialChanges, attachments: typeof entry.attachments === 'object' && entry.attachments !== null ? JSON.stringify(entry.attachments) : entry.attachments, changedByUser: entry.changedByUser ? {
                        id: entry.changedByUser.id,
                        name: entry.changedByUser.name
                    } : null, ipAddress: undefined, userAgent: undefined }))),
                documents: documents.map(d => ({
                    id: d.id,
                    name: d.name,
                    originalName: d.originalName,
                    mimeType: d.mimeType,
                    fileSize: d.fileSize,
                    fileHash: d.fileHash,
                    uploadedAt: d.createdAt.toISOString(),
                    uploadedBy: d.uploadedBy,
                    storagePath: undefined,
                }))
            };
            const package_hash = this.generateEvidenceHash(packageDataForHash);
            const primaryEntityId = quoteId || orderId || jobId || 'unknown';
            const primaryEntityType = quoteId ? 'QUOTE' : orderId ? 'ORDER' : jobId ? 'JOB' : 'UNKNOWN';
            return {
                evidence,
                documents,
                metadata: {
                    generatedAt: new Date(),
                    generatedBy: 'system',
                    packageHash: package_hash,
                    totalHistoryEntries: evidence.timeline.length,
                    totalDocuments: documents.length,
                    entityIds: {
                        quoteId: quoteId || null,
                        orderId: orderId || null,
                        jobId: jobId || null,
                        primaryEntityId: primaryEntityId,
                        primaryEntityType: primaryEntityType, // Ensure this is properly typed too
                    }
                }
            };
        });
    }
    static generateEvidenceHash(data) {
        const stableStringify = (obj) => {
            // For robust, production-grade hashing, consider using a dedicated library
            // like 'json-stable-stringify' which handles more edge cases.
            if (typeof obj !== 'object' || obj === null) {
                return JSON.stringify(obj);
            }
            if (Array.isArray(obj)) {
                return '[' + obj.map(item => stableStringify(item)).join(',') + ']';
            }
            const keys = Object.keys(obj).sort();
            return '{' + keys.map(key => `${stableStringify(key)}:${stableStringify(obj[key])}`).join(',') + '}';
        };
        try {
            const dataString = stableStringify(data);
            return crypto_1.default.createHash('sha256').update(dataString).digest('hex');
        }
        catch (error) {
            console.error('Error generating stable string for hash:', error);
            throw new Error('Failed to generate package hash due to data processing error.');
        }
    }
    static exportLegalHistory(quoteId_1, orderId_1, jobId_1) {
        return __awaiter(this, arguments, void 0, function* (quoteId, orderId, jobId, format = 'csv') {
            const evidencePackage = yield this.getLegalEvidencePackage(quoteId, orderId, jobId);
            const entityId = quoteId || orderId || jobId || 'unknown';
            const entityType = quoteId ? 'Quote' : orderId ? 'Order' : jobId ? 'Job' : 'Entity';
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
            if (format === 'csv') {
                const filename = `legal-evidence-${entityType}_${entityId}_${timestamp}.csv`;
                const csvContent = this.generateCSVExport(evidencePackage.evidence.timeline);
                return {
                    data: csvContent,
                    filename: filename,
                    contentType: 'text/csv'
                };
            }
            else if (format === 'pdf') {
                const filename = `legal-evidence-${entityType}_${entityId}_${timestamp}.pdf`;
                try {
                    const { filePath, fileName } = yield this.generatePDFExport(evidencePackage, filename);
                    return {
                        filePath,
                        filename: fileName,
                        contentType: 'application/pdf'
                    };
                }
                catch (err) {
                    console.error('Error during PDF generation in exportLegalHistory:', err);
                    throw err;
                }
            }
            else {
                throw new Error(`Unsupported export format: ${format}. Must be 'pdf' or 'csv'.`);
            }
        });
    }
    static generateCSVExport(timeline) {
        const rows = [
            ['Timestamp', 'Entity Type', 'Entity ID', 'Change Type', 'Version', 'Status', 'Changed By User ID', 'Changed By User Name', 'IP Address', 'User Agent', 'Reason', 'Customer Approved', 'Approval Timestamp', 'Material Changes', 'Progress Notes', 'Attachments', 'Full Data Snapshot']
        ];
        timeline.forEach((entry) => {
            var _a;
            const escapeCsv = (data) => {
                if (data === null || data === undefined)
                    return '';
                const str = typeof data === 'object' ? JSON.stringify(data) : String(data);
                if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            const entityId = entry.quoteId || entry.orderId || entry.jobId || '';
            const entityType = entry.entityType || 'UNKNOWN';
            const changedByUserId = entry.changedBy || '';
            const changedByUserName = ((_a = entry.changedByUser) === null || _a === void 0 ? void 0 : _a.name) || '';
            const customerApproved = entry.customerApproved ? 'Yes' : 'No';
            const approvalTimestamp = entry.approvalTimestamp ? new Date(entry.approvalTimestamp).toISOString() : '';
            rows.push([
                escapeCsv(new Date(entry.createdAt).toISOString()),
                escapeCsv(entityType.toUpperCase()),
                escapeCsv(entityId),
                escapeCsv(entry.changeType || 'UNKNOWN'),
                escapeCsv(entry.version),
                escapeCsv(entry.status || 'N/A'),
                escapeCsv(changedByUserId),
                escapeCsv(changedByUserName),
                escapeCsv(entry.ipAddress),
                escapeCsv(entry.userAgent),
                escapeCsv(entry.changeReason),
                escapeCsv(customerApproved),
                escapeCsv(approvalTimestamp),
                escapeCsv(entry.materialChanges),
                escapeCsv(entry.progressNotes),
                escapeCsv(entry.attachments),
                escapeCsv(entry.data)
            ]);
        });
        return rows.map(row => row.join(',')).join('\n');
    }
    static generatePDFExport(evidencePackage, targetFilename) {
        return __awaiter(this, void 0, void 0, function* () {
            const history = evidencePackage.evidence.timeline;
            const documents = evidencePackage.documents;
            const metadata = evidencePackage.metadata;
            const uploadsDir = path_1.default.join(__dirname, '../../uploads/evidence');
            try {
                yield fsAsync.mkdir(uploadsDir, { recursive: true });
            }
            catch (error) {
                console.error(`Error creating directory: ${uploadsDir}`, error);
                throw new Error('Failed to create upload directory for PDF');
            }
            const filePath = path_1.default.join(uploadsDir, targetFilename);
            return new Promise((resolve, reject) => {
                const doc = new pdfkit_1.default({
                    margin: 50,
                    size: 'A4'
                });
                const stream = fs_1.default.createWriteStream(filePath);
                doc.pipe(stream);
                doc.fontSize(18)
                    .font('Helvetica-Bold')
                    .text('Legal Evidence Package', {
                    align: 'center'
                })
                    .moveDown(1);
                doc.fontSize(12)
                    .font('Helvetica')
                    .text(`Generated: ${new Date().toLocaleString()}`)
                    .text(`Package Hash: ${metadata.packageHash || 'Not available'}`)
                    .text(`Total Events: ${metadata.totalHistoryEntries || 0}`)
                    .text(`Total Documents: ${metadata.totalDocuments || 0}`)
                    .moveDown(2);
                doc.fontSize(16)
                    .font('Helvetica-Bold')
                    .text('Timeline of Events')
                    .moveDown(1);
                const columns = ['Timestamp', 'Entity', 'Change', 'Version', 'User', 'Reason'];
                const columnWidths = [100, 80, 80, 50, 80, 100];
                const startX = 50;
                let yPos = doc.y;
                doc.fontSize(10).font('Helvetica-Bold');
                columns.forEach((text, i) => {
                    let xPos = startX;
                    for (let j = 0; j < i; j++) {
                        xPos += columnWidths[j];
                    }
                    doc.text(text, xPos, yPos, { width: columnWidths[i] });
                });
                yPos += 15;
                doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
                yPos += 5;
                doc.fontSize(9).font('Helvetica');
                history.forEach((entry) => {
                    var _a;
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }
                    const timestamp = new Date(entry.createdAt).toLocaleString();
                    const entityType = entry.entityType ? entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1) : 'Unknown';
                    const entityId = (entry.quoteId || entry.orderId || entry.jobId || '').substring(0, 8);
                    const changeType = entry.changeType ? entry.changeType.replace(/_/g, ' ') : 'Unknown';
                    const version = entry.version || 'N/A';
                    const user = ((_a = entry.changedByUser) === null || _a === void 0 ? void 0 : _a.name) || 'System';
                    const reason = entry.changeReason || '';
                    let xPos = startX;
                    [timestamp, `${entityType} #${entityId}`, changeType, version, user, reason].forEach((text, i) => {
                        doc.text(String(text), xPos, yPos, { width: columnWidths[i] });
                        xPos += columnWidths[i];
                    });
                    yPos += 20;
                });
                if (documents.length > 0) {
                    if (yPos > 650) {
                        doc.addPage();
                        yPos = 50;
                    }
                    else {
                        yPos += 20;
                    }
                    doc.fontSize(16)
                        .font('Helvetica-Bold')
                        .text('Supporting Documents')
                        .moveDown(1);
                    const docColumns = ['Name', 'Type', 'Upload Date', 'Uploaded By'];
                    const docColumnWidths = [150, 80, 100, 100];
                    doc.fontSize(10).font('Helvetica-Bold');
                    let xPos = startX;
                    docColumns.forEach((text, i) => {
                        doc.text(text, xPos, yPos, { width: docColumnWidths[i] });
                        xPos += docColumnWidths[i];
                    });
                    yPos += 15;
                    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
                    yPos += 5;
                    doc.fontSize(9).font('Helvetica');
                    documents.forEach((document) => {
                        var _a;
                        if (yPos > 700) {
                            doc.addPage();
                            yPos = 50;
                        }
                        const name = document.name || document.originalName || 'Unnamed';
                        const type = document.mimeType ? document.mimeType.split('/')[1] : 'Unknown';
                        const uploadDate = document.createdAt ? new Date(document.createdAt).toLocaleString() : 'Unknown';
                        const uploader = ((_a = document.uploadedByUser) === null || _a === void 0 ? void 0 : _a.name) || 'System';
                        let xPos = startX;
                        [name, type, uploadDate, uploader].forEach((text, i) => {
                            doc.text(String(text), xPos, yPos, { width: docColumnWidths[i] });
                            xPos += docColumnWidths[i];
                        });
                        yPos += 20;
                    });
                }
                let pageCount = doc.bufferedPageRange().count;
                for (let i = 0; i < pageCount; i++) {
                    doc.switchToPage(i);
                    doc.fontSize(8)
                        .text(`Page ${i + 1} of ${pageCount}`, 0, doc.page.height - 50, { align: 'center' });
                }
                doc.end();
                stream.on('finish', () => {
                    resolve({ filePath, fileName: targetFilename });
                });
                stream.on('error', (err) => {
                    console.error('Error writing PDF to file:', err);
                    reject(err);
                });
            });
        });
    }
    static logDocumentUpload(documentData, uploadedByUserId, fileBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!documentData.storagePath || !uploadedByUserId || !fileBuffer) {
                throw new Error('Missing required data for logging document upload.');
            }
            const fileHash = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
            try {
                const document = yield prismaClient_1.default.document.create({
                    data: Object.assign(Object.assign({}, documentData), { fileHash, uploadedBy: uploadedByUserId, storageType: 'LOCAL' })
                });
                const context = {
                    userId: uploadedByUserId,
                    reason: `Document uploaded: ${documentData.originalName || documentData.name}`
                };
                if (documentData.quoteId) {
                    yield AuditService.auditQuoteChange(documentData.quoteId, 'DOCUMENT_UPLOADED', context);
                }
                if (documentData.orderId) { // Add audit for order if linked
                    yield AuditService.auditOrderChange(documentData.orderId, 'DOCUMENT_UPLOADED', context);
                }
                if (documentData.jobId) { // Add audit for job if linked
                    yield AuditService.auditJobChange(documentData.jobId, 'DOCUMENT_UPLOADED', context);
                }
                return document; // Return the created document record
            }
            catch (error) {
                console.error('Error logging document upload:', error.message);
                throw new Error('Failed to log document upload and audit changes.');
            }
        });
    }
}
exports.AuditService = AuditService;
