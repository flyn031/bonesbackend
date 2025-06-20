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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuote = void 0;
const client_1 = require("@prisma/client");
const pdfService_1 = require("../services/pdfService");
const prisma = new client_1.PrismaClient();
const generateQuote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const order = yield prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        const pdfBuffer = yield (0, pdfService_1.generateQuotePDF)(order);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=quote-${order.quoteRef}.pdf`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
});
exports.generateQuote = generateQuote;
