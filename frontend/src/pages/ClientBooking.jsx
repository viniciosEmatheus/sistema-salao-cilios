import { useState } from 'react';
import api from '../api/client';

export default function ClientBooking() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    service_id: '1',
    scheduled_at: ''
  });
  
  const [pixData, setPixData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Horário Reservado!</h2>
        <p>Escaneie o QR Code abaixo para pagar o sinal e confirmar seu agendamento.</p>
        <img src={`data:image/jpeg;base64,${pixData.pix_qr_code_base64}`} alt="QR Code Pix" style={{ width: '250px', margin: '20px auto' }} />
        <div>
          <p><strong>Ou use o Pix Copia e Cola:</strong></p>
          <textarea readOnly value={pixData.pix_copia_cola} style={{ width: '80%', height: '80px', marginBottom: '10px' }} />
          <br/>
          <button onClick={() => navigator.clipboard.writeText(pixData.pix_copia_cola)}>Copiar Código</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Agendar Cílios</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label>Nome Completo:
          <input type="text" name="client_name" required onChange={handleChange} style={{ width: '100%', padding: '8px' }}/>
        </label>
        <label>WhatsApp:
          <input type="tel" name="client_phone" required onChange={handleChange} placeholder="(11) 99999-9999" style={{ width: '100%', padding: '8px' }}/>
        </label>
        <label>Serviço:
          <select name="service_id" onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
            <option value="1">Volume Russo - Sinal R$ 50,00</option>
            <option value="2">Manutenção - Sinal R$ 30,00</option>
          </select>
        </label>
        <label>Data e Hora:
          <input type="datetime-local" name="scheduled_at" required onChange={handleChange} style={{ width: '100%', padding: '8px' }}/>
        </label>
        <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#d63384', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {loading ? 'Gerando Pix...' : 'Confirmar Horário'}
        </button>
      </form>
    </div>
  );
}