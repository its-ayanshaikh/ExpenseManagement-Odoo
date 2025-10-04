// OCR-related types and interfaces

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  lines: OCRLine[];
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface OCRLine {
  text: string;
  confidence: number;
  words: OCRWord[];
  bbox: BoundingBox;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ExtractedExpenseData {
  amount?: number;
  currency?: string;
  date?: Date;
  description?: string;
  vendor?: string;
  category?: string;
  lineItems?: ExpenseLineItem[];
  confidence: number;
  rawText: string;
}

export interface ExpenseLineItem {
  description: string;
  amount: number;
  currency?: string;
}

export interface CurrencyPattern {
  symbol: string;
  code: string;
  regex: RegExp;
}

// Common currency patterns for detection
export const CURRENCY_PATTERNS: CurrencyPattern[] = [
  { symbol: '$', code: 'USD', regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g },
  { symbol: '€', code: 'EUR', regex: /€\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g },
  { symbol: '£', code: 'GBP', regex: /£\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g },
  { symbol: '¥', code: 'JPY', regex: /¥\s*(\d+(?:,\d{3})*)/g },
  { symbol: '₹', code: 'INR', regex: /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g },
  { symbol: 'CAD', code: 'CAD', regex: /CAD\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi },
  { symbol: 'AUD', code: 'AUD', regex: /AUD\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi },
  { symbol: 'CHF', code: 'CHF', regex: /CHF\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi },
];

// Date patterns for extraction
export const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g, // MM/DD/YYYY or DD/MM/YYYY
  /(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, // YYYY/MM/DD
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})/gi, // DD MMM YYYY
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{2,4})/gi, // MMM DD, YYYY
];

// Common expense categories for classification
export const EXPENSE_CATEGORIES = [
  'Meals & Entertainment',
  'Travel',
  'Transportation',
  'Office Supplies',
  'Software & Subscriptions',
  'Marketing',
  'Training & Education',
  'Equipment',
  'Utilities',
  'Professional Services',
  'Other'
];