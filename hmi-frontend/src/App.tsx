import { useState, useEffect } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket' // Removido SendJsonMessage não usado
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


// --- 2. Constantes da API (sem mudanças) ---
const API_URL = 'http://localhost:8080/api/v1/status'
const WS_URL = 'ws://localhost:8080/ws'


function App() {
  // --- 3. Gerenciamento de Estado (REFATORADO) ---
  const [state, setState] = useState<HMIState | null>(null)
  
  // --- MUDANÇA: 'sendJsonMessage' é pego aqui ---
  const { lastMessage, readyState, sendJsonMessage } = useWebSocket(WS_URL, {
    onOpen: () => console.log('Conexão WebSocket estabelecida.'),
    onClose: () => console.log('Conexão WebSocket perdida.'),
    shouldReconnect: () => true,
  })

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

  useEffect(() => {
    if (lastMessage !== null) {
      const newState: HMIState = JSON.parse(lastMessage.data)
      setState(newState)
    }
  }, [lastMessage])

  // --- 5. Renderização (REFATORADO) ---
  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Conectando...',
    [ReadyState.OPEN]: 'Conectado (Tempo Real)',
    [ReadyState.CLOSING]: 'Fechando...',
    [ReadyState.CLOSED]: 'Desconectado',
    [ReadyState.UNINSTANTIATED]: 'Não instanciado',
  }[readyState]

  const handleCommand = (command: WsMessage) => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage(command); // <-- Usa a função do hook
      console.log('Comando enviado:', command);
    } else {
      console.warn('Não foi possível enviar comando: WebSocket não está conectado.');
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