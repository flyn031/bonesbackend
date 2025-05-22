// backend/src/controllers/customerController.ts
import { Response, NextFunction } from 'express'; // Import Response and NextFunction
import prisma from '../utils/prismaClient';
import csv from 'csv-parser';
import fs from 'fs';
import { Prisma, ContactRole, PaymentTerms /* Add other enums like CustomerStatus if needed */ } from '@prisma/client';
import { AuthRequest } from '../types/express.d'; // <--- ADDED: Import AuthRequest

// Helper function to check if a string is a valid ContactRole
function isValidContactRole(role: string | null | undefined): role is ContactRole {
    // Handle null/undefined values
    if (role === null || role === undefined) {
        return true; // Allow null/undefined roles
    }
    // Check against the actual enum values
    return Object.values(ContactRole).includes(role as ContactRole);
}

// --- createCustomer function (as provided by user) ---
// CHANGED: req: Request to req: AuthRequest
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // --- Added Logging ---
    console.log('>>> CREATE CUSTOMER CONTROLLER HIT <<<');
    console.log('>>> Received Request Body:', req.body);
    // You can now safely access req.user here if needed for authorization within the controller
    if (req.user) {
        console.log(`>>> User ID: ${req.user.id}, Role: ${req.user.role} <<<`);
    } else {
        console.log('>>> No authenticated user found on request <<<');
    }
    console.log('--------------------------------------');
    // --- End Added Logging ---

    try {
        console.log('[BE][createCustomer] Processing body:', JSON.stringify(req.body, null, 2)); // Log request body for processing
        const {
            name,
            email,
            phone,
            address,
            shippingAddress,
            billingAddress,
            paymentTerms,
            creditLimit,
            specialTermsNotes,
            discountPercentage,
            status,
            contacts = [] // Add support for contacts array
        } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        if (email) {
            const existingCustomer = await prisma.customer.findUnique({
                where: { email }
            });
            if (existingCustomer) {
                res.status(400).json({ error: 'Email already in use' });
                return;
            }
        }

        // Use a transaction to create both customer and contacts
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the customer
             // Prepare data, handling potential type issues
            const customerData: Prisma.CustomerCreateInput = {
                name,
                email: email || null, // Ensure email is null if empty/not provided
                phone: phone || null,
                address: address || null,
                shippingAddress: shippingAddress || null,
                billingAddress: billingAddress || null,
                // Handle PaymentTerms enum
                paymentTerms: (paymentTerms && Object.values(PaymentTerms).includes(paymentTerms as PaymentTerms))
                    ? paymentTerms as PaymentTerms
                    : null, // Set to null if empty or invalid
                creditLimit: (creditLimit !== undefined && creditLimit !== null && creditLimit !== "")
                    ? parseFloat(creditLimit.toString())
                    : null, // Convert or null
                specialTermsNotes: specialTermsNotes || null,
                discountPercentage: (discountPercentage !== undefined && discountPercentage !== null && discountPercentage !== "")
                    ? parseFloat(discountPercentage.toString())
                    : null, // Convert or null
                status: status || null // Handle status appropriately (maybe needs enum check too)
            };

            const customer = await tx.customer.create({ data: customerData });

            // 2. Process contacts if any are provided
            if (contacts && contacts.length > 0) {
                console.log(`[BE][createCustomer] Processing ${contacts.length} contacts`);

                // Find the primary contact (or set the first one as primary)
                let hasPrimary = contacts.some((c: any) => c.isPrimary);
                if (!hasPrimary && contacts.length > 0) {
                    contacts[0].isPrimary = true;
                    console.log('[BE][createCustomer] Setting first contact as primary');
                }

                // Create each contact
                for (const contact of contacts) {
                    // Basic validation
                    if (!contact.name) {
                        throw new Error('Each contact must have a name');
                    }

                    // Validate role if provided
                    let validatedRole: ContactRole | null = null;
                    if (contact.role !== undefined && contact.role !== null && contact.role !== "") {
                         if (isValidContactRole(contact.role)) {
                            validatedRole = contact.role as ContactRole;
                        } else {
                            console.error(`[BE][createCustomer] Invalid role for contact: ${contact.role}`);
                            throw new Error(`Invalid role provided for contact "${contact.name}". Must be one of: ${Object.values(ContactRole).join(', ')}`);
                        }
                    }

                    // Create the contact
                    await tx.contactPerson.create({
                        data: {
                            name: contact.name.trim(),
                            email: contact.email || null,
                            phone: contact.phone || null,
                            role: validatedRole,
                            notes: contact.notes || null,
                            isPrimary: contact.isPrimary || false,
                            customer: { connect: { id: customer.id } }
                        }
                    });
                    console.log(`[BE][createCustomer] Created contact: ${contact.name}`);
                }
                 // --- If first contact was made primary, update the main customer record ---
                 if (contacts[0].isPrimary === true) {
                     const primaryContactDetails = contacts[0];
                     await tx.customer.update({
                         where: { id: customer.id },
                         data: {
                             email: primaryContactDetails.email || customer.email || null, // Keep original if new primary has no email
                             phone: primaryContactDetails.phone || customer.phone || null  // Keep original if new primary has no phone
                         }
                     });
                     console.log(`[BE][createCustomer] Updated main customer email/phone from first contact marked as primary.`);
                 }
            }

            // Return the customer with contacts
            return tx.customer.findUnique({
                where: { id: customer.id },
                include: {
                    contactPersons: {
                        orderBy: [
                            { isPrimary: 'desc' },
                            { name: 'asc' }
                        ]
                    }
                }
            });
        });

        console.log('[BE][createCustomer] Successfully created customer with contacts:', JSON.stringify(result, null, 2));
        res.status(201).json(result);
    } catch (error: any) {
        console.error('[BE][createCustomer] !!! ERROR creating customer:', error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             const target = (error.meta?.target as string[])?.join(', ');
             res.status(400).json({ error: `Unique constraint violation on field(s): ${target}` });
             return;
         }
         if (error instanceof Prisma.PrismaClientValidationError) {
             res.status(400).json({ error: 'Invalid data provided.', details: error.message });
             return;
         }
        res.status(400).json({ error: 'Failed to create customer', details: error.message });
    }
};


