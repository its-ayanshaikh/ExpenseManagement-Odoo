// Application constants
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Expense Management System'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
export const MAX_FILE_SIZE = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '5242880') // 5MB default

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  COMPANY: 'company',
} as const

// File upload constants
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals',
  'Office Supplies',
  'Software',
  'Equipment',
  'Marketing',
  'Training',
  'Other',
] as const

// Currency symbols mapping (common ones)
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
} as const

// Status colors for UI
export const STATUS_COLORS = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
} as const

// Role colors for UI
export const ROLE_COLORS = {
  ADMIN: 'purple',
  MANAGER: 'blue',
  EMPLOYEE: 'gray',
} as const

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    ROLE: (id: string) => `/users/${id}/role`,
    MANAGER: (id: string) => `/users/${id}/manager`,
  },
  EXPENSES: {
    BASE: '/expenses',
    BY_ID: (id: string) => `/expenses/${id}`,
    APPROVE: (id: string) => `/expenses/${id}/approve`,
    REJECT: (id: string) => `/expenses/${id}/reject`,
    HISTORY: (id: string) => `/expenses/${id}/history`,
  },
  APPROVAL_RULES: {
    BASE: '/approval-rules',
    BY_ID: (id: string) => `/approval-rules/${id}`,
  },
  CURRENCIES: {
    COUNTRIES: '/currencies/countries',
    CONVERT: '/currencies/convert',
  },
  OCR: {
    SCAN: '/ocr/scan',
  },
} as const