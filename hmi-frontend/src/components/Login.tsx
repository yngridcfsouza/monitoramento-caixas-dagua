import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WS_BASE = import.meta.env.VITE_WS_BASE as string

const Login: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${WS_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (!res.ok) {
        throw new Error('Credenciais inválidas')
      }

      const data = await res.json()
      localStorage.setItem('token', data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      flexDirection: 'column',
      backgroundColor: '#131418',
      color: '#fff'
    }}>
      <h1 style={{ marginBottom: '2rem' }}>HMI Login</h1>
      <form onSubmit={handleLogin} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem', 
        width: '300px',
        backgroundColor: '#1f2128',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="username">Usuário</label>
          <input 
            id="username"
            type="text" 
            placeholder="Ex: admin" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            style={{ 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #4a4d57',
              backgroundColor: '#2a2d36',
              color: '#fff'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="password">Senha</label>
          <input 
            id="password"
            type="password" 
            placeholder="Ex: admin" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            style={{ 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #4a4d57',
              backgroundColor: '#2a2d36',
              color: '#fff'
            }}
          />
        </div>

        {error && <p style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>{error}</p>}
        
        <button type="submit" style={{ 
          padding: '12px', 
          marginTop: '1rem',
          borderRadius: '4px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem'
        }}>
          Entrar
        </button>
      </form>
    </div>
  )
}

export default Login
