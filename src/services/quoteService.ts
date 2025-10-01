// backend/src/services/quoteService.ts
import prisma from '../utils/prismaClient';
import { Prisma, Quote, QuoteLineItem, QuoteStatus, OrderStatus, PaymentTerms, OrderType, CompanySettings, Material } from '@prisma/client';

// --- Interfaces ---
interface QuoteInputData {
  customerId: string;
  title: string;
  description?: string;
  termsAndConditions?: string; // Keep for additional notes
  paymentTerms?: string; // NEW
  deliveryTerms?: string; // NEW
  warranty?: string; // NEW
  exclusions?: string; // NEW
  notes?: string;   
  totalAmount?: number;
  validUntil?: Date;
  createdById: string;
  customerReference?: string;
  contactEmail?: string;
  contactPerson?: string;
  contactPhone?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    materialId: string | null | undefined;
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
    unitPrice: number;
    materialId: string | null | undefined;
  }>
): Promise<Array<Prisma.QuoteLineItemCreateWithoutQuoteInput>> {
  const processedLineItems: Array<Prisma.QuoteLineItemCreateWithoutQuoteInput> = [];
  for (const item of lineItemsInput) {
    let actualMaterialDatabaseId: string | undefined = undefined;

    if (item.materialId && String(item.materialId).trim() !== '') {
      const materialCodeFromFrontend = String(item.materialId).trim();
      console.log(`[QuoteService][Helper] Attempting to find material with code: '${materialCodeFromFrontend}'`);
      const materialRecord = await prisma.material.findUnique({
        where: { code: materialCodeFromFrontend },
        select: { id: true },
      });

      if (!materialRecord) {
        console.warn(`[QuoteService][Helper] WARNING: Material with code '${materialCodeFromFrontend}' NOT FOUND in database. Proceeding without material link.`);
        actualMaterialDatabaseId = undefined;
      } else {
        actualMaterialDatabaseId = materialRecord.id;
        console.log(`[QuoteService][Helper] Found material CUID: '${actualMaterialDatabaseId}' for code: '${materialCodeFromFrontend}'`);
      }
    }

    processedLineItems.push({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      ...(actualMaterialDatabaseId && {
        material: {
          connect: { id: actualMaterialDatabaseId },
        },
      }),
    });
  }
  return processedLineItems;
}

type CompanySettingsWithVat = CompanySettings;

// --- Helper Function for Quote Reference with configurable padding ---
async function generateQuoteReference(): Promise<string> {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    console.warn("[QuoteService][generateQuoteReference] CompanySettings not found, creating default settings...");
    try {
        settings = await prisma.companySettings.create({
            data: {
                quoteReferencePrefix: 'QR',
                lastQuoteReferenceSeq: 0,
                quoteNumberPadding: 4,
            }
        });
        console.log("[QuoteService][generateQuoteReference] Default CompanySettings created.");
    } catch (error) {
         console.error("[QuoteService][generateQuoteReference] Failed to create default CompanySettings!", error);
         return `QR-ERR-${Date.now()}`;
    }
  }
  
  const updatedSettings = await prisma.companySettings.update({
    where: { id: settings.id },
    data: { lastQuoteReferenceSeq: { increment: 1 } },
  });
  
  const prefix = updatedSettings.quoteReferencePrefix || 'QR';
  const sequence = updatedSettings.lastQuoteReferenceSeq;
  const padding = updatedSettings.quoteNumberPadding || 4;
  const paddedSequence = sequence.toString().padStart(padding, '0');
  
  return `${prefix}-${paddedSequence}`;
}

export const calculateQuoteTotals = (items: Array<{ quantity?: number; unitPrice?: number }>) => {
  return items.reduce((sum: number, item) => {
    return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
  }, 0);
};