// --- CORRECTED updateCustomer function ---
// CHANGED: req: Request to req: AuthRequest
export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    // Destructure all expected fields from the body
    const {
        name, email, phone, address, shippingAddress, billingAddress,
        paymentTerms, creditLimit, specialTermsNotes, discountPercentage,
        status,
        // Contacts are handled separately now if needed, but let's focus on customer update first
        // contacts = [] // You might handle contacts update differently or not at all here
    } = req.body;

    console.log(`[BE][updateCustomer] Attempting update for customer ${id}`);
    console.log('[BE][updateCustomer] Received body:', JSON.stringify(req.body, null, 2));
    if (req.user) {
        console.log(`>>> User ID: ${req.user.id}, Role: ${req.user.role} <<<`);
    } else {
        console.log('>>> No authenticated user found on request <<<');
    }

    try {
        // Fetch existing customer *outside* the transaction first for validation
        const existingCustomer = await prisma.customer.findUnique({
            where: { id },
            select: { email: true } // Only select necessary fields for validation
        });

        if (!existingCustomer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        // Check for email conflicts
        if (email && email !== existingCustomer.email) {
            const emailInUse = await prisma.customer.findUnique({
                where: { email }
            });
            if (emailInUse && emailInUse.id !== id) {
                res.status(400).json({
                    error: 'Email address is already in use by another customer.'
                });
                return;
            }
        }

        // --- Prepare update data with validation and type handling ---
        const updateData: Prisma.CustomerUpdateInput = {};

        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email; // Assumes email might be optional or nullable in schema?
        if (phone !== undefined) updateData.phone = phone || null;
        if (address !== undefined) updateData.address = address || null;
        if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress || null;
        if (billingAddress !== undefined) updateData.billingAddress = billingAddress || null;
        if (specialTermsNotes !== undefined) updateData.specialTermsNotes = specialTermsNotes || null;

        // --- Handle PaymentTerms Enum ---
        if (paymentTerms !== undefined) {
            // If empty string or not a valid enum value, set to null.
            // Assumes PaymentTerms enum is imported from @prisma/client
            if (paymentTerms === "" || !Object.values(PaymentTerms).includes(paymentTerms as PaymentTerms)) {
                 console.log(`[BE][updateCustomer] Invalid or empty paymentTerms ('${paymentTerms}'), setting to null.`);
                 updateData.paymentTerms = null;
            } else {
                 updateData.paymentTerms = paymentTerms as PaymentTerms; // Cast to enum type
            }
        }

        // --- Handle Status (Assuming it might be an enum, adjust if not) ---
        if (status !== undefined) {
             // Replace 'CustomerStatus' with your actual status enum name if it exists
             // If status is just a string field, this check can be simpler: updateData.status = status || null;
             /* Example if status is an enum:
             if (status === "" || !Object.values(CustomerStatus).includes(status as CustomerStatus)) {
                 console.log(`[BE][updateCustomer] Invalid or empty status ('${status}'), potentially setting to null or default.`);
                 updateData.status = null; // Or a default status? Depends on schema.
             } else {
                 updateData.status = status as CustomerStatus;
             }
             */
             // Assuming status is just a string based on previous code:
             updateData.status = status || null; // Set to null if empty string
        }


        // --- Handle Optional Numeric Fields ---
        if (creditLimit !== undefined) {
            const limit = creditLimit === "" ? null : parseFloat(creditLimit.toString()); // Handle empty string -> null first
            updateData.creditLimit = (limit !== null && !isNaN(limit)) ? limit : null;
        }
        if (discountPercentage !== undefined) {
            const discount = discountPercentage === "" ? null : parseFloat(discountPercentage.toString()); // Handle empty string -> null first
            updateData.discountPercentage = (discount !== null && !isNaN(discount)) ? discount : null;
        }

        // Check if there's actually anything to update
        if (Object.keys(updateData).length === 0) {
            console.log(`[BE][updateCustomer] No valid data fields provided for update for customer ${id}.`);
             // Return current customer data? Or a specific message?
             // Fetching again to ensure consistency
             const currentCustomer = await prisma.customer.findUnique({
                 where: { id },
                 // Include contacts if needed in the response
                 include: {
                     contactPersons: {
                         orderBy: [ { isPrimary: 'desc' }, { name: 'asc' } ]
                     }
                 }
             });
             res.json(currentCustomer); // Return current data if nothing changed
             return;
        }

        console.log(`[BE][updateCustomer] Prepared update data for customer ${id}:`, JSON.stringify(updateData, null, 2));

        // --- Perform Update ---
        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data: updateData,
            // Include contacts if you need to return them
             include: {
                 contactPersons: {
                     orderBy: [ { isPrimary: 'desc' }, { name: 'asc' } ]
                 }
             }
        });

        console.log(`[BE][updateCustomer] Successfully updated customer ${id}`);
        res.json(updatedCustomer); // Return the updated customer

    } catch (error: any) {
        console.error(`[BE][updateCustomer] !!! ERROR updating customer ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Specific handling for unique constraint violation (e.g., email)
            const target = (error.meta?.target as string[])?.join(', ');
            res.status(400).json({ error: `Unique constraint violation on field(s): ${target}` });
            return;
        }
        if (error instanceof Prisma.PrismaClientValidationError) {
            // Handling validation errors (like invalid enum value if checks missed somehow)
            res.status(400).json({ error: 'Invalid data provided.', details: error.message });
            return;
        }
        // Generic error
        res.status(500).json({ error: 'Failed to update customer', details: error.message });
    }
};


// --- getCustomers function (as provided by user) ---
// CHANGED: req: Request to req: AuthRequest
export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // You can now safely access req.user here if needed for authorization
        if (req.user) {
            console.log(`[BE][getCustomers] User ID: ${req.user.id}, Role: ${req.user.role}`);
        } else {
            console.log('[BE][getCustomers] No authenticated user found on request');
        }

        const {
            page = '1',
            limit = '20',
            search,
            status,
            minOrders,
            minSpent,
            lastOrderAfter
        } = req.query;
        console.log('[BE][getCustomers] Received Query Params:', req.query); // Log query params

        const filter: any = {};

        if (search) {
            filter.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        if (status && status !== 'all') {
            filter.status = status as string;
        }

        if (minOrders) {
            filter.totalOrders = { gte: parseInt(minOrders as string) };
        }

        if (minSpent) {
            filter.totalSpent = { gte: parseFloat(minSpent as string) };
        }

        if (lastOrderAfter) {
            filter.lastOrderDate = { gte: new Date(lastOrderAfter as string) };
        }
        console.log('[BE][getCustomers] Constructed Filter:', filter); // Log filter

        const customers = await prisma.customer.findMany({
            where: filter,
            include: {
                // Simplified includes to avoid totalCosts reference
                jobs: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        startDate: true,
                        expectedEndDate: true
                    }
                },
                orders: true,
                contactPersons: true // Include contact persons
            },
            skip: (parseInt(page as string) - 1) * parseInt(limit as string),
            take: parseInt(limit as string),
            orderBy: { createdAt: 'desc' }
        });
        console.log(`[BE][getCustomers] Found ${customers.length} customers in DB.`); // Log count found

        const totalCustomers = await prisma.customer.count({ where: filter });

        res.json({
            customers,
            totalPages: Math.ceil(totalCustomers / parseInt(limit as string)),
            currentPage: parseInt(page as string),
            totalCustomers
        });
    } catch (error: any) { // Added :any type for error message access
        console.error('[BE][getCustomers] !!! ERROR fetching customers:', error); // Log error explicitly
        // Return empty data as fallback <-- MODIFIED TO RETURN 500 STATUS
        res.status(500).json({
            message: 'Failed to fetch customers',
            error: error.message, // Send error message
            customers: [],
            totalPages: 1,
            currentPage: parseInt(req.query.page as string) || 1,
            totalCustomers: 0
        });
    }
};

// --- getCustomer function (as provided by user) ---
// CHANGED: req: Request to req: AuthRequest
export const getCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.user) {
            console.log(`[BE][getCustomer] User ID: ${req.user.id}, Role: ${req.user.role}`);
        } else {
            console.log('[BE][getCustomer] No authenticated user found on request');
        }

        const { id } = req.params;

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                // Simplified includes to avoid totalCosts reference
                jobs: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        startDate: true,
                        expectedEndDate: true
                    }
                },
                orders: true,
                contactPersons: true // Include contact persons
            }
        });

        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        res.json(customer);
    } catch (error: any) { // Added :any type for error message access
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Failed to fetch customer details', details: error.message });
    }
};

// --- getCustomerOrders function (as provided by user) ---
// CHANGED: req: Request to req: AuthRequest
export const getCustomerOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.user) {
            console.log(`[BE][getCustomerOrders] User ID: ${req.user.id}, Role: ${req.user.role}`);
        } else {
            console.log('[BE][getCustomerOrders] No authenticated user found on request');
        }

        const { customerId } = req.params;
        console.log(`Looking for orders for customer ID: ${customerId}`);

        // First, check if the customer exists
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true }
        });

        if (!customer) {
            console.log(`Customer not found: ${customerId}`);
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        console.log(`Found customer: ${customer.name}`);

        // Find orders directly linked to the customer by ID
        const linkedOrders = await prisma.order.findMany({
            where: { customerId: customerId },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${linkedOrders.length} orders linked by ID`);

        // Clean up and normalize the customer name for more flexible matching
        const cleanName = customer.name.trim();
        console.log(`Looking for orders with customer name containing: "${cleanName}"`);

        // Try multiple approaches to find orders by name
        const exactMatchOrders = await prisma.order.findMany({
            where: {
                customerName: cleanName,
                customerId: null // Only include orders not already linked by ID
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${exactMatchOrders.length} orders with exact name match`);

        // Try case-insensitive contains match
        const nameContainsOrders = await prisma.order.findMany({
            where: {
                customerName: {
                    contains: cleanName,
                    mode: 'insensitive'
                },
                customerId: null, // Only include orders not already linked by ID or exact match
                id: { notIn: exactMatchOrders.map(o => o.id) }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${nameContainsOrders.length} orders with name contains match`);

        // Try a more fuzzy match with just parts of the name
        const nameParts = cleanName.split(' ').filter(p => p.length > 2);
        console.log(`Name parts for fuzzy matching: ${nameParts.join(', ')}`);

        let fuzzyMatchOrders: any[] = [];

        if (nameParts.length > 0) {
            // Try to match each substantial part of the name
            const partialMatches = await Promise.all(
                nameParts.map(part =>
                    prisma.order.findMany({
                        where: {
                            customerName: {
                                contains: part,
                                mode: 'insensitive'
                            },
                            customerId: null,
                            id: {
                                notIn: [...linkedOrders, ...exactMatchOrders, ...nameContainsOrders].map(o => o.id)
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })
                )
            );

            // Flatten and deduplicate results
            const allPartialMatches = partialMatches.flat();
            const matchIds = new Set();
            fuzzyMatchOrders = allPartialMatches.filter(order => {
                if (matchIds.has(order.id)) return false;
                matchIds.add(order.id);
                return true;
            });

            console.log(`Found ${fuzzyMatchOrders.length} orders with fuzzy name matching`);
        }

        // Combine all unique orders
        const orders = [...linkedOrders, ...exactMatchOrders, ...nameContainsOrders, ...fuzzyMatchOrders];
        console.log(`Returning ${orders.length} total orders for customer ${customer.name} (${customerId})`);

        // Map order data to match what the frontend expects
        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.quoteRef || order.id.substring(0, 8), // Use quoteRef as orderNumber if available
            date: order.createdAt,
            total: order.totalAmount || order.projectValue || 0,
            status: order.status || 'UNKNOWN'
        }));

        // Even if no orders, return empty array with 200 status
        res.json(formattedOrders);
    } catch (error: any) { // Added :any type for error message access
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ error: 'Failed to fetch customer orders', details: error.message });
    }
};


