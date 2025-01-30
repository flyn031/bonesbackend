import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Payment Milestones
export const createPaymentMilestone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orderId, description, amount, dueDate } = req.body;

        const milestone = await prisma.paymentMilestone.create({
            data: {
                orderId,
                description,
                amount,
                dueDate: new Date(dueDate),
                status: 'PENDING'
            }
        });

        res.status(201).json(milestone);
    } catch (error) {
        next(error);
    }
};

// Regional Tax Settings
export const createRegionalTaxSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { country, region, standardVatRate, reducedVatRate, taxCode } = req.body;

        const taxSetting = await prisma.regionalTaxSetting.create({
            data: {
                country,
                region,
                standardVatRate,
                reducedVatRate,
                taxCode
            }
        });

        res.status(201).json(taxSetting);
    } catch (error) {
        next(error);
    }
};

// Currency Rates
export const createCurrencyRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fromCurrency, toCurrency, rate, validFrom, validTo } = req.body;

        const currencyRate = await prisma.currencyRate.create({
            data: {
                fromCurrency,
                toCurrency,
                rate,
                validFrom: new Date(validFrom),
                validTo: new Date(validTo)
            }
        });

        res.status(201).json(currencyRate);
    } catch (error) {
        next(error);
    }
};

// Get current exchange rate
export const getCurrentRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fromCurrency, toCurrency } = req.params;
        const now = new Date();

        const rate = await prisma.currencyRate.findFirst({
            where: {
                fromCurrency,
                toCurrency,
                validFrom: { lte: now },
                validTo: { gte: now }
            },
            orderBy: {
                validFrom: 'desc'
            }
        });

        if (!rate) {
            res.status(404).json({ error: 'Exchange rate not found' });
            return;
        }

        res.json(rate);
    } catch (error) {
        next(error);
    }
};