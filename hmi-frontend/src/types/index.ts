export interface PumpStatus {
  id: string
  on: boolean
  flow?: number
}

export interface TankStatus {
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

export interface Alert {
  id: string
  message: string
  level: 'Warning' | 'Critical'
  activeAt: string
  tankId?: string
}

export interface HMIState {
  tanks: TankStatus[]
  pumps: PumpStatus[]
  activeAlerts: Alert[]
}
