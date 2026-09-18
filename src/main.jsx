import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPage from './AdminPage.jsx'
import './styles.css'

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
const root = document.getElementById('root')
const app = (
  <React.StrictMode>
    {isAdminRoute ? <AdminPage /> : <App />}
  </React.StrictMode>
)

if (!isAdminRoute && root.hasChildNodes()) {
  ReactDOM.hydrateRoot(root, app)
} else {
  ReactDOM.createRoot(root).render(app)
}
