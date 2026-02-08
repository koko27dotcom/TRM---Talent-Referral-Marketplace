import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Polyfill for framer-motion to fix useLayoutEffect error in production
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.React = React
}

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
