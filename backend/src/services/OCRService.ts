import Tesseract from 'tesseract.js';
import fs from 'fs';
import {
  OCRResult,
  ExtractedExpenseData,
  ExpenseLineItem,
  CURRENCY_PATTERNS,
  DATE_PATTERNS
} from '../types/ocr';

export class OCRService {
  constructor() {
    // OCR provider is configured via environment variables
  }

  /**
   * Scan receipt image using OCR technology
   * @param imagePath Path to the uploaded image file
   * @returns OCR result with extracted text and metadata
   */
  async scanReceipt(imagePath: string): Promise<OCRResult> {
    try {
      // Verify file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      // Use Tesseract.js for OCR processing
      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => {
          if (process.env.NODE_ENV === 'development') {
            console.log('OCR Progress:', m);
          }
        }
      });

      // Transform Tesseract result to our OCR format
      // For simplicity, we'll work with the basic text output and create simple line structure
      const textLines = data.text.split('\n').filter(line => line.trim().length > 0);
      
      const ocrResult: OCRResult = {
        text: data.text,
        confidence: data.confidence,
        words: [], // Basic implementation - could be enhanced later
        lines: textLines.map((lineText, index) => ({
          text: lineText,
          confidence: data.confidence, // Use overall confidence for each line
          words: [], // Basic implementation - could be enhanced later
          bbox: { x0: 0, y0: index * 20, x1: 100, y1: (index + 1) * 20 } // Approximate positioning
        }))
      };

