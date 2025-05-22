// backend/src/controllers/simpleContactController.ts
import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { Prisma, ContactRole } from '@prisma/client';

export const createContactPerson = async (req: AuthRequest, res: Response) => {
    try {
        const { customerId } = req.params;
        const { name, email, phone, role, notes, isPrimary } = req.body;
        
        console.log(`[SimpleContactCtrl] Creating contact for customer ${customerId}`);
        
        // Find the customer
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        // Create the contact without any validation
        const contact = await prisma.contactPerson.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                role: role as any, // Force bypass type checking
                notes: notes || null,
                isPrimary: isPrimary || false,
                customer: { connect: { id: customerId } }
            }
        });
        
        console.log(`[SimpleContactCtrl] Created contact: ${contact.id}`);
        return res.status(201).json(contact);
    } catch (error: any) {
        console.error('[SimpleContactCtrl] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const getContactPersons = async (req: AuthRequest, res: Response) => {
    try {
        const { customerId } = req.params;
        
        const contacts = await prisma.contactPerson.findMany({
            where: { customerId }
        });
        
        return res.status(200).json(contacts);
    } catch (error: any) {
        console.error('[SimpleContactCtrl] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
