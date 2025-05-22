// backend/src/routes/contactRoutes.ts
import express, { Request, Response } from 'express';
// Fix import path to match project structure
import { authenticateToken } from '../../middleware/authMiddleware';
import {
  createContactPerson,
  getContactPersonsForCustomer,
  updateContactPerson,
  deleteContactPerson,
  setPrimaryContactPerson
} from '../../controllers/contactController';

const router = express.Router({ mergeParams: true });

// Get all contacts for a customer
router.get('/', authenticateToken, getContactPersonsForCustomer);

// Create a new contact for a customer
router.post('/', authenticateToken, createContactPerson);

// Update a contact
router.put('/:contactId', authenticateToken, updateContactPerson);

// Delete a contact
router.delete('/:contactId', authenticateToken, deleteContactPerson);

// Set a contact as primary
router.put('/:contactId/set-primary', authenticateToken, setPrimaryContactPerson);

export default router;