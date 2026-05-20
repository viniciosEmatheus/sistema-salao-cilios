import { useState, useEffect, useRef } from 'react';
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
  
  // Referência para fazer a tela rolar até o formulário quando a cliente clicar em uma foto
  const formRef = useRef(null);

  useEffect(() => {
    api.get('/services/')
      .then(response => setServices(response.data))
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
      // Rola a tela suavemente para mostrar o QR Code
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      alert("Erro ao criar agendamento: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // TELA 2: O QR Code do Pix (Mostrado após agendar)
  if (pixData) {
    return (
      <div className="container pix-container" style={{ marginTop: '50px' }}>
        <h2 className="title">Quase lá, linda! ✨</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Escaneie o QR Code abaixo para pagar o sinal e garantir sua vaga na agenda.
          Lembrando que esse valor será descontado no dia do procedimento!
        </p>
        
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

  // TELA 1: Landing Page completa
  return (
    <div>
      {/* CABEÇALHO */}
      <header className="hero-section">
        <h1 className="hero-title">Giovanna Soares</h1>
        <p className="hero-subtitle">Especialista em Alongamento de Cílios e Design de Sobrancelhas</p>
        <div className="contact-badges">
          <span>📍 Rua Ari Carneiro Fernandes, 155 - Jardim dos Francos</span>
          <span>📱 WhatsApp: (11) 99362-7584</span>
          <span>📸 Instagram: @giovannasoares_beauty</span>
        </div>
      </header>

      {/* REGRAS E COMO FUNCIONA */}
      <section className="info-box">
        <h3>✨ Como funciona o agendamento?</h3>
        <ul>
          <li><strong>Pagamento de Sinal:</strong> Para garantir seu horário, trabalhamos com o pagamento de um sinal (R$ 30 para Cílios e R$ 15 para Sobrancelhas) via Pix automático.</li>
          <li><strong>Desconto no dia:</strong> Fique tranquila! Esse valor é descontado do valor total no dia do seu atendimento.</li>
          <li><strong>Pré-procedimento (Cílios):</strong> Venha sem maquiagem nos olhos (nada de rímel ou lápis) e, se usa lentes, traga o estojo.</li>
          <li><strong>Pontualidade:</strong> Chegue no horário combinado, cada minutinho faz diferença para um resultado perfeito e duradouro.</li>
        </ul>
      </section>

      {/* CATÁLOGO VISUAL */}
      <h2 className="title">Nosso Catálogo</h2>
      <section className="catalog-grid">
        <div className="catalog-card" onClick={scrollToForm} style={{cursor: 'pointer'}}>
          <img src="https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600" alt="Volume Brasileiro" />
          <div className="catalog-card-body">
            <h4>Volume Brasileiro & Egípcio</h4>
            <p>A partir de R$ 115,00</p>
          </div>
        </div>

        <div className="catalog-card" onClick={scrollToForm} style={{cursor: 'pointer'}}>
          <img src="https://images.unsplash.com/photo-1620052579624-9adfa8ee9c51?q=80&w=600" alt="Técnica Capping" />
          <div className="catalog-card-body">
            <h4>Técnica Capping (Sem Manutenção)</h4>
            <p>A partir de R$ 135,00</p>
          </div>
        </div>

        <div className="catalog-card" onClick={scrollToForm} style={{cursor: 'pointer'}}>
          <img src="https://images.unsplash.com/photo-1512496015851-a90838d54446?q=80&w=600" alt="Brow Lamination" />
          <div className="catalog-card-body">
            <h4>Brow Lamination & Design</h4>
            <p>A partir de R$ 30,00</p>
          </div>
        </div>
      </section>

      {/* FORMULÁRIO DE AGENDAMENTO */}
      <div className="container" ref={formRef} style={{ marginBottom: '80px' }}>
        <h2 className="title">Garanta seu Horário</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Completo</label>
            <input type="text" name="client_name" required onChange={handleChange} placeholder="Como gosta de ser chamada?" />
          </div>
          
          <div className="form-group">
            <label>Seu melhor WhatsApp</label>
            <input type="tel" name="client_phone" required onChange={handleChange} placeholder="(11) 99999-9999" />
          </div>
          
          <div className="form-group">
            <label>Escolha o Serviço ou Manutenção</label>
            <select name="service_id" required onChange={handleChange} value={formData.service_id}>
              <option value="" disabled>Selecione uma opção na lista...</option>
              
              {/* Agrupa por Categoria para facilitar a leitura da cliente */}
              <optgroup label="👁️ Cílios - Aplicação e Manutenção">
                {services.filter(s => s.category === 'cilios').map(srv => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} (Sinal R$ {srv.deposit_amount.toFixed(2)})
                  </option>
                ))}
              </optgroup>
              
              <optgroup label="✨ Sobrancelhas">
                {services.filter(s => s.category === 'sobrancelha').map(srv => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} (Sinal R$ {srv.deposit_amount.toFixed(2)})
                  </option>
                ))}
              </optgroup>

              <optgroup label="🧼 Remoções">
                {services.filter(s => s.category === 'remocao').map(srv => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name}
                  </option>
                ))}
              </optgroup>

            </select>
          </div>
          
          <div className="form-group">
            <label>Data e Hora Desejada</label>
            <input type="datetime-local" name="scheduled_at" required onChange={handleChange} />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Gerando seu Pix Seguro...' : 'Agendar e Gerar Pix de Sinal'}
          </button>
        </form>
      </div>
    </div>
  );
}