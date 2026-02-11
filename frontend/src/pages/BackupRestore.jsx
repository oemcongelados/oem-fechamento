import React, { useState } from 'react';
import Layout from '../components/Layout';

const BackupRestore = () => {
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // --- DOWNLOAD ---
  const handleDownload = async () => {
    const token = localStorage.getItem('oem_token');
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/backup`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Erro ao gerar backup');

        // Cria um link invisível para forçar o download do BLOB
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Pega data atual para nome do arquivo
        const date = new Date().toISOString().slice(0,10);
        a.download = `backup_oem_${date}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMsg({ type: 'success', text: 'Backup baixado com sucesso!' });
    } catch (error) {
        // CORREÇÃO: Usamos a variável error para logar no console
        console.error("Erro no download:", error);
        setMsg({ type: 'error', text: 'Falha ao baixar backup.' });
    }
  };

  // --- UPLOAD / RESTORE ---
  const handleRestore = async (e) => {
    e.preventDefault();
    if (!window.confirm("ATENÇÃO: Isso apagará os dados atuais e substituirá pelo backup. Continuar?")) {
        return;
    }

    const fileInput = e.target.elements.backupFile;
    if (!fileInput.files[0]) {
        setMsg({ type: 'error', text: 'Selecione um arquivo JSON.' });
        return;
    }

    const formData = new FormData();
    formData.append('backup_file', fileInput.files[0]);
    const token = localStorage.getItem('oem_token');

    setLoading(true);
    setMsg({ type: 'loading', text: 'Restaurando... aguarde.' });

    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/restore`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            setMsg({ type: 'success', text: data.message });
            e.target.reset(); // Limpa o input
        } else {
            setMsg({ type: 'error', text: data.error || 'Erro ao restaurar.' });
        }
    } catch (error) {
        // CORREÇÃO: Usamos a variável error para logar no console
        console.error("Erro na restauração:", error);
        setMsg({ type: 'error', text: 'Erro de conexão.' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Layout title="Backup & Restauração">
      
      {/* Mensagens */}
      {msg.text && (
          <div style={{
            padding: '15px', marginBottom: '20px', borderRadius: '8px',
            backgroundColor: msg.type === 'success' ? '#dcfce7' : msg.type === 'error' ? '#fee2e2' : '#e0f2fe',
            color: msg.type === 'success' ? '#166534' : msg.type === 'error' ? '#991b1b' : '#075985',
            fontWeight: 'bold', textAlign: 'center'
          }}>
            {msg.text}
          </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px'}}>
        
        {/* CARD 1: FAZER BACKUP */}
        <div className="card" style={{textAlign: 'center'}}>
            <h3 style={{color: '#2563eb'}}>📥 Fazer Backup</h3>
            <p style={{marginBottom: '20px'}}>
                Baixe uma cópia completa de todos os dados do sistema (usuários, viagens, cadastros) para o seu computador.
            </p>
            <button onClick={handleDownload} className="btn btn-primary">
                BAIXAR ARQUIVO .JSON
            </button>
        </div>

        {/* CARD 2: RESTAURAR */}
        <div className="card" style={{textAlign: 'center', border: '1px solid #f87171'}}>
            <h3 style={{color: '#dc2626'}}>📤 Restaurar Sistema</h3>
            <p style={{marginBottom: '20px'}}>
                Recupere o sistema a partir de um arquivo salvo. <br/>
                <b>Cuidado:</b> Os dados atuais serão substituídos.
            </p>
            <form onSubmit={handleRestore}>
                <input 
                    type="file" 
                    name="backupFile" 
                    accept=".json" 
                    required 
                    style={{marginBottom: '15px', border: '1px dashed #ccc'}}
                />
                <button type="submit" className="btn btn-danger" disabled={loading}>
                    {loading ? 'PROCESSANDO...' : 'INICIAR RESTAURAÇÃO'}
                </button>
            </form>
        </div>

      </div>
    </Layout>
  );
};

export default BackupRestore;