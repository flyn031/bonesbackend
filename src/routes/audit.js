"use strict";
// src/routes/audit.ts
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
const express_1 = require("express");
const auditController_1 = require("../controllers/auditController");
const router = (0, express_1.Router)();
// === QUOTE AUDIT ROUTES ===
router.get('/quotes/:id/history', auditController_1.getQuoteHistory);
// === ORDER AUDIT ROUTES ===
router.get('/orders/:id/history', auditController_1.getOrderHistory);
// === JOB AUDIT ROUTES ===
router.get('/jobs/:id/history', auditController_1.getJobHistory);
// === COMBINED AUDIT ROUTES ===
// Fix: properly type the request/response parameters
router.get('/complete-history', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, auditController_1.getCompleteHistory)(req, res);
}));
// === LEGAL & EVIDENCE ROUTES ===
// Fix: properly type the request/response parameters
router.get('/legal-evidence', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, auditController_1.getLegalEvidencePackage)(req, res);
})); // Keep for backward compatibility
router.post('/legal-evidence', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, auditController_1.getLegalEvidencePackage)(req, res);
})); // Add POST endpoint
router.get('/download-evidence/:entityType/:entityId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, auditController_1.downloadEvidencePackage)(req, res);
}));
router.get('/download/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, auditController_1.downloadEvidenceFile)(req, res);
})); // Add new download endpoint
// === SEARCH & ANALYTICS ===
router.get('/search', auditController_1.searchAuditHistory);
router.get('/statistics', auditController_1.getAuditStatistics);
// === VERIFICATION ===
router.post('/verify-signature', auditController_1.verifyDigitalSignature);
exports.default = router;
