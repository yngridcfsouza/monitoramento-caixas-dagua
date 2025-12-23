import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import './App.css'
import Tank from './components/Tank'
import AlertPanel from './components/AlertPanel'
import Sidebar from './components/Sidebar'
import FixedAlertStatus from './components/FixedAlertStatus'
import Login from './components/Login'

// --- Tipos ---
interface PumpStatus {
  id: string
  on: boolean
  flow?: number
}
interface TankStatus {
  id: string
  level: number
  description?: string
  pumpId?: string
  flowRate?: number
  pumpStatus?: 'Ligada' | 'Desligada'
  bloco?: string
  categoria?: 'inferior' | 'superior'
  bomba?: boolean
  local?: string
  alert?: string
}
interface Alert {
  id: string
  message: string
  level: 'Warning' | 'Critical'
  activeAt: string
  tankId?: string
}
interface HMIState {
  tanks: TankStatus[]
  pumps: PumpStatus[]
  activeAlerts: Alert[]
}

// --- Constantes ---
const API_URL = import.meta.env.VITE_API_URL as string
const WS_BASE = import.meta.env.VITE_WS_BASE as string
const MUTE_DURATION_MS = 300000 // 5 minutos

// --- Hook customizado para controle de som/popup ---
function useAlertControl(active: boolean) {
  const [muted, setMuted] = useState(false)
  const [popupDismissed, setPopupDismissed] = useState(false)
  const muteUntilRef = useRef<number | null>(null)
  const dismissUntilRef = useRef<number | null>(null)
  const muteTimerRef = useRef<number | null>(null)
  const dismissTimerRef = useRef<number | null>(null)

  // Atualiza estado ativo
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  const mute = useCallback(() => {
    const until = Date.now() + MUTE_DURATION_MS
    muteUntilRef.current = until
    setMuted(true)

    clearTimeout(muteTimerRef.current || undefined)
    muteTimerRef.current = window.setTimeout(() => {
      // só ativa som se ainda houver perigo
      if (activeRef.current) setMuted(false)
      muteUntilRef.current = null
      muteTimerRef.current = null
    }, MUTE_DURATION_MS)
  }, [])

  const unmute = useCallback(() => {
    setMuted(false)
    muteUntilRef.current = null
    clearTimeout(muteTimerRef.current || undefined)
    muteTimerRef.current = null
  }, [])

  const dismissPopup = useCallback(() => {
    const until = Date.now() + MUTE_DURATION_MS
    dismissUntilRef.current = until
    setPopupDismissed(true)

    clearTimeout(dismissTimerRef.current || undefined)
    dismissTimerRef.current = window.setTimeout(() => {
      if (activeRef.current) setPopupDismissed(false)
      dismissUntilRef.current = null
      dismissTimerRef.current = null
    }, MUTE_DURATION_MS)
  }, [])

  // Nunca reabre popup antes do tempo
  const canShowPopup = useCallback(() => {
    return !dismissUntilRef.current || Date.now() > dismissUntilRef.current
  }, [])

  const canPlaySound = useCallback(() => {
    return !muteUntilRef.current || Date.now() > muteUntilRef.current
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(muteTimerRef.current || undefined)
      clearTimeout(dismissTimerRef.current || undefined)
    }
  }, [])

  return {
    muted,
    popupDismissed,
    mute,
    unmute,
    dismissPopup,
    canShowPopup: canShowPopup(),
    canPlaySound: canPlaySound(),
    muteUntil: muteUntilRef.current,
    dismissUntil: dismissUntilRef.current,
  }
}


