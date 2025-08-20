export interface SmartQuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  materialId?: string;
  source?: 'previous_quote' | 'customer_history' | 'template' | 'bundle';
  sourceQuoteId?: string;
  sourceQuoteNumber?: string;
  confidence?: number;
  reason?: string;
  material?: {
    id: string;
    code: string;
    name: string;
    description?: string;
    unitPrice: number;
    unit: string;
    category?: string;
  };
}

export interface QuoteHealthScore {
  score: number;
  issues: QuoteHealthIssue[];
  suggestions: QuoteHealthSuggestion[];
  metrics: {
    itemCount: number;
    totalValue: number;
    completeness: number;
    customerFit: number;
  };
}

export interface QuoteHealthIssue {
  type: 'missing_items' | 'pricing' | 'customer_mismatch' | 'margin' | 'completeness';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
}

export interface QuoteHealthSuggestion {
  type: 'add_item' | 'adjust_price' | 'bundle_discount' | 'alternative_item';
  description: string;
  action?: string;
  itemSuggestion?: SmartQuoteItem;
}

export interface CustomerIntelligence {
  customerId: string;
  customerName: string;
  industry?: string;
  totalQuotes: number;
  totalValue: number;
  lastQuoteDate?: Date;
  commonItems: SmartQuoteItem[];
  averageOrderValue: number;
  preferredCategories: string[];
}
