import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPage from './AdminPage.jsx'
import './styles.css'

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
const root = document.getElementById('root')

let preloadedProducts = null
const preloadNode = document.getElementById('sancity-preloaded-products')
if (preloadNode?.textContent) {
  try {
    preloadedProducts = JSON.parse(preloadNode.textContent)
  } catch {
    preloadedProducts = null
  }
}

const app = (
  <React.StrictMode>
    {isAdminRoute
      ? <AdminPage />
      : <App initialProducts={preloadedProducts} initialPath={window.location.pathname} />}
  </React.StrictMode>
)

if (!isAdminRoute && root.hasChildNodes()) {
  ReactDOM.hydrateRoot(root, app)
} else {
  ReactDOM.createRoot(root).render(app)
}
