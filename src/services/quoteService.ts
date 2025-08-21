// backend/src/services/quoteService.ts
import prisma from '../utils/prismaClient';
import { Prisma, Quote, QuoteLineItem, QuoteStatus, OrderStatus, PaymentTerms, OrderType, CompanySettings, Material } from '@prisma/client';

// --- Interfaces ---
interface QuoteInputData {
  customerId: string;
  title: string;
  description?: string;
  notes?: string;   
  totalAmount?: number; // Frontend might send number, backend should handle as Decimal
  validUntil?: Date;
  createdById: string;
  customerReference?: string;
  contactEmail?: string;
  contactPerson?: string;
  contactPhone?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // Frontend might send number
    materialId: string | null | undefined; // Expecting material CODE here from frontend
  }>;
  status?: QuoteStatus;
}

interface QuoteVersionInputData extends QuoteInputData {
  parentQuoteId: string;
  changeReason: string;
}

// --- Helper Function to process line items and lookup material by code ---
async function processLineItemsWithMaterialCodeLookup(
  lineItemsInput: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // Frontend sends number
    materialId: string | null | undefined; // Expecting material CODE here
  }>
): Promise<Array<Prisma.QuoteLineItemCreateWithoutQuoteInput>> {
  const processedLineItems: Array<Prisma.QuoteLineItemCreateWithoutQuoteInput> = [];
  for (const item of lineItemsInput) {
    let actualMaterialDatabaseId: string | undefined = undefined; // This will store the CUID

    if (item.materialId && String(item.materialId).trim() !== '') {
      const materialCodeFromFrontend = String(item.materialId).trim();
      console.log(`[QuoteService][Helper] Attempting to find material with code: '${materialCodeFromFrontend}'`);
      const materialRecord = await prisma.material.findUnique({
        where: { code: materialCodeFromFrontend },
        select: { id: true }, // Only fetch the 'id' (CUID)
      });

      if (!materialRecord) {
        console.warn(`[QuoteService][Helper] WARNING: Material with code '${materialCodeFromFrontend}' NOT FOUND in database. Proceeding without material link.`);
        actualMaterialDatabaseId = undefined; // Don't link to material if not found
      } else {
        actualMaterialDatabaseId = materialRecord.id; // Use the actual database CUID
        console.log(`[QuoteService][Helper] Found material CUID: '${actualMaterialDatabaseId}' for code: '${materialCodeFromFrontend}'`);
      }
    }

    // Fix 1: Ensure quantity and unitPrice are converted properly for Prisma
    processedLineItems.push({
      description: item.description,
      quantity: item.quantity,  // Store as number instead of Decimal
      unitPrice: item.unitPrice, // Store as number instead of Decimal
      ...(actualMaterialDatabaseId && { // Conditionally connect to material if CUID was found
        material: {
          connect: { id: actualMaterialDatabaseId },
        },
      }),
    });
  }
  return processedLineItems;
}

// Define type for CompanySettings that includes defaultVatRate
type CompanySettingsWithVat = CompanySettings;

// --- Helper Function for Quote Reference ---
async function generateQuoteReference(): Promise<string> {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    console.warn("[QuoteService][generateQuoteReference] CompanySettings not found, creating default settings...");
    try {
        // Create settings with defaultVatRate if needed
        settings = await prisma.companySettings.create({
            data: {
                quoteReferencePrefix: 'QR',
                lastQuoteReferenceSeq: 0,
                // Use an additional field for defaultVatRate if needed
                // This assumes schema has been updated to include this field
                // If not, you'll need to store VAT rate elsewhere
            }
        });
        console.log("[QuoteService][generateQuoteReference] Default CompanySettings created.");
    } catch (error) {
         console.error("[QuoteService][generateQuoteReference] Failed to create default CompanySettings!", error);
         return `QR-ERR-${Date.now()}`;
    }
  }
  // Use a transaction to ensure atomicity for incrementing sequence number
  const updatedSettings = await prisma.companySettings.update({
    where: { id: settings.id },
    data: { lastQuoteReferenceSeq: { increment: 1 } },
  });
  const prefix = updatedSettings.quoteReferencePrefix || 'QR';
  const sequence = updatedSettings.lastQuoteReferenceSeq;
  const paddedSequence = sequence.toString().padStart(4, '0'); // Ensure consistent padding
  return `${prefix}-${paddedSequence}`;
}

