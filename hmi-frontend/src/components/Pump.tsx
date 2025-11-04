import React from 'react';

interface WsMessage {
  type: string;
  payload: any;
}

// --- MUDANÇA: 'mode' -> 'pumpMode' ---
interface PumpProps {
  id: string;
  on: boolean;
  pumpMode: string; // <-- Renomeado
  onCommand: (command: WsMessage) => void;
}
// --- FIM DA MUDANÇA ---

// --- Estilos (sem mudanças) ---
const pumpContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  margin: '10px',
  padding: '10px',
  border: '1px solid #444',
  borderRadius: '8px',
  backgroundColor: '#282c34',
  width: '160px',
};
const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  marginBottom: '10px',
};
const symbolStyle: React.CSSProperties = {
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  border: '4px solid #333',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
  position: 'relative',
};
const impellerStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  border: '3px solid rgba(255,255,255,0.8)',
  borderRightColor: 'transparent',
  borderLeftColor: 'transparent',
  borderRadius: '50%',
  transition: 'transform 1s linear',
};
const infoStyle: React.CSSProperties = {
  marginTop: '10px',
  fontSize: '12px',
  color: '#aaa',
};
const buttonStyle: React.CSSProperties = {
  marginTop: '10px',
  padding: '6px 10px',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '4px',
  width: '100%',
};
// --- Fim Estilos ---


// Componente da Bomba
// --- MUDANÇA: 'mode' -> 'pumpMode' ---
const Pump: React.FC<PumpProps> = ({ id, on, pumpMode, onCommand }) => {
  
  // (Estilos dinâmicos de símbolo/rotor sem mudanças)
  const dynamicSymbolStyle: React.CSSProperties = {
    ...symbolStyle,
    backgroundColor: on ? '#2ecc71' : '#e74c3c',
    boxShadow: on ? '0 0 15px 3px rgba(46, 204, 113, 0.5)' : 'none',
  };
  const dynamicImpellerStyle: React.CSSProperties = {
    ...impellerStyle,
    animation: on ? 'spin 1.5s linear infinite' : 'none',
  };


  // --- MUDANÇA: Lógica usa 'pumpMode' ---
  const handleModeToggle = () => {
    const newMode = (pumpMode === 'AUTO') ? 'MANUAL' : 'AUTO';
    
    const command: WsMessage = {
      type: "SET_PUMP_MODE",
      payload: {
        id: id,
        pumpMode: newMode // <-- Envia 'pumpMode'
      }
    };
    onCommand(command);
  };
  
  const handleStateToggle = () => {
    if (pumpMode === 'MANUAL') { // <-- Checa 'pumpMode'
      const newState = !on; 
      const command: WsMessage = {
        type: "SET_PUMP_STATE",
        payload: {
          id: id,
          on: newState
        }
      };
      onCommand(command);
    }
  };
  
  const dynamicModeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: pumpMode === 'AUTO' ? '#007bff' : '#6c757d', // <-- Checa 'pumpMode'
    color: 'white',
  };
  
  const dynamicStateButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    marginTop: '4px',
    backgroundColor: on ? '#dc3545' : '#28a745',
    color: 'white',
  };

  if (pumpMode !== 'MANUAL') { // <-- Checa 'pumpMode'
    dynamicStateButtonStyle.backgroundColor = '#6c757d';
    dynamicStateButtonStyle.opacity = 0.5;
    dynamicStateButtonStyle.cursor = 'not-allowed';
  }
  // --- FIM DA MUDANÇA ---


  return (
    <div style={pumpContainerStyle}>
      <div style={titleStyle}>{id}</div>
      <div style={dynamicSymbolStyle}>
        <div style={dynamicImpellerStyle}></div>
      </div>
      <div style={infoStyle}>
        Status: <strong>{on ? 'LIGADA' : 'DESLIGADA'}</strong>
      </div>
      
      {/* --- MUDANÇA: 'mode' -> 'pumpMode' --- */}
      <button style={dynamicModeButtonStyle} onClick={handleModeToggle}>
        Modo: {pumpMode} 
      </button>

      <button 
        style={dynamicStateButtonStyle} 
        onClick={handleStateToggle}
        disabled={pumpMode !== 'MANUAL'} // <-- Checa 'pumpMode'
      >
        {on ? 'Desligar Manual' : 'Ligar Manual'}
      </button>
    </div>
  );
};

export default Pump;