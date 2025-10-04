import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useResponsive } from '../../hooks/useResponsive'
import { useSkipLinks, useEscapeKey } from '../../hooks/useAccessibility'
import { Navigation } from './Navigation'
import { MobileMenu } from './MobileMenu'
import { UserMenu } from './UserMenu'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  const { user } = useAuth()
  const { isMobile } = useResponsive()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Add skip links for accessibility
  useSkipLinks()

  // Close mobile menu on escape
  useEscapeKey(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
    if (isUserMenuOpen) {
      setIsUserMenuOpen(false)
    }
  })

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    setIsUserMenuOpen(false) // Close user menu when opening mobile menu
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen)
    setIsMobileMenuOpen(false) // Close mobile menu when opening user menu
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and title */}
            <div className="flex items-center">
              {isMobile && (
                <button
                  type="button"
                  onClick={toggleMobileMenu}
                  className="mr-3 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-menu"
                  aria-label="Toggle navigation menu"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              )}
              
              <div className="flex items-center">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {title || 'Expense Management System'}
                </h1>
              </div>
            </div>

            {/* Desktop navigation */}
            {!isMobile && (
              <nav id="navigation" className="hidden md:flex space-x-8" role="navigation" aria-label="Main navigation">
                <Navigation />
              </nav>
            )}

            {/* User menu */}
            <div className="flex items-center space-x-4">
              {/* User info - hidden on mobile */}
              {!isMobile && user && (
                <div className="hidden sm:flex sm:items-center sm:space-x-2">
                  <span className="text-sm text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {user.role}
                  </span>
                </div>
              )}

              {/* User menu button */}
              <UserMenu 
                isOpen={isUserMenuOpen}
                onToggle={toggleUserMenu}
                user={user}
              />
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobile && (
          <MobileMenu 
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            user={user}
          />
        )}
      </header>

      {/* Main content */}
      <main 
        id="main-content" 
        className="flex-1"
        role="main"
        aria-label="Main content"
        tabIndex={-1}
      >
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto" role="contentinfo">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p className="text-sm text-gray-500">
              © 2024 Expense Management System. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <button 
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                onClick={() => window.open('/accessibility', '_blank')}
              >
                Accessibility
              </button>
              <button 
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                onClick={() => window.open('/privacy', '_blank')}
              >
                Privacy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}