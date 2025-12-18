import React from 'react';

interface Alert {
  id: string;
  message: string;
  level: "Warning" | "Critical";
  activeAt: string;
  tankId?: string;
}

interface AlertPanelProps {
  alerts: Alert[];
  history: Alert[];
  tanks: { id: string; level: number }[];
}

const panelStyle: React.CSSProperties = {
  margin: '20px auto',
  width: '90%',
  maxWidth: '800px',
  border: '1px solid #444',
  borderRadius: '8px',
  backgroundColor: '#282c34',
  overflow: 'hidden',
};

const titleStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontWeight: 'bold',
  backgroundColor: '#333',
  color: 'white',
  borderBottom: '1px solid #444',
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '10px 12px',
  alignItems: 'center',
  borderBottom: '1px solid #444',
  backgroundColor: '#2d2f36',
};

const tabButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #4a4d57',
  backgroundColor: '#1f2128',
  color: '#fff',
  borderRadius: '6px',
  cursor: 'pointer',
};

const listContainerStyle: React.CSSProperties = {
  maxHeight: '260px',
  overflowY: 'auto',
};

const noAlertsStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'center',
  color: '#2ecc71', // Verde "tudo OK"
  fontStyle: 'italic',
};

const alertItemStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #444',
  display: 'flex',
  justifyContent: 'space-between',
  fontWeight: 500,
};

// Componente do Painel de Alertas
const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, history, tanks }) => {
  const [view, setView] = React.useState<'active' | 'history'>('active')
  const [tankId, setTankId] = React.useState<string>('')

  const getAlertColor = (level: "Warning" | "Critical") => {
    return level === "Critical" ? '#e74c3c' : '#f1c40f'
  }

  const options = [{ id: '', level: 0 }, ...tanks]
  const applyFilter = (list: Alert[]) => {
    if (!tankId) return list
    return list.filter(a => a.tankId === tankId)
  }
  const activeList = applyFilter(alerts)
  const historyList = applyFilter(history)

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>Painel de Alertas</div>
      <div style={controlsStyle}>
        <div>
          <button
            onClick={() => setView('active')}
            style={{
              ...tabButtonStyle,
              backgroundColor: view === 'active' ? '#0f1116' : '#1f2128',
              borderColor: view === 'active' ? '#6b6f7a' : '#4a4d57',
            }}
          >
            Ativos
          </button>
          <button
            onClick={() => setView('history')}
            style={{
              ...tabButtonStyle,
              backgroundColor: view === 'history' ? '#0f1116' : '#1f2128',
              borderColor: view === 'history' ? '#6b6f7a' : '#4a4d57',
              marginLeft: '8px',
            }}
          >
            Histórico
          </button>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <select
            value={tankId}
            onChange={(e) => setTankId(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #4a4d57',
              backgroundColor: '#1f2128',
              color: '#fff',
              borderRadius: '6px',
            }}
          >
            <option value="">Todos os tanques</option>
            {options.filter(o => o.id).map((t) => (
              <option key={t.id} value={t.id}>{t.id}</option>
            ))}
          </select>
        </div>
      </div>
      {view === 'active' ? (
        activeList.length === 0 ? (
          <div style={noAlertsStyle}>Sistema normal. Nenhum alerta ativo.</div>
        ) : (
          <div style={listContainerStyle}>
            {activeList.map((alert) => (
              <div
                key={`${alert.id}:${alert.activeAt}`}
                style={{ ...alertItemStyle, color: getAlertColor(alert.level) }}
              >
                <span>{alert.message}</span>
                <span>{new Date(alert.activeAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        historyList.length === 0 ? (
          <div style={noAlertsStyle}>Sem registros no histórico.</div>
        ) : (
          <div style={listContainerStyle}>
            {historyList.map((alert) => (
              <div
                key={`${alert.id}:${alert.activeAt}`}
                style={{ ...alertItemStyle, color: getAlertColor(alert.level) }}
              >
                <span>{alert.message}</span>
                <span>{new Date(alert.activeAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

export default AlertPanel;
