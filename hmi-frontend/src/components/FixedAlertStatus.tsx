import React, { useEffect, useState } from 'react'

interface TankData {
  id: string
  level: number
}

interface PumpData {
  id: string
  on: boolean
  flow?: number
}

interface FixedAlertStatusProps {
  tanks: TankData[]
  pumps: PumpData[]
}

const containerStyle: React.CSSProperties = {
  width: 320,
  borderRadius: 12,
  color: '#fff',
  margin: '8px',
  alignSelf: 'flex-start',
  fontFamily: 'Inter, sans-serif',
}

const infoContainerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const infoItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 12px',
  backgroundColor: '#2d2f36',
  borderRadius: '8px',
  border: '1px solid #3a3d45',
}

const infoLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const infoValueStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
}

const FixedAlertStatus: React.FC<FixedAlertStatusProps> = ({ tanks, pumps }) => {
  // Encontra o tanque principal (T-100 ou T-200)
  const mainTank = tanks.find(t => t.id === 'T-100') || tanks.find(t => t.id === 'T-200') || tanks[0]
  const tankLevel = mainTank ? parseFloat(String(mainTank.level).replace('%', '')) : 0
  
  // Determina status do nível
  let status = 'NÍVEL NORMAL'
  let statusColor = '#ffffff'
  
  if (tankLevel >= 110) {
    status = 'NÍVEL ALTO'
    statusColor = '#ff6b6b'
  } else if (tankLevel < 40) {
    status = 'NÍVEL BAIXO'
    statusColor = '#ff6b6b'
  }

  const isCritical = tankLevel >= 110 || tankLevel < 40
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
  const pumpStatus = mainPump?.on ? 'LIGADA' : 'DESLIGADA'
  const pumpStatusColor = mainPump?.on ? '#51cf66' : '#ff6b6b'

  // Fluxos em cm³/s (sensor envia m³/s)
  let pumpFlow = '0.00 cm³/s'
  let consumptionFlow = '0.00 cm³/s'

  if (typeof mainPump?.flow === 'number') {
    const cm3s = mainPump.flow
    if (cm3s > 0) {
      pumpFlow = `${cm3s.toFixed(2)} cm³/s`
    } else if (cm3s < 0) {
      consumptionFlow = `${Math.abs(cm3s).toFixed(2)} cm³/s`
    }
  }

  return (
    <div style={containerStyle}>
      <div style={infoContainerStyle}>
        <div style={infoItemStyle}>
          <span style={infoLabelStyle}>RESERVATÓRIO</span>
          <span style={{
            ...infoValueStyle,
            color: isCritical ? (blinkOn ? '#ffffff' : '#ff6b6b') : statusColor,
          }}>
            {status}
          </span>
        </div>

        <div style={infoItemStyle}>
          <span style={infoLabelStyle}>Status da Bomba</span>
          <span style={{
            ...infoValueStyle,
            color: pumpStatusColor,
          }}>
            {pumpStatus}
          </span>
        </div>
        
        <div style={infoItemStyle}>
          <span style={infoLabelStyle}>Vazão da Bomba</span>
          <span style={infoValueStyle}>{pumpFlow}</span>
        </div>
        
        <div style={infoItemStyle}>
          <span style={infoLabelStyle}>Vazão de Consumo</span>
          <span style={infoValueStyle}>{consumptionFlow}</span>
        </div>
      </div>
    </div>
  )
}

export default FixedAlertStatus
