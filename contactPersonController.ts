import { Request, Response, NextFunction } from 'express';
// Fix the import path to match the working path used in other files
import prisma from '../../utils/prismaClient';

// Get all contact persons for a customer
export const getContactPersons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    console.log(`[ContactCtrl] Attempt get contacts for customer ${customerId}`);

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true }
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Get all contacts for this customer
    const contacts = await prisma.contactPerson.findMany({
      where: { customerId },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' }
      ]
    });

    console.log(`[ContactCtrl] Fetched ${contacts.length} contacts for customer ${customerId}`);
    res.json(contacts);
  } catch (error: any) {
    console.error('Error fetching contact persons:', error);
    res.status(500).json({ error: 'Failed to fetch contact persons', details: error.message });
  }
};

// Create a new contact person
export const createContactPerson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { name, email, phone, role, notes, isPrimary } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true }
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Check for email uniqueness if provided
    if (email) {
      const existingContact = await prisma.contactPerson.findUnique({
        where: { email }
      });
      if (existingContact) {
        res.status(400).json({ error: 'Email is already associated with another contact' });
        return;
      }
    }

    // If this contact is being set as primary, update all other contacts to not be primary
    if (isPrimary) {
      await prisma.contactPerson.updateMany({
        where: { customerId },
        data: { isPrimary: false }
      });
    }

    // Create the contact person
    const contact = await prisma.contactPerson.create({
      data: {
        name,
        email,
        phone,
        role,
        notes,
        isPrimary: isPrimary || false,
        customer: {
          connect: { id: customerId }
        }
      }
    });

    res.status(201).json(contact);
  } catch (error: any) {
    console.error('Error creating contact person:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      res.status(400).json({ error: 'Email address is already in use. Please use a different email.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create contact person', details: error.message });
  }
};

// Update an existing contact person
export const updateContactPerson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, contactId } = req.params;
    const { name, email, phone, role, notes, isPrimary } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check if contact exists and belongs to the specified customer
    const existingContact = await prisma.contactPerson.findFirst({
      where: { 
        id: contactId,
        customerId
      }
    });

    if (!existingContact) {
      res.status(404).json({ error: 'Contact not found or does not belong to this customer' });
      return;
    }

    // Check for email uniqueness if email is changing
    if (email && email !== existingContact.email) {
      const emailInUse = await prisma.contactPerson.findUnique({
        where: { email }
      });
      
      if (emailInUse && emailInUse.id !== contactId) {
        res.status(400).json({ error: 'Email is already associated with another contact' });
        return;
      }
    }

    // If this contact is being set as primary, update all other contacts to not be primary
    if (isPrimary && !existingContact.isPrimary) {
      await prisma.contactPerson.updateMany({
        where: { 
          customerId,
          id: { not: contactId }
        },
        data: { isPrimary: false }
      });
    }

    // Update the contact
    const updatedContact = await prisma.contactPerson.update({
      where: { id: contactId },
      data: {
        name,
        email,
        phone,
        role,
        notes,
        isPrimary: isPrimary || false
      }
    });

    res.json(updatedContact);
  } catch (error: any) {
    console.error('Error updating contact person:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      res.status(400).json({ error: 'Email address is already in use. Please use a different email.' });
      return;
    }
    res.status(500).json({ error: 'Failed to update contact person', details: error.message });
  }
};

// Delete a contact person
export const deleteContactPerson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, contactId } = req.params;

    // Check if contact exists and belongs to the specified customer
    const existingContact = await prisma.contactPerson.findFirst({
      where: { 
        id: contactId,
        customerId
      }
    });

    if (!existingContact) {
      res.status(404).json({ error: 'Contact not found or does not belong to this customer' });
      return;
    }

    // Delete the contact
    await prisma.contactPerson.delete({
      where: { id: contactId }
    });

    res.json({ message: 'Contact person deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting contact person:', error);
    res.status(500).json({ error: 'Failed to delete contact person', details: error.message });
  }
};

// Set a contact as the primary contact for a customer
export const setPrimaryContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, contactId } = req.params;

    // Check if contact exists and belongs to the specified customer
    const existingContact = await prisma.contactPerson.findFirst({
      where: { 
        id: contactId,
        customerId
      }
    });

    if (!existingContact) {
      res.status(404).json({ error: 'Contact not found or does not belong to this customer' });
      return;
    }

    // Update all contacts for this customer to not be primary
    await prisma.contactPerson.updateMany({
      where: { customerId },
      data: { isPrimary: false }
    });

    // Set the specified contact as primary
    const updatedContact = await prisma.contactPerson.update({
      where: { id: contactId },
      data: { isPrimary: true }
    });

    res.json(updatedContact);
  } catch (error: any) {
    console.error('Error setting primary contact:', error);
    res.status(500).json({ error: 'Failed to set primary contact', details: error.message });
  }
};