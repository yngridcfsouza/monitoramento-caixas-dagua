import React from 'react';

interface Alert {
  id: string;
  message: string;
  level: "Warning" | "Critical"; // Podemos ser específicos nos tipos
  activeAt: string;
}

interface AlertPanelProps {
  alerts: Alert[]; // Recebe a lista de alertas ativos
}

// Estilos
const panelStyle: React.CSSProperties = {
  margin: '20px auto',
  width: '90%',
  maxWidth: '800px',
  border: '1px solid #444',
  borderRadius: '8px',
  backgroundColor: '#282c34',
  maxHeight: '200px',
  overflowY: 'auto',
};

const titleStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontWeight: 'bold',
  backgroundColor: '#333',
  color: 'white',
  borderBottom: '1px solid #444',
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
const AlertPanel: React.FC<AlertPanelProps> = ({ alerts }) => {
  
  // Função helper para definir a cor com base no nível
  const getAlertColor = (level: "Warning" | "Critical") => {
    return level === "Critical" ? '#e74c3c' : '#f1c40f'; // Vermelho ou Amarelo
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>Painel de Alertas</div>
      
      {alerts.length === 0 ? (
        // Se a lista de alertas estiver vazia
        <div style={noAlertsStyle}>
          Sistema normal. Nenhum alerta ativo.
        </div>
      ) : (
        // Se tivermos alertas, fazemos um loop neles
        <div>
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              style={{ ...alertItemStyle, color: getAlertColor(alert.level) }}
            >
              <span>{alert.message}</span>
              {/* Converte o timestamp para um formato legível */}
              <span>{new Date(alert.activeAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertPanel;