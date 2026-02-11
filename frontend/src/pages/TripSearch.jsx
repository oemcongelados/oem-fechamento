import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const TripSearch = () => {
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  // Verifica permissão (algumas ações só aparecem para Admin)
  const isAdmin = localStorage.getItem('oem_is_admin') === 'true';

  // ===============================
  // BUSCA DE VIAGENS
  // ===============================
  useEffect(() => {
    let isMounted = true;

    const loadTrips = async () => {
      const token = localStorage.getItem('oem_token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trips`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
             localStorage.removeItem('oem_token');
             navigate('/');
             return;
        }

        const data = await res.json();
        if (isMounted) {
          setTrips(data);
        }
      } catch (error) {
        console.error('Erro ao buscar viagens:', error);
      }
    };

    loadTrips();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // ===============================
  // AÇÃO DE APROVAR (ADMIN)
  // ===============================
  const handleApprove = async (id) => {
    if (!window.confirm('ATENÇÃO: Aprovar este fechamento bloqueará edições. Confirmar?')) {
      return;
    }

    const token = localStorage.getItem('oem_token');

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/trips/${id}/approve`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        alert('Erro: ' + (err.error || 'Erro desconhecido'));
        return;
      }

      alert('Fechamento aprovado com sucesso!');

      // Recarrega a lista
      const reloadRes = await fetch(`${import.meta.env.VITE_API_URL}/api/trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reloadData = await reloadRes.json();
      setTrips(reloadData);
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      alert('Erro de conexão.');
    }
  };

  // ===============================
  // CÁLCULO DE SALDO
  // ===============================
  const calculateBalance = (t) => {
    const entries = (t.value_withdraw || 0) + (t.value_received || 0);
    const expenses =
      (t.expense_fuel || 0) +
      (t.expense_daily || 0) +
      (t.expense_assistant || 0) +
      (t.expense_toll || 0) +
      (t.expense_other || 0);

    return entries - expenses;
  };

  // ===============================
  // FILTRO
  // ===============================
  const filteredTrips = trips.filter(
    (t) =>
      (t.driver && t.driver.toLowerCase().includes(filter.toLowerCase())) ||
      (t.route && t.route.toLowerCase().includes(filter.toLowerCase())) ||
      (t.vehicle && t.vehicle.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <Layout title="Gerenciar Viagens">
      
      {/* BARRA DE PESQUISA */}
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

      {/* LISTA DE CARDS (Substituindo a Tabela) */}
      <div style={{ display: 'grid', gap: '15px' }}>
        
        {filteredTrips.map((trip) => {
            const balance = calculateBalance(trip);
            const isApproved = trip.approved === true;

            return (
                <div key={trip.id} className="card" style={{
                    backgroundColor: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid #eee'
                }}>
                    {/* LINHA 1: Cabeçalho do Card (Data e Status) */}
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                        <div>
                            <span style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#333'}}>
                                {new Date(trip.start_date).toLocaleDateString()}
                            </span>
                            <div style={{fontSize: '0.75rem', color: '#888'}}>ID: {trip.id.slice(-6)}</div>
                        </div>
                        
                        {/* Badge de Status */}
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
                            <div style={{fontWeight: 'bold'}}>{trip.driver}</div>
                        </div>
                        <div>
                            <div style={{fontSize: '0.8rem', color: '#666'}}>Rota</div>
                            <div style={{fontWeight: 'bold'}}>{trip.route}</div>
                        </div>
                    </div>

                    {/* LINHA 3: Saldo e Botões (Rodapé do Card) */}
                    <div style={{
                        borderTop: '1px solid #f3f4f6', 
                        paddingTop: '15px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        
                        {/* Saldo */}
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

                        {/* Botões de Ação */}
                        <div style={{display: 'flex', gap: '8px'}}>
                            {/* Botão Resumo (Sempre visível) */}
                            <button 
                                onClick={() => navigate(`/summary/${trip.id}`)}
                                style={{
                                    backgroundColor: '#3b82f6', color: 'white', border: 'none', 
                                    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'
                                }}
                                title="Ver Resumo"
                            >
                                📄
                            </button>

                            {/* Botão Editar (Apenas se não aprovado) */}
                            {!isApproved && (
                                <button 
                                    onClick={() => navigate(`/closing/${trip.id}`)}
                                    style={{
                                        backgroundColor: '#f59e0b', color: 'white', border: 'none', 
                                        padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'
                                    }}
                                    title="Editar"
                                >
                                    ✏️
                                </button>
                            )}

                            {/* Botão Aprovar (Apenas Admin) */}
                            {isAdmin && !isApproved && (
                                <button 
                                    onClick={() => handleApprove(trip.id)}
                                    style={{
                                        backgroundColor: '#10b981', color: 'white', border: 'none', 
                                        padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'
                                    }}
                                    title="Aprovar"
                                >
                                    ✅
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        })}

        {filteredTrips.length === 0 && (
            <div style={{textAlign: 'center', padding: '40px', color: '#888', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                Nenhuma viagem encontrada.
            </div>
        )}

      </div>
    </Layout>
  );
};

export default TripSearch;