// Helper function to calculate totals - exported to fix the missing reference error
export const calculateQuoteTotals = (items: Array<{ quantity?: number; unitPrice?: number }>) => {
  return items.reduce((sum: number, item) => {
    return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
  }, 0);
};

// --- Service Functions ---
export const createQuoteV1 = async (data: QuoteInputData) => {
  console.log('[QuoteService][createQuoteV1] Received raw payload:', JSON.stringify(data, null, 2));
  const quoteReference = await generateQuoteReference();
  const versionNumber = 1;
  const quoteNumber = `${quoteReference}-v${versionNumber}`;

  const lineItemsForDb = await processLineItemsWithMaterialCodeLookup(data.lineItems);

  // Calculate total amount from items
  const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
    // Handle as regular numbers instead of Decimals
    return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
  }, 0); 

  // Get company settings
  const companySettings = await prisma.companySettings.findFirst() as CompanySettingsWithVat;
  
  // Calculate VAT - handle as regular number calculation
  const vatRate = 20; // Default VAT rate if not set
  const vatMultiplier = 1 + (vatRate / 100);

  // Calculate final total
  const finalTotal = data.totalAmount !== undefined
    ? data.totalAmount
    : totalAmountFromItems * vatMultiplier;

  console.log(`[QuoteService][createQuoteV1] User ID: ${data.createdById}, Customer ID: ${data.customerId}`);
  console.log(`[QuoteService][createQuoteV1] Calculated finalTotal: ${finalTotal}`);
  console.log('[QuoteService][createQuoteV1] Line items processed for DB (with CUIDs for materialId):', JSON.stringify(lineItemsForDb, null, 2));

  try {
    return await prisma.quote.create({
      data: {
        customerId: data.customerId,
        title: data.title,
        description: data.description,
        status: data.status || QuoteStatus.DRAFT, // Default to DRAFT
        validUntil: data.validUntil,
        createdById: data.createdById,
        customerReference: data.customerReference,
        contactEmail: data.contactEmail,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        totalAmount: finalTotal, // Use number instead of Decimal
        quoteReference: quoteReference,
        versionNumber: versionNumber,
        isLatestVersion: true,
        changeReason: 'Initial creation',
        parentQuoteId: null,
        quoteNumber: quoteNumber,
        lineItems: {
          create: lineItemsForDb,
        },
      },
      include: { customer: true, lineItems: { include: { material: true } }, createdBy: true },
    });
  } catch (error) {
    console.error("[QuoteService][createQuoteV1] Prisma Error during quote creation:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("[QuoteService][createQuoteV1] Prisma Error Code:", error.code);
        console.error("[QuoteService][createQuoteV1] Prisma Error Meta:", error.meta);
    }
    throw error;
  }
};

export const createNewQuoteVersion = async (data: QuoteVersionInputData) => {
  console.log('[QuoteService][createNewQuoteVersion] Received raw payload:', JSON.stringify(data, null, 2));
  const { parentQuoteId, changeReason, ...newData } = data;
  const parentQuote = await prisma.quote.findUnique({ where: { id: parentQuoteId } });
  if (!parentQuote) throw new Error(`Parent quote with ID ${parentQuoteId} not found.`);
  
  // Create an array of valid status values to check against
  const invalidStatusValues: QuoteStatus[] = [QuoteStatus.APPROVED, QuoteStatus.DECLINED, QuoteStatus.EXPIRED, QuoteStatus.CONVERTED];
  if (parentQuote.status && invalidStatusValues.includes(parentQuote.status)) {
      throw new Error(`Cannot create new version from quote with status ${parentQuote.status}. Clone instead.`);
  }

  const lineItemsForDb = await processLineItemsWithMaterialCodeLookup(newData.lineItems);

  // Calculate total amount from items as numbers
  const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
    return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
  }, 0);

  // Get company settings
  const companySettings = await prisma.companySettings.findFirst() as CompanySettingsWithVat;
  
  // Calculate VAT - handle as regular number calculation
  const vatRate = 20; // Default VAT rate if not set
  const vatMultiplier = 1 + (vatRate / 100);

  // Calculate final total
  const finalTotal = newData.totalAmount !== undefined
    ? newData.totalAmount
    : totalAmountFromItems * vatMultiplier;

  const newVersionNumber = parentQuote.versionNumber + 1;
  const newQuoteNumber = `${parentQuote.quoteReference}-v${newVersionNumber}`;

  console.log('[QuoteService][createNewQuoteVersion] Line items processed for DB:', JSON.stringify(lineItemsForDb, null, 2));

  const newVersion = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.quote.update({ where: { id: parentQuoteId }, data: { isLatestVersion: false } });
    const createdQuote = await tx.quote.create({
      data: {
        customerId: parentQuote.customerId,
        quoteReference: parentQuote.quoteReference,
        title: newData.title,
        description: newData.description,
        status: newData.status || parentQuote.status,
        validUntil: newData.validUntil,
        createdById: newData.createdById,
        customerReference: newData.customerReference,
        contactEmail: newData.contactEmail,
        contactPerson: newData.contactPerson,
        contactPhone: newData.contactPhone,
        totalAmount: finalTotal, // Store as number not Decimal
        versionNumber: newVersionNumber,
        isLatestVersion: true,
        changeReason: changeReason,
        parentQuoteId: parentQuoteId,
        quoteNumber: newQuoteNumber,
        lineItems: {
          create: lineItemsForDb,
        },
      },
      include: { customer: true, lineItems: { include: { material: true } }, createdBy: true },
    });
    return createdQuote; // Return the created quote from the transaction
  });
  return newVersion;
};

