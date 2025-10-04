import { api } from './api'
import { ExtractedExpenseData } from '../types'

export class OCRService {
  // Scan receipt and extract expense data
  async scanReceipt(file: File): Promise<ExtractedExpenseData> {
    return api.uploadFile<ExtractedExpenseData>('/ocr/scan', file)
  }
}

export const ocrService = new OCRService()