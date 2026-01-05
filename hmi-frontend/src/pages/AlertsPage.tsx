import React from 'react'
import { useHMI } from '../context/HMIContext'
import AlertPanel from '../components/AlertPanel'

const AlertsPage: React.FC = () => {
  const { state, alertHistory, isConnected } = useHMI()

  return (
    <div>
      <header className="App-header" style={{ textAlign: 'left' }}>
        <h1>Alertas e avisos</h1>
        <p>Status do WebSocket: <strong>{isConnected ? 'Conectado' : 'Desconectado'}</strong></p>
      </header>
      <main>
        <AlertPanel 
          alerts={state?.activeAlerts || []} 
          history={alertHistory} 
          tanks={state?.tanks || []} 
        />
      </main>
    </div>
  )
}

export default AlertsPage
