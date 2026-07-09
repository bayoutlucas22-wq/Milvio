import React, { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (user.toLowerCase() === 'milvio' && pass === 'milvio') {
      onLogin()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, fontFamily: 'system-ui, sans-serif'
    }}>
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-10px); }
            40%, 80% { transform: translateX(10px); }
          }
          .shake-anim { animation: shake 0.4s ease-in-out; }
          .login-input {
            width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155;
            background: #1e293b; color: #fff; font-size: 16px; margin-bottom: 16px;
            box-sizing: border-box; outline: none; transition: border-color 0.2s;
          }
          .login-input:focus { border-color: #3b82f6; }
          .login-btn {
            width: 100%; padding: 14px; border-radius: 8px; border: none;
            background: #3b82f6; color: #fff; font-size: 16px; font-weight: bold;
            cursor: pointer; transition: background 0.2s;
          }
          .login-btn:hover { background: #2563eb; }
        `}
      </style>

      <div 
        className={shake ? 'shake-anim' : ''}
        style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
          padding: '40px', width: '100%', maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: '#3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', margin: '0 auto 16px' }}>M</div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '24px' }}>Milvio Dashboard</h1>
          <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>Área Restrita - Autenticação Necessária</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Usuário</label>
            <input 
              className="login-input" 
              type="text" 
              placeholder="Digite seu usuário" 
              value={user} 
              onChange={e => { setUser(e.target.value); setError(false) }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Senha</label>
            <input 
              className="login-input" 
              type="password" 
              placeholder="Digite sua senha" 
              value={pass} 
              onChange={e => { setPass(e.target.value); setError(false) }}
            />
          </div>
          
          {error && (
            <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
              Usuário ou senha incorretos.
            </div>
          )}

          <button type="submit" className="login-btn">Entrar</button>
        </form>
      </div>
    </div>
  )
}
