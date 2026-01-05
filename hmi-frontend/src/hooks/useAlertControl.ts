import { useState, useEffect, useRef, useCallback } from 'react'

const MUTE_DURATION_MS = 300000 // 5 minutos

export function useAlertControl(active: boolean) {
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

    if (muteTimerRef.current) clearTimeout(muteTimerRef.current)
    
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
    if (muteTimerRef.current) clearTimeout(muteTimerRef.current)
    muteTimerRef.current = null
  }, [])

  const dismissPopup = useCallback(() => {
    const until = Date.now() + MUTE_DURATION_MS
    dismissUntilRef.current = until
    setPopupDismissed(true)

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)

    dismissTimerRef.current = window.setTimeout(() => {
      if (activeRef.current) setPopupDismissed(false)
      dismissUntilRef.current = null
      dismissTimerRef.current = null
    }, MUTE_DURATION_MS)
  }, [])

  // Nunca reabre popup antes do tempo
  const canShowPopup = !dismissUntilRef.current || Date.now() > dismissUntilRef.current
  const canPlaySound = !muteUntilRef.current || Date.now() > muteUntilRef.current

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (muteTimerRef.current) clearTimeout(muteTimerRef.current)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  return {
    muted,
    popupDismissed,
    mute,
    unmute,
    dismissPopup,
    canShowPopup,
    canPlaySound,
    muteUntil: muteUntilRef.current,
    dismissUntil: dismissUntilRef.current,
  }
}
