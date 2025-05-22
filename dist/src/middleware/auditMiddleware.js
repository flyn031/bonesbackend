"use strict";
// src/middleware/auditMiddleware.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditStatusChangeMiddleware = exports.auditDocumentMiddleware = exports.auditJobMiddleware = exports.auditOrderMiddleware = exports.auditQuoteMiddleware = void 0;
const auditService_1 = require("../services/auditService");
// Middleware to automatically audit quote changes
const auditQuoteMiddleware = (changeType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        // Store original response methods
        const originalSend = res.send;
        const originalJson = res.json;
        // Override response methods to capture successful operations
        res.send = function (body) {
            // Only audit on successful operations (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const quoteId = req.params.id || req.params.quoteId;
                if (quoteId) {
                    const context = auditService_1.AuditService.getAuditContext(req, req.body.changeReason);
                    auditService_1.AuditService.auditQuoteChange(quoteId, changeType, context)
                        .catch(err => console.error('Quote audit error:', err));
                }
            }
            return originalSend.call(this, body);
        };
        res.json = function (body) {
            // Only audit on successful operations (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const quoteId = req.params.id || req.params.quoteId || (body === null || body === void 0 ? void 0 : body.id);
                if (quoteId) {
                    const context = auditService_1.AuditService.getAuditContext(req, req.body.changeReason);
                    auditService_1.AuditService.auditQuoteChange(quoteId, changeType, context)
                        .catch(err => console.error('Quote audit error:', err));
                }
            }
            return originalJson.call(this, body);
        };
        next();
    });
};
exports.auditQuoteMiddleware = auditQuoteMiddleware;
// Middleware to automatically audit order changes
const auditOrderMiddleware = (changeType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const originalSend = res.send;
        const originalJson = res.json;
        res.send = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const orderId = req.params.id || req.params.orderId;
                if (orderId) {
                    const context = auditService_1.AuditService.getAuditContext(req, req.body.changeReason);
                    // Create proper customer approval with typed properties
                    const customerApproval = req.body.customerApproval ? {
                        approved: Boolean(req.body.customerApproval.approved),
                        signature: req.body.customerApproval.signature,
                        timestamp: new Date() // Keep Date for service, it will be serialized
                    } : undefined;
                    auditService_1.AuditService.auditOrderChange(orderId, changeType, context, customerApproval)
                        .catch(err => console.error('Order audit error:', err));
                }
            }
            return originalSend.call(this, body);
        };
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const orderId = req.params.id || req.params.orderId || (body === null || body === void 0 ? void 0 : body.id);
                if (orderId) {
                    const context = auditService_1.AuditService.getAuditContext(req, req.body.changeReason);
                    const customerApproval = req.body.customerApproval ? {
                        approved: Boolean(req.body.customerApproval.approved),
                        signature: req.body.customerApproval.signature,
                        timestamp: new Date() // Keep Date for service, it will be serialized
                    } : undefined;
                    auditService_1.AuditService.auditOrderChange(orderId, changeType, context, customerApproval)
                        .catch(err => console.error('Order audit error:', err));
                }
            }
            return originalJson.call(this, body);
        };
        next();
    });
};
exports.auditOrderMiddleware = auditOrderMiddleware;
// Middleware to automatically audit job changes
const auditJobMiddleware = (changeType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const originalSend = res.send;
        const originalJson = res.json;
        res.send = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const jobId = req.params.id || req.params.jobId;
                if (jobId) {
                    const context = auditService_1.AuditService.getAuditContext(req, req.body.changeReason);
                    // Using ISO string for JSON compatibility
                    const materialChanges = req.body.materialId ? {
                        materialId: req.body.materialId,
                        quantityNeeded: req.body.quantityNeeded,
                        unitCost: req.body.unitCost,
                        action: changeType,
                        timestamp: new Date().toISOString() // Use ISO string for JSON compatibility
                    } : undefined;
                    auditService_1.AuditService.auditJobChange(jobId, changeType, context, materialChanges, req.body.progressNotes, req.body.attachments).catch(err => console.error('Job audit error:', err));
                }
            }
            return originalSend.call(this, body);
        };
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const jobId = req.params.id || req.params.jobId || (body === null || body === void 0 ? void 0 : body.id);
                if (jobId) {
                    const context = auditService_1.AuditService.getAuditContext(req, req.body.changeReason);
                    const materialChanges = req.body.materialId ? {
                        materialId: req.body.materialId,
                        quantityNeeded: req.body.quantityNeeded,
                        unitCost: req.body.unitCost,
                        action: changeType,
                        timestamp: new Date().toISOString() // Use ISO string for JSON compatibility
                    } : undefined;
                    auditService_1.AuditService.auditJobChange(jobId, changeType, context, materialChanges, req.body.progressNotes, req.body.attachments).catch(err => console.error('Job audit error:', err));
                }
            }
            return originalJson.call(this, body);
        };
        next();
    });
};
exports.auditJobMiddleware = auditJobMiddleware;
// Document upload audit middleware
const auditDocumentMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const originalSend = res.send;
    const originalJson = res.json;
    res.send = function (body) {
        var _a, _b;
        if (res.statusCode >= 200 && res.statusCode < 300) {
            // Audit document uploads
            const { quoteId, orderId, jobId } = req.body;
            const context = auditService_1.AuditService.getAuditContext(req);
            if (quoteId) {
                auditService_1.AuditService.auditQuoteChange(quoteId, 'DOCUMENT_UPLOADED', context, `Document uploaded: ${((_a = req.file) === null || _a === void 0 ? void 0 : _a.originalname) || 'Unknown file'}`).catch(err => console.error('Document audit error:', err));
            }
            if (orderId) {
                auditService_1.AuditService.auditOrderChange(orderId, 'DOCUMENT_UPLOADED', context)
                    .catch(err => console.error('Document audit error:', err));
            }
            if (jobId) {
                auditService_1.AuditService.auditJobChange(jobId, 'DOCUMENT_UPLOADED', context, undefined, `Document uploaded: ${((_b = req.file) === null || _b === void 0 ? void 0 : _b.originalname) || 'Unknown file'}`).catch(err => console.error('Document audit error:', err));
            }
        }
        return originalSend.call(this, body);
    };
    res.json = function (body) {
        var _a, _b;
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const { quoteId, orderId, jobId } = req.body;
            const context = auditService_1.AuditService.getAuditContext(req);
            if (quoteId) {
                auditService_1.AuditService.auditQuoteChange(quoteId, 'DOCUMENT_UPLOADED', context, `Document uploaded: ${((_a = req.file) === null || _a === void 0 ? void 0 : _a.originalname) || 'Unknown file'}`).catch(err => console.error('Document audit error:', err));
            }
            if (orderId) {
                auditService_1.AuditService.auditOrderChange(orderId, 'DOCUMENT_UPLOADED', context)
                    .catch(err => console.error('Document audit error:', err));
            }
            if (jobId) {
                auditService_1.AuditService.auditJobChange(jobId, 'DOCUMENT_UPLOADED', context, undefined, `Document uploaded: ${((_b = req.file) === null || _b === void 0 ? void 0 : _b.originalname) || 'Unknown file'}`).catch(err => console.error('Document audit error:', err));
            }
        }
        return originalJson.call(this, body);
    };
    next();
});
exports.auditDocumentMiddleware = auditDocumentMiddleware;
// Status change middleware (for more specific status tracking)
const auditStatusChangeMiddleware = (entityType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const originalSend = res.send;
        const originalJson = res.json;
        res.send = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const entityId = req.params.id;
                if (entityId && req.body.status) {
                    const context = auditService_1.AuditService.getAuditContext(req, `Status changed to: ${req.body.status}`);
                    switch (entityType) {
                        case 'quote':
                            auditService_1.AuditService.auditQuoteChange(entityId, 'STATUS_CHANGE', context)
                                .catch(err => console.error('Status audit error:', err));
                            break;
                        case 'order':
                            auditService_1.AuditService.auditOrderChange(entityId, 'STATUS_CHANGE', context)
                                .catch(err => console.error('Status audit error:', err));
                            break;
                        case 'job':
                            auditService_1.AuditService.auditJobChange(entityId, 'STATUS_CHANGE', context)
                                .catch(err => console.error('Status audit error:', err));
                            break;
                    }
                }
            }
            return originalSend.call(this, body);
        };
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const entityId = req.params.id;
                if (entityId && req.body.status) {
                    const context = auditService_1.AuditService.getAuditContext(req, `Status changed to: ${req.body.status}`);
                    switch (entityType) {
                        case 'quote':
                            auditService_1.AuditService.auditQuoteChange(entityId, 'STATUS_CHANGE', context)
                                .catch(err => console.error('Status audit error:', err));
                            break;
                        case 'order':
                            auditService_1.AuditService.auditOrderChange(entityId, 'STATUS_CHANGE', context)
                                .catch(err => console.error('Status audit error:', err));
                            break;
                        case 'job':
                            auditService_1.AuditService.auditJobChange(entityId, 'STATUS_CHANGE', context)
                                .catch(err => console.error('Status audit error:', err));
                            break;
                    }
                }
            }
            return originalJson.call(this, body);
        };
        next();
    });
};
exports.auditStatusChangeMiddleware = auditStatusChangeMiddleware;
