import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Layout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const token = localStorage.getItem('oem_token');
  const isAdmin = localStorage.getItem('oem_is_admin') === 'true';
  const userName = localStorage.getItem('oem_user_name') || 'Usuário';

  // Estados de Notificação
  const [notifications, setNotifications] = useState([]);
  const [showToast, setShowToast] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('oem_token');
    localStorage.removeItem('oem_is_admin');
    localStorage.removeItem('oem_user_name');
    navigate('/');
  };

  // --- LÓGICA DE DATA ---
  const [currentDate, setCurrentDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const formatCustomDate = (date) => {
    let weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = date.getDate();
    let month = date.toLocaleDateString('pt-BR', { month: 'long' });
    month = month.charAt(0).toUpperCase() + month.slice(1);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${weekday}, ${day} de ${month}. ${hours}h:${minutes}m.`;
  };

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // --- LÓGICA: Buscar Notificações ---
  useEffect(() => {
    if (token && !isAdmin) {
        const checkNotifs = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        setNotifications(data);
                        setShowToast(true);
                    }
                }
            } catch (error) {
                console.error("Erro notif:", error);
            }
        };
        checkNotifs();
    }
  }, [token, isAdmin, location.pathname]);

  const dismissNotification = async () => {
    setShowToast(false);
    try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/dismiss`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error("Erro ao limpar notif:", error);
    }
  };

  const homeLink = isAdmin ? "/admin" : "/closing";

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      
      {/* --- TOAST DE NOTIFICAÇÃO --- */}
      {showToast && (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#dcfce7',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '15px 20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            maxWidth: '90%',
            animation: 'slideDown 0.5s ease-out'
        }}>
            <div style={{fontSize: '2rem'}}>🎉</div>
            <div>
                <strong style={{color: '#15803d', display: 'block', marginBottom: '4px'}}>
                    Atenção, {userName}!
                </strong>
                <span style={{color: '#166534', fontSize: '0.9rem'}}>
                    {notifications.length === 1 
                        ? `Sua viagem para ${notifications[0].route} foi APROVADA!` 
                        : `Você tem ${notifications.length} fechamentos APROVADOS!`}
                </span>
            </div>
            <button 
                onClick={dismissNotification}
                style={{
                    background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#15803d', fontWeight: 'bold'
                }}
            >
                ✕
            </button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
            from { top: -100px; opacity: 0; }
            to { top: 20px; opacity: 1; }
        }
      `}</style>

      {/* BARRA DE NAVEGAÇÃO */}
      <nav className="navbar" style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1000px', height: '70px' }}>
            
            {/* Logo e Info */}
            <div style={{display:'flex', alignItems:'center', gap: '20px'}}>
                <Link to={homeLink} className="brand" style={{display: 'flex', alignItems: 'center'}}>
                  <img src="/Logo.png" alt="OEM Sales Logo" style={{ height: '50px', width: 'auto' }} />
                </Link>
                {token && (
                    <div style={{display: 'flex', flexDirection: 'column', lineHeight: '1.3'}}>
                        <span style={{fontWeight: 'bold', color: '#333', fontSize: '1rem'}}>{getGreeting()}, {userName}</span>
                        <span style={{color: '#666', fontSize: '0.85rem'}}>{formatCustomDate(currentDate)}</span>
                    </div>
                )}
            </div>
            
            {/* Botões */}
            {token && (
              <div className="nav-links" style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                
                {/* --- CORREÇÃO AQUI: Botão Lupa --- */}
                <button 
                    onClick={() => navigate('/search')} 
                    className="btn btn-secondary" 
                    title="Pesquisar Viagens"
                    style={{
                        padding: '0',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        borderRadius: '50%'
                    }}
                >
                    🔍
                </button>

                {isAdmin && location.pathname === '/closing' && (
                     <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{padding: '8px 16px', fontSize: '0.9rem', height: '40px'}}>Painel</button>
                )}
                
                <button onClick={handleLogout} className="btn btn-secondary" style={{padding: '8px 16px', fontSize: '0.9rem', height: '40px'}}>Sair</button>
              </div>
            )}
        </div>
      </nav>

      {/* CONTEÚDO */}
      <main className="container" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '20px', flex: 1 }}>
        {title && <h2 style={{marginTop: '20px', marginBottom: '20px', color: '#333'}}>{title}</h2>}
        {children}
      </main>
    </div>
  );
};

export default Layout;