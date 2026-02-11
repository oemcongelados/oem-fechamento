import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';

const TripClosing = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const initialData = {
    route: '', start_date: '', end_date: '', driver: '', vehicle: '',
    km_start: '', km_end: '', value_withdraw: '', value_received: '', return_notes: '',
    expense_fuel: '', expense_daily: '', expense_assistant: '', expense_toll: '', expense_other: ''
  };

  const [formData, setFormData] = useState(() => {
    if (id) return initialData;
    const saved = localStorage.getItem('oem_trip_draft');
    return saved ? JSON.parse(saved) : initialData;
  });

  const [status, setStatus] = useState({ type: '', msg: '' });
  const [catalogs, setCatalogs] = useState({ drivers: [], vehicles: [], routes: [] });

  useEffect(() => {
    const fetchCatalogs = async () => {
        const token = localStorage.getItem('oem_token');
        try {
            const [driversRes, vehiclesRes, routesRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/api/drivers`, { headers: { Authorization: `Bearer ${token}` }}),
                fetch(`${import.meta.env.VITE_API_URL}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` }}),
                fetch(`${import.meta.env.VITE_API_URL}/api/routes`, { headers: { Authorization: `Bearer ${token}` }})
            ]);
            setCatalogs({
                drivers: await driversRes.json() || [],
                vehicles: await vehiclesRes.json() || [],
                routes: await routesRes.json() || []
            });
        } catch (error) {
            console.error("Erro catalogos:", error);
        }
    };
    fetchCatalogs();
  }, []);

  useEffect(() => {
    if (isEditMode) {
        const fetchTrip = async () => {
            const token = localStorage.getItem('oem_token');
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/trips/${id}`, {
                     headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.start_date) data.start_date = data.start_date.split('T')[0];
                    if (data.end_date) data.end_date = data.end_date.split('T')[0];
                    setFormData(data);
                }
            } catch (err) {
                console.error("Erro ao carregar viagem:", err);
            }
        };
        fetchTrip();
    }
  }, [id, isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
        localStorage.setItem('oem_trip_draft', JSON.stringify(formData));
    }
  }, [formData, isEditMode]);

  // --- MUDANÇA 1: Função Genérica para Texto/Números Simples ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    const isNumber = ['km_start', 'km_end'].includes(name);
    
    setFormData(prev => ({ 
        ...prev, 
        [name]: isNumber ? (value === '' ? '' : parseFloat(value)) : value 
    }));
  };

  // --- MUDANÇA 2: Função Específica para Moeda (Máscara R$) ---
  // Transforma digitação em centavos e salva float no estado
  const handleCurrencyChange = (e) => {
    const { name, value } = e.target;
    
    // 1. Remove tudo que não for dígito
    const onlyDigits = value.replace(/\D/g, "");
    
    // 2. Converte para float (ex: 1234 virar 12.34)
    const floatValue = Number(onlyDigits) / 100;
    
    setFormData(prev => ({ ...prev, [name]: floatValue }));
  };

  // Helper para exibir o valor formatado no input (R$ 0,00)
  const formatCurrencyInput = (value) => {
    if (value === '' || value === undefined || value === null) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', msg: 'Enviando dados...' });
    
    const token = localStorage.getItem('oem_token');
    
    const url = isEditMode 
        ? `${import.meta.env.VITE_API_URL}/api/trips/${id}`
        : `${import.meta.env.VITE_API_URL}/api/trips`;
    
    const method = isEditMode ? 'PUT' : 'POST';

    // Garante que campos vazios virem 0 para o backend
    const payload = { ...formData };
    const numericFields = [
        'km_start', 'km_end', 
        'value_withdraw', 'value_received', 
        'expense_fuel', 'expense_daily', 'expense_assistant', 'expense_toll', 'expense_other'
    ];

    numericFields.forEach(field => {
        if (!payload[field] || payload[field] === '') {
            payload[field] = 0;
        } else {
            payload[field] = parseFloat(payload[field]);
        }
    });

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isEditMode) localStorage.removeItem('oem_trip_draft');
        const tripId = isEditMode ? id : data.id;
        navigate(`/summary/${tripId}`);
      } else {
        setStatus({ type: 'error', msg: data.error || 'Erro ao salvar dados.' });
      }
    } catch (error) {
      console.error("Erro no envio:", error);
      setStatus({ type: 'error', msg: 'Erro de conexão.' });
    }
  };

  return (
    <Layout>
      <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
          <h1>{isEditMode ? 'Editar Lançamento' : 'Fechamento de Viagem'}</h1>
          <p>{isEditMode ? `Editando registro ID: ${id}` : 'Preencha os dados abaixo ao finalizar a rota.'}</p>
        </div>

        {status.msg && (
          <div style={{
            padding: '15px', marginBottom: '20px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold',
            backgroundColor: status.type === 'error' ? '#fee2e2' : '#e0f2fe',
            color: status.type === 'error' ? '#991b1b' : '#075985'
          }}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* GRUPO 1: Informações Básicas */}
          <div style={{marginBottom: '30px'}}>
            <h3>📋 Dados Gerais</h3>
            
            {/* LINHA 1: DATAS */}
            <div className="form-grid">
              <div>
                <label>Data de Saída *</label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required />
              </div>
              
              <div>
                <label>Data de Chegada *</label>
                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required />
              </div>
            </div>

            {/* LINHA 2: ROTA E MOTORISTA */}
            <div className="form-grid" style={{marginTop: '16px'}}>
              <div>
                <label>Rota *</label>
                <select name="route" value={formData.route} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {catalogs.routes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label>Motorista *</label>
                <select name="driver" value={formData.driver} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {catalogs.drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* LINHA 3: VEÍCULO */}
             <div className="form-grid" style={{marginTop: '16px'}}>
              <div style={{gridColumn: '1 / -1'}}>
                <label>Veículo *</label>
                <select name="vehicle" value={formData.vehicle} onChange={handleChange} required style={{width: '100%'}}>
                  <option value="">Selecione...</option>
                  {catalogs.vehicles.map(v => <option key={v.id} value={`${v.model} (${v.plate})`}>{v.model} - {v.plate}</option>)}
                </select>
              </div>
            </div>
          </div>
          <hr style={{border: '0', borderTop: '1px solid var(--border)', margin: '30px 0'}} />

          {/* GRUPO 2: Odômetro e Caixa */}
          <div style={{marginBottom: '30px'}}>
            <h3>🚚 Quilometragem e Caixa</h3>
            <div className="form-grid">
              <div>
                  <label>KM Saída *</label>
                  <input type="number" name="km_start" value={formData.km_start} onChange={handleChange} required />
              </div>
              <div>
                  <label>KM Chegada *</label>
                  <input type="number" name="km_end" value={formData.km_end} onChange={handleChange} required />
              </div>
            </div>

            {/* CAMPOS COM MÁSCARA DE MOEDA */}
            <div className="form-grid" style={{marginTop: '16px'}}>
              <div>
                  <label>Retirada (Adiantamento) *</label>
                  <input 
                    type="text" 
                    name="value_withdraw" 
                    value={formatCurrencyInput(formData.value_withdraw)} 
                    onChange={handleCurrencyChange} 
                    placeholder="R$ 0,00"
                    required 
                  />
              </div>
              <div>
                  <label>Recebido em Dinheiro *</label>
                  <input 
                    type="text" 
                    name="value_received" 
                    value={formatCurrencyInput(formData.value_received)} 
                    onChange={handleCurrencyChange} 
                    placeholder="R$ 0,00"
                    required 
                  />
              </div>
            </div>
          </div>

          {/* GRUPO 3: Devoluções */}
          <div style={{marginBottom: '30px'}}>
             <label>Houve Devolução de Mercadoria?</label>
             <textarea name="return_notes" rows="3" value={formData.return_notes} onChange={handleChange}></textarea>
          </div>
          <hr style={{border: '0', borderTop: '1px solid var(--border)', margin: '30px 0'}} />

          {/* GRUPO 4: Despesas (COM MÁSCARA DE MOEDA) */}
          <div style={{marginBottom: '30px'}}>
            <h3>⛽ Despesas</h3>
            <div className="form-grid">
              <div>
                  <label>Combustível *</label>
                  <input type="text" name="expense_fuel" value={formatCurrencyInput(formData.expense_fuel)} onChange={handleCurrencyChange} placeholder="R$ 0,00" required />
              </div>
              <div>
                  <label>Diária *</label>
                  <input type="text" name="expense_daily" value={formatCurrencyInput(formData.expense_daily)} onChange={handleCurrencyChange} placeholder="R$ 0,00" required />
              </div>
              
              {/* Opcionais, mas com máscara */}
              <div>
                  <label>Ajudante</label>
                  <input type="text" name="expense_assistant" value={formatCurrencyInput(formData.expense_assistant)} onChange={handleCurrencyChange} placeholder="R$ 0,00" />
              </div>
              <div>
                  <label>Pedágio</label>
                  <input type="text" name="expense_toll" value={formatCurrencyInput(formData.expense_toll)} onChange={handleCurrencyChange} placeholder="R$ 0,00" />
              </div>
              <div>
                  <label>Outros</label>
                  <input type="text" name="expense_other" value={formatCurrencyInput(formData.expense_other)} onChange={handleCurrencyChange} placeholder="R$ 0,00" />
              </div>
            </div>
          </div>

          <div style={{display:'flex', gap:'10px'}}>
             <button type="submit" className="btn btn-primary" style={{flex: 1, padding: '18px', fontSize: '1.1rem'}}>
                {isEditMode ? 'SALVAR ALTERAÇÕES' : 'ENVIAR FECHAMENTO'}
             </button>
             {isEditMode && (
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/search')} style={{padding: '18px'}}>
                    CANCELAR
                </button>
             )}
          </div>

        </form>
      </div>
    </Layout>
  );
};

export default TripClosing;