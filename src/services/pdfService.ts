import PDFDocument from 'pdfkit';
import { Order } from '@prisma/client';

export const generateQuotePDF = async (order: Order): Promise<Buffer> => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

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
    doc.text(order.contactPerson);
    doc.text(order.contactEmail);
    doc.text(order.contactPhone);
    doc.moveDown();

    // Project Details
    doc.fontSize(12).text('Project Details', { underline: true });
    doc.fontSize(10).text(`Project Title: ${order.projectTitle}`);
    doc.text(`Lead Time: ${order.leadTimeWeeks} weeks`);
    doc.moveDown();

    // Items Table
    doc.fontSize(12).text('Items', { underline: true });
    const items = order.items as any[];
    items.forEach(item => {
        doc.fontSize(10).text(`${item.description}`);
        doc.text(`Quantity: ${item.quantity}    Price: £${item.price.toFixed(2)}`, { align: 'right' });
        doc.moveDown(0.5);
    });

    // Financial Summary
    doc.moveDown();
    doc.fontSize(12).text('Financial Summary', { underline: true });
    doc.fontSize(10).text(`Sub Total: £${order.subTotal.toFixed(2)}`, { align: 'right' });
    if (order.vatRate) {
        doc.text(`VAT (${order.vatRate}%): £${order.totalTax.toFixed(2)}`, { align: 'right' });
    }
    doc.fontSize(12).text(`Total Amount: £${order.totalAmount.toFixed(2)}`, { align: 'right' });
    doc.moveDown();

    // Payment Terms
    doc.fontSize(12).text('Payment Terms', { underline: true });
    doc.fontSize(10).text(`Terms: ${order.paymentTerms}`);
    if (order.paymentSchedule) {
        const schedule = order.paymentSchedule as any;
        Object.entries(schedule).forEach(([stage, amount]) => {
            doc.text(`${stage}: £${(amount as number).toFixed(2)}`);
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
};