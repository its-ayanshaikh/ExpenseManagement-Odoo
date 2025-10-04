import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Import accessibility testing for development
if (process.env.NODE_ENV === 'development') {
  import('./utils/accessibilityTest').then(({ auditCurrentPage }) => {
    // Run accessibility audit after initial render
    auditCurrentPage()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