export const getQuotes = async (onlyLatest: boolean = true) => {
  return prisma.quote.findMany({
    where: onlyLatest ? { isLatestVersion: true } : undefined,
    include: {
      customer: { select: { name: true, id: true } },
      lineItems: { include: { material: {select: {id: true, code: true, name: true}} } },
      createdBy: { select: { name: true, id: true } }
    },
    orderBy: [{ quoteReference: 'desc' }, { versionNumber: 'desc' }],
  });
};

export const getQuoteVersionById = async (id: string) => {
  return prisma.quote.findUnique({
    where: { id },
    include: {
        customer: true,
        lineItems: { orderBy: { createdAt: 'asc' }, include: { material: true } },
        parentQuote: { select: { id: true, versionNumber: true, status: true } },
        childQuotes: { where: { isLatestVersion: true }, select: { id: true, versionNumber: true, status: true }, take: 1 },
        orders: { select: { id: true, projectTitle: true, status: true } },
        createdBy: { select: { name: true, id: true } }
    },
  });
};

export const getQuoteHistory = async (quoteReference: string) => {
    return prisma.quote.findMany({
        where: { quoteReference: quoteReference },
        include: {
          customer: { select: { name: true, id: true } },
          lineItems: { include: { material: true } },
          createdBy: { select: { name: true, id: true }}
        },
        orderBy: { versionNumber: 'asc' }
    });
}

// Export the function to match the import in the test files
export const getQuoteHistoryByReference = getQuoteHistory;

export const cloneQuote = async (sourceQuoteId: string, userId: string, targetCustomerId?: string, newTitle?: string) => {
  const sourceQuote = await prisma.quote.findUnique({
    where: { id: sourceQuoteId },
    include: {
      lineItems: { include: { material: { select: { code: true } } } } // Fetch material code
    }
  });
  if (!sourceQuote) throw new Error(`Quote version with ID ${sourceQuoteId} not found for cloning.`);

  // Pass material CODEs to createQuoteV1, as it now handles the lookup
  // No need for toNumber() since lineItems are stored as regular numbers
  const lineItemsForCloneInput = sourceQuote.lineItems.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity), // Ensure it's a number
    unitPrice: Number(item.unitPrice), // Ensure it's a number
    materialId: item.material?.code, // Use the material CODE here
  }));

  const newQuoteData: QuoteInputData = {
    customerId: targetCustomerId || sourceQuote.customerId,
    title: newTitle || `${sourceQuote.title} (Clone)`,
    description: sourceQuote.description || undefined,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days validity
    createdById: userId,
    customerReference: sourceQuote.customerReference || undefined,
    contactEmail: sourceQuote.contactEmail || undefined,
    contactPerson: sourceQuote.contactPerson || undefined,
    contactPhone: sourceQuote.contactPhone || undefined,
    status: QuoteStatus.DRAFT,
    lineItems: lineItemsForCloneInput,
    // totalAmount will be recalculated by createQuoteV1 if not explicitly provided
  };
  return createQuoteV1(newQuoteData);
};

// Export the function to match the import in the controller
export const cloneQuoteController = cloneQuote;

