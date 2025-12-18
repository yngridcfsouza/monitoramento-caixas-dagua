import React, { useState, useEffect } from 'react';

interface TankProps {
  id: string;
  level: number;
}

const RULER_HEIGHT_PX = 340; // Régua calibrada 0–110% - mesma altura do tanque
const TANK_HEIGHT_PX = 340; // Tanque com mesma altura da régua
const TANK_WIDTH_PX = 180; // Largura do tanque
const RULER_WIDTH_PX = 56; // Largura da régua

const tankBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  margin: '12px',
  fontFamily: 'Inter, sans-serif',
  position: 'relative',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 800,
  color: '#f2f2f2',
  marginBottom: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.7px',
  padding: '8px 14px',
  alignSelf: 'flex-end',
  borderRadius: '12px',
  border: '1px solid #4a4d57',
  background: 'linear-gradient(180deg, #2d2f36 0%, #1f2128 100%)',
  boxShadow: '0 8px 18px rgba(0,0,0,0.38)',
  textShadow: '0 0 6px rgba(148, 108, 108, 0.35), 0 0 2px rgba(255,255,255,0.25)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: '12px',
};

const rulerStyle: React.CSSProperties = {
  position: 'relative',
  height: `${RULER_HEIGHT_PX}px`,
  width: `${RULER_WIDTH_PX}px`,
  background: 'linear-gradient(to right, #1f1f1f 0%, #2a2a2a 100%)',
  borderRadius: '10px',
  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.75)',
  border: '1px solid #454545',
};

const tickLineStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  width: '100%',
  borderTop: '1px solid #666',
};

const tickLabelStyle: React.CSSProperties = {
  position: 'absolute',
  right: '6px',
  transform: 'translateY(-50%)',
  fontSize: '12px',
  color: '#eaeaea',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  backgroundColor: 'rgba(0,0,0,0.35)',
  padding: '2px 6px',
  borderRadius: '6px',
};

const tankStyle: React.CSSProperties = {
  position: 'relative',
  width: `${TANK_WIDTH_PX}px`,
  height: `${TANK_HEIGHT_PX}px`,
  borderRadius: '12px',
  overflow: 'visible',
  background: 'linear-gradient(to bottom, #2a2a2a, #1b1b1b)',
  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.3)',
  border: '1px solid #444',
};

const levelPercentStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontSize: '26px',
  fontWeight: 700,
  color: 'white',
  textShadow: '0 0 8px rgba(0,0,0,0.8)',
  zIndex: 3,
  pointerEvents: 'none',
};

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translate(-50%, -130%)',
  backgroundColor: '#0f1116',
  color: '#fff',
  padding: '8px 10px',
  border: '1px solid #3d3f45',
  borderRadius: '8px',
  boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
  whiteSpace: 'nowrap',
  zIndex: 10,
  pointerEvents: 'none',
};

const Tank: React.FC<TankProps> = ({ id, level }) => {
  const getTankName = (tid: string) => {
    if (tid === 'T-100') return 'RESERVATÓRIO SUPERIOR'
    if (tid === 'T-200') return 'RESERVATÓRIO INFERIOR'
    return tid
  }
  const name = getTankName(id)
  const [hovered, setHovered] = useState(false);
  const isLow = (level ?? 0) < 40
  const isHigh = (level ?? 0) >= 110
  const [blinkOn, setBlinkOn] = useState(false)
  useEffect(() => {
    if (!isLow && !isHigh) {
      setBlinkOn(false)
      return
    }
    const t = setInterval(() => setBlinkOn((b) => !b), 1000)
    return () => clearInterval(t)
  }, [isLow, isHigh])
  const clampedLevel = Math.max(0, Math.min(level ?? 0, 110));
  const fluidHeightPx = (clampedLevel / 110) * RULER_HEIGHT_PX; // calibra pela régua 0-110%

  const fluidStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: `${fluidHeightPx}px`,
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
    background: `linear-gradient(
      180deg,
      #4fc3f7 0%,
      #0288d1 60%,
      #01579b 100%
    )`,
    boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.2)',
    transition: 'height 0.6s ease-in-out',
    zIndex: 2,
  };

  const reflectionStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: '10%',
    width: '25%',
    height: '100%',
    background: 'linear-gradient(to right, rgba(255,255,255,0.15), transparent)',
    zIndex: 3,
    pointerEvents: 'none',
  };

  const majorTicks = Array.from({ length: 12 }, (_, i) => i * 10); // 0,10,...,100
  const minorTicks = Array.from({ length: 21 }, (_, i) => (i + 1) * 5).filter(v => v % 10 !== 0); // 5,15,...,95

  return (
    <div style={tankBlockStyle}>
      {hovered && (
        <div style={tooltipStyle}>
          <strong>{name}</strong> • Nível: {level !== undefined ? level.toFixed(1) : 'N/A'}%
        </div>
      )}
      <div style={labelStyle}>{name}</div>
      <div style={rowStyle}>
        <div style={rulerStyle}>
          {/* Minor ticks (5%) */}
          {minorTicks.map((pct) => {
            const bottomPx = (pct / 110) * RULER_HEIGHT_PX; // Escala de 0-110%
            return (
              <div
                key={`m-${pct}`}
                style={{
                  position: 'absolute',
                  bottom: `${bottomPx}px`,
                  left: 0,
                  width: `${RULER_WIDTH_PX * 0.6}px`,
                  borderTop: '1px solid #555',
                  opacity: 0.8,
                }}
              />
            );
          })}

          {/* Major ticks (10%) + labels */}
          {majorTicks.map((pct) => {
            const bottomPx = (pct / 110) * RULER_HEIGHT_PX; // Escala de 0-110%
            const isBlink40 = pct === 40 && isLow
            const isBlink110 = pct === 110 && isHigh
            const labelColor = (isBlink40 || isBlink110) ? (blinkOn ? '#ffffff' : '#ff6b6b') : '#eaeaea'
            return (
              <div key={`M-${pct}`} style={{ ...tickLineStyle, bottom: `${bottomPx}px`, borderTop: '1px solid #666' }}>
                <span style={{ ...tickLabelStyle, color: labelColor }}>{pct}%</span>
              </div>
            );
          })}
        </div>

        <div style={tankStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <div style={fluidStyle}></div>
          <div style={reflectionStyle}></div>
          <div style={levelPercentStyle}>
            {level !== undefined ? level.toFixed(1) + '%' : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tank;
