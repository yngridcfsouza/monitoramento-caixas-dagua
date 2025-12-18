export interface PumpStatus {
  id: string
  on: boolean
  flow?: number
}

export interface TankStatus {
  id: string
  level: number
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
  level: string
  activeAt: string
}

export interface HMIState {
  tanks: TankStatus[]
  pumps: PumpStatus[]
  activeAlerts: Alert[]
}

export type SensorPayload = {
  id: string
  level: number
  flow: number
  pumpStatus: 'Ligada' | 'Desligada'
}