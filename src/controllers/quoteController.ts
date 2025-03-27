import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate the next quote number
async function generateQuoteNumber(): Promise<string> {
  // Use a transaction to ensure atomicity when updating the counter
  return await prisma.$transaction(async (tx) => {
    // Get or create company settings
    let settings = await tx.companySettings.findFirst();
    
    if (!settings) {
      settings = await tx.companySettings.create({
        data: {
          quoteNumberPrefix: 'Q',
          quoteNumberFormat: '{PREFIX}-{YEAR}-{SEQ}',
          lastQuoteNumber: 0
        }
      });
    }
    
    // Increment the counter
    settings = await tx.companySettings.update({
      where: { id: settings.id },
      data: { lastQuoteNumber: settings.lastQuoteNumber + 1 }
    });
    
    // Format the quote number according to the template
    const currentYear = new Date().getFullYear().toString();
    const sequenceNumber = settings.lastQuoteNumber.toString().padStart(3, '0');
    
    let quoteNumber = settings.quoteNumberFormat
      .replace('{PREFIX}', settings.quoteNumberPrefix)
      .replace('{YEAR}', currentYear)
      .replace('{SEQ}', sequenceNumber);
      
    return quoteNumber;
  });
}

// Get all quotes
export const getAllQuotes = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all quotes...');
    const quotes = await prisma.quote.findMany({
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    // Log a sample quote to see its structure
    if (quotes.length > 0) {
      console.log('Sample quote:', {
        id: quotes[0].id,
        title: quotes[0].title,
        quoteNumber: quotes[0].quoteNumber,
        customerReference: quotes[0].customerReference,
        contactPerson: quotes[0].contactPerson,
        contactEmail: quotes[0].contactEmail,
        contactPhone: quotes[0].contactPhone,
        totalAmount: quotes[0].totalAmount
      });
    }
    
    console.log(`Found ${quotes.length} quotes`);
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ message: 'Failed to fetch quotes' });
  }
};

// Get quote by ID
export const getQuoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`Fetching quote with ID: ${id}`);
    
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    if (!quote) {
      console.log(`Quote with ID ${id} not found`);
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    // Log full quote details
    console.log('Quote details:', {
      id: quote.id,
      title: quote.title,
      quoteNumber: quote.quoteNumber,
      customerReference: quote.customerReference,
      contactPerson: quote.contactPerson,
      contactEmail: quote.contactEmail,
      contactPhone: quote.contactPhone,
      totalAmount: quote.totalAmount
    });
    
    // Ensure the response includes line items as both lineItems and items
    const responseData = {
      ...quote,
      items: quote.lineItems  // Add an items field for the frontend
    };
    
    console.log(`Found quote: ${quote.title} with ${quote.lineItems.length} line items`);
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ message: 'Failed to fetch quote' });
  }
};

