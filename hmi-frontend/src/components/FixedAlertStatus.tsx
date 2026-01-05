import React, { useEffect, useState } from 'react'
import type { TankStatus, PumpStatus } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertTriangle, CheckCircle2, Droplets, Gauge, Power } from 'lucide-react'

interface FixedAlertStatusProps {
  tanks: TankStatus[]
  pumps: PumpStatus[]
}

const FixedAlertStatus: React.FC<FixedAlertStatusProps> = ({ tanks, pumps }) => {
  // Encontra o tanque principal (T-100 ou T-200)
  const mainTank = tanks.find(t => t.id === 'T-100') || tanks.find(t => t.id === 'T-200') || tanks[0]
  const tankLevel = mainTank ? parseFloat(String(mainTank.level).replace('%', '')) : 0
  
  // Determina status do nível
  let status = 'NORMAL'
  let isCritical = false
  
  if (tankLevel >= 110) {
    status = 'ALTO'
    isCritical = true
  } else if (tankLevel < 40) {
    status = 'BAIXO'
    isCritical = true
  }

  const [blinkOn, setBlinkOn] = useState(false)
  useEffect(() => {
    if (!isCritical) {
      setBlinkOn(false)
      return
    }
    const t = setInterval(() => setBlinkOn((blinkOn) => !blinkOn), 1000)
    return () => clearInterval(t)
  }, [isCritical])

  // Encontra a bomba principal
  const mainPump = pumps.find(p => p.id === 'P-100') || pumps[0]
  const isPumpOn = mainPump?.on

  // Fluxos em cm³/s (sensor envia m³/s)
  let pumpFlow = '0.00'
  let consumptionFlow = '0.00'

  if (typeof mainPump?.flow === 'number') {
    const cm3s = mainPump.flow
    if (cm3s > 0) {
      pumpFlow = cm3s.toFixed(2)
    } else if (cm3s < 0) {
      consumptionFlow = Math.abs(cm3s).toFixed(2)
    }
  }

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-5 w-5 text-primary" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nível do Reservatório */}
        <div className={`p-4 rounded-lg border flex items-center justify-between transition-colors duration-500 ${
            isCritical 
              ? (blinkOn ? 'bg-destructive/20 border-destructive' : 'bg-destructive/10 border-destructive/50')
              : 'bg-secondary/50 border-border/50'
        }`}>
          <div className="flex items-center gap-3">
            {isCritical ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-green-500" />}
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Nível Geral</span>
          </div>
          <span className={`font-bold text-sm ${isCritical ? 'text-destructive' : 'text-green-500'}`}>
            {status}
          </span>
        </div>

        {/* Bomba */}
        <div className="p-4 rounded-lg border bg-secondary/10 border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Power className={`h-5 w-5 ${isPumpOn ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bomba Principal</span>
          </div>
          <span className={`font-bold text-sm ${isPumpOn ? 'text-green-500' : 'text-muted-foreground'}`}>
            {isPumpOn ? 'LIGADA' : 'DESLIGADA'}
          </span>
        </div>

        {/* Vazão Bomba */}
        <div className="p-4 rounded-lg border bg-secondary/10 border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Vazão Entrada</span>
          </div>
          <span className="font-mono font-bold text-foreground text-sm">
            {pumpFlow} <span className="text-[10px] text-muted-foreground">cm³/s</span>
          </span>
        </div>

        {/* Vazão Consumo */}
        <div className="p-4 rounded-lg border bg-secondary/10 border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-orange-500" />
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Consumo</span>
          </div>
          <span className="font-mono font-bold text-foreground text-sm">
            {consumptionFlow} <span className="text-[10px] text-muted-foreground">cm³/s</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default FixedAlertStatus