// --- Service Functions ---
export const createQuoteV1 = async (data: QuoteInputData) => {
  console.log('🔥 CREATEQUOTEV1 CALLED');
  console.log('[QuoteService][createQuoteV1] Received raw payload:', JSON.stringify(data, null, 2));
  
  // Fetch company settings for defaults
  const companySettings = await prisma.companySettings.findFirst() as CompanySettingsWithVat;
  
  const quoteReference = await generateQuoteReference();
  const versionNumber = 1;
  const quoteNumber = `${quoteReference}-v${versionNumber}`;

  const lineItemsForDb = await processLineItemsWithMaterialCodeLookup(data.lineItems);

  const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
    return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
  }, 0); 

  const vatRate = 20;
  const vatMultiplier = 1 + (vatRate / 100);

  const finalTotal = data.totalAmount !== undefined
    ? data.totalAmount
    : totalAmountFromItems * vatMultiplier;

  console.log(`[QuoteService][createQuoteV1] Calculated finalTotal: ${finalTotal}`);

  try {
    return await prisma.quote.create({
      data: {
        customerId: data.customerId,
        title: data.title,
        description: data.description,
        status: data.status || QuoteStatus.DRAFT,
        validUntil: data.validUntil,
        createdById: data.createdById,
        customerReference: data.customerReference,
        contactEmail: data.contactEmail,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        // Inherit company defaults if not provided
        paymentTerms: data.paymentTerms || companySettings?.standardWarranty || 'Net 30',
        deliveryTerms: data.deliveryTerms || companySettings?.standardDeliveryTerms || `Delivery ${companySettings?.defaultLeadTimeWeeks || 4} weeks from order`,
        warranty: data.warranty || companySettings?.standardWarranty || 'Standard 12 month warranty',
        exclusions: data.exclusions || companySettings?.standardExclusions || 'VAT, Installation, Delivery',
        termsAndConditions: data.termsAndConditions,
        totalAmount: finalTotal,
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
  
  const invalidStatusValues: QuoteStatus[] = [QuoteStatus.APPROVED, QuoteStatus.DECLINED, QuoteStatus.EXPIRED, QuoteStatus.CONVERTED];
  if (parentQuote.status && invalidStatusValues.includes(parentQuote.status)) {
      throw new Error(`Cannot create new version from quote with status ${parentQuote.status}. Clone instead.`);
  }

  const lineItemsForDb = await processLineItemsWithMaterialCodeLookup(newData.lineItems);

  const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
    return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
  }, 0);

  const vatRate = 20;
  const vatMultiplier = 1 + (vatRate / 100);

  const finalTotal = newData.totalAmount !== undefined
    ? newData.totalAmount
    : totalAmountFromItems * vatMultiplier;

  const newVersionNumber = parentQuote.versionNumber + 1;
  const newQuoteNumber = `${parentQuote.quoteReference}-v${newVersionNumber}`;

  const newVersion = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.quote.update({ where: { id: parentQuoteId }, data: { isLatestVersion: false } });
    const createdQuote = await tx.quote.create({
      data: {
        customerId: parentQuote.customerId,
        quoteReference: parentQuote.quoteReference,
        title: newData.title,
        description: newData.description,
        termsAndConditions: newData.termsAndConditions,
        paymentTerms: newData.paymentTerms || parentQuote.paymentTerms,
        deliveryTerms: newData.deliveryTerms || parentQuote.deliveryTerms,
        warranty: newData.warranty || parentQuote.warranty,
        exclusions: newData.exclusions || parentQuote.exclusions,
        status: newData.status || parentQuote.status,
        validUntil: newData.validUntil,
        createdById: newData.createdById,
        customerReference: newData.customerReference,
        contactEmail: newData.contactEmail,
        contactPerson: newData.contactPerson,
        contactPhone: newData.contactPhone,
        totalAmount: finalTotal,
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
    return createdQuote;
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

export const getQuoteHistoryByReference = getQuoteHistory;

export const cloneQuote = async (sourceQuoteId: string, userId: string, targetCustomerId?: string, newTitle?: string) => {
  const sourceQuote = await prisma.quote.findUnique({
    where: { id: sourceQuoteId },
    include: {
      lineItems: { include: { material: { select: { code: true } } } }
    }
  });
  if (!sourceQuote) throw new Error(`Quote version with ID ${sourceQuoteId} not found for cloning.`);

  const lineItemsForCloneInput = sourceQuote.lineItems.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    materialId: item.material?.code,
  }));

  const newQuoteData: QuoteInputData = {
    customerId: targetCustomerId || sourceQuote.customerId,
    title: newTitle || `${sourceQuote.title} (Clone)`,
    description: sourceQuote.description || undefined,
    termsAndConditions: sourceQuote.termsAndConditions || undefined,
    paymentTerms: sourceQuote.paymentTerms || undefined,
    deliveryTerms: sourceQuote.deliveryTerms || undefined,
    warranty: sourceQuote.warranty || undefined,
    exclusions: sourceQuote.exclusions || undefined,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdById: userId,
    customerReference: sourceQuote.customerReference || undefined,
    contactEmail: sourceQuote.contactEmail || undefined,
    contactPerson: sourceQuote.contactPerson || undefined,
    contactPhone: sourceQuote.contactPhone || undefined,
    status: QuoteStatus.DRAFT,
    lineItems: lineItemsForCloneInput,
  };
  return createQuoteV1(newQuoteData);
};

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
        materialId: qli.materialId,
        materialCode: qli.material?.code,
        description: qli.description,
        quantity: Number(qli.quantity),
        unitPrice: Number(qli.unitPrice),
        total: Number(qli.quantity) * Number(qli.unitPrice),
    }));

    const companySettings = await prisma.companySettings.findFirst() as CompanySettingsWithVat;
    
    const totalAmount = Number(quoteVersion.totalAmount);
    const vatRate = 20;
    const vatMultiplier = 1 + (vatRate / 100);
    const subTotal = totalAmount / vatMultiplier;
    const totalTax = totalAmount - subTotal;

    const orderData: Prisma.OrderCreateInput = {
        projectTitle: quoteVersion.title || `Order from Quote ${quoteVersion.quoteNumber || quoteId}`,
        quoteRef: quoteVersion.quoteNumber || quoteVersion.quoteReference || quoteId,
        customerReference: quoteVersion.customerReference,
        orderType: OrderType.CUSTOMER_LINKED,
        status: OrderStatus.IN_PRODUCTION,
        customerName: quoteVersion.customer.name,
        contactPerson: quoteVersion.contactPerson || (quoteVersion.customer as any).contactPerson || quoteVersion.customer.name,
        contactPhone: quoteVersion.contactPhone || quoteVersion.customer.phone || '',
        contactEmail: quoteVersion.contactEmail || quoteVersion.customer.email || '',
        projectValue: totalAmount,
        marginPercent: 0,
        leadTimeWeeks: 4,
        items: orderLineItemsJson as Prisma.InputJsonValue[],
        paymentTerms: (quoteVersion.customer as any).paymentTerms || PaymentTerms.THIRTY_DAYS,
        currency: 'GBP',
        vatRate: vatRate,
        subTotal: subTotal,
        totalTax: totalTax,
        totalAmount: totalAmount,
        profitMargin: 0,
        notes: `Converted from Quote: ${quoteVersion.quoteNumber || quoteVersion.quoteReference || quoteId} v${quoteVersion.versionNumber}`,
        customer: { connect: { id: quoteVersion.customerId } },
        sourceQuote: { connect: { id: quoteVersion.id } },
        projectOwner: { connect: { id: quoteVersion.createdById } },
        createdBy: { connect: { id: userId } },
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
     if (data.termsAndConditions !== undefined) dataToUpdate.termsAndConditions = data.termsAndConditions;
     if (data.paymentTerms !== undefined) dataToUpdate.paymentTerms = data.paymentTerms;
     if (data.deliveryTerms !== undefined) dataToUpdate.deliveryTerms = data.deliveryTerms;
     if (data.warranty !== undefined) dataToUpdate.warranty = data.warranty;
     if (data.exclusions !== undefined) dataToUpdate.exclusions = data.exclusions;
     if (data.validUntil !== undefined) dataToUpdate.validUntil = data.validUntil;
     if (data.customerReference !== undefined) dataToUpdate.customerReference = data.customerReference;
     if (data.contactEmail !== undefined) dataToUpdate.contactEmail = data.contactEmail;
     if (data.contactPerson !== undefined) dataToUpdate.contactPerson = data.contactPerson;
     if (data.contactPhone !== undefined) dataToUpdate.contactPhone = data.contactPhone;
     if (data.status !== undefined && data.status === QuoteStatus.DRAFT) dataToUpdate.status = data.status;

     if (data.lineItems || data.totalAmount !== undefined) {
        let finalTotal: number;
        if (data.lineItems) {
            await prisma.quoteLineItem.deleteMany({
                where: { quoteId: quoteId }
            });

            const lineItemsForDb = await processLineItemsWithMaterialCodeLookup(data.lineItems);
            console.log('[QuoteService][updateDraftQuote] Line items processed for DB:', JSON.stringify(lineItemsForDb, null, 2));

            const totalAmountFromItems = lineItemsForDb.reduce((sum, item) => {
                return sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0));
            }, 0);

            const companySettings = await prisma.companySettings.findFirst() as CompanySettingsWithVat;
            
            const vatRate = 20;
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
            finalTotal = Number(quote.totalAmount);
        }
        dataToUpdate.totalAmount = finalTotal;
     }
    
     console.log('[QuoteService][updateDraftQuote] FINAL dataToUpdate being sent to Prisma:', JSON.stringify(dataToUpdate, null, 2));
     
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
    currentDescription = currentDescription.replace(/Sent on:\s*\d{4}-\d{2}-\d{2}\s*;?\s*/g, '').trim();
    dataToUpdate.description = `Sent on: ${sentDateStr}${currentDescription ? '; ' + currentDescription : ''}`;
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