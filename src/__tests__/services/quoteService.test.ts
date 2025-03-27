import { calculateQuoteTotals } from '../../services/quoteService';
// If the function doesn't exist yet, you'll need to create it in your quoteService.ts file

describe('Quote Service', () => {
  test('calculates quote totals correctly', () => {
    const quoteItems = [
      { description: 'Material A', quantity: 2, unitPrice: 100, total: 200 },
      { description: 'Material B', quantity: 5, unitPrice: 50, total: 250 }
    ];
    
    const result = calculateQuoteTotals(quoteItems);
    
    expect(result.subtotal).toBe(450);
    expect(result.vat).toBe(90); // Assuming 20% VAT
    expect(result.total).toBe(540);
  });
  
  test('handles empty items array', () => {
    const result = calculateQuoteTotals([]);
    
    expect(result.subtotal).toBe(0);
    expect(result.vat).toBe(0);
    expect(result.total).toBe(0);
  });
});