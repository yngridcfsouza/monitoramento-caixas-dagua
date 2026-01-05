import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import type { HMIState, Alert } from '../types'
import { useAlertControl } from '../hooks/useAlertControl'
import { useAudioAlarm } from '../hooks/useAudioAlarm'

const API_URL = import.meta.env.VITE_API_URL as string
const WS_BASE = import.meta.env.VITE_WS_BASE as string

interface HMIContextData {
  state: HMIState | null
  isConnected: boolean
  alertHistory: Alert[]
  hasDanger: boolean
  alertControl: {
    muted: boolean
    popupDismissed: boolean
    mute: () => void
    unmute: () => void
    dismissPopup: () => void
    canShowPopup: boolean
  }
}

const HMIContext = createContext<HMIContextData>({} as HMIContextData)

export const HMIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HMIState | null>(null)
  const [alertHistory, setAlertHistory] = useState<Alert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  
  const socketRef = useRef<Socket | null>(null)
  const seenAlertsRef = useRef<Set<string>>(new Set())
  const prevActiveRef = useRef<Alert[]>([])

  // --- 1. Carrega estado inicial ---
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(API_URL)
        if (!response.ok) throw new Error('Falha ao buscar dados da API')
        const data: HMIState = await response.json()
        setState(data)
        processNewAlerts(data.activeAlerts || [])
      } catch (error) {
        console.error('Erro ao buscar estado inicial:', error)
      }
    }
    fetchInitialState()
  }, [])

  // --- 2. Socket.io ---
  useEffect(() => {
    const socket = io(WS_BASE, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Conectado ao Socket.io')
      setIsConnected(true)
    })
    
    socket.on('disconnect', () => {
      console.log('Desconectado do Socket.io')
      setIsConnected(false)
    })
    
    socket.on('hmi_update', (newState: HMIState) => {
      setState(newState)
      processNewAlerts(newState.activeAlerts || [])
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Helper para processar histórico de alertas
  const processNewAlerts = (incoming: Alert[]) => {
    const prevKeys = new Set((prevActiveRef.current || []).map((a) => `${a.id}:${a.activeAt}`))
    const toAdd: Alert[] = []

    for (const a of incoming) {
      const key = `${a.id}:${a.activeAt}`
      if (!prevKeys.has(key) && !seenAlertsRef.current.has(key)) {
        seenAlertsRef.current.add(key)
        toAdd.push(a)
      }
    }

    if (toAdd.length) {
      setAlertHistory((cur) => [...cur, ...toAdd])
    }
    prevActiveRef.current = incoming
  }

  // --- 3. Lógica de Perigo e Áudio ---
  const hasDanger = useMemo(() => {
    const tanks = state?.tanks || []
    return tanks.some((t) => {
      const lv = parseFloat(String(t.level).replace('%', ''))
      return Number.isFinite(lv) && (lv < 40 || lv >= 110)
    })
  }, [state?.tanks])

  const alertControl = useAlertControl(hasDanger)
  const { startAlarmSound, stopAlarmSound } = useAudioAlarm()

  useEffect(() => {
    if (!hasDanger || alertControl.muted || !alertControl.canPlaySound || alertControl.popupDismissed || !alertControl.canShowPopup) {
      stopAlarmSound()
      return
    }
    startAlarmSound()
    return () => stopAlarmSound()
  }, [hasDanger, alertControl, startAlarmSound, stopAlarmSound])

  return (
    <HMIContext.Provider value={{
      state,
      isConnected,
      alertHistory,
      hasDanger,
      alertControl
    }}>
      {children}
    </HMIContext.Provider>
  )
}

export function useHMI() {
  return useContext(HMIContext)
}