export const convertQuoteToOrder = async (quoteId: string, userId: string) => {
    const quoteVersion = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
            lineItems: { include: { material: { select: { id: true, code: true }} } },
            customer: true,
            createdBy: true
        }
    });

    if (!quoteVersion) throw new Error(`Quote version ${quoteId} not found.`);
    if (quoteVersion.status !== QuoteStatus.APPROVED) throw new Error(`Only APPROVED quotes can be converted. Current status is ${quoteVersion.status}.`);
    if (!quoteVersion.customer) throw new Error(`Quote ${quoteId} does not have a valid customer associated.`);
    if (!quoteVersion.createdById) throw new Error(`Quote ${quoteId} missing creator information for order ownership.`);

    const orderLineItemsJson = quoteVersion.lineItems.map(qli => ({
        materialId: qli.materialId, // This is the actual CUID
        materialCode: qli.material?.code, // Store the code
        description: qli.description,
        quantity: Number(qli.quantity), // Convert to number if needed
        unitPrice: Number(qli.unitPrice), // Convert to number if needed
        total: Number(qli.quantity) * Number(qli.unitPrice), // Calculate without times()
    }));

    // Get company settings with default VAT rate
    const companySettings = await prisma.companySettings.findFirst() as CompanySettingsWithVat;
    
    // Use regular number calculations
    const totalAmount = Number(quoteVersion.totalAmount);
    const vatRate = 20; // Default VAT rate
    const vatMultiplier = 1 + (vatRate / 100);
    const subTotal = totalAmount / vatMultiplier;
    const totalTax = totalAmount - subTotal;

    const orderData: Prisma.OrderCreateInput = {
        projectTitle: quoteVersion.title || `Order from Quote ${quoteVersion.quoteNumber || quoteId}`,
        quoteRef: quoteVersion.quoteNumber || quoteVersion.quoteReference || quoteId,
        orderType: OrderType.CUSTOMER_LINKED,
        status: OrderStatus.IN_PRODUCTION, // ✅ FIXED: Use valid OrderStatus from database
        customerName: quoteVersion.customer.name,
        contactPerson: quoteVersion.contactPerson || (quoteVersion.customer as any).contactPerson || quoteVersion.customer.name,
        contactPhone: quoteVersion.contactPhone || quoteVersion.customer.phone || '',
        contactEmail: quoteVersion.contactEmail || quoteVersion.customer.email || '',
        projectValue: totalAmount, // Use number instead of Decimal
        marginPercent: 0, // Use number instead of Decimal
        leadTimeWeeks: 4, // Default value
        items: orderLineItemsJson as Prisma.InputJsonValue[], // Correct type for JsonArray in create
        paymentTerms: (quoteVersion.customer as any).paymentTerms || PaymentTerms.THIRTY_DAYS,
        currency: 'GBP', // Default currency
        vatRate: vatRate, // Store as number
        subTotal: subTotal, // Store as number
        totalTax: totalTax, // Store as number
        totalAmount: totalAmount, // Store as number
        profitMargin: 0, // Use number instead of Decimal
        notes: `Converted from Quote: ${quoteVersion.quoteNumber || quoteVersion.quoteReference || quoteId} v${quoteVersion.versionNumber}`,
        customer: { connect: { id: quoteVersion.customerId } }, // Connect to existing customer
        sourceQuote: { connect: { id: quoteVersion.id } }, // Connect to existing quote
        projectOwner: { connect: { id: quoteVersion.createdById } }, // Connect to project owner (creator of quote)
        createdBy: { connect: { id: userId } }, // Connect to user who performed the conversion
    };

    const transactionResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const newOrder = await tx.order.create({ data: orderData });
        const updatedQuote = await tx.quote.update({
            where: { id: quoteId },
            data: { status: QuoteStatus.CONVERTED },
            include: { customer: true, lineItems: true, createdBy: true }
        });
        return { order: newOrder, quote: updatedQuote };
    });
    return transactionResult;
};

// Export the function to match the import in the controller
export const convertQuoteToOrderController = convertQuoteToOrder;

