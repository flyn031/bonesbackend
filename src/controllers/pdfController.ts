import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateQuotePDF } from '../services/pdfService';

const prisma = new PrismaClient();

export const generateQuote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const pdfBuffer = await generateQuotePDF(order);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=quote-${order.quoteRef}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
};