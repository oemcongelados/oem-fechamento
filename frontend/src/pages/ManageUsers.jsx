import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const styles = {
  container: { 
    padding: '20px', 
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", 
    maxWidth: '1200px', 
    margin: '0 auto' 
  },
  
  // Layout Principal (Responsivo)
  contentWrapper: { 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '30px',
    alignItems: 'flex-start' 
  },
  
  // --- ÁREA DO FORMULÁRIO (ESQUERDA) ---
  formSection: { 
    flex: '1 1 320px', // Largura base um pouco maior
    backgroundColor: 'white', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', // Sombra mais suave e moderna
    border: '1px solid #f0f0f0',
    position: 'sticky',
    top: '20px' 
  },

  formTitle: {
    margin: '0 0 20px 0',
    color: '#1e293b',
    fontSize: '1.25rem',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '10px'
  },

  inputGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' },
  input: { 
    width: '100%', 
    padding: '12px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  
  // Checkbox estilizado
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    marginBottom: '20px'
  },

  // Botões
  btn: { width: '100%', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: '0.2s' },
  btnSave: { backgroundColor: '#2563eb', color: 'white' }, // Azul vibrante
  btnCancel: { backgroundColor: '#94a3b8', color: 'white', marginTop: '10px' },

  // --- ÁREA DA LISTA (DIREITA) ---
  listSection: {
    flex: '2 1 400px', 
    minWidth: '0' 
  },

  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },

  // GRID DE CARDS
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', // Cards responsivos
    gap: '20px'
  },

  // --- CARD VISUAL ---
  userCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Centralizado
    textAlign: 'center',
    position: 'relative',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },

  // Avatar com Inicial
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff', // Azul bem claro
    color: '#2563eb', // Azul texto
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '15px',
    border: '2px solid #dbeafe'
  },

  cardName: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '5px'
  },

  // Badges (Etiquetas)
  badge: { 
    padding: '4px 12px', 
    borderRadius: '20px', 
    fontSize: '0.75rem', 
    fontWeight: 'bold', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '20px',
    display: 'inline-block'
  },
  badgeAdmin: { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }, // Verde
  badgeUser: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }, // Cinza

  // Botões do Card
  actionButtons: {
    display: 'flex',
    width: '100%',
    gap: '10px',
    marginTop: 'auto' // Empurra para o fundo
  },
  
  actionBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px'
  },
  btnEdit: { backgroundColor: '#fef3c7', color: '#b45309' }, // Amarelo
  btnDelete: { backgroundColor: '#fee2e2', color: '#b91c1c' } // Vermelho
};

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  
  const [userData, setUserData] = useState({ username: '', password: '', is_Admin: false });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  // --- BUSCAR USUÁRIOS ---
  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('oem_token');
      if (!token) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
          localStorage.removeItem('oem_token');
          navigate('/');
          return;
        }
        setUsers(await response.json());
      } catch (error) {
        console.error("Erro busca:", error);
      }
    };
    fetchUsers();
  }, [navigate, refreshKey]);

  // --- SALVAR ---
  const handleSave = async (e) => {
    e.preventDefault();
    setMsg({ type: 'loading', text: 'Salvando...' });
    
    const token = localStorage.getItem('oem_token');
    const url = editingId 
        ? `${import.meta.env.VITE_API_URL}/api/users/${editingId}` 
        : `${import.meta.env.VITE_API_URL}/api/register`;
    const method = editingId ? 'PUT' : 'POST';

    const payload = {
        username: userData.username,
        password: userData.password,
        isAdmin: userData.is_Admin 
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setMsg({ type: 'success', text: editingId ? 'Atualizado com sucesso!' : 'Cadastrado com sucesso!' });
            resetForm();
            setRefreshKey(old => old + 1);
        } else {
            setMsg({ type: 'error', text: data.error || 'Erro ao salvar.' });
        }
    } catch (error) {
        console.error("Erro save:", error);
        setMsg({ type: 'error', text: 'Erro de conexão.' });
    }
  };

  // --- EXCLUIR ---
  const handleDelete = async (id) => {
    if(!window.confirm("Tem certeza que deseja remover este usuário?")) return;
    const token = localStorage.getItem('oem_token');
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setRefreshKey(old => old + 1);
        else alert("Erro ao excluir.");
    } catch (error) {
        console.error("Erro delete:", error);
        alert("Erro de conexão.");
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    const AdminStatus = user.isAdmin || user.is_admin || user.IsAdmin || false;
    setUserData({ username: user.username, password: '', is_Admin: AdminStatus });
    setMsg({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setUserData({ username: '', password: '', is_Admin: false });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  return (
    <Layout title="Gerenciar Equipe">
      <div style={styles.container}>
        
        <div style={styles.contentWrapper}>
          
          {/* --- FORMULÁRIO --- */}
          <div style={styles.formSection}>
            <h3 style={styles.formTitle}>
                {editingId ? '✏️ Editar Acesso' : '👤 Novo Cadastro'}
            </h3>
            
            {msg.text && (
                <div style={{
                    marginBottom: '15px', padding: '10px', borderRadius: '6px', fontSize: '14px', textAlign: 'center', fontWeight: 'bold',
                    color: msg.type === 'error' ? '#dc2626' : '#166534',
                    backgroundColor: msg.type === 'error' ? '#fee2e2' : '#dcfce7',
                }}>
                    {msg.text}
                </div>
            )}
            
            <form onSubmit={handleSave}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome de Usuário</label>
                <input 
                  type="text" 
                  placeholder="Ex: thiago.silva"
                  style={styles.input} 
                  value={userData.username}
                  onChange={(e) => setUserData({...userData, username: e.target.value})}
                  required
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Senha {editingId && <span style={{fontWeight:'normal', fontSize:'0.8rem', color:'#94a3b8'}}>(Opcional na edição)</span>}
                </label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  style={styles.input} 
                  value={userData.password}
                  onChange={(e) => setUserData({...userData, password: e.target.value})}
                  required={!editingId}
                />
              </div>

              <label style={styles.checkboxContainer}>
                <input 
                  type="checkbox" 
                  checked={!!userData.is_Admin}
                  onChange={(e) => setUserData({...userData, is_Admin: e.target.checked})}
                  style={{width: '20px', height: '20px', accentColor: '#2563eb'}}
                />
                <span style={{color: '#334155', fontWeight: '500'}}>Acesso Administrador</span>
              </label>

              <button type="submit" style={{...styles.btn, ...styles.btnSave}}>
                {editingId ? 'SALVAR MUDANÇAS' : 'CADASTRAR USUÁRIO'}
              </button>

              {editingId && (
                <button type="button" style={{...styles.btn, ...styles.btnCancel}} onClick={resetForm}>
                    CANCELAR
                </button>
              )}
            </form>
          </div>

          {/* --- LISTA DE CARDS --- */}
          <div style={styles.listSection}>
            <div style={styles.listHeader}>
                <h3 style={{margin:0, color: '#333'}}>Membros da Equipe</h3>
                <span style={{background: '#e2e8f0', padding: '5px 12px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569'}}>
                    {users.length} Total
                </span>
            </div>
            
            <div style={styles.cardsGrid}>
              {users.map((u) => {
                const IsAdmin = u.isAdmin || u.is_admin || u.IsAdmin || false;
                const initial = u.username ? u.username.charAt(0).toUpperCase() : '?';
                
                return (
                  <div key={u.id} style={styles.userCard}>
                    
                    {/* Avatar Visual */}
                    <div style={styles.avatar}>
                        {initial}
                    </div>

                    <div style={styles.cardName}>{u.username}</div>
                    
                    <span style={{...styles.badge, ...(IsAdmin ? styles.badgeAdmin : styles.badgeUser)}}>
                        {IsAdmin ? '👑 Admin' : '👤 Usuário'}
                    </span>

                    <div style={styles.actionButtons}>
                        <button 
                            style={{...styles.actionBtn, ...styles.btnEdit}} 
                            onClick={() => handleEdit(u)}
                            title="Editar Dados"
                        >
                            ✏️ Editar
                        </button>
                        <button 
                            style={{...styles.actionBtn, ...styles.btnDelete}} 
                            onClick={() => handleDelete(u.id)}
                            title="Remover Usuário"
                        >
                            🗑️ Excluir
                        </button>
                    </div>
                  </div>
                );
              })}
              
              {users.length === 0 && (
                <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', gridColumn: '1 / -1', backgroundColor: '#fff', borderRadius: '12px', border: '2px dashed #e2e8f0'}}>
                    Nenhum usuário encontrado.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default ManageUsers;