export const updateDraftQuote = async (quoteId: string, data: Partial<QuoteInputData>) => {
     console.log(`[QuoteService][updateDraftQuote] Updating draft quote ${quoteId}. Raw input:`, JSON.stringify(data, null, 2));
     const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
     if (!quote) throw new Error(`Quote ${quoteId} not found.`);
     if (quote.status !== QuoteStatus.DRAFT) throw new Error(`Quote ${quoteId} is not in DRAFT status.`);

     const dataToUpdate: Prisma.QuoteUpdateInput = {};
     if (data.title !== undefined) dataToUpdate.title = data.title;
     if (data.description !== undefined) dataToUpdate.description = data.description;
     if (data.notes !== undefined) dataToUpdate.notes = data.notes;
     if (data.validUntil !== undefined) dataToUpdate.validUntil = data.validUntil;
     if (data.customerReference !== undefined) dataToUpdate.customerReference = data.customerReference;
     if (data.contactEmail !== undefined) dataToUpdate.contactEmail = data.contactEmail;
     if (data.contactPerson !== undefined) dataToUpdate.contactPerson = data.contactPerson;
     if (data.contactPhone !== undefined) dataToUpdate.contactPhone = data.contactPhone;
     // Only allow status change to DRAFT if explicitly provided and is DRAFT
     if (data.status !== undefined && data.status === QuoteStatus.DRAFT) dataToUpdate.status = data.status;

     if (data.lineItems || data.totalAmount !== undefined) {
        let finalTotal: number;
        if (data.lineItems) {
            // Delete existing line items first
            await prisma.quoteLineItem.deleteMany({
                where: { quoteId: quoteId }
            });

            const lineItemsForDb = await processLineItemsWithMaterialCodeLookup(data.lineItems);
            console.log('[QuoteService][updateDraftQuote] Line items processed for DB:', JSON.stringify(lineItemsForDb, null, 2));

            // Calculate total using regular number math
            const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
                return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
            }, 0);

            // Get company settings with default VAT rate
            const companySettings = await prisma.companySettings.findFirst() as CompanySettingsWithVat;
            
            // Use regular number calculations
            const vatRate = 20; // Default VAT rate
            const vatMultiplier = 1 + (vatRate / 100);

            finalTotal = data.totalAmount !== undefined
                ? data.totalAmount
                : totalAmountFromItems * vatMultiplier;

            dataToUpdate.lineItems = {
                create: lineItemsForDb,
            };
        } else if (data.totalAmount !== undefined) {
            finalTotal = data.totalAmount;
        } else {
            finalTotal = Number(quote.totalAmount); // Ensure it's a number
        }
        dataToUpdate.totalAmount = finalTotal;
     }

     return prisma.quote.update({
        where: { id: quoteId },
        data: dataToUpdate,
        include: { customer: true, lineItems: { include: { material: true } }, createdBy: true }
     });
};

export const updateQuoteStatus = async (quoteId: string, newStatus: QuoteStatus, userId: string) => {
  console.log(`[QuoteService][updateQuoteStatus] User ${userId} updating quote ${quoteId} to ${newStatus}`);
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { status: true, description: true, createdById: true }
  });

  if (!quote) throw new Error(`Quote ${quoteId} not found.`);
  if (quote.status === newStatus) {
    // If status is already the desired status, just return the current quote
    return prisma.quote.findUnique({
        where: {id: quoteId},
        include: { customer: { select: { name: true, id: true } }, lineItems: { include: { material: true } }, createdBy: { select: { name: true, id: true } } }
    });
  }

  if (quote.status === QuoteStatus.CONVERTED) throw new Error(`Cannot change status from ${QuoteStatus.CONVERTED}.`);
  if (quote.status === QuoteStatus.EXPIRED && newStatus !== QuoteStatus.DRAFT) {
    throw new Error(`Cannot change status from ${QuoteStatus.EXPIRED} to ${newStatus}. Consider cloning.`);
  }

  const dataToUpdate: Prisma.QuoteUpdateInput = { status: newStatus };

  if (newStatus === QuoteStatus.SENT && quote.status !== QuoteStatus.SENT) {
    const sentDateStr = new Date().toISOString().split('T')[0];
    let currentDescription = quote.description || '';
    // Use regex to remove existing "Sent on: YYYY-MM-DD;" entries to avoid duplication
    currentDescription = currentDescription.replace(/Sent on:\s*\d{4}-\d{2}-\d{2}\s*;?\s*/g, '').trim();
    dataToUpdate.description = `Sent on: ${sentDateStr}; ${currentDescription}`.replace(/;\s*$/, '').trim();
  }

  const updatedQuote = await prisma.quote.update({
    where: { id: quoteId },
    data: dataToUpdate,
    include: {
        customer: { select: { name: true, id: true } },
        lineItems: { include: { material: true } },
        createdBy: { select: { name: true, id: true } }
    }
  });
  return updatedQuote;
};