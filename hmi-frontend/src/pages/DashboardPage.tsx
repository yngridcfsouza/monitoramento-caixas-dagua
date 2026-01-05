import React from 'react'
import { useHMI } from '../context/HMIContext'
import FixedAlertStatus from '../components/FixedAlertStatus'
import Tank from '../components/Tank'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Volume2, VolumeX, Activity, Wifi, WifiOff } from 'lucide-react'

const DashboardPage: React.FC = () => {
  const { state, isConnected, hasDanger, alertControl } = useHMI()
  const { muted, mute, unmute } = alertControl

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 min-h-screen bg-background/95">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard dos Reservatórios</h1>
          <div className="flex items-center gap-2 mt-2">
             <div className={`flex items-center justify-center h-6 w-6 rounded-full ${isConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
             </div>
             <span className={`text-sm font-medium ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
               {isConnected ? 'Sistema Online' : 'Desconectado'}
             </span>
          </div>
        </div>
        
        {hasDanger && (
          <Button 
            variant={muted ? "secondary" : "destructive"}
            onClick={() => (muted ? unmute() : mute())}
            className="gap-2 shadow-lg animate-pulse"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? 'Alertas Silenciados' : 'SILENCIAR ALARME'}
          </Button>
        )}
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Status Panel (Side) */}
        <div className="xl:col-span-1 space-y-6">
            <FixedAlertStatus tanks={state?.tanks || []} pumps={state?.pumps || []} />
        </div>

        {/* Visualização dos Tanques (Main) */}
        <div className="xl:col-span-3">
          <Card className="h-full shadow-md border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5 text-primary" />
                Monitoramento de Nível
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center items-end gap-8 py-4 md:py-8 min-h-[400px]">
                 {state ? (
                    state.tanks.map((tank) => (
                      <div key={tank.id} className="transform transition-transform duration-300 hover:-translate-y-1">
                        <Tank id={tank.id} level={tank.level} />
                      </div>
                    ))
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground gap-4">
                     <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                     <p>Carregando telemetria...</p>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
