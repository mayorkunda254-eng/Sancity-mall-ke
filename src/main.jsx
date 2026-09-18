import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPage from './AdminPage.jsx'
import './styles.css'

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminPage /> : <App />}
  </React.StrictMode>,
)