// --- deleteCustomer function (as provided by user) ---
// CHANGED: req: Request to req: AuthRequest
export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.user) {
            console.log(`[BE][deleteCustomer] User ID: ${req.user.id}, Role: ${req.user.role}`);
        } else {
            console.log('[BE][deleteCustomer] No authenticated user found on request');
        }

        const { id } = req.params;

        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });

        if (!existingCustomer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        await prisma.customer.delete({
            where: { id }
        });

        res.json({ message: 'Customer deleted successfully' });
    } catch (error: any) { // Added :any type for error message access
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer', details: error.message });
    }
};

// --- importCustomers function (as provided by user) ---
// CHANGED: req: Request to req: AuthRequest
export const importCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user) {
        console.log(`[BE][importCustomers] User ID: ${req.user.id}, Role: ${req.user.role}`);
    } else {
        console.log('[BE][importCustomers] No authenticated user found on request');
    }

    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const results: any[] = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                const validCustomers = results.map(customer => ({
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    shippingAddress: customer.shippingAddress,
                    billingAddress: customer.billingAddress,
                    // Ensure paymentTerms matches enum or is null/ignored
                    paymentTerms: (customer.paymentTerms && Object.values(PaymentTerms).includes(customer.paymentTerms as PaymentTerms))
                        ? customer.paymentTerms as PaymentTerms
                        : null,
                    creditLimit: customer.creditLimit ? parseFloat(customer.creditLimit) : null,
                    specialTermsNotes: customer.specialTermsNotes,
                    discountPercentage: customer.discountPercentage ? parseFloat(customer.discountPercentage) : null,
                    status: customer.status // Might need enum handling here too
                }));

                // Use createMany with skipDuplicates
                const createResult = await prisma.customer.createMany({
                    data: validCustomers,
                    skipDuplicates: true // Important for handling potential email conflicts
                });

                // Safe check before trying to unlink
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // Clean up uploaded file
                }

                res.status(200).json({ message: `Processed ${results.length} records. Created ${createResult.count} new customers successfully.` });

            } catch (error: any) { // Added :any type for error message access
                console.error('Error importing customers:', error);
                // Attempt to delete the file even if import fails
                if (filePath && fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (unlinkErr) { console.error("Error cleaning up uploaded file:", unlinkErr); }
                }
                res.status(500).json({ error: 'Failed to import customers', details: error.message });
            }
        });
};