// Create new quote
export const createQuote = async (req: Request, res: Response) => {
  try {
    console.log('Received quote creation request with body:', JSON.stringify(req.body, null, 2));
    console.log('User context:', req.user);
    
    // Extract data from request, looking for both lineItems and items
    const { 
      customerId, 
      title, 
      description, 
      lineItems, 
      items, 
      customerReference,
      contactPerson,
      contactEmail,
      contactPhone,
      value,
      ...quoteData 
    } = req.body;
    
    // Log the specific fields we're looking for
    console.log('Extracted fields:', {
      customerReference,
      contactPerson,
      contactEmail,
      contactPhone,
      value
    });
    
    // Use items if lineItems isn't provided
    const itemsToProcess = lineItems || items || [];
    
    // Calculate total from line items
    let calculatedTotal = 0;
    if (itemsToProcess.length > 0) {
      calculatedTotal = itemsToProcess.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity) || 1;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        return sum + (quantity * unitPrice);
      }, 0);
      
      console.log(`Calculated total from line items: ${calculatedTotal}`);
    }
    
    // Use provided value or calculated total
    const totalAmount = value ? parseFloat(value.toString()) : 
                      (calculatedTotal > 0 ? calculatedTotal : 0); // Always use a value, default to 0
    
    console.log(`Final total amount: ${totalAmount}`);
    
    // Validate required fields
    if (!customerId) {
      console.log('Missing customerId in request');
      return res.status(400).json({ message: 'Customer ID is required' });
    }
    
    // Generate a quote number
    const quoteNumber = await generateQuoteNumber();
    console.log(`Generated quote number: ${quoteNumber}`);
    
    // Create the quote with explicit fields
    const quoteCreateData = {
      customerId,
      title: title || 'Untitled Quote',
      description: description || '',
      status: 'DRAFT',
      createdById: req.user.id,
      quoteNumber,
      customerReference,
      contactPerson,
      contactEmail,
      contactPhone,
      totalAmount
    };
    
    console.log('Creating quote with data:', quoteCreateData);
    
    const newQuote = await prisma.quote.create({
      data: quoteCreateData
    });
    
    console.log('Successfully created quote:', newQuote);
    
    // Process line items if provided
    if (itemsToProcess.length > 0) {
      console.log('Processing line items:', itemsToProcess);
      
      const lineItemResults = await Promise.all(
        itemsToProcess.map((item: any) => 
          prisma.quoteLineItem.create({
            data: {
              quoteId: newQuote.id,
              description: item.description || 'No Description',
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              materialId: item.materialId || item.id || null
            }
          })
        )
      );
      
      console.log('Created line items:', lineItemResults);
    }
    
    // IMPORTANT FIX: Always ensure the final total amount is saved before returning
    // This ensures the quotes list will show the correct value without requiring an edit first
    await prisma.quote.update({
      where: { id: newQuote.id },
      data: { 
        totalAmount: calculatedTotal > 0 ? calculatedTotal : (parseFloat(value?.toString() || '0') || 0)
      }
    });
    
    // Return the complete quote with its relations
    const completeQuote = await prisma.quote.findUnique({
      where: { id: newQuote.id },
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    // Add items field for frontend compatibility
    const responseData = {
      ...completeQuote,
      items: completeQuote.lineItems
    };
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ 
      message: 'Failed to create quote', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update quote
export const updateQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`Updating quote with ID: ${id}`);
    console.log('Update data:', JSON.stringify(req.body, null, 2));
    
    // Extract data from request, looking for both lineItems and items
    const { 
      customerId, 
      title, 
      description, 
      lineItems, 
      items, 
      customerReference,
      contactPerson,
      contactEmail,
      contactPhone,
      value,
      ...quoteData 
    } = req.body;
    
    // Log the specific fields we're looking for
    console.log('Extracted fields for update:', {
      customerReference,
      contactPerson,
      contactEmail,
      contactPhone,
      value
    });
    
    // Determine which items array to use (prefer items if both are present)
    const itemsToProcess = items || lineItems || [];
    
    // Calculate total from line items if no value provided
    let calculatedTotal = 0;
    if (itemsToProcess.length > 0) {
      calculatedTotal = itemsToProcess.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity) || 1;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        return sum + (quantity * unitPrice);
      }, 0);
      
      console.log(`Calculated total from line items for update: ${calculatedTotal}`);
    }
    
    // Update quote with validated data - explicitly include all fields
    const updateData = {
      ...(customerId ? { customerId } : {}),
      ...(title ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(customerReference !== undefined ? { customerReference } : {}),
      ...(contactPerson !== undefined ? { contactPerson } : {}),
      ...(contactEmail !== undefined ? { contactEmail } : {}),
      ...(contactPhone !== undefined ? { contactPhone } : {}),
      ...(quoteData.validUntil ? { validUntil: new Date(quoteData.validUntil) } : {}),
      ...(value !== undefined ? { totalAmount: parseFloat(value.toString()) } : 
         (calculatedTotal > 0 ? { totalAmount: calculatedTotal } : {})),
      ...(quoteData.totalAmount !== undefined ? { totalAmount: parseFloat(quoteData.totalAmount.toString()) } : {}),
      ...(quoteData.status ? { status: quoteData.status } : {})
    };
    
    console.log('Quote update data:', updateData);
    
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData
    });
    
    console.log('Quote basic data updated successfully:', updatedQuote);
    
    // Process line items if provided
    if (itemsToProcess.length > 0) {
      // Delete existing line items
      console.log(`Deleting existing line items for quote ${id}`);
      await prisma.quoteLineItem.deleteMany({
        where: { quoteId: id }
      });
      
      // Create new line items
      console.log('Creating new line items:', itemsToProcess);
      
      for (const item of itemsToProcess) {
        await prisma.quoteLineItem.create({
          data: {
            quoteId: id,
            description: item.description || '',
            quantity: parseFloat(item.quantity || '1'),
            unitPrice: parseFloat(item.unitPrice || '0'),
            materialId: item.materialId || item.id || null
          }
        });
      }
      
      console.log('Line items updated successfully');
      
      // IMPORTANT FIX: Always ensure the final total amount is saved
      if (calculatedTotal > 0) {
        console.log(`Ensuring final calculated total after update: ${calculatedTotal}`);
        await prisma.quote.update({
          where: { id },
          data: { totalAmount: calculatedTotal }
        });
      }
    }
    
    // Get the updated quote with all relations
    const completeQuote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    // Add items field for frontend compatibility
    const responseData = {
      ...completeQuote,
      items: completeQuote.lineItems
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error updating quote:', error);
    if (error.code) {
      console.error('Prisma error code:', error.code);
    }
    if (error.meta) {
      console.error('Error metadata:', error.meta);
    }
    res.status(500).json({ 
      message: 'Failed to update quote',
      error: error.message
    });
  }
};

