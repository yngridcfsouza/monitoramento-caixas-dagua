import { useRef, useCallback } from 'react'

export function useAudioAlarm() {
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
      
      if (oscRef.current) return // Já está tocando

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
    } catch (e) {
      console.error("Erro ao iniciar áudio:", e)
    }
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

  return { startAlarmSound, stopAlarmSound }
}
