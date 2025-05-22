// src/middleware/auditMiddleware.ts

import { Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { AuthRequest } from '../types/express';
import { Prisma } from '@prisma/client';

// Middleware to automatically audit quote changes
export const auditQuoteMiddleware = (changeType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture successful operations
    res.send = function(body: any) {
      // Only audit on successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const quoteId = req.params.id || req.params.quoteId;
        if (quoteId) {
          const context = AuditService.getAuditContext(req, req.body.changeReason);
          AuditService.auditQuoteChange(quoteId, changeType, context)
            .catch(err => console.error('Quote audit error:', err));
        }
      }
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      // Only audit on successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const quoteId = req.params.id || req.params.quoteId || body?.id;
        if (quoteId) {
          const context = AuditService.getAuditContext(req, req.body.changeReason);
          AuditService.auditQuoteChange(quoteId, changeType, context)
            .catch(err => console.error('Quote audit error:', err));
        }
      }
      return originalJson.call(this, body);
    };

    next();
  };
};

// Middleware to automatically audit order changes
export const auditOrderMiddleware = (changeType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const orderId = req.params.id || req.params.orderId;
        if (orderId) {
          const context = AuditService.getAuditContext(req, req.body.changeReason);
          
          // Create proper customer approval with typed properties
          const customerApproval = req.body.customerApproval ? {
            approved: Boolean(req.body.customerApproval.approved),
            signature: req.body.customerApproval.signature,
            timestamp: new Date() // Keep Date for service, it will be serialized
          } : undefined;

          AuditService.auditOrderChange(orderId, changeType, context, customerApproval)
            .catch(err => console.error('Order audit error:', err));
        }
      }
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const orderId = req.params.id || req.params.orderId || body?.id;
        if (orderId) {
          const context = AuditService.getAuditContext(req, req.body.changeReason);
          
          const customerApproval = req.body.customerApproval ? {
            approved: Boolean(req.body.customerApproval.approved),
            signature: req.body.customerApproval.signature,
            timestamp: new Date() // Keep Date for service, it will be serialized
          } : undefined;

          AuditService.auditOrderChange(orderId, changeType, context, customerApproval)
            .catch(err => console.error('Order audit error:', err));
        }
      }
      return originalJson.call(this, body);
    };

    next();
  };
};

// Middleware to automatically audit job changes
export const auditJobMiddleware = (changeType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const jobId = req.params.id || req.params.jobId;
        if (jobId) {
          const context = AuditService.getAuditContext(req, req.body.changeReason);
          
          // Using ISO string for JSON compatibility
          const materialChanges = req.body.materialId ? {
            materialId: req.body.materialId,
            quantityNeeded: req.body.quantityNeeded,
            unitCost: req.body.unitCost,
            action: changeType,
            timestamp: new Date().toISOString() // Use ISO string for JSON compatibility
          } : undefined;

          AuditService.auditJobChange(
            jobId, 
            changeType, 
            context, 
            materialChanges,
            req.body.progressNotes,
            req.body.attachments
          ).catch(err => console.error('Job audit error:', err));
        }
      }
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const jobId = req.params.id || req.params.jobId || body?.id;
        if (jobId) {
          const context = AuditService.getAuditContext(req, req.body.changeReason);
          
          const materialChanges = req.body.materialId ? {
            materialId: req.body.materialId,
            quantityNeeded: req.body.quantityNeeded,
            unitCost: req.body.unitCost,
            action: changeType,
            timestamp: new Date().toISOString() // Use ISO string for JSON compatibility
          } : undefined;

          AuditService.auditJobChange(
            jobId, 
            changeType, 
            context, 
            materialChanges,
            req.body.progressNotes,
            req.body.attachments
          ).catch(err => console.error('Job audit error:', err));
        }
      }
      return originalJson.call(this, body);
    };

    next();
  };
};

// Document upload audit middleware
export const auditDocumentMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Audit document uploads
      const { quoteId, orderId, jobId } = req.body;
      const context = AuditService.getAuditContext(req);
      
      if (quoteId) {
        AuditService.auditQuoteChange(
          quoteId, 
          'DOCUMENT_UPLOADED', 
          context, 
          `Document uploaded: ${(req as any).file?.originalname || 'Unknown file'}`
        ).catch(err => console.error('Document audit error:', err));
      }
      if (orderId) {
        AuditService.auditOrderChange(orderId, 'DOCUMENT_UPLOADED', context)
          .catch(err => console.error('Document audit error:', err));
      }
      if (jobId) {
        AuditService.auditJobChange(
          jobId, 
          'DOCUMENT_UPLOADED', 
          context, 
          undefined, 
          `Document uploaded: ${(req as any).file?.originalname || 'Unknown file'}`
        ).catch(err => console.error('Document audit error:', err));
      }
    }
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const { quoteId, orderId, jobId } = req.body;
      const context = AuditService.getAuditContext(req);
      
      if (quoteId) {
        AuditService.auditQuoteChange(
          quoteId, 
          'DOCUMENT_UPLOADED', 
          context, 
          `Document uploaded: ${(req as any).file?.originalname || 'Unknown file'}`
        ).catch(err => console.error('Document audit error:', err));
      }
      if (orderId) {
        AuditService.auditOrderChange(orderId, 'DOCUMENT_UPLOADED', context)
          .catch(err => console.error('Document audit error:', err));
      }
      if (jobId) {
        AuditService.auditJobChange(
          jobId, 
          'DOCUMENT_UPLOADED', 
          context, 
          undefined, 
          `Document uploaded: ${(req as any).file?.originalname || 'Unknown file'}`
        ).catch(err => console.error('Document audit error:', err));
      }
    }
    return originalJson.call(this, body);
  };

  next();
};

// Status change middleware (for more specific status tracking)
export const auditStatusChangeMiddleware = (entityType: 'quote' | 'order' | 'job') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id;
        if (entityId && req.body.status) {
          const context = AuditService.getAuditContext(req, `Status changed to: ${req.body.status}`);
          
          switch (entityType) {
            case 'quote':
              AuditService.auditQuoteChange(entityId, 'STATUS_CHANGE', context)
                .catch(err => console.error('Status audit error:', err));
              break;
            case 'order':
              AuditService.auditOrderChange(entityId, 'STATUS_CHANGE', context)
                .catch(err => console.error('Status audit error:', err));
              break;
            case 'job':
              AuditService.auditJobChange(entityId, 'STATUS_CHANGE', context)
                .catch(err => console.error('Status audit error:', err));
              break;
          }
        }
      }
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id;
        if (entityId && req.body.status) {
          const context = AuditService.getAuditContext(req, `Status changed to: ${req.body.status}`);
          
          switch (entityType) {
            case 'quote':
              AuditService.auditQuoteChange(entityId, 'STATUS_CHANGE', context)
                .catch(err => console.error('Status audit error:', err));
              break;
            case 'order':
              AuditService.auditOrderChange(entityId, 'STATUS_CHANGE', context)
                .catch(err => console.error('Status audit error:', err));
              break;
            case 'job':
              AuditService.auditJobChange(entityId, 'STATUS_CHANGE', context)
                .catch(err => console.error('Status audit error:', err));
              break;
          }
        }
      }
      return originalJson.call(this, body);
    };

    next();
  };
};