// Delete quote
export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`Deleting quote with ID: ${id}`);
    
    // Delete related line items first
    console.log(`Deleting line items for quote ${id}`);
    await prisma.quoteLineItem.deleteMany({
      where: { quoteId: id }
    });
    
    // Delete the quote
    console.log(`Deleting quote ${id}`);
    await prisma.quote.delete({
      where: { id }
    });
    
    console.log(`Quote ${id} deleted successfully`);
    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ message: 'Failed to delete quote' });
  }
};

// Clone quote
export const cloneQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId, title, adjustments = {} } = req.body;
    
    console.log(`Cloning quote with ID: ${id}`);
    console.log('Clone parameters:', { customerId, title, adjustments });
    
    // Find the original quote with all its line items
    const originalQuote = await prisma.quote.findUnique({
      where: { id },
      include: { 
        lineItems: true,
        customer: true 
      }
    });
    
    if (!originalQuote) {
      console.log(`Quote with ID ${id} not found for cloning`);
      return res.status(404).json({ message: 'Quote not found' });
    }
    
    // Generate a new quote number for the clone
    const quoteNumber = await generateQuoteNumber();
    console.log(`Generated quote number for clone: ${quoteNumber}`);
    
    // Create a new quote based on the original one - copy all contact fields
    console.log('Creating cloned quote with contact details');
    const newQuote = await prisma.quote.create({
      data: {
        customerId: customerId || originalQuote.customerId,
        title: title || `${originalQuote.title} (Copy)`,
        description: originalQuote.description,
        totalAmount: originalQuote.totalAmount || 0,
        status: 'DRAFT', // Always start as draft
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdById: req.user.id,
        quoteNumber, // Add the generated quote number
        customerReference: originalQuote.customerReference, // Copy the customer reference
        contactPerson: originalQuote.contactPerson, // Copy contact person
        contactEmail: originalQuote.contactEmail, // Copy contact email
        contactPhone: originalQuote.contactPhone, // Copy contact phone
      }
    });
    
    // Clone all line items from the original quote
    console.log('Cloning line items');
    const lineItemPromises = originalQuote.lineItems.map(item => {
      return prisma.quoteLineItem.create({
        data: {
          quoteId: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          materialId: item.materialId,
          // Apply any adjustments if specified
          ...(adjustments[item.id] || {})
        }
      });
    });
    
    await Promise.all(lineItemPromises);
    
    // Return the newly created quote with its line items
    const completeQuote = await prisma.quote.findUnique({
      where: { id: newQuote.id },
      include: {
        customer: true,
        lineItems: true
      }
    });
    
    // Add items field for frontend compatibility
    const responseData = {
      ...completeQuote,
      items: completeQuote.lineItems
    };
    
    console.log('Quote cloned successfully:', completeQuote);
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error cloning quote:', error);
    res.status(500).json({ message: 'Failed to clone quote' });
  }
};

// Get frequent items
export const getFrequentItems = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    console.log(`Fetching frequent items for customer ${customerId}`);
    
    // For now, just return an empty array
    // Later, you can implement the actual logic to get frequently used items
    res.json([]);
  } catch (error) {
    console.error('Error fetching frequent items:', error);
    res.status(500).json({ message: 'Failed to fetch frequent items' });
  }
};

// Add a function to migrate existing quotes with new reference numbers
export const migrateQuoteNumbers = async (req: Request, res: Response) => {
  try {
    console.log('Starting migration of existing quotes to add quote numbers');
    
    // Find quotes without a quote number
    const quotesWithoutNumber = await prisma.quote.findMany({
      where: {
        quoteNumber: null
      }
    });
    
    console.log(`Found ${quotesWithoutNumber.length} quotes without a quote number`);
    
    // Update each quote with a new quote number
    let updatedCount = 0;
    for (const quote of quotesWithoutNumber) {
      const quoteNumber = await generateQuoteNumber();
      
      await prisma.quote.update({
        where: { id: quote.id },
        data: { quoteNumber }
      });
      
      updatedCount++;
      console.log(`Updated quote ${quote.id} with number ${quoteNumber}`);
    }
    
    console.log(`Migration complete. Updated ${updatedCount} quotes with new quote numbers`);
    res.json({ 
      success: true, 
      message: `Successfully migrated ${updatedCount} quotes with new quote numbers` 
    });
  } catch (error) {
    console.error('Error during quote number migration:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to migrate quote numbers',
      error: error.message 
    });
  }
};