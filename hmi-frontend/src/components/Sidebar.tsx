import React from 'react';
import { NavLink } from 'react-router-dom';
import logoUrl from '../assets/qhy-logo.svg';

const sidebarHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px 16px',
  borderBottom: '1px solid #2d3138',
  marginBottom: '12px',
};

const logoStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
};

const brandStyle: React.CSSProperties = {
  fontWeight: 800,
  letterSpacing: '0.6px',
  color: '#eaeaea',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  paddingTop: '8px',
};

const linkStyle: React.CSSProperties = {
  display: 'block',
  padding: '8px 10px',
  borderRadius: '8px',
  color: '#cfd3da',
  textDecoration: 'none',
  fontWeight: 600,
};

const activeStyle: React.CSSProperties = {
  ...linkStyle,
  backgroundColor: '#2a2f37',
  color: '#ffffff',
  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.35)',
};

const Sidebar: React.FC = () => {
  return (
    <div>
      <div style={sidebarHeaderStyle}>
        <img src={logoUrl} alt="QHY Tech Logo" style={logoStyle} />
        <div style={brandStyle}>QHY Tech</div>
      </div>
      <nav style={navStyle}>
        <NavLink
          to="/dashboard"
          style={({ isActive }) => (isActive ? activeStyle : linkStyle)}
          end
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/alertas"
          style={({ isActive }) => (isActive ? activeStyle : linkStyle)}
          end
        >
          Alertas e avisos
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;