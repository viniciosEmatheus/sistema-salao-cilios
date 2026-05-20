import { useState, useEffect } from 'react';
import api from '../api/client';

export default function ClientBooking() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
    scheduled_at: ''
  });
  
  const [pixData, setPixData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Assim que a tela carrega, o React bate no FastAPI para buscar o catálogo
  useEffect(() => {
    api.get('/services/')
      .then(response => {
        setServices(response.data);
      })
      .catch(error => console.error("Erro ao buscar catálogo:", error));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.service_id) {
      alert("Por favor, selecione um serviço.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        service_id: parseInt(formData.service_id),
        scheduled_at: new Date(formData.scheduled_at).toISOString()
      };
      const response = await api.post('/appointments/', payload);
      setPixData(response.data);
    } catch (error) {
      alert("Erro ao criar agendamento: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (pixData) {
    return (
      <div className="container pix-container">
        <h2 className="title">Horário Reservado!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Escaneie o QR Code abaixo para pagar o sinal e confirmar seu agendamento.</p>
        
        <img src={`data:image/jpeg;base64,${pixData.pix_qr_code_base64}`} alt="QR Code Pix" className="pix-qrcode" />
        
        <div>
          <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Ou use o Pix Copia e Cola:</p>
          <textarea readOnly value={pixData.pix_copia_cola} className="pix-textarea" />
          <button className="btn-primary" onClick={() => navigator.clipboard.writeText(pixData.pix_copia_cola)}>
            Copiar Código Pix
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="title">Agendar Cílios</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nome Completo</label>
          <input type="text" name="client_name" required onChange={handleChange} placeholder="Digite seu nome" />
        </div>
        
        <div className="form-group">
          <label>WhatsApp</label>
          <input type="tel" name="client_phone" required onChange={handleChange} placeholder="(11) 99999-9999" />
        </div>
        
        <div className="form-group">
          <label>Serviço Desejado</label>
          <select name="service_id" required onChange={handleChange} value={formData.service_id}>
            <option value="" disabled>Selecione um serviço...</option>
            {services.map(srv => (
              <option key={srv.id} value={srv.id}>
                {srv.name} - Sinal R$ {srv.deposit_amount.toFixed(2)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Data e Hora</label>
          <input type="datetime-local" name="scheduled_at" required onChange={handleChange} />
        </div>
        
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processando...' : 'Confirmar Horário'}
        </button>
      </form>
    </div>
  );
}