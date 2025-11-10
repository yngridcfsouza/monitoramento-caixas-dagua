import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import './App.css'
import Tank from './components/Tank'
import Pump from './components/Pump'
import AlertPanel from './components/AlertPanel'

// --- 1. Definição de Tipos (REFATORADO) ---
interface PumpStatus {
  id: string
  on: boolean
  // --- MUDANÇA: 'mode' -> 'pumpMode' ---
  pumpMode: string 
}
interface TankStatus {
  id: string
  level: number
}
interface Alert {
  id: string;
  message: string;
  level: "Warning" | "Critical";
  activeAt: string;
}
interface HMIState {
  tanks: TankStatus[]
  pumps: PumpStatus[]
  activeAlerts: Alert[]
}
interface WsMessage {
  type: string;
  payload: any;
}
// --- Fim dos Tipos ---


// --- 2. Constantes da API (via Vite ENV) ---
const API_URL = import.meta.env.VITE_API_URL as string
const WS_BASE = import.meta.env.VITE_WS_BASE as string


function App() {
  // --- 3. Gerenciamento de Estado (REFATORADO) ---
  const [state, setState] = useState<HMIState | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // --- 4. Lógica de Carregamento (sem mudanças) ---
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        console.log('Buscando estado inicial da API REST...')
        const response = await fetch(API_URL)
        if (!response.ok) {
          throw new Error('Falha ao buscar dados da API')
        }
        const data: HMIState = await response.json()
        setState(data)
        console.log('Estado inicial carregado:', data)
      } catch (error) {
        console.error('Erro ao buscar estado inicial:', error)
      }
    }
    fetchInitialState()
  }, [])

  // --- 4. Socket.io: conexão e assinatura de updates ---
  useEffect(() => {
    console.log('Conectando ao Socket.io em', WS_BASE)
    const socket = io(WS_BASE, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Conectado ao Socket.io')
    })
    socket.on('disconnect', () => {
      console.log('Desconectado do Socket.io')
    })
    socket.on('hmi_update', (newState: HMIState) => {
      setState(newState)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  // --- 5. Renderização (REFATORADO) ---
  const connectionStatus = socketRef.current?.connected ? 'Conectado (Tempo Real)' : 'Desconectado'

  const handleCommand = (command: WsMessage) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit(command.type, command.payload)
      console.log('Comando enviado:', command)
    } else {
      console.warn('Não foi possível enviar comando: Socket.io não está conectado.')
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dashboard HMI (React + Go)</h1>
        <p>Status do WebSocket: <strong>{connectionStatus}</strong></p>
      </header>
      
      <main>
        <AlertPanel alerts={state?.activeAlerts || []} />

        <h3>Tanques</h3>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
          {state ? (
            state.tanks.map((tank) => (
              <Tank 
                key={tank.id}
                id={tank.id} 
                level={tank.level} 
              />
            ))
          ) : (
            <p>Carregando dados dos tanques...</p>
          )}
        </div>

        <h3>Bombas</h3>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
          {state ? (
            state.pumps.map((pump) => (
              <Pump
                key={pump.id}
                id={pump.id}
                on={pump.on}
                // --- MUDANÇA: 'mode' -> 'pumpMode' ---
                pumpMode={pump.pumpMode} 
                onCommand={handleCommand}
              />
            ))
          ) : (
            <p>Carregando dados das bombas...</p>
          )}
        </div>
      </main>
    </div>
  )
}

export default App