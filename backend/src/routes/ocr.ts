import express from 'express';
import { OCRService } from '../services/OCRService';
import { uploadSingle } from '../config/multer';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/authorization';
import { UserRole } from '../types/database';

const router = express.Router();
const ocrService = new OCRService();

/**
 * POST /api/ocr/scan
 * Upload receipt image and extract expense data using OCR
 * Requires authentication and Employee role or higher
 */
router.post('/scan', 
  authenticateToken,
  requireRole(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN),
  uploadSingle,
  async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No receipt image uploaded. Please upload an image file.'
        });
      }

      const filePath = req.file.path;
      const fileSize = req.file.size;
      const mimeType = req.file.mimetype;

      // Validate file size (already handled by multer, but double-check)
      const maxSize = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5MB
      if (fileSize > maxSize) {
        await ocrService.cleanupFile(filePath);
        return res.status(400).json({
          status: 'error',
          message: `File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        await ocrService.cleanupFile(filePath);
        return res.status(400).json({
          status: 'error',
          message: 'Invalid file type. Only image files (JPEG, PNG, GIF, BMP, WebP) are allowed.'
        });
      }

      // Process the receipt with OCR
      try {
        console.log(`Processing OCR for file: ${filePath}`);
        
        // Step 1: Scan the receipt
        const ocrResult = await ocrService.scanReceipt(filePath);
        
        // Step 2: Extract expense data
        const extractedData = await ocrService.extractExpenseData(ocrResult);
        
        // Clean up the uploaded file
        await ocrService.cleanupFile(filePath);
        
        // Return extracted data
        return res.json({
          status: 'success',
          message: 'Receipt processed successfully',
          data: {
            extractedData,
            metadata: {
              originalFilename: req.file.originalname,
              fileSize: fileSize,
              processingTime: Date.now() - Date.now(), // This would be calculated properly in production
              ocrConfidence: ocrResult.confidence
            }
          }
        });

      } catch (ocrError) {
        // Clean up file on OCR failure
        await ocrService.cleanupFile(filePath);
        
        console.error('OCR processing failed:', ocrError);
        
        // Return error but allow manual entry as fallback
        return res.status(422).json({
          status: 'error',
          message: 'OCR processing failed. Please enter expense details manually.',
          error: ocrError instanceof Error ? ocrError.message : 'Unknown OCR error',
          fallback: true // Indicates that manual entry should be allowed
        });
      }

    } catch (error) {
      console.error('OCR endpoint error:', error);
      
      // Clean up file if it exists
      if (req.file) {
        await ocrService.cleanupFile(req.file.path);
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred while processing the receipt.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/ocr/supported-formats
 * Get list of supported image formats for OCR
 */
router.get('/supported-formats',
  authenticateToken,
  requireRole(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN),
  (_req, res) => {
    return res.json({
      status: 'success',
      data: {
        supportedFormats: [
          {
            extension: 'jpg',
            mimeType: 'image/jpeg',
            description: 'JPEG Image'
          },
          {
            extension: 'jpeg',
            mimeType: 'image/jpeg',
            description: 'JPEG Image'
          },
          {
            extension: 'png',
            mimeType: 'image/png',
            description: 'PNG Image'
          },
          {
            extension: 'gif',
            mimeType: 'image/gif',
            description: 'GIF Image'
          },
          {
            extension: 'bmp',
            mimeType: 'image/bmp',
            description: 'Bitmap Image'
          },
          {
            extension: 'webp',
            mimeType: 'image/webp',
            description: 'WebP Image'
          }
        ],
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
        maxFileSizeMB: Math.round(parseInt(process.env.MAX_FILE_SIZE || '5242880') / 1024 / 1024)
      }
    });
  }
);

export default router;