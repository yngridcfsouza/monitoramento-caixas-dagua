import React from 'react';

// Define os Tipos de Props que este componente espera
interface TankProps {
  id: string;
  level: number;
}

// Estilos CSS inline para facilitar
// (Mais tarde, podemos mover isso para um arquivo CSS)
const tankStyle: React.CSSProperties = {
  border: '2px solid #555',
  borderRadius: '8px',
  width: '150px',
  height: '250px',
  margin: '10px',
  backgroundColor: '#333',
  display: 'flex',
  flexDirection: 'column', // Empilha os elementos verticalmente
  position: 'relative', // Chave para o preenchimento
  overflow: 'hidden', // Garante que o preenchimento não "vaze"
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '8px',
  textAlign: 'center',
  backgroundColor: '#444',
  color: 'white',
  zIndex: 3, // Garante que o título fique sobre o fluido
};

const levelPercentStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontSize: '28px',
  fontWeight: 'bold',
  color: 'white',
  zIndex: 3, // Fica sobre o fluido
  textShadow: '0 0 5px rgba(0,0,0,0.7)', // Sombra para legibilidade
};

// Este é o nosso componente
const Tank: React.FC<TankProps> = ({ id, level }) => {
  
  // Estilo dinâmico para o fluido (a parte azul)
  const fluidStyle: React.CSSProperties = {
    backgroundColor: '#1a62c4',
    height: `${level}%`, // A mágica acontece aqui!
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    transition: 'height 0.5s ease', // Animação suave
    zIndex: 2,
  };

  return (
    <div style={tankStyle}>
      <div style={titleStyle}>{id}</div>
      
      {/* O Fluido (nível) */}
      <div style={fluidStyle}></div>

      {/* O Texto do Nível (ex: 41.5%) */}
      <div style={levelPercentStyle}>
        {level !== undefined ? level.toFixed(1) : 'N/A'} 
      </div>
    </div>
  );
};

export default Tank;