// --- Componente Principal ---
function App() {
  const [state, setState] = useState<HMIState | null>(null)
  const [alertHistory, setAlertHistory] = useState<Alert[]>([])
  const socketRef = useRef<Socket | null>(null)
  const seenAlertsRef = useRef<Set<string>>(new Set())
  const prevActiveRef = useRef<Alert[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const startAlarmSound = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current as AudioContext
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      if (oscRef.current) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 880
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      oscRef.current = osc
      gainRef.current = gain
    } catch {}
  }, [])
  const stopAlarmSound = useCallback(() => {
    if (oscRef.current) {
      try { oscRef.current.stop() } catch {}
      oscRef.current.disconnect()
      gainRef.current?.disconnect()
      oscRef.current = null
      gainRef.current = null
    }
  }, [])

  // --- Carrega estado inicial ---
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(API_URL)
        if (!response.ok) throw new Error('Falha ao buscar dados da API')

        const data: HMIState = await response.json()
        setState(data)

        if (Array.isArray(data.activeAlerts)) {
          const incoming = data.activeAlerts
          const next: Alert[] = []

          for (const a of incoming) {
            const key = `${a.id}:${a.activeAt}`
            if (!seenAlertsRef.current.has(key)) {
              seenAlertsRef.current.add(key)
              next.push(a)
            }
          }

          if (next.length) setAlertHistory((cur) => [...cur, ...next])
          prevActiveRef.current = incoming
        }
      } catch (error) {
        console.error('Erro ao buscar estado inicial:', error)
      }
    }
    fetchInitialState()
  }, [])

  // --- Socket.io ---
  useEffect(() => {
    const socket = io(WS_BASE, { transports: ['websocket'] })
    socketRef.current = socket

    const handleConnect = () => console.log('Conectado ao Socket.io')
    const handleDisconnect = () => console.log('Desconectado do Socket.io')
    const handleUpdate = (newState: HMIState) => {
      setState(newState)

      const incoming = newState.activeAlerts || []
      const prevKeys = new Set((prevActiveRef.current || []).map((a) => `${a.id}:${a.activeAt}`))
      const toAdd: Alert[] = []

      for (const a of incoming) {
        const key = `${a.id}:${a.activeAt}`
        if (!prevKeys.has(key) && !seenAlertsRef.current.has(key)) {
          seenAlertsRef.current.add(key)
          toAdd.push(a)
        }
      }

      if (toAdd.length) setAlertHistory((cur) => [...cur, ...toAdd])
      prevActiveRef.current = incoming
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('hmi_update', handleUpdate)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('hmi_update', handleUpdate)
      socket.disconnect()
    }
  }, [])

  const connectionStatus = socketRef.current?.connected ? 'Conectado (Tempo Real)' : 'Desconectado'

  const hasDanger = useMemo(() => {
    const tanks = state?.tanks || []
    return tanks.some((t) => {
      const lv = parseFloat(String(t.level).replace('%', ''))
      return Number.isFinite(lv) && (lv < 40 || lv >= 110)
    })
  }, [state?.tanks])
  const { muted, popupDismissed, mute, unmute, canShowPopup, canPlaySound } = useAlertControl(hasDanger)

  useEffect(() => {
    if (!hasDanger || muted || !canPlaySound || popupDismissed || !canShowPopup) {
      stopAlarmSound()
      return
    }
    startAlarmSound()
    return () => stopAlarmSound()
  }, [hasDanger, muted, canPlaySound, popupDismissed, canShowPopup, startAlarmSound, stopAlarmSound])

  // --- Dashboard ---
  const Dashboard: React.FC = () => {
    return (
      <div>
        <header className="App-header" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0 }}>Dashboard dos reservatórios</h1>
            <p style={{ margin: 0 }}>Status: <strong>{connectionStatus}</strong></p>
          </div>
          {hasDanger && (
            <button
              onClick={() => (muted ? unmute() : mute())}
              style={{ padding: '6px 10px', border: '1px solid #4a4d57', backgroundColor: muted ? '#6c757d' : '#1f2128', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
            >
              {muted ? 'Ativar som' : 'Silenciar'}
            </button>
          )}
        </header>
        <main style={{ position: 'relative' }}>
          <h3 style={{ textAlign: 'left' }}>Tanques</h3>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <FixedAlertStatus tanks={state?.tanks || []} pumps={state?.pumps || []} />
            </div>
            {state ? state.tanks.map((tank) => <Tank key={tank.id} id={tank.id} level={tank.level} />) : <p>Carregando dados dos tanques...</p>}
          </div>

        </main>
      </div>
    )
  }

  const AlertasAvisos: React.FC = () => (
    <div>
      <header className="App-header" style={{ textAlign: 'left' }}>
        <h1>Alertas e avisos</h1>
        <p>Status do WebSocket: <strong>{connectionStatus}</strong></p>
      </header>
      <main>
        <AlertPanel alerts={state?.activeAlerts || []} history={alertHistory} tanks={state?.tanks || []} />
      </main>
    </div>
  )

  const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('token')
    if (!token) {
      return <Navigate to="/login" replace />
    }
    return children
  }

  const Layout = () => {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <Sidebar />
        </aside>
        <div className="content">
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={
        <RequireAuth>
          <Layout />
        </RequireAuth>
      }>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alertas" element={<AlertasAvisos />} />
      </Route>
    </Routes>
  )
}

export default App
