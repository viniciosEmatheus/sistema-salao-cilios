import { useState, useEffect } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments/');
      setAppointments(response.data);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      setError("Não foi possível conectar ao servidor. O backend pode estar iniciando — aguarde 30 segundos e recarregue a página.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarTelefone = (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const formatarData = (dateString) => {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  };

  const formatarHora = (dateString) => {
    const d = new Date(dateString);
    const min = d.getMinutes();
    return `${d.getHours()}h${min > 0 ? String(min).padStart(2,'0') : ''}`;
  };

  const gerarMensagemConfirmacao = (apt) => {
    const sinal = (apt.financial?.total_value - apt.financial?.balance_due) || 0;
    return (
      `Arrasou! ✨✨\n\n` +
      `Seu horário está confirmado com sucesso!\n\n` +
      `📅 Data: ${formatarData(apt.scheduled_at)}\n` +
      `⏰ Horário: ${formatarHora(apt.scheduled_at)}\n` +
      `📍 Local: Rua Ari Carneiro Fernandes 155\n` +
      `💅 Procedimento: ${apt.service?.name}\n` +
      `✅ Valor: ${formatCurrency(apt.financial?.total_value)} - Sinal ${formatCurrency(sinal)} PG ☑️\n\n` +
      `Estou te esperando pra te deixar ainda mais linda ✨💅\n\n` +
      `Qualquer imprevisto, me avisa com antecedência, tá bom?`
    );
  };

  const gerarMensagemLembrete = (apt) => {
    return (
      `Oi, meu amor! ✨\n\n` +
      `Passando pra te lembrar do seu horário comigo.\n\n` +
      `📅 Data: ${formatarData(apt.scheduled_at)}\n` +
      `⏰ Horário: ${formatarHora(apt.scheduled_at)}\n` +
      `📍 Local: Rua Ari Carneiro Fernandes 155\n\n` +
      `Te espero pra te deixar ainda mais linda ✨💅\n\n` +
      `Peço que chegue no horário certinho, tá bom? 💕\n` +
      `Qualquer imprevisto, me avisa.`
    );
  };

  const abrirWhatsApp = (phone, message) => {
    const tel = formatarTelefone(phone);
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '80px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⏳</div>
        <h2 className="title">Carregando agenda...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Se demorar muito, o servidor pode estar iniciando. Aguarde 30 segundos.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: '80px', padding: '20px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
        <h2 className="title" style={{ color: '#d9534f' }}>Servidor offline</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
          {error}
        </p>
        <button className="btn-primary" style={{ maxWidth: '220px', margin: '0 auto' }}
          onClick={() => { setError(null); setLoading(true); fetchAppointments(); }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h2 className="title" style={{ textAlign: 'left', marginBottom: '30px' }}>Agenda da Giovanna</h2>
      
      {appointments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Nenhum agendamento encontrado.</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {appointments.map((apt) => (
            <div key={apt.id} style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              borderLeft: '5px solid var(--primary-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem' }}>
                  {apt.client?.name}
                </h3>
                <span style={{ background: '#fdfafb', color: 'var(--primary-color)', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {formatDate(apt.scheduled_at)}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                <p><strong>WhatsApp:</strong> {apt.client?.phone}</p>
                <p><strong>Serviço:</strong> {apt.service?.name}</p>
                <p><strong>Total:</strong> {formatCurrency(apt.financial?.total_value)}</p>
                <p><strong>Sinal Gerado:</strong> {formatCurrency(apt.financial?.deposit_paid)} (Pix)</p>
                <p style={{ color: '#d9534f', fontWeight: 'bold' }}>
                  <strong>Receber no dia:</strong> {formatCurrency(apt.financial?.balance_due)}
                </p>
              </div>

              {apt.client?.medical_restrictions && (
                <div style={{ marginTop: '15px', padding: '10px', background: '#fff3cd', color: '#856404', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <strong>⚠️ Restrição Médica:</strong> {apt.client.medical_restrictions}
                </div>
              )}

              {/* Botões WhatsApp */}
              <div style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => abrirWhatsApp(apt.client?.phone, gerarMensagemConfirmacao(apt))}
                  style={{
                    flex: 1, minWidth: '160px', padding: '10px 14px',
                    background: '#25D366', color: 'white', border: 'none',
                    borderRadius: '8px', fontWeight: 'bold', fontSize: '0.88rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '6px'
                  }}
                >
                  ✅ Enviar Confirmação
                </button>
                <button
                  onClick={() => abrirWhatsApp(apt.client?.phone, gerarMensagemLembrete(apt))}
                  style={{
                    flex: 1, minWidth: '160px', padding: '10px 14px',
                    background: '#128C7E', color: 'white', border: 'none',
                    borderRadius: '8px', fontWeight: 'bold', fontSize: '0.88rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '6px'
                  }}
                >
                  ⏰ Enviar Lembrete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}