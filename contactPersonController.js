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
exports.setPrimaryContact = exports.deleteContactPerson = exports.updateContactPerson = exports.createContactPerson = exports.getContactPersons = void 0;
// Fix the import path to match the working path used in other files
const prismaClient_1 = __importDefault(require("../../utils/prismaClient"));
// Get all contact persons for a customer
const getContactPersons = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        console.log(`[ContactCtrl] Attempt get contacts for customer ${customerId}`);
        // Check if customer exists
        const customer = yield prismaClient_1.default.customer.findUnique({
            where: { id: customerId },
            select: { id: true }
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Get all contacts for this customer
        const contacts = yield prismaClient_1.default.contactPerson.findMany({
            where: { customerId },
            orderBy: [
                { isPrimary: 'desc' },
                { name: 'asc' }
            ]
        });
        console.log(`[ContactCtrl] Fetched ${contacts.length} contacts for customer ${customerId}`);
        res.json(contacts);
    }
    catch (error) {
        console.error('Error fetching contact persons:', error);
        res.status(500).json({ error: 'Failed to fetch contact persons', details: error.message });
    }
});
exports.getContactPersons = getContactPersons;
// Create a new contact person
const createContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { customerId } = req.params;
        const { name, email, phone, role, notes, isPrimary } = req.body;
        // Validate required fields
        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }
        // Check if customer exists
        const customer = yield prismaClient_1.default.customer.findUnique({
            where: { id: customerId },
            select: { id: true }
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Check for email uniqueness if provided
        if (email) {
            const existingContact = yield prismaClient_1.default.contactPerson.findUnique({
                where: { email }
            });
            if (existingContact) {
                res.status(400).json({ error: 'Email is already associated with another contact' });
                return;
            }
        }
        // If this contact is being set as primary, update all other contacts to not be primary
        if (isPrimary) {
            yield prismaClient_1.default.contactPerson.updateMany({
                where: { customerId },
                data: { isPrimary: false }
            });
        }
        // Create the contact person
        const contact = yield prismaClient_1.default.contactPerson.create({
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
    }
    catch (error) {
        console.error('Error creating contact person:', error);
        if (error.code === 'P2002' && ((_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.includes('email'))) {
            res.status(400).json({ error: 'Email address is already in use. Please use a different email.' });
            return;
        }
        res.status(500).json({ error: 'Failed to create contact person', details: error.message });
    }
});
exports.createContactPerson = createContactPerson;
// Update an existing contact person
const updateContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { customerId, contactId } = req.params;
        const { name, email, phone, role, notes, isPrimary } = req.body;
        // Validate required fields
        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }
        // Check if contact exists and belongs to the specified customer
        const existingContact = yield prismaClient_1.default.contactPerson.findFirst({
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
            const emailInUse = yield prismaClient_1.default.contactPerson.findUnique({
                where: { email }
            });
            if (emailInUse && emailInUse.id !== contactId) {
                res.status(400).json({ error: 'Email is already associated with another contact' });
                return;
            }
        }
        // If this contact is being set as primary, update all other contacts to not be primary
        if (isPrimary && !existingContact.isPrimary) {
            yield prismaClient_1.default.contactPerson.updateMany({
                where: {
                    customerId,
                    id: { not: contactId }
                },
                data: { isPrimary: false }
            });
        }
        // Update the contact
        const updatedContact = yield prismaClient_1.default.contactPerson.update({
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
    }
    catch (error) {
        console.error('Error updating contact person:', error);
        if (error.code === 'P2002' && ((_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.includes('email'))) {
            res.status(400).json({ error: 'Email address is already in use. Please use a different email.' });
            return;
        }
        res.status(500).json({ error: 'Failed to update contact person', details: error.message });
    }
});
exports.updateContactPerson = updateContactPerson;
// Delete a contact person
const deleteContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, contactId } = req.params;
        // Check if contact exists and belongs to the specified customer
        const existingContact = yield prismaClient_1.default.contactPerson.findFirst({
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
        yield prismaClient_1.default.contactPerson.delete({
            where: { id: contactId }
        });
        res.json({ message: 'Contact person deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting contact person:', error);
        res.status(500).json({ error: 'Failed to delete contact person', details: error.message });
    }
});
exports.deleteContactPerson = deleteContactPerson;
// Set a contact as the primary contact for a customer
const setPrimaryContact = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, contactId } = req.params;
        // Check if contact exists and belongs to the specified customer
        const existingContact = yield prismaClient_1.default.contactPerson.findFirst({
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
        yield prismaClient_1.default.contactPerson.updateMany({
            where: { customerId },
            data: { isPrimary: false }
        });
        // Set the specified contact as primary
        const updatedContact = yield prismaClient_1.default.contactPerson.update({
            where: { id: contactId },
            data: { isPrimary: true }
        });
        res.json(updatedContact);
    }
    catch (error) {
        console.error('Error setting primary contact:', error);
        res.status(500).json({ error: 'Failed to set primary contact', details: error.message });
    }
});
exports.setPrimaryContact = setPrimaryContact;
