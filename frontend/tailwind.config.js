/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Enhanced responsive breakpoints
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      // Accessibility-focused spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // Touch-friendly minimum sizes
      minHeight: {
        '11': '2.75rem', // 44px minimum touch target
        '12': '3rem',    // 48px comfortable touch target
      },
      minWidth: {
        '11': '2.75rem', // 44px minimum touch target
        '12': '3rem',    // 48px comfortable touch target
      },
      // Focus ring improvements
      ringWidth: {
        '3': '3px',
      },
      // High contrast colors for accessibility
      colors: {
        'focus': '#2563eb', // Blue-600 for focus rings
        'error': '#dc2626',  // Red-600 for errors
        'success': '#16a34a', // Green-600 for success
        'warning': '#d97706', // Amber-600 for warnings
      },
    },
  },
  plugins: [
    // Add accessibility and responsive utilities
    function({ addUtilities, addComponents, theme }) {
      // Screen reader utilities
      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          'white-space': 'nowrap',
          border: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          'white-space': 'normal',
        },
        '.sr-only-focusable': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          'white-space': 'nowrap',
          border: '0',
          '&:focus': {
            position: 'static',
            width: 'auto',
            height: 'auto',
            padding: '0',
            margin: '0',
            overflow: 'visible',
            clip: 'auto',
            'white-space': 'normal',
          },
        },
      })

      // Focus management utilities
      addUtilities({
        '.focus-visible-only': {
          '&:focus': {
            outline: 'none',
          },
          '&:focus-visible': {
            outline: '2px solid #2563eb',
            'outline-offset': '2px',
          },
        },
        '.focus-ring': {
          '&:focus': {
            outline: 'none',
            'box-shadow': '0 0 0 2px #2563eb',
          },
        },
        '.focus-ring-inset': {
          '&:focus': {
            outline: 'none',
            'box-shadow': 'inset 0 0 0 2px #2563eb',
          },
        },
      })

      // Touch target utilities
      addUtilities({
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.touch-target-sm': {
          'min-height': '40px',
          'min-width': '40px',
        },
        '.touch-target-lg': {
          'min-height': '48px',
          'min-width': '48px',
        },
      })

      // Reduced motion utilities
      addUtilities({
        '.motion-safe': {
          '@media (prefers-reduced-motion: no-preference)': {
            // Only apply animations when motion is safe
          },
        },
        '.motion-reduce': {
          '@media (prefers-reduced-motion: reduce)': {
            'animation-duration': '0.01ms !important',
            'animation-iteration-count': '1 !important',
            'transition-duration': '0.01ms !important',
            'scroll-behavior': 'auto !important',
          },
        },
      })

      // High contrast utilities
      addUtilities({
        '.high-contrast': {
          '@media (prefers-contrast: high)': {
            'border-width': '2px',
            'outline-width': '2px',
          },
        },
      })

      // Skip link component
      addComponents({
        '.skip-link': {
          position: 'absolute',
          top: '-40px',
          left: '6px',
          background: theme('colors.blue.600'),
          color: theme('colors.white'),
          padding: '8px 16px',
          'text-decoration': 'none',
          'border-radius': '4px',
          'z-index': '1000',
          '&:focus': {
            top: '6px',
          },
        },
      })
    }
  ],
}
