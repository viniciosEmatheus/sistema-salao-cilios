import { useState, useEffect } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments/');
      setAppointments(response.data);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
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

  if (loading) {
    return <div className="container"><h2 className="title">Carregando agenda...</h2></div>;
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}