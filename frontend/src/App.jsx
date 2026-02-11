import React, { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import TripClosing from './pages/TripClosing';
import AdminDashboard from './pages/AdminDashboard';
import ManageUsers from './pages/ManageUsers';
import ManageTrips from './pages/ManageTrips';
import ManageCatalogs from './pages/ManageCatalogs';
import BackupRestore from './pages/BackupRestore';
import TripSearch from './pages/TripSearch';
import TripSummary from './pages/TripSummary';

// --- CONFIGURAÇÃO DE TEMPO ---
// MODO TESTE: 5 segundos (5 * 1000)
// MODO PRODUÇÃO: 10 minutos (10 * 60 * 1000)


const TIMEOUT_MS = 10 * 60 * 1000;
// const TIMEOUT_MS = 10 * 60 * 1000; // <-- Depois de testar, descomente esta linha e comente a de cima

// --- COMPONENTE DE LOGOUT AUTOMÁTICO ---
const AutoLogout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    // Só executa se ainda estiver logado
    const token = localStorage.getItem('oem_token');
    
    if (token) {
      console.log("⏰ Tempo esgotado! Realizando Logout...");

      // 1. Limpa tudo
      localStorage.clear(); // Limpa token, admin, user, drafts, tudo.
      
      // 2. Avisa
      alert("⚠️ Sessão expirada por inatividade. Faça login novamente.");
      
      // 3. Chuta para login
      navigate('/', { replace: true });
      window.location.reload(); // Força um recarregamento para garantir limpeza total de estados
    }
  }, [navigate]);

  useEffect(() => {
    let timer;

    const resetTimer = () => {
      // Só reseta se estiver logado
      if (localStorage.getItem('oem_token')) {
        // console.log("Atividade detectada. Resetando timer..."); // Descomente se quiser ver no console cada movimento
        clearTimeout(timer);
        timer = setTimeout(handleLogout, TIMEOUT_MS);
      }
    };

    // Lista de eventos que consideram o usuário "ativo"
    const events = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart', 'change'];

    // Adiciona os ouvintes
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Inicia a contagem
    resetTimer();

    // Limpeza ao sair da tela
    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [handleLogout]);

  return children;
};

// Guarda de Rota (Usuário Logado)
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('oem_token');
  return token ? children : <Navigate to="/" />;
};

// Guarda de Rota (Apenas Admin)
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('oem_token');
  const isAdmin = localStorage.getItem('oem_is_admin') === 'true'; 

  if (!token) return <Navigate to="/" />;
  if (!isAdmin) return <Navigate to="/closing" />;

  return children;
};

function App() {
  return (
    <BrowserRouter>
      {/* O AutoLogout deve estar DENTRO do BrowserRouter para o navigate funcionar */}
      <AutoLogout>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Rotas de Usuário */}
          <Route path="/closing" element={<PrivateRoute><TripClosing /></PrivateRoute>} />
          <Route path="/closing/:id" element={<PrivateRoute><TripClosing /></PrivateRoute>} />
          <Route path="/search" element={<PrivateRoute><TripSearch /></PrivateRoute>} />
          <Route path="/summary/:id" element={<PrivateRoute><TripSummary /></PrivateRoute>} />

          {/* Rotas de Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
          <Route path="/admin/trips" element={<AdminRoute><ManageTrips /></AdminRoute>} />
          <Route path="/admin/backup" element={<AdminRoute><BackupRestore /></AdminRoute>} />
          <Route path="/admin/catalogs" element={<AdminRoute><ManageCatalogs /></AdminRoute>} />
           
        </Routes>
      </AutoLogout>
    </BrowserRouter>
  );
}

export default App;