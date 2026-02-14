import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const ManageTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();
  
  const isAdmin = localStorage.getItem('oem_is_admin') === 'true';

  // 1. Busca Dados
  const fetchTrips = useCallback(async () => {
    const token = localStorage.getItem('oem_token');
    if (!token) { navigate('/'); return; }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
          localStorage.removeItem('oem_token');
          navigate('/');
          return;
      }
      
      const data = await response.json();
      // Proteção: Garante que 'data' seja um array
      setTrips(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error("Erro ao buscar viagens:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // --- AÇÃO APROVAR (Admin) ---
  const handleApprove = async (id) => {
    if (!id) return; // Proteção contra ID nulo

    // 1. Localiza a viagem específica na lista para verificar o romaneio
    const currentTrip = trips.find(t => (t.id === id || t._id === id));
    
    let romaneioToSend = '';

    // 2. Verifica se já existe romaneio preenchido
    if (currentTrip && currentTrip.romaneio && currentTrip.romaneio.toString().trim() !== '') {
        // CASO A: Já tem romaneio, pede apenas confirmação
        const confirm = window.confirm(
            `ATENÇÃO: Aprovar bloqueará edições.\n\n` +
            `O Romaneio já está registrado como: ${currentTrip.romaneio}\n\n` +
            `Deseja confirmar a aprovação?`
        );
        if (!confirm) return;
        romaneioToSend = currentTrip.romaneio;
    } else {
        // CASO B: Não tem romaneio, pede para digitar
        const input = window.prompt("ATENÇÃO: Aprovar bloqueará edições.\n\nPor favor, insira o número do ROMANEIO para confirmar:");
        if (input === null) return; // Cancelou
        romaneioToSend = input;
    }

    const token = localStorage.getItem('oem_token');
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trips/${id}/approve`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ romaneio: romaneioToSend })
        });

        if (res.ok) {
            alert("Fechamento aprovado com sucesso!");
            fetchTrips();
        } else {
            const errorData = await res.json();
            alert("Erro ao aprovar: " + (errorData.error || "Erro desconhecido"));
        }
    } catch (error) { 
        console.error("Erro na aprovação:", error);
        alert("Erro de conexão."); 
    }
  };

  // --- AÇÃO REABRIR (Admin) ---
  const handleReopen = async (id) => {
    if (!id) return;
    if(!window.confirm("Deseja REABRIR esta viagem para edição?")) return;

    const token = localStorage.getItem('oem_token');
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trips/${id}/reopen`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            alert("Viagem reaberta com sucesso!");
            fetchTrips();
        } else {
            const err = await res.json();
            alert("Erro: " + err.error);
        }
    } catch (error) { 
        console.error("Erro ao reabrir:", error);
        alert("Erro de conexão."); 
    }
  };

  // --- AÇÃO EXCLUIR (Admin) ---
  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Tem certeza que deseja EXCLUIR este registro permanentemente?")) {
        return;
    }

    const token = localStorage.getItem('oem_token');
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trips/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
            alert("Registro excluído com sucesso!");
            fetchTrips();
        } else {
            const err = await res.json();
            alert("Erro ao excluir: " + (err.error || "Erro desconhecido"));
        }
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro de conexão.");
    }
  };

  // --- CÁLCULO DE SALDO ---
  const calculateBalance = (t) => {
    const entries = (t.value_withdraw || 0) + (t.value_received || 0);
    const expenses = (t.expense_fuel || 0) + (t.expense_daily || 0) + 
                     (t.expense_assistant || 0) + (t.expense_toll || 0) + 
                     (t.expense_other || 0);
    return entries - expenses;
  };

  // Filtro Seguro (Proteção contra nulos)
  const filteredTrips = trips.filter(t => {
    const searchTerm = filter.toLowerCase();
    const driver = t.driver ? t.driver.toLowerCase() : '';
    const route = t.route ? t.route.toLowerCase() : '';
    const vehicle = t.vehicle ? t.vehicle.toLowerCase() : '';

    return driver.includes(searchTerm) || route.includes(searchTerm) || vehicle.includes(searchTerm);
  });

  return (
    <Layout title="Gerenciar Viagens">
      
      {/* BARRA DE FILTRO */}
      <div style={{marginBottom: '20px'}}>
        <input
          type="text"
          placeholder="🔍 Filtrar por Motorista, Rota ou Veículo..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
        />
      </div>

      {/* LISTA DE CARDS */}
      <div style={{ display: 'grid', gap: '15px' }}>
        
        {loading ? (
             <div style={{textAlign:'center', padding:'20px', color: '#666'}}>Carregando...</div>
        ) : filteredTrips.length === 0 ? (
             <div style={{textAlign: 'center', padding: '40px', color: '#888', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                Nenhuma viagem encontrada.
             </div>
        ) : (
             filteredTrips.map((trip, index) => {
                const balance = calculateBalance(trip);
                const isApproved = trip.approved === true;
                
                // --- CORREÇÃO CRUCIAL: ID SEGURO ---
                // Usa trip.id se existir, senão usa trip._id, senão usa o índice (evita crash)
                const safeId = trip.id || trip._id || `temp-${index}`;
                const displayId = typeof safeId === 'string' ? safeId.slice(-6) : '---';

                // Tratamento seguro de data
                let dateDisplay = 'Data Inválida';
                try {
                    if (trip.start_date) {
                         // Garante que a data seja lida corretamente mesmo se vier como string UTC
                         const dateObj = new Date(trip.start_date);
                         if (!isNaN(dateObj)) {
                             dateDisplay = dateObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                         }
                    }
                } catch (e) { console.log(e); }

                return (
                    <div key={safeId} className="card" style={{
                        backgroundColor: 'white',
                        padding: '15px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: '1px solid #eee'
                    }}>
                        {/* LINHA 1: Cabeçalho do Card */}
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                            <div>
                                <span style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#333'}}>
                                    {dateDisplay}
                                </span>
                                <div style={{fontSize: '0.75rem', color: '#888'}}>ID: {displayId}</div>
                            </div>
                            
                            <div style={{
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem', 
                                fontWeight: 'bold',
                                backgroundColor: isApproved ? '#d1fae5' : '#fef3c7',
                                color: isApproved ? '#065f46' : '#92400e',
                                border: `1px solid ${isApproved ? '#a7f3d0' : '#fde68a'}`
                            }}>
                                {isApproved ? '✅ Aprovado' : '⏳ Aberto'}
                            </div>
                        </div>

                        {/* LINHA 2: Informações Principais */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px'}}>
                            <div>
                                <div style={{fontSize: '0.8rem', color: '#666'}}>Motorista</div>
                                <div style={{fontWeight: 'bold'}}>{trip.driver || '---'}</div>
                            </div>
                            <div>
                                <div style={{fontSize: '0.8rem', color: '#666'}}>Rota</div>
                                <div style={{fontWeight: 'bold'}}>{trip.route || '---'}</div>
                            </div>
                        </div>

                        {/* LINHA 3: Saldo e Botões */}
                        <div style={{
                            borderTop: '1px solid #f3f4f6', 
                            paddingTop: '15px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            
                            <div>
                                <div style={{fontSize: '0.8rem', color: '#666'}}>Saldo Final</div>
                                <div style={{
                                    fontWeight: 'bold', 
                                    fontSize: '1.1rem',
                                    color: balance >= 0 ? '#16a34a' : '#dc2626'
                                }}>
                                    {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                            </div>

                            <div style={{display: 'flex', gap: '8px'}}>
                                <button 
                                    onClick={() => navigate(`/summary/${safeId}`)}
                                    title="Ver Resumo"
                                    style={{backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                                >
                                    📄
                                </button>

                                {!isApproved && (
                                    <button 
                                        onClick={() => navigate(`/closing/${safeId}`)}
                                        title="Editar"
                                        style={{backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                                    >
                                        ✏️
                                    </button>
                                )}

                                {isAdmin && !isApproved && (
                                    <button 
                                        onClick={() => handleApprove(safeId)}
                                        title="Aprovar"
                                        style={{backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                                    >
                                        ✅
                                    </button>
                                )}

                                {isAdmin && isApproved && (
                                    <button 
                                        onClick={() => handleReopen(safeId)}
                                        title="Reabrir / Desbloquear"
                                        style={{backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                                    >
                                        🔓
                                    </button>
                                )}

                                {isAdmin && (
                                    <button 
                                        onClick={() => handleDelete(safeId)}
                                        title="Excluir"
                                        style={{backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </Layout>
  );
};

export default ManageTrips;