import React from 'react';

interface WsMessage {
  type: string;
  payload: any;
}

// --- MUDANÇA: 'mode' -> 'pumpMode' ---
interface PumpProps {
  id: string;
  on: boolean;
  pumpMode: string;
  flow?: number;
  updateSeq: number;
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
// --- Fim Estilos ---


// Componente da Bomba
// --- MUDANÇA: 'mode' -> 'pumpMode' ---
const Pump: React.FC<PumpProps> = (props) => {
  const { id, flow, updateSeq } = props
  const [systemOn, setSystemOn] = React.useState(((flow ?? 0) * 1000000) > 0)
  const onStreakRef = React.useRef(0)
  const offStreakRef = React.useRef(0)
  React.useEffect(() => {
    const cmFlow = (flow ?? 0) * 1000000
    if (cmFlow > 0) {
      onStreakRef.current += 1
      offStreakRef.current = 0
      if (onStreakRef.current >= 3) setSystemOn(true)
    } else {
      offStreakRef.current += 1
      onStreakRef.current = 0
      if (offStreakRef.current >= 3) setSystemOn(false)
    }
  }, [updateSeq])
  
  // (Estilos dinâmicos de símbolo/rotor sem mudanças)
  const dynamicSymbolStyle: React.CSSProperties = {
    ...symbolStyle,
    backgroundColor: systemOn ? '#2ecc71' : '#e74c3c',
    boxShadow: systemOn ? '0 0 15px 3px rgba(46, 204, 113, 0.5)' : 'none',
  };
  const dynamicImpellerStyle: React.CSSProperties = {
    ...impellerStyle,
    animation: systemOn ? 'spin 1.5s linear infinite' : 'none',
  };


  // --- FIM DA MUDANÇA ---


  return (
    <div style={pumpContainerStyle}>
      <div style={titleStyle}>{id}</div>
      <div style={dynamicSymbolStyle}>
        <div style={dynamicImpellerStyle}></div>
      </div>
      <div style={infoStyle}>
        Vazão: <strong>{(((flow ?? 0) * 1000000)).toFixed(2)} cm³/s</strong><br/>
        Sistema: <strong>{systemOn ? 'LIGADO' : 'DESLIGADO'}</strong>
      </div>
    </div>
  );
};

export default Pump;
