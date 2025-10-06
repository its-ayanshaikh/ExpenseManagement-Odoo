/**
 * Production-safe logging utility
 * Logs to console in development, can be extended to send to logging service in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment: boolean
  private logLevel: LogLevel

  constructor() {
    this.isDevelopment = import.meta.env.DEV
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex >= currentLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment && this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      if (this.isDevelopment) {
        console.log(this.formatMessage('info', message, context))
      } else {
        // In production, could send to logging service
        // Example: sendToLoggingService('info', message, context)
      }
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      if (this.isDevelopment) {
        console.warn(this.formatMessage('warn', message, context))
      } else {
        // In production, could send to logging service
        // Example: sendToLoggingService('warn', message, context)
      }
    }
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      }

      if (this.isDevelopment) {
        console.error(this.formatMessage('error', message, errorContext))
        if (error instanceof Error) {
          console.error(error)
        }
      } else {
        // In production, send to error tracking service (Sentry, etc.)
        // Example: sendToErrorTracking(message, error, context)
      }
    }
  }

  // Specialized logging methods
  api(method: string, url: string, duration: number, status?: number): void {
    if (this.isDevelopment) {
      const statusStr = status ? ` [${status}]` : ''
      this.debug(`API ${method} ${url}${statusStr} - ${duration}ms`)
    }
  }

  performance(label: string, duration: number): void {
    if (this.isDevelopment) {
      this.debug(`Performance: ${label} - ${duration}ms`)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing
export { Logger }
