import React from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  container: { padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' },
  header: { marginBottom: '40px' },
  title: { color: '#333', fontSize: '32px' },
  subtitle: { color: '#666', fontSize: '18px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  card: { padding: '30px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #eee' },
  cardTitle: { fontSize: '20px', fontWeight: 'bold', color: '#007bff', marginBottom: '10px' },
  cardDesc: { color: '#777', fontSize: '14px' },
  logoutBtn: { marginTop: '40px', padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('oem_token');
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Painel Administrativo</h1>
        <p style={styles.subtitle}>Bem-vindo ao sistema de gestão OEM Congelados</p>
      </div>

      <div style={styles.grid}>
        {/* Card 1: Gerenciar Viagens */}
        <div style={styles.card} onClick={() => navigate('/Admin/trips')}>
          <div style={styles.cardTitle}>Gerenciar Viagens</div>
          <p style={styles.cardDesc}>Visualize o histórico de fechamentos e relatórios.</p>
        </div>

        {/* Card 2: Gerenciar Usuários */}
        <div style={styles.card} onClick={() => navigate('/Admin/users')}>
          <div style={styles.cardTitle}>Gerenciar Usuários</div>
          <p style={styles.cardDesc}>Cadastre novos acessos e visualize a equipe.</p>
        </div>

        {/* Card 3: Nova Viagem (Atalho) */}
        <div style={styles.card} onClick={() => navigate('/closing')}>
          <div style={styles.cardTitle}>Lançar Viagem</div>
          <p style={styles.cardDesc}>Acesso rápido ao formulário de fechamento.</p>
        </div>

        {/* Card NOVO: Cadastros */}
        <div style={styles.card} onClick={() => navigate('/Admin/catalogs')}>
          <div style={styles.cardTitle}>Cadastros Gerais</div>
          <p style={styles.cardDesc}>Gerenciar Motoristas, Veículos e Rotas.</p>
        </div>

        {/* Card NOVO: Backup */}
        <div style={styles.card} onClick={() => navigate('/Admin/backup')}>
          <div style={styles.cardTitle}>Backup do Sistema</div>
          <p style={styles.cardDesc}>Salvar ou restaurar cópias de segurança.</p>
        </div>
        
      </div>
     

      <button style={styles.logoutBtn} onClick={handleLogout}>Sair do Sistema</button>
    </div>
  );
};

export default AdminDashboard;