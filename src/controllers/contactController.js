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
exports.setPrimaryContactPerson = exports.getContactPersonsForCustomer = exports.deleteContactPerson = exports.updateContactPerson = exports.setPrimaryContact = exports.getContactPersons = exports.createContactPerson = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
// Import both the TYPE and the ENUM OBJECT itself
const client_1 = require("@prisma/client"); // Added ContactPerson type
// --- HELPER FUNCTION (Not Exported) ---
function isValidContactRole(role) {
    if (role === null || role === undefined) {
        return true;
    }
    if (typeof role !== 'string') {
        console.error('[isValidContactRole] Received non-string role:', role);
        return false;
    }
    try {
        // console.log('[isValidContactRole] Checking against ContactRole enum object:', ContactRole); // Keep for debugging if needed
        if (!client_1.ContactRole) {
            console.error('[isValidContactRole] FATAL: Imported ContactRole enum object is undefined/null!');
            return false;
        }
        const validRoles = Object.values(client_1.ContactRole);
        return validRoles.includes(role);
    }
    catch (error) {
        console.error('[isValidContactRole] Error during validation check:', error);
        console.error('[isValidContactRole] Role being validated:', role);
        return false;
    }
}
// --- Helper function to update customer details ---
function updateCustomerFromPrimaryContact(tx, customerId, primaryContact // Can accept null if no primary
) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const customerUpdateData = {
            email: (_a = primaryContact === null || primaryContact === void 0 ? void 0 : primaryContact.email) !== null && _a !== void 0 ? _a : null, // Use contact's email or null
            phone: (_b = primaryContact === null || primaryContact === void 0 ? void 0 : primaryContact.phone) !== null && _b !== void 0 ? _b : null, // Use contact's phone or null
        };
        console.log(`[ContactCtrl] Updating customer ${customerId} with primary contact details:`, customerUpdateData);
        yield tx.customer.update({
            where: { id: customerId },
            data: customerUpdateData,
        });
    });
}
// --- EXPORTED CONTROLLER FUNCTIONS ---
// @desc    Create a contact person for a specific customer
// @route   POST /api/customers/:customerId/contacts
// @access  Private
const createContactPerson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { customerId } = req.params;
    const { name, email, phone, role, notes, isPrimary } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    console.log(`[ContactCtrl] Attempt create contact for customer ${customerId}. Body:`, req.body);
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Contact name is required' });
    }
    let validatedRole = null;
    // Role validation logic (remains the same as previous working version)
    try {
        if (role !== undefined && role !== null) {
            if (isValidContactRole(role)) {
                if (role !== null && role !== undefined)
                    validatedRole = role;
                else
                    validatedRole = null;
            }
            else {
                console.error(`[ContactCtrl] Invalid role received: ${role}`);
                const availableRoles = client_1.ContactRole ? Object.values(client_1.ContactRole).join(', ') : 'Enum unavailable';
                return res.status(400).json({ error: `Invalid role provided. Must be one of: ${availableRoles}` });
            }
        }
        else {
            validatedRole = null;
        }
    }
    catch (validationError) {
        console.error('[ContactCtrl] Error during role validation step:', validationError);
        return res.status(400).json({ error: 'Error validating contact role' });
    }
    try {
        // Ensure customer exists before transaction
        const customerExists = yield prismaClient_1.default.customer.findUnique({
            where: { id: customerId }, select: { id: true }
        });
        if (!customerExists) {
            console.log(`[ContactCtrl] Customer ${customerId} not found for contact creation.`);
            return res.status(404).json({ error: `Customer with ID ${customerId} not found` });
        }
        const newContact = yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Unset other primary contacts if this one is primary
            if (isPrimary === true) {
                console.log(`[ContactCtrl] Unsetting other primary contacts for customer ${customerId}`);
                yield tx.contactPerson.updateMany({
                    where: { customerId: customerId, isPrimary: true },
                    data: { isPrimary: false }
                });
            }
            // 2. Create the new contact
            const contactData = {
                name: name.trim(),
                email: email || null,
                phone: phone || null,
                role: validatedRole,
                notes: notes || null,
                isPrimary: isPrimary || false,
                customer: { connect: { id: customerId } }
            };
            const createdContact = yield tx.contactPerson.create({ data: contactData });
            console.log(`[ContactCtrl] Contact person created for customer ${customerId}: ID ${createdContact.id}`);
            // 3. *** NEW: Update customer if this contact is primary ***
            if (createdContact.isPrimary) {
                yield updateCustomerFromPrimaryContact(tx, customerId, createdContact);
            }
            // --- End New Logic ---
            return createdContact;
        }));
        res.status(201).json(newContact);
    }
    catch (error) {
        console.error(`[ContactCtrl] Error creating contact for customer ${customerId}:`, error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const targetField = (_b = error.meta) === null || _b === void 0 ? void 0 : _b.target;
            const message = (targetField === null || targetField === void 0 ? void 0 : targetField.includes('email')) ? 'Email already exists.' : 'Unique constraint failed.';
            return res.status(400).json({ error: message, code: error.code });
        }
        res.status(500).json({ error: 'Server error creating contact person', details: error.message });
    }
});
exports.createContactPerson = createContactPerson;
// @desc    Get all contact persons for a specific customer
// @route   GET /api/customers/:customerId/contacts
// @access  Private
// (No changes needed here)
const getContactPersons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { customerId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    console.log(`[ContactCtrl] Attempt get contacts for customer ${customerId}`);
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const customerExists = yield prismaClient_1.default.customer.findUnique({ where: { id: customerId }, select: { id: true } });
        if (!customerExists) {
            console.log(`[ContactCtrl] Customer ${customerId} not found for getting contacts.`);
            return res.status(404).json({ error: `Customer with ID ${customerId} not found` });
        }
        const contacts = yield prismaClient_1.default.contactPerson.findMany({
            where: { customerId: customerId },
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }]
        });
        console.log(`[ContactCtrl] Fetched ${contacts.length} contacts for customer ${customerId}`);
        res.status(200).json(contacts);
    }
    catch (error) {
        console.error(`[ContactCtrl] Error fetching contacts for customer ${customerId}:`, error);
        res.status(500).json({ error: 'Server error fetching contact persons', details: error.message });
    }
});
exports.getContactPersons = getContactPersons;
// @desc    Set a specific contact person as the primary for a customer
// @route   PATCH /api/customers/:customerId/contacts/:contactId/set-primary
// @access  Private
const setPrimaryContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { customerId, contactId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    console.log(`[ContactCtrl] Attempt set primary contact ${contactId} for customer ${customerId}`);
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const updatedContact = yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Verify contact exists and belongs to customer
            const contact = yield tx.contactPerson.findFirst({
                where: { id: contactId, customerId: customerId },
                // Select email and phone as we'll need them later
                select: { id: true, email: true, phone: true }
            });
            if (!contact) {
                throw new Error(`Contact person with ID ${contactId} not found for customer ${customerId}.`);
            }
            console.log(`[ContactCtrl] Verified contact ${contactId} belongs to customer ${customerId}.`);
            // 2. Unset primary flag on all other contacts for this customer
            yield tx.contactPerson.updateMany({
                where: { customerId: customerId, id: { not: contactId } },
                data: { isPrimary: false }
            });
            console.log(`[ContactCtrl] Unset other primary contacts for customer ${customerId}`);
            // 3. Set specified contact as primary
            const newPrimary = yield tx.contactPerson.update({
                where: { id: contactId },
                data: { isPrimary: true },
                // Re-select email/phone in case they were updated concurrently (unlikely but safe)
                select: { id: true, email: true, phone: true, isPrimary: true }
            });
            console.log(`[ContactCtrl] Set contact ${contactId} as primary.`);
            // 4. *** NEW: Update customer with this primary contact's details ***
            yield updateCustomerFromPrimaryContact(tx, customerId, newPrimary);
            // --- End New Logic ---
            return newPrimary; // Return the updated contact (or maybe return all contacts? TBD)
        }));
        // Decide what to return - the updated contact, or perhaps refetch all contacts?
        // Let's return the updated contact for now.
        res.status(200).json(updatedContact);
    }
    catch (error) {
        console.error(`[ContactCtrl] Error setting primary contact ${contactId} for customer ${customerId}:`, error);
        if (error.message && (error.message.includes('not found'))) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Server error setting primary contact person', details: error.message });
    }
});
exports.setPrimaryContact = setPrimaryContact;
// @desc    Update a specific contact person
// @route   PUT /api/contacts/:contactId (or /api/customers/:customerId/contacts/:contactId)
// @access  Private
const updateContactPerson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { contactId } = req.params;
    const { name, email, phone, role, notes, isPrimary } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    console.log(`[ContactCtrl] Attempt update contact ${contactId}. Body:`, req.body);
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    // Role validation (remains the same as previous working version)
    let validatedRole = undefined;
    try {
        if (role !== undefined) {
            if (role === null || role === '')
                validatedRole = null;
            else if (isValidContactRole(role)) {
                if (role !== null && role !== '')
                    validatedRole = role;
                else
                    validatedRole = null;
            }
            else {
                console.error(`[ContactCtrl] Invalid role for update: ${role}`);
                const availableRoles = client_1.ContactRole ? Object.values(client_1.ContactRole).join(', ') : 'Enum unavailable';
                return res.status(400).json({ error: `Invalid role provided. Must be one of: ${availableRoles} or null/empty string` });
            }
        }
    }
    catch (validationError) {
        console.error('[ContactCtrl] Error validating role for update:', validationError);
        return res.status(400).json({ error: 'Error validating contact role' });
    }
    try {
        const resultContact = yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Get the contact being updated to know its customerId
            const contactToUpdate = yield tx.contactPerson.findUnique({
                where: { id: contactId },
                select: { customerId: true }
            });
            if (!contactToUpdate) {
                throw new Error("Contact not found.");
            }
            const customerId = contactToUpdate.customerId; // Store customerId
            // 2. If setting isPrimary=true, unset others first
            if (isPrimary === true) {
                console.log(`[ContactCtrl] Updating primary status for contact ${contactId}, unsetting others for customer ${customerId}`);
                yield tx.contactPerson.updateMany({
                    where: { customerId: customerId, id: { not: contactId } },
                    data: { isPrimary: false }
                });
            }
            // 3. Prepare update data
            const contactUpdateData = {};
            if (name !== undefined)
                contactUpdateData.name = name.trim();
            if (email !== undefined)
                contactUpdateData.email = email || null;
            if (phone !== undefined)
                contactUpdateData.phone = phone || null;
            if (validatedRole !== undefined)
                contactUpdateData.role = validatedRole;
            if (notes !== undefined)
                contactUpdateData.notes = notes || null;
            if (isPrimary !== undefined)
                contactUpdateData.isPrimary = isPrimary;
            // Check if there's anything to update
            if (Object.keys(contactUpdateData).length === 0) {
                console.log(`[ContactCtrl] No fields provided for update on contact ${contactId}. Returning existing.`);
                const existing = yield tx.contactPerson.findUnique({ where: { id: contactId } });
                if (!existing)
                    throw new Error("Contact disappeared during transaction?");
                // If nothing changed, we don't need to update the customer either.
                return existing;
            }
            // 4. Update the contact
            const updatedContact = yield tx.contactPerson.update({
                where: { id: contactId },
                data: contactUpdateData,
                // Select needed fields for potential customer update
                select: { id: true, email: true, phone: true, isPrimary: true }
            });
            console.log(`[ContactCtrl] Updated contact person ${contactId}`);
            // 5. *** NEW: Update customer if this contact is now primary ***
            if (updatedContact.isPrimary) {
                yield updateCustomerFromPrimaryContact(tx, customerId, updatedContact);
            }
            else {
                // *** EDGE CASE: If the contact being updated was primary, but is NO LONGER primary... ***
                // We need to find the *new* primary contact (if any) for this customer
                // and update the customer details accordingly, or set them to null if none.
                // Check if the update *specifically* set isPrimary to false.
                if (isPrimary === false) {
                    console.log(`[ContactCtrl] Contact ${contactId} unset as primary. Checking for new primary for customer ${customerId}.`);
                    const newPrimaryContact = yield tx.contactPerson.findFirst({
                        where: {
                            customerId: customerId,
                            isPrimary: true
                        },
                        select: { email: true, phone: true }
                    });
                    // Update customer with new primary (or null if none found)
                    yield updateCustomerFromPrimaryContact(tx, customerId, newPrimaryContact);
                }
            }
            // --- End New Logic ---
            return updatedContact;
        }));
        res.status(200).json(resultContact);
    }
    catch (error) {
        console.error(`[ContactCtrl] Error updating contact ${contactId}:`, error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const targetField = (_b = error.meta) === null || _b === void 0 ? void 0 : _b.target;
            const message = (targetField === null || targetField === void 0 ? void 0 : targetField.includes('email')) ? 'Email already exists.' : 'Unique constraint failed.';
            return res.status(400).json({ error: message, code: error.code });
        }
        if (error.message === "Contact not found." || (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025')) {
            return res.status(404).json({ error: 'Contact person not found.' });
        }
        res.status(500).json({ error: 'Server error updating contact person', details: error.message });
    }
});
exports.updateContactPerson = updateContactPerson;
// @desc    Delete a specific contact person
// @route   DELETE /api/contacts/:contactId (or /api/customers/:customerId/contacts/:contactId)
// @access  Private
const deleteContactPerson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { contactId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    console.log(`[ContactCtrl] Attempt delete contact ${contactId}`);
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        yield prismaClient_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Find the contact to be deleted to check if it was primary
            const contactToDelete = yield tx.contactPerson.findUnique({
                where: { id: contactId },
                select: { isPrimary: true, customerId: true }
            });
            if (!contactToDelete) {
                // If already deleted or never existed, act as if successful (idempotent)
                console.log(`[ContactCtrl] Contact ${contactId} not found for deletion, perhaps already deleted.`);
                return; // Exit transaction block
            }
            const wasPrimary = contactToDelete.isPrimary;
            const customerId = contactToDelete.customerId;
            // 2. Delete the contact
            yield tx.contactPerson.delete({
                where: { id: contactId },
            });
            console.log(`[ContactCtrl] Deleted contact person ${contactId}`);
            // 3. *** NEW: If the deleted contact was primary, update the customer ***
            if (wasPrimary) {
                console.log(`[ContactCtrl] Deleted contact ${contactId} was primary. Finding new primary for customer ${customerId}.`);
                // Find the *next* potential primary contact (often the first one alphabetically?)
                // For simplicity, let's just find *any* remaining contact first.
                // A more robust approach might involve finding the oldest, or explicitly setting one.
                const nextPotentialPrimary = yield tx.contactPerson.findFirst({
                    where: { customerId: customerId },
                    orderBy: { name: 'asc' }, // Or createdAt: 'asc'? Pick a deterministic order.
                    select: { id: true, email: true, phone: true }
                });
                if (nextPotentialPrimary) {
                    console.log(`[ContactCtrl] Found next potential primary contact: ${nextPotentialPrimary.id}. Promoting it.`);
                    // Promote this one to primary
                    yield tx.contactPerson.update({
                        where: { id: nextPotentialPrimary.id },
                        data: { isPrimary: true }
                    });
                    // Update customer with its details
                    yield updateCustomerFromPrimaryContact(tx, customerId, nextPotentialPrimary);
                }
                else {
                    console.log(`[ContactCtrl] No remaining contacts for customer ${customerId}. Setting customer details to null.`);
                    // No contacts left, set customer details to null
                    yield updateCustomerFromPrimaryContact(tx, customerId, null);
                }
            }
            // --- End New Logic ---
        }));
        res.status(204).send(); // No Content success response
    }
    catch (error) {
        console.error(`[ContactCtrl] Error deleting contact ${contactId}:`, error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // This might be caught inside the transaction now, returning 204 is okay.
            return res.status(404).json({ error: 'Contact person not found (or already deleted).' });
        }
        res.status(500).json({ error: 'Server error deleting contact person', details: error.message });
    }
});
exports.deleteContactPerson = deleteContactPerson;
// --- Keep backward compatibility aliases if needed, ensure they are also exported ---
exports.getContactPersonsForCustomer = exports.getContactPersons;
exports.setPrimaryContactPerson = exports.setPrimaryContact;
