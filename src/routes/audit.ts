// src/routes/audit.ts

import { Router, Request, Response } from 'express';
import {
  getQuoteHistory,
  getOrderHistory,
  getJobHistory,
  getCompleteHistory,
  getLegalEvidencePackage,
  searchAuditHistory,
  getAuditStatistics,
  verifyDigitalSignature,
  downloadEvidencePackage,
  downloadEvidenceFile
} from '../controllers/auditController';

const router = Router();

// === QUOTE AUDIT ROUTES ===
router.get('/quotes/:id/history', getQuoteHistory);

// === ORDER AUDIT ROUTES ===
router.get('/orders/:id/history', getOrderHistory);

// === JOB AUDIT ROUTES ===
router.get('/jobs/:id/history', getJobHistory);

// === COMBINED AUDIT ROUTES ===
// Fix: properly type the request/response parameters
router.get('/complete-history', async (req: Request, res: Response) => {
  await getCompleteHistory(req, res);
});

// === LEGAL & EVIDENCE ROUTES ===
// Fix: properly type the request/response parameters
router.get('/legal-evidence', async (req: Request, res: Response) => {
  await getLegalEvidencePackage(req, res);
});  // Keep for backward compatibility

router.post('/legal-evidence', async (req: Request, res: Response) => {
  await getLegalEvidencePackage(req, res);
}); // Add POST endpoint

router.get('/download-evidence/:entityType/:entityId', async (req: Request, res: Response) => {
  await downloadEvidencePackage(req, res);
});

router.get('/download/:filename', async (req: Request, res: Response) => {
  await downloadEvidenceFile(req, res);
}); // Add new download endpoint

// === SEARCH & ANALYTICS ===
router.get('/search', searchAuditHistory);
router.get('/statistics', getAuditStatistics);

// === VERIFICATION ===
router.post('/verify-signature', verifyDigitalSignature);

export default router;