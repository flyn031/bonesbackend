"use strict";
/**
 * Utility functions for quote data analytics and reporting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = exports.formatCurrency = exports.calculateConversionRate = exports.aggregateQuotesByStatus = exports.aggregateQuotesByMonth = exports.calculateTotalFromItems = exports.calculateTotalValue = exports.extractSentDate = void 0;
/**
 * Extract sent date from quote description
 * @param description The quote description text
 * @returns Extracted date string in YYYY-MM-DD format or null if not found
 */
const extractSentDate = (description) => {
    if (!description)
        return null;
    // Use a robust regex that can handle various formats and line breaks
    const match = description.match(/Sent on:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
};
exports.extractSentDate = extractSentDate;
/**
 * Calculate total value of quotes
 * @param quotes Array of quotes
 * @returns Total value as a number
 */
const calculateTotalValue = (quotes) => {
    if (!Array.isArray(quotes) || quotes.length === 0)
        return 0;
    return quotes.reduce((total, quote) => {
        // Get value from either totalAmount or by calculating from items
        const quoteValue = quote.totalAmount || (0, exports.calculateTotalFromItems)(quote.items || quote.lineItems || []);
        return total + (quoteValue || 0);
    }, 0);
};
exports.calculateTotalValue = calculateTotalValue;
/**
 * Calculate total from line items
 * @param items Array of line items
 * @returns Total amount calculated from quantity and unit price
 */
const calculateTotalFromItems = (items) => {
    if (!Array.isArray(items) || items.length === 0)
        return 0;
    return items.reduce((sum, item) => {
        // Ensure values are numbers before calculation
        const quantity = parseFloat(String((item === null || item === void 0 ? void 0 : item.quantity) || 0));
        const unitPrice = parseFloat(String((item === null || item === void 0 ? void 0 : item.unitPrice) || 0));
        // Check for NaN after parseFloat
        if (isNaN(quantity) || isNaN(unitPrice)) {
            return sum; // Skip this item if data is bad
        }
        return sum + (quantity * unitPrice);
    }, 0);
};
exports.calculateTotalFromItems = calculateTotalFromItems;
/**
 * Group quotes by month and count them
 * @param quotes Array of quotes
 * @param monthCount Number of months to include (defaults to 6)
 * @param statusFilter Optional status to filter by (e.g., 'SENT')
 * @returns Array of objects with month and count properties, sorted by month
 */
const aggregateQuotesByMonth = (quotes, monthCount = 6, statusFilter) => {
    // Create an object to store counts by month
    const monthlyCounts = {};
    // Get the current date and calculate dates for display
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(today.getMonth() - (monthCount - 1)); // Set to show 'monthCount' months including current
    // Initialize all months with zero counts (ensures all months are shown even with no data)
    for (let i = 0; i < monthCount; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCounts[yearMonth] = 0;
    }
    // Process each quote
    quotes.forEach(quote => {
        // Apply status filter if provided
        if (statusFilter && quote.status !== statusFilter) {
            return;
        }
        // Get the date to group by (use sentDate for sent quotes, otherwise createdAt/date)
        let dateToUse = null;
        if (quote.status === 'SENT' && quote.sentDate) {
            dateToUse = quote.sentDate;
        }
        else {
            dateToUse = quote.date || quote.createdAt;
        }
        if (dateToUse) {
            // Extract year and month
            const date = new Date(dateToUse);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            // Only count if it's within our display range
            if (monthlyCounts[yearMonth] !== undefined) {
                monthlyCounts[yearMonth] += 1;
            }
        }
    });
    // Convert to array for easier charting
    return Object.entries(monthlyCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
};
exports.aggregateQuotesByMonth = aggregateQuotesByMonth;
/**
 * Group quotes by status
 * @param quotes Array of quotes
 * @returns Object with status counts
 */
const aggregateQuotesByStatus = (quotes) => {
    const statusCounts = {
        DRAFT: 0,
        SENT: 0,
        PENDING: 0,
        APPROVED: 0,
        DECLINED: 0,
        EXPIRED: 0,
        CONVERTED: 0
    };
    quotes.forEach(quote => {
        const status = (quote.status || 'UNKNOWN').toUpperCase();
        if (statusCounts[status] !== undefined) {
            statusCounts[status] += 1;
        }
        else {
            statusCounts.UNKNOWN = (statusCounts.UNKNOWN || 0) + 1;
        }
    });
    return statusCounts;
};
exports.aggregateQuotesByStatus = aggregateQuotesByStatus;
/**
 * Calculate the conversion rate (approved quotes / sent quotes)
 * @param quotes Array of quotes
 * @returns Conversion rate as a decimal (0-1)
 */
const calculateConversionRate = (quotes) => {
    const sentCount = quotes.filter(q => q.status === 'SENT').length;
    const approvedCount = quotes.filter(q => q.status === 'APPROVED' || q.status === 'CONVERTED').length;
    return sentCount > 0 ? approvedCount / sentCount : 0;
};
exports.calculateConversionRate = calculateConversionRate;
/**
 * Format currency value
 * @param value Numeric value
 * @param currency Currency code (default: 'GBP')
 * @returns Formatted currency string
 */
const formatCurrency = (value, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};
exports.formatCurrency = formatCurrency;
/**
 * Format date for display
 * @param dateString Date string
 * @returns Formatted date string
 */
const formatDate = (dateString) => {
    if (!dateString)
        return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-GB');
    }
    catch (error) {
        return String(dateString);
    }
};
exports.formatDate = formatDate;
