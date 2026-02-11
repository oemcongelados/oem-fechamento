import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const ManageCatalogs = () => {
  const [activeTab, setActiveTab] = useState('drivers'); 
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null); 
  const [msg, setMsg] = useState('');

  // Busca dados dependendo da aba
  const fetchItems = async () => {
    const token = localStorage.getItem('oem_token');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Erro ao buscar itens:", err);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Função para mudar aba e limpar estados (Evita loop do useEffect)
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEditingItem(null); 
    setMsg('');           
  };

  // Salvar (Criar ou Editar)
  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('oem_token');
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (editingItem && editingItem.id) {
        data.id = editingItem.id;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/${activeTab}`, {
        method: 'POST', 
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setMsg('Salvo com sucesso!');
        fetchItems();
        setEditingItem(null); 
        e.target.reset();     
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg('Erro ao salvar (backend recusou).');
      }
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setMsg('Erro de conexão ao salvar.');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    window.scrollTo(0, 0); 
  };

  return (
    <Layout title="Cadastros Gerais">
      {/* Abas de Navegação */}
      <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <button 
            className={`btn ${activeTab === 'drivers' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => handleTabChange('drivers')}
        >
            Motoristas
        </button>
        <button 
            className={`btn ${activeTab === 'vehicles' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => handleTabChange('vehicles')}
        >
            Veículos
        </button>
        <button 
            className={`btn ${activeTab === 'routes' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => handleTabChange('routes')}
        >
            Rotas
        </button>
      </div>

      {/* Formulário */}
      <div className="card">
        <h3>{editingItem ? `Editar ${activeTab}` : `Novo ${activeTab}`}</h3>
        {msg && <p style={{color: 'green', fontWeight:'bold'}}>{msg}</p>}

        <form onSubmit={handleSave} key={editingItem ? editingItem.id : 'new'}>
            <div className="form-grid">
                {/* --- CAMPOS DE MOTORISTA --- */}
                {activeTab === 'drivers' && (
                    <>
                        <div>
                            <label>Nome do Motorista</label>
                            <input name="name" defaultValue={editingItem?.name} required />
                        </div>
                        <div>
                            <label>Telefone / Celular</label>
                            <input 
                                name="phone" 
                                placeholder="(XX) 99999-9999" 
                                defaultValue={editingItem?.phone} 
                            />
                        </div>
                    </>
                )}

                {/* --- CAMPOS DE ROTA --- */}
                {activeTab === 'routes' && (
                    <div>
                        <label>Nome da Rota</label>
                        <input name="name" defaultValue={editingItem?.name} required />
                    </div>
                )}

                {/* --- CAMPOS DE VEÍCULO --- */}
                {activeTab === 'vehicles' && (
                    <>
                        <div>
                            <label>Modelo</label>
                            <input name="model" defaultValue={editingItem?.model} required />
                        </div>
                        <div>
                            <label>Placa</label>
                            <input name="plate" defaultValue={editingItem?.plate} required />
                        </div>
                    </>
                )}
            </div>
            
            <div style={{marginTop: '20px', display:'flex', gap:'10px'}}>
                <button type="submit" className="btn btn-success">
                    {editingItem ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR'}
                </button>
                {editingItem && (
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                        CANCELAR EDIÇÃO
                    </button>
                )}
            </div>
        </form>
      </div>

      {/* Lista de Itens */}
      <div className="card">
        <h3>Cadastrados</h3>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
                <tr style={{textAlign:'left', background: '#f3f4f6'}}>
                    <th style={{padding:'10px'}}>Descrição</th>
                    
                    {/* Cabeçalho dinâmico */}
                    {activeTab === 'drivers' && <th style={{padding:'10px'}}>Telefone</th>}
                    {activeTab === 'vehicles' && <th style={{padding:'10px'}}>Placa</th>}
                    
                    <th style={{padding:'10px', width: '100px'}}>Ação</th>
                </tr>
            </thead>
            <tbody>
                {items.map(item => (
                    <tr key={item.id} style={{borderBottom: '1px solid #eee'}}>
                        <td style={{padding:'10px'}}>
                            {item.name || item.model} 
                        </td>

                        {/* Coluna dinâmica */}
                        {activeTab === 'drivers' && <td style={{padding:'10px'}}>{item.phone}</td>}
                        {activeTab === 'vehicles' && <td style={{padding:'10px'}}>{item.plate}</td>}
                        
                        <td style={{padding:'10px'}}>
                            <button className="btn btn-primary" style={{padding:'5px 10px', fontSize:'0.8rem'}} onClick={() => handleEdit(item)}>
                                Editar
                            </button>
                        </td>
                    </tr>
                ))}
                {items.length === 0 && <tr><td colSpan="3" style={{padding:'20px', textAlign:'center'}}>Nenhum registro encontrado.</td></tr>}
            </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default ManageCatalogs;