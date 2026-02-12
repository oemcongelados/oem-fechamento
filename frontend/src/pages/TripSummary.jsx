import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const TripSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      const token = localStorage.getItem('oem_token');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trips/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            setTrip(await res.json());
        } else {
            alert("Erro ao carregar resumo.");
            navigate('/search');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id, navigate]);

  if (loading || !trip) return (
    <Layout>
        <div style={{textAlign:'center', marginTop:'50px', color: '#666'}}>
            Carregando detalhes do lançamento...
        </div>
    </Layout>
  );

  const totalEntries = (trip.value_withdraw || 0) + (trip.value_received || 0);
  
  const totalExpenses = (
    (trip.expense_fuel || 0) + 
    (trip.expense_daily || 0) + 
    (trip.expense_assistant || 0) + 
    (trip.expense_toll || 0) + 
    (trip.expense_other || 0)
  );

  const balance = totalEntries - totalExpenses; 
  const kmTotal = (trip.km_end || 0) - (trip.km_start || 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <Layout title="Resumo Analítico">
      <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
        
        {/* CABEÇALHO */}
        <div style={{
            borderBottom: '2px solid #eee', 
            paddingBottom: '20px', 
            marginBottom: '20px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
        }}>
            <div>
                <h2 style={{margin: 0, color: '#333'}}>Lançamento de Viagem</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span style={{color: '#888', fontSize: '0.9rem'}}>ID: {trip.id}</span>
                        {trip.approved && (
                            <span style={{backgroundColor:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'4px', fontSize:'0.75rem', border:'1px solid #bbf7d0', fontWeight: 'bold'}}>
                                ✅ APROVADO
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div style={{display: 'flex', gap: '20px', textAlign: 'right'}}>
                <div>
                    <div style={{fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Saída</div>
                    <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#333'}}>
                        {new Date(trip.start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                    </div>
                </div>
                <div>
                    <div style={{fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Chegada</div>
                    <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#333'}}>
                        {new Date(trip.end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                    </div>
                </div>
            </div>
        </div>

        {/* 1. LOGÍSTICA */}
        <div style={{backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
            <h4 style={{marginTop: 0, color: '#555', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px'}}>🚚 Logística e Rota</h4>
            <div className="form-grid">
                <div><strong>Motorista:</strong><br/>{trip.driver}</div>
                <div><strong>Veículo:</strong><br/>{trip.vehicle}</div>
                <div><strong>Rota:</strong><br/>{trip.route}</div>

                {(trip.romaneio || trip.approved) && (
                    <div>
                        <strong>Romaneio:</strong><br/>
                        <span style={{
                            backgroundColor: '#e5e7eb', 
                            color: '#374151',
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            border: '1px solid #d1d5db'
                        }}>
                            {trip.romaneio || '---'}
                        </span>
                    </div>
                )}
            </div>
        </div>

        {/* 2. ODÔMETRO */}
        <div style={{backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
            <h4 style={{marginTop: 0, color: '#555', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px'}}>⛽ Quilometragem</h4>
            <div style={{display: 'flex', justifyContent: 'space-between', textAlign: 'center'}}>
                <div>
                    <span style={{color: '#666', fontSize:'0.9rem'}}>KM Saída</span>
                    <div style={{fontWeight:'bold'}}>{trip.km_start}</div>
                </div>
                <div>
                    <span style={{color: '#666', fontSize:'0.9rem'}}>KM Chegada</span>
                    <div style={{fontWeight:'bold'}}>{trip.km_end}</div>
                </div>
                <div>
                    <span style={{color: '#2563eb', fontSize:'0.9rem', fontWeight:'bold'}}>TOTAL PERCORRIDO</span>
                    <div style={{fontWeight:'bold', color: '#2563eb', fontSize: '1.2rem'}}>{kmTotal} km</div>
                </div>
            </div>
        </div>

        {/* 3. FINANCEIRO */}
        <div style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px', 
            marginBottom: '20px'
        }}>
            
            {/* ENTRADAS */}
            <div style={{border: '1px solid #d1fae5', borderRadius: '8px', padding: '15px', backgroundColor: '#f0fdf4'}}>
                <h4 style={{marginTop: 0, color: '#166534', borderBottom: '1px solid #bbf7d0', paddingBottom: '8px'}}>📥 Entradas (Créditos)</h4>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span>Retirada (Adiantamento):</span>
                    <strong>{formatCurrency(trip.value_withdraw)}</strong>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span>Recebido em Dinheiro:</span>
                    <strong>{formatCurrency(trip.value_received)}</strong>
                </div>
                <hr style={{borderColor: '#bbf7d0'}}/>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'1.1rem', color:'#166534'}}>
                    <strong>TOTAL ENTRADAS:</strong>
                    <strong>{formatCurrency(totalEntries)}</strong>
                </div>
            </div>

            {/* SAÍDAS */}
            <div style={{border: '1px solid #fee2e2', borderRadius: '8px', padding: '15px', backgroundColor: '#fef2f2'}}>
                <h4 style={{marginTop: 0, color: '#991b1b', borderBottom: '1px solid #fecaca', paddingBottom: '8px'}}>📤 Saídas (Despesas)</h4>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span>Combustível:</span>
                    <span>{formatCurrency(trip.expense_fuel)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span>Diária:</span>
                    <span>{formatCurrency(trip.expense_daily)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span>Ajudante:</span>
                    <span>{formatCurrency(trip.expense_assistant)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span>Pedágio:</span>
                    <span>{formatCurrency(trip.expense_toll)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span>Outros:</span>
                    <span>{formatCurrency(trip.expense_other)}</span>
                </div>

                {/* --- ALTERAÇÃO: EXIBIÇÃO DA DESCRIÇÃO DE OUTROS --- */}
                {trip.expense_other_desc && (
                    <div style={{
                        marginTop: '-2px', 
                        marginBottom: '8px', 
                        textAlign: 'right', 
                        fontSize: '0.85rem', 
                        color: '#b91c1c', 
                        fontStyle: 'italic'
                    }}>
                        Obs: {trip.expense_other_desc}
                    </div>
                )}

                <hr style={{borderColor: '#fecaca'}}/>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'1.1rem', color:'#991b1b'}}>
                    <strong>TOTAL DESPESAS:</strong>
                    <strong>{formatCurrency(totalExpenses)}</strong>
                </div>
            </div>
        </div>

        {/* 4. OBSERVAÇÕES */}
        {trip.return_notes && (
            <div style={{backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                <h4 style={{marginTop: 0, color: '#9a3412'}}>📦 Devoluções / Observações</h4>
                <p style={{margin: 0, whiteSpace: 'pre-wrap'}}>{trip.return_notes}</p>
            </div>
        )}

        {/* 5. TOTALIZADOR FINAL */}
        <div style={{
            backgroundColor: '#374151', 
            color: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <span>SALDO FINAL:</span>
            <span style={{
                fontWeight: 'bold', 
                color: balance >= 0 ? '#4ade80' : '#f87171'
            }}>
                {formatCurrency(balance)}
            </span>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div style={{marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center'}}>
            
            <button className="btn btn-primary" onClick={() => navigate('/closing')}>
                ➕ Novo Lançamento
            </button>
            
            <button 
                className="btn" 
                disabled={trip.approved}
                style={{
                    backgroundColor: trip.approved ? '#9ca3af' : '#eab308',
                    color: 'white',
                    cursor: trip.approved ? 'not-allowed' : 'pointer',
                    opacity: trip.approved ? 0.7 : 1,
                    transition: '0.3s'
                }} 
                onClick={() => !trip.approved && navigate(`/closing/${trip.id}`)}
            >
                {trip.approved ? '🔒 Edição Bloqueada' : '✏️ Editar Lançamento'}
            </button>
        </div>

      </div>
    </Layout>
  );
};

export default TripSummary;