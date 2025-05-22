// src/services/auditService.ts

import prisma from '../utils/prismaClient';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import * as fsAsync from 'fs/promises';
import { v4 as uuidv4 } from 'uuid'; // Not used in this file, but keeping if used elsewhere
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client'; // Import Prisma for JsonValue type

interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

// Define specific payload types for each history model from Prisma
type QuoteHistoryPayload = Prisma.QuoteHistoryGetPayload<{
  include: { changedByUser: { select: { id: true; name: true; email: true } } };
}>;

type OrderHistoryPayload = Prisma.OrderHistoryGetPayload<{
  include: { changedByUser: { select: { id: true; name: true; email: true } } };
}>;

type JobHistoryPayload = Prisma.JobHistoryGetPayload<{
  include: { changedByUser: { select: { id: true; name: true; email: true } } };
}>;

// Define EntityType as a type to ensure type safety
type EntityType = 'QUOTE' | 'ORDER' | 'JOB' | 'UNKNOWN';

// Base interface for a unified history entry, adding the 'entityType' discriminator
interface BaseHistoryEntry {
  id: string;
  createdAt: Date;
  changeType: string;
  version: number;
  status: string;
  data: Prisma.JsonValue; // Stored as JsonValue in Prisma
  changedBy: string;
  changedByUser: { id: string; name: string | null; email: string | null } | null;
  changeReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;

  // Specific fields from different history models, marked as optional
  customerApproved?: boolean | null;
  approvalTimestamp?: Date | null;
  materialChanges?: Prisma.JsonValue | null; // Can be array or stringified JSON, use JsonValue
  progressNotes?: string | null;
  attachments?: Prisma.JsonValue | null; // Can be array or stringified JSON, use JsonValue

  // Discriminant fields for source entity
  quoteId?: string | null;
  orderId?: string | null;
  jobId?: string | null;

  // The entityType property to differentiate history entries
  entityType: EntityType;
}

export class AuditService {
  private static async createAuditEntry(
    entityType: 'quote' | 'order' | 'job',
    entityId: string,
    changeType: string,
    data: any, // Raw object for snapshot
    version: number,
    status: string,
    context: AuditContext,
    additionalData?: any
  ): Promise<any> { // Return type could be specific history entry, but `any` for flexibility
    const auditData = {
      version,
      status,
      data: JSON.parse(JSON.stringify(data)) as Prisma.JsonValue, // Deep clone and cast to JsonValue
      changeType,
      changedBy: context.userId,
      changeReason: context.reason,
      createdAt: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      ...additionalData
    };

    switch (entityType) {
      case 'quote':
        return await prisma.quoteHistory.create({
          data: { quoteId: entityId, ...auditData }
        });
      case 'order':
        return await prisma.orderHistory.create({
          data: { orderId: entityId, ...auditData }
        });
      case 'job':
        return await prisma.jobHistory.create({
          data: { jobId: entityId, ...auditData }
        });
      default:
        throw new Error(`Unsupported entity type for audit: ${entityType}`);
    }
  }

  static getAuditContext(req: Request & { user?: { id: string } }, reason?: string): AuditContext {
    return {
      userId: req.user?.id || 'system',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      reason
    };
  }

  static async auditQuoteChange(
    quoteId: string,
    changeType: string,
    context: AuditContext,
    reason?: string
  ) {
    const quote = await prisma.quote.findUnique({
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

    if (!quote) throw new Error('Quote not found');

    let newVersion = typeof quote.currentVersion === 'number' ? quote.currentVersion : 0;
    if (['CREATE', 'UPDATE', 'STATUS_CHANGE', 'APPROVED', 'REJECTED', 'CLONE', 'CONVERT', 'DOCUMENT_UPLOADED'].includes(changeType)) {
      newVersion += 1;
      await prisma.quote.update({
        where: { id: quoteId },
        data: { currentVersion: newVersion }
      });
    }

    return await this.createAuditEntry(
      'quote',
      quoteId,
      changeType,
      quote,
      newVersion,
      quote.status,
      { ...context, reason: reason || context.reason }
    );
  }

  static async auditOrderChange(
    orderId: string,
    changeType: string,
    context: AuditContext,
    customerApproval?: {
      approved: boolean;
      signature?: string;
      timestamp: Date;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        createdBy: true,
        projectOwner: true,
        paymentMilestones: true,
        documents: true
      }
    });

    if (!order) throw new Error('Order not found');

    let newVersion = typeof order.currentVersion === 'number' ? order.currentVersion : 0;
    if (['CREATE', 'UPDATE', 'STATUS_CHANGE', 'APPROVED', 'REJECTED', 'CLONE', 'CONVERT', 'DOCUMENT_UPLOADED'].includes(changeType)) {
      newVersion += 1;
      await prisma.order.update({
        where: { id: orderId },
        data: { currentVersion: newVersion }
      });
    }

    return await this.createAuditEntry(
      'order',
      orderId,
      changeType,
      order,
      newVersion,
      order.status,
      context,
      {
        customerApproved: customerApproval?.approved,
        customerSignature: customerApproval?.signature,
        approvalTimestamp: customerApproval?.timestamp
      }
    );
  }

  static async auditJobChange(
    jobId: string,
    changeType: string,
    context: AuditContext,
    materialChanges?: Prisma.JsonValue, // Use JsonValue for flexibility
    progressNotes?: string,
    attachments?: Prisma.JsonValue // Use JsonValue for flexibility
  ) {
    const job = await prisma.job.findUnique({
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

    if (!job) throw new Error('Job not found');

    let newVersion = typeof job.currentVersion === 'number' ? job.currentVersion : 0;
    if (['CREATE', 'UPDATE', 'STATUS_CHANGE', 'MATERIAL_ADDED', 'MATERIAL_REMOVED', 'MATERIAL_UPDATED', 'DOCUMENT_UPLOADED'].includes(changeType)) {
      newVersion += 1;
      await prisma.job.update({
        where: { id: jobId },
        data: { currentVersion: newVersion }
      });
    }

    return await this.createAuditEntry(
      'job',
      jobId,
      changeType,
      job,
      newVersion,
      job.status,
      context,
      {
        materialChanges: materialChanges !== undefined ? materialChanges : null,
        progressNotes: progressNotes !== undefined ? progressNotes : null,
        attachments: attachments !== undefined ? attachments : null
      }
    );
  }

  private static async fetchHistory(quoteId?: string, orderId?: string, jobId?: string): Promise<BaseHistoryEntry[]> {
    let history: BaseHistoryEntry[] = [];

    if (quoteId) {
      try {
        const quoteHistory: QuoteHistoryPayload[] = await prisma.quoteHistory.findMany({
          where: { quoteId },
          include: { changedByUser: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' }
        });
        // Fix the type issue by using 'as' to explicitly cast the entityType to the union type
        history.push(...quoteHistory.map(h => ({ ...h, entityType: 'QUOTE' as EntityType })));
      } catch (error) {
        console.error(`Error fetching quote history for ID ${quoteId}:`, (error as Error).message);
      }
    }

    if (orderId) {
      try {
        const orderHistory: OrderHistoryPayload[] = await prisma.orderHistory.findMany({
          where: { orderId },
          include: { changedByUser: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' }
        });
        // Fix the type issue by using 'as' to explicitly cast the entityType to the union type
        history.push(...orderHistory.map(h => ({ ...h, entityType: 'ORDER' as EntityType })));
      } catch (error) {
        console.error(`Error fetching order history for ID ${orderId}:`, (error as Error).message);
      }
    }

    if (jobId) {
      try {
        const jobHistory: JobHistoryPayload[] = await prisma.jobHistory.findMany({
          where: { jobId },
          include: { changedByUser: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' }
        });
        // Fix the type issue by using 'as' to explicitly cast the entityType to the union type
        history.push(...jobHistory.map(h => ({ ...h, entityType: 'JOB' as EntityType })));
      } catch (error) {
        console.error(`Error fetching job history for ID ${jobId}:`, (error as Error).message);
      }
    }

    history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return history;
  }

  static async getCompleteHistory(quoteId?: string, orderId?: string, jobId?: string) {
    const timeline = await this.fetchHistory(quoteId, orderId, jobId);

    const history = {
      quote: timeline.filter(h => h.entityType === 'QUOTE'),
      order: timeline.filter(h => h.entityType === 'ORDER'),
      job: timeline.filter(h => h.entityType === 'JOB'),
      timeline: timeline
    };

    return history;
  }

  static async getLegalEvidencePackage(quoteId?: string, orderId?: string, jobId?: string) {
    const evidence = await this.getCompleteHistory(quoteId, orderId, jobId);

    const whereClause: any = {
      OR: []
    };

    if (quoteId) whereClause.OR.push({ quoteId });
    if (orderId) whereClause.OR.push({ orderId });
    if (jobId) whereClause.OR.push({ jobId });

    const documents = whereClause.OR.length > 0 ? await prisma.document.findMany({
      where: whereClause,
      include: {
        uploadedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    }) : [];

    const packageDataForHash = {
      historyTimeline: evidence.timeline.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        approvalTimestamp: entry.approvalTimestamp ? entry.approvalTimestamp.toISOString() : null,
        data: typeof entry.data === 'object' && entry.data !== null ? JSON.stringify(entry.data) : entry.data,
        materialChanges: typeof entry.materialChanges === 'object' && entry.materialChanges !== null ? JSON.stringify(entry.materialChanges) : entry.materialChanges,
        attachments: typeof entry.attachments === 'object' && entry.attachments !== null ? JSON.stringify(entry.attachments) : entry.attachments,
        changedByUser: entry.changedByUser ? {
          id: entry.changedByUser.id,
          name: entry.changedByUser.name
        } : null,
        ipAddress: undefined,
        userAgent: undefined,
      })),
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
          primaryEntityType: primaryEntityType as EntityType, // Ensure this is properly typed too
        }
      }
    };
  }

  private static generateEvidenceHash(data: any): string {
    const stableStringify = (obj: any): string => {
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
      return crypto.createHash('sha256').update(dataString).digest('hex');
    } catch (error) {
      console.error('Error generating stable string for hash:', error);
      throw new Error('Failed to generate package hash due to data processing error.');
    }
  }

  static async exportLegalHistory(
    quoteId?: string,
    orderId?: string,
    jobId?: string,
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<{ filePath?: string; filename: string; contentType: string; data?: string }> {
    const evidencePackage = await this.getLegalEvidencePackage(quoteId, orderId, jobId);

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
    } else if (format === 'pdf') {
      const filename = `legal-evidence-${entityType}_${entityId}_${timestamp}.pdf`;
      try {
        const { filePath, fileName } = await this.generatePDFExport(evidencePackage, filename);
        return {
          filePath,
          filename: fileName,
          contentType: 'application/pdf'
        };
      } catch (err) {
        console.error('Error during PDF generation in exportLegalHistory:', err);
        throw err;
      }
    } else {
      throw new Error(`Unsupported export format: ${format}. Must be 'pdf' or 'csv'.`);
    }
  }

  private static generateCSVExport(timeline: BaseHistoryEntry[]): string {
    const rows = [
      ['Timestamp', 'Entity Type', 'Entity ID', 'Change Type', 'Version', 'Status', 'Changed By User ID', 'Changed By User Name', 'IP Address', 'User Agent', 'Reason', 'Customer Approved', 'Approval Timestamp', 'Material Changes', 'Progress Notes', 'Attachments', 'Full Data Snapshot']
    ];

    timeline.forEach((entry: BaseHistoryEntry) => {
      const escapeCsv = (data: any): string => {
        if (data === null || data === undefined) return '';
        const str = typeof data === 'object' ? JSON.stringify(data) : String(data);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const entityId = entry.quoteId || entry.orderId || entry.jobId || '';
      const entityType = entry.entityType || 'UNKNOWN';
      const changedByUserId = entry.changedBy || '';
      const changedByUserName = entry.changedByUser?.name || '';
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

  private static async generatePDFExport(evidencePackage: any, targetFilename: string): Promise<{ filePath: string, fileName: string }> {
    const history = evidencePackage.evidence.timeline;
    const documents = evidencePackage.documents;
    const metadata = evidencePackage.metadata;

    const uploadsDir = path.join(__dirname, '../../uploads/evidence');

    try {
      await fsAsync.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory: ${uploadsDir}`, error);
      throw new Error('Failed to create upload directory for PDF');
    }

    const filePath = path.join(uploadsDir, targetFilename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });

      const stream = fs.createWriteStream(filePath);
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

      history.forEach((entry: BaseHistoryEntry) => { // Use BaseHistoryEntry type for consistency
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const timestamp = new Date(entry.createdAt).toLocaleString();
        const entityType = entry.entityType ? entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1) : 'Unknown';
        const entityId = (entry.quoteId || entry.orderId || entry.jobId || '').substring(0, 8);
        const changeType = entry.changeType ? entry.changeType.replace(/_/g, ' ') : 'Unknown';
        const version = entry.version || 'N/A';
        const user = entry.changedByUser?.name || 'System';
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
        } else {
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

        documents.forEach((document: any) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          const name = document.name || document.originalName || 'Unnamed';
          const type = document.mimeType ? document.mimeType.split('/')[1] : 'Unknown';
          const uploadDate = document.createdAt ? new Date(document.createdAt).toLocaleString() : 'Unknown';
          const uploader = document.uploadedByUser?.name || 'System';

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
          .text(
            `Page ${i + 1} of ${pageCount}`,
            0,
            doc.page.height - 50,
            { align: 'center' }
          );
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
  }

  static async logDocumentUpload(
    documentData: {
      name: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
      category: string;
      quoteId?: string | null;
      orderId?: string | null;
      jobId?: string | null;
    },
    uploadedByUserId: string,
    fileBuffer: Buffer
  ) {
    if (!documentData.storagePath || !uploadedByUserId || !fileBuffer) {
      throw new Error('Missing required data for logging document upload.');
    }

    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    try {
      const document = await prisma.document.create({
        data: {
          ...documentData,
          fileHash,
          uploadedBy: uploadedByUserId,
          storageType: 'LOCAL'
        }
      });

      const context: AuditContext = {
        userId: uploadedByUserId,
        reason: `Document uploaded: ${documentData.originalName || documentData.name}`
      };

      if (documentData.quoteId) {
        await AuditService.auditQuoteChange(documentData.quoteId, 'DOCUMENT_UPLOADED', context);
      }
      if (documentData.orderId) { // Add audit for order if linked
        await AuditService.auditOrderChange(documentData.orderId, 'DOCUMENT_UPLOADED', context);
      }
      if (documentData.jobId) { // Add audit for job if linked
        await AuditService.auditJobChange(documentData.jobId, 'DOCUMENT_UPLOADED', context);
      }

      return document; // Return the created document record
    } catch (error) {
      console.error('Error logging document upload:', (error as Error).message);
      throw new Error('Failed to log document upload and audit changes.');
    }
  }
}