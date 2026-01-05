import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import { HMIProvider } from './context/HMIContext'
import Layout from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AlertsPage from './pages/AlertsPage'

// Componente simples para proteger rotas
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <HMIProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/alertas" element={<AlertsPage />} />
        </Route>
      </Routes>
    </HMIProvider>
  )
}

export default App
