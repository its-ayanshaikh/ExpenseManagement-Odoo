import React, { useState, useRef, useCallback } from 'react'
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../../constants'
import { useId } from '../../hooks/useAccessibility'

interface ReceiptUploaderProps {
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  currentFile?: File | null
  currentImageUrl?: string
  disabled?: boolean
  className?: string
  maxSize?: number
  acceptedTypes?: string[]
  showPreview?: boolean
  onOCRScan?: (file: File) => void
  isOCRLoading?: boolean
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  onFileSelect,
  onFileRemove,
  currentFile,
  currentImageUrl,
  disabled = false,
  className = '',
  maxSize = MAX_FILE_SIZE,
  acceptedTypes = ALLOWED_IMAGE_TYPES,
  showPreview = true,
  onOCRScan,
  isOCRLoading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadId = useId('file-upload')
  const errorId = useId('upload-error')
  const descriptionId = useId('upload-description')

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type as any)) {
      return `File type not supported. Please upload: ${acceptedTypes.join(', ')}`
    }
    
    if (file.size > maxSize) {
      return `File size too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`
    }
    
    return null
  }

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    
    setError(null)
    onFileSelect(file)
  }, [onFileSelect, maxSize, acceptedTypes])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [disabled, handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      handleClick()
    }
  }, [disabled, handleClick])

  const handleRemove = useCallback(() => {
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileRemove?.()
  }, [onFileRemove])

  const handleOCRScan = useCallback(() => {
    if (currentFile && onOCRScan) {
      onOCRScan(currentFile)
    }
  }, [currentFile, onOCRScan])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const hasFile = currentFile || currentImageUrl

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
          ${isDragOver && !disabled ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-gray-400'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={uploadId}
        aria-describedby={`${descriptionId} ${error ? errorId : ''}`.trim()}
        aria-disabled={disabled}
      >
        <input
          ref={fileInputRef}
          id={uploadId}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-describedby={descriptionId}
        />
        
        <div className="space-y-2">
          <div className="text-4xl" aria-hidden="true">📄</div>
          <div>
            <p id={uploadId} className="text-sm font-medium text-gray-900">
              {hasFile ? 'Click to replace file' : 'Click to upload or drag and drop'}
            </p>
            <p id={descriptionId} className="text-xs text-gray-500">
              {acceptedTypes.includes('image/jpeg') ? 'Images' : 'Files'} up to {(maxSize / 1024 / 1024).toFixed(1)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="assertive">
          <p id={errorId} className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* File Info */}
      {currentFile && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📎</div>
            <div>
              <p className="text-sm font-medium text-gray-900">{currentFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(currentFile.size)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* OCR Scan Button */}
            {onOCRScan && (
              <button
                type="button"
                onClick={handleOCRScan}
                disabled={isOCRLoading || disabled}
                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-8 transition-colors duration-200"
                aria-label={isOCRLoading ? 'Scanning receipt...' : 'Scan receipt with OCR'}
              >
                <span aria-hidden="true">🔍</span>
                <span className="ml-1">{isOCRLoading ? 'Scanning...' : 'Scan'}</span>
              </button>
            )}
            
            {/* Remove Button */}
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="p-1 text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-8 min-h-8 rounded transition-colors duration-200"
              aria-label={`Remove ${currentFile?.name || 'file'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {showPreview && (currentImageUrl || currentFile) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <img
            src={currentImageUrl || (currentFile ? URL.createObjectURL(currentFile) : '')}
            alt={`Preview of ${currentFile?.name || 'uploaded receipt'}`}
            className="w-full h-48 object-contain bg-gray-50"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}