      return ocrResult;
    } catch (error) {
      console.error('OCR scanning failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract expense data from OCR results
   * @param ocrResult OCR result from scanReceipt
   * @returns Extracted expense data with structured information
   */
  async extractExpenseData(ocrResult: OCRResult): Promise<ExtractedExpenseData> {
    const text = ocrResult.text;
    const lines = ocrResult.lines;

    // Initialize extracted data
    const extractedData: ExtractedExpenseData = {
      confidence: ocrResult.confidence,
      rawText: text
    };

    try {
      // Extract currency and amount
      const currencyData = this.extractCurrencyAndAmount(text);
      if (currencyData) {
        extractedData.amount = currencyData.amount;
        extractedData.currency = currencyData.currency;
      }

      // Extract date
      const date = this.extractDate(text);
      if (date) {
        extractedData.date = date;
      }

      // Extract vendor/merchant name (usually at the top of receipt)
      const vendor = this.extractVendor(lines);
      if (vendor) {
        extractedData.vendor = vendor;
      }

      // Extract description/items
      const description = this.extractDescription(text, lines);
      if (description) {
        extractedData.description = description;
      }

      // Extract category based on vendor or items
      const category = this.classifyExpenseCategory(text, vendor);
      if (category) {
        extractedData.category = category;
      }

      // Extract line items if multiple items present
      const lineItems = this.extractLineItems(lines);
      if (lineItems.length > 0) {
        extractedData.lineItems = lineItems;
      }

      return extractedData;
    } catch (error) {
      console.error('Error extracting expense data:', error);
      // Return basic data even if extraction partially fails
      return extractedData;
    }
  }

  /**
   * Extract currency symbol and amount from text
   */
  private extractCurrencyAndAmount(text: string): { amount: number; currency: string } | null {
    // Try each currency pattern
    for (const pattern of CURRENCY_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern.regex));
      if (matches.length > 0) {
        // Find the largest amount (likely the total)
        let maxAmount = 0;
        let currency = pattern.code;

        for (const match of matches) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr);
          if (!isNaN(amount) && amount > maxAmount) {
            maxAmount = amount;
          }
        }

        if (maxAmount > 0) {
          return { amount: maxAmount, currency };
        }
      }
    }

    // Fallback: look for any number that might be an amount
    const amountRegex = /(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    const amounts = Array.from(text.matchAll(amountRegex));
    if (amounts.length > 0) {
      // Take the largest number as potential amount
      let maxAmount = 0;
      for (const match of amounts) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > maxAmount) {
          maxAmount = amount;
        }
      }
      if (maxAmount > 0) {
        return { amount: maxAmount, currency: 'USD' }; // Default to USD if no currency detected
      }
    }

    return null;
  }

  /**
   * Extract date from text using various date patterns
   */
  private extractDate(text: string): Date | null {
    for (const pattern of DATE_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        const match = matches[0];
        try {
          let date: Date;
          
          if (pattern.source.includes('Jan|Feb')) {
            // Month name patterns
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = monthNames.findIndex(m => 
              match[0].toLowerCase().includes(m.toLowerCase())
            );
            
            if (match.length === 4) { // MMM DD, YYYY format
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              date = new Date(year, monthIndex, day);
            } else { // DD MMM YYYY format
              const day = parseInt(match[1]);
              const year = parseInt(match[3]);
              date = new Date(year, monthIndex, day);
            }
          } else {
            // Numeric date patterns
            const parts = match.slice(1, 4).map(p => parseInt(p));
            
            // Try to determine format based on values
            if (parts[0] > 12 && parts[1] <= 12) {
              // DD/MM/YYYY format
              date = new Date(parts[2] < 100 ? 2000 + parts[2] : parts[2], parts[1] - 1, parts[0]);
            } else if (parts[1] > 12 && parts[0] <= 12) {
              // MM/DD/YYYY format
              date = new Date(parts[2] < 100 ? 2000 + parts[2] : parts[2], parts[0] - 1, parts[1]);
            } else if (parts[0] > 31) {
              // YYYY/MM/DD format
              date = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
              // Default to MM/DD/YYYY
              date = new Date(parts[2] < 100 ? 2000 + parts[2] : parts[2], parts[0] - 1, parts[1]);
            }
          }

          // Validate date
          if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
            return date;
          }
        } catch (error) {
          continue; // Try next pattern
        }
      }
    }

    return null;
  }

  /**
   * Extract vendor/merchant name from receipt lines
   */
  private extractVendor(lines: any[]): string | null {
    if (lines.length === 0) return null;

    // Vendor name is usually in the first few lines and has high confidence
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.confidence > 70 && line.text.trim().length > 2) {
        const text = line.text.trim();
        
        // Skip lines that look like addresses, dates, or numbers
        if (!/^\d+/.test(text) && 
            !text.toLowerCase().includes('receipt') &&
            !text.toLowerCase().includes('invoice') &&
            !/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text)) {
          return text;
        }
      }
    }

    return null;
  }

  /**
   * Extract description from text and lines
   */
  private extractDescription(_text: string, lines: any[]): string | null {
    // Look for item descriptions in the middle section of the receipt
    const middleLines = lines.slice(2, Math.max(2, lines.length - 3));
    const descriptions: string[] = [];

    for (const line of middleLines) {
      const lineText = line.text.trim();
      
      // Skip lines that are likely totals, taxes, or other non-item text
      if (lineText.length > 3 && 
          !lineText.toLowerCase().includes('total') &&
          !lineText.toLowerCase().includes('tax') &&
          !lineText.toLowerCase().includes('subtotal') &&
          !/^\$?\d+\.?\d*$/.test(lineText)) {
        descriptions.push(lineText);
      }
    }

    if (descriptions.length > 0) {
      return descriptions.slice(0, 3).join(', '); // Take first 3 descriptions
    }

    // Fallback: use first meaningful line
    const meaningfulLines = lines.filter(line => 
      line.text.trim().length > 5 && line.confidence > 60
    );
    
    if (meaningfulLines.length > 0) {
      return meaningfulLines[0].text.trim();
    }

    return null;
  }

  /**
   * Classify expense category based on vendor and text content
   */
  private classifyExpenseCategory(text: string, vendor: string | null): string | null {
    const lowerText = text.toLowerCase();
    const lowerVendor = vendor?.toLowerCase() || '';

    // Restaurant/Food keywords
    if (lowerText.includes('restaurant') || lowerText.includes('cafe') || 
        lowerText.includes('food') || lowerText.includes('dining') ||
        lowerVendor.includes('restaurant') || lowerVendor.includes('cafe')) {
      return 'Meals & Entertainment';
    }

    // Travel keywords
    if (lowerText.includes('hotel') || lowerText.includes('airline') || 
        lowerText.includes('flight') || lowerText.includes('taxi') ||
        lowerVendor.includes('hotel') || lowerVendor.includes('airline')) {
      return 'Travel';
    }

    // Transportation keywords
    if (lowerText.includes('uber') || lowerText.includes('lyft') || 
        lowerText.includes('taxi') || lowerText.includes('gas') ||
        lowerText.includes('fuel') || lowerText.includes('parking')) {
      return 'Transportation';
    }

    // Office supplies
    if (lowerText.includes('office') || lowerText.includes('supplies') || 
        lowerText.includes('staples') || lowerText.includes('depot')) {
      return 'Office Supplies';
    }

    // Software/subscriptions
    if (lowerText.includes('software') || lowerText.includes('subscription') || 
        lowerText.includes('saas') || lowerText.includes('license')) {
      return 'Software & Subscriptions';
    }

    return 'Other'; // Default category
  }

  /**
   * Extract individual line items from receipt
   */
  private extractLineItems(lines: any[]): ExpenseLineItem[] {
    const lineItems: ExpenseLineItem[] = [];
    
    // Look for lines that contain both description and amount
    for (const line of lines) {
      const text = line.text.trim();
      
      // Skip header and footer lines
      if (text.length < 3 || line.confidence < 50) continue;
      
      // Look for lines with amounts
      const amountMatch = text.match(/(\d+\.?\d*)\s*$/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1]);
        if (!isNaN(amount) && amount > 0) {
          const description = text.replace(amountMatch[0], '').trim();
          if (description.length > 0) {
            lineItems.push({
              description,
              amount
            });
          }
        }
      }
    }

    return lineItems;
  }

  /**
   * Clean up uploaded file after processing
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
      // Don't throw error for cleanup failures
    }
  }
}