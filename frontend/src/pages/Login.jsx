import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  container: { 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontFamily: 'Arial, sans-serif',
    
    // Configuração do Background (Imagem)
    backgroundImage: 'url(/plano.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  card: { 
    width: '90%', 
    maxWidth: '340px', 
    padding: '35px 30px', 
    
    // Efeito Glassmorphism
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
    backdropFilter: 'blur(10px)', 
    WebkitBackdropFilter: 'blur(10px)', 
    border: '1px solid rgba(255, 255, 255, 0.2)', 
    
    borderRadius: '12px', 
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' 
  },
  title: { 
    textAlign: 'center', 
    marginBottom: '25px', 
    color: '#1d0544', 
    fontWeight: 'bold',
    fontSize: '1.5rem'
  },
  input: { 
    width: '100%', 
    padding: '12px 15px', 
    marginBottom: '15px', 
    borderRadius: '6px', 
    border: 'none', 
    backgroundColor: 'rgba(255,255,255,0.8)', 
    boxSizing: 'border-box',
    fontSize: '1rem',
    outline: 'none'
  },
  
  // --- NOVO ESTILO: Wrapper da Senha ---
  passwordWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: '15px'
  },
  // --- NOVO ESTILO: Botão do Olho ---
  eyeButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    color: '#666',
    padding: '5px',
    display: 'flex',
    alignItems: 'center'
  },

  button: { width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s', fontSize: '1rem' },
  buttonDisabled: { width: '100%', padding: '12px', backgroundColor: '#5a6268', color: '#ccc', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontWeight: 'bold', fontSize: '1rem' },
  
  error: { color: '#d32f2f', backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '4px', fontSize: '14px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' },

  progressContainer: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.3)', 
    borderRadius: '4px',
    marginTop: '20px',
    overflow: 'hidden',
    position: 'relative'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00c853', 
    borderRadius: '4px',
    width: '50%',
    position: 'absolute',
    animation: 'loading 1.5s infinite ease-in-out'
  }
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 1. Estado para controlar visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('oem_token', data.token);
        localStorage.setItem('oem_is_admin', data.isAdmin); 
        localStorage.setItem('oem_user_name', data.user);
        
        setTimeout(() => {
            if (data.isAdmin) {
                navigate('/Admin'); 
            } else {
                navigate('/closing'); 
            }
        }, 800); 

      } else {
        setError(data.error || 'Falha no login');
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setError('Erro de conexão com o servidor');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes loading {
            0% { left: -40%; }
            100% { left: 100%; }
          }
          input::placeholder {
            color: #888;
          }
        `}
      </style>

      <div style={styles.card}>
        <h2 style={styles.title}>OEM Congelados</h2>
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          {/* Input de Usuário */}
          <input 
            type="text" 
            placeholder="Usuário" 
            style={styles.input} 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />

          {/* Wrapper da Senha para Posicionamento */}
          <div style={styles.passwordWrapper}>
            <input 
              // 2. Alterna entre 'text' e 'password'
              type={showPassword ? "text" : "password"} 
              placeholder="Senha" 
              style={{...styles.input, marginBottom: 0}} // Remove margem interna pois o wrapper já tem
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            {/* 3. Botão do Olho (toggle) */}
            <button
              type="button" // Importante ser type="button" para não submeter o form
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              title={showPassword ? "Esconder senha" : "Ver senha"}
              disabled={loading}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          
          <button 
            type="submit" 
            style={loading ? styles.buttonDisabled : styles.button}
            disabled={loading}
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR'}
          </button>
        </form>

        {loading && (
            <div style={styles.progressContainer}>
                <div style={styles.progressBar}></div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Login;