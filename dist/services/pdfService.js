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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuotePDF = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const generateQuotePDF = (order) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const doc = new pdfkit_1.default();
    const chunks = [];
    // Collect PDF data chunks
    doc.on('data', (chunk) => chunks.push(chunk));
    // Company Header
    doc.fontSize(20).text('Your Company Name', { align: 'right' });
    doc.fontSize(10).text('123 Business Street', { align: 'right' });
    doc.text('London, UK SW1A 1AA', { align: 'right' });
    doc.moveDown();
    // Quote Information
    doc.fontSize(16).text('Quotation', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Quote Reference: ${order.quoteRef}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    // Client Information
    doc.text('To:');
    doc.text(order.customerName);
    // Applying nullish coalescing operator (?? '') to handle potential null values
    doc.text((_a = order.contactPerson) !== null && _a !== void 0 ? _a : ''); // Fix: Provide empty string if null
    doc.text((_b = order.contactEmail) !== null && _b !== void 0 ? _b : ''); // Fix: Provide empty string if null
    doc.text((_c = order.contactPhone) !== null && _c !== void 0 ? _c : ''); // Fix: Provide empty string if null
    doc.moveDown();
    // Project Details
    doc.fontSize(12).text('Project Details', { underline: true });
    doc.fontSize(10).text(`Project Title: ${order.projectTitle}`);
    doc.text(`Lead Time: ${order.leadTimeWeeks} weeks`);
    doc.moveDown();
    // Items Table
    doc.fontSize(12).text('Items', { underline: true });
    const items = order.items; // Cast to any[] if Prisma type for `items` isn't an array of objects directly
    items.forEach(item => {
        var _a, _b, _c;
        // Ensure item.description, item.quantity, item.price are handled for potential null/undefined if necessary
        doc.fontSize(10).text(`${(_a = item.description) !== null && _a !== void 0 ? _a : ''}`); // Example for description
        doc.text(`Quantity: ${(_b = item.quantity) !== null && _b !== void 0 ? _b : 0}    Price: £${((_c = item.price) !== null && _c !== void 0 ? _c : 0).toFixed(2)}`, { align: 'right' });
        doc.moveDown(0.5);
    });
    // Financial Summary
    doc.moveDown();
    doc.fontSize(12).text('Financial Summary', { underline: true });
    doc.fontSize(10).text(`Sub Total: £${order.subTotal.toFixed(2)}`, { align: 'right' });
    if (order.vatRate) { // Check if vatRate exists
        doc.text(`VAT (${order.vatRate}%): £${order.totalTax.toFixed(2)}`, { align: 'right' });
    }
    doc.fontSize(12).text(`Total Amount: £${order.totalAmount.toFixed(2)}`, { align: 'right' });
    doc.moveDown();
    // Payment Terms
    doc.fontSize(12).text('Payment Terms', { underline: true });
    doc.fontSize(10).text(`Terms: ${(_d = order.paymentTerms) !== null && _d !== void 0 ? _d : ''}`); // Handle potential null for paymentTerms
    if (order.paymentSchedule) {
        // This cast might be necessary if paymentSchedule is JsonValue or a generic object
        const schedule = order.paymentSchedule;
        Object.entries(schedule).forEach(([stage, amount]) => {
            doc.text(`${stage}: £${amount.toFixed(2)}`); // Ensure amount is treated as number
        });
    }
    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('All prices are in GBP and exclude VAT unless otherwise stated.', { align: 'center' });
    doc.text('This quote is valid for 30 days from the date of issue.', { align: 'center' });
    // Finalize PDF
    doc.end();
    // Return as Buffer
    return new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
});
exports.generateQuotePDF = generateQuotePDF;
