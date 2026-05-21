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
  const [activeModal, setActiveModal] = useState(null); // Controla qual modal está aberto
  
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
    setActiveModal(null); // Fecha o modal ao avançar
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Conteúdos dos Modais baseados rigorosamente no catálogo técnico
  const modalDetails = {
    cilios: {
      title: "Extensão de Cílios Tradicional",
      text: "Técnica minuciosa onde é acoplado um fio sintético em cada um dos seus fios naturais. Ideal para realçar o olhar com um resultado leve, harmônico e duradouro. O procedimento leva em torno de 2h a 3h dependendo da quantidade de fios naturais. Exige manutenção de 15 a 25 dias.",
      alert: "⚠️ Pré-procedimento: Venha sem nenhuma maquiagem nos olhos (nada de rímel, lápis ou delineador). Se usar lentes de contato, traga o seu estojo para retirá-las."
    },
    capping: {
      title: "Técnica Capping (Sem Manutenção)",
      text: "Diferente das técnicas normais, utilizamos o método 'Capping Sanduíche'. É acoplado um fio sintético por cima e outro por baixo do seu fio natural, formando uma prensa perfeita. Isso aumenta drasticamente o volume e a retenção, fazendo com que os cílios durem 30 dias ou mais sem necessidade de manutenção!",
      alert: "✨ Perfeito para quem tem a rotina corrida e quer acordar pronta o mês inteiro sem se preocupar com visitas frequentes ao salão."
    },
    sobrancelhas: {
      title: "Brow Lamination & Design",
      text: "Procedimento químico avançado que alisa e alinha os pelos das sobrancelhas, deixando-as mais encorpadas e corrigindo falhas. O efeito levanta o olhar e deixa a sobrancelha naturalmente mais grossa, reforçando o seu design por 30 a 50 dias.",
      alert: "⚠️ Atenção: Não indicado para gestantes, lactantes ou pessoas em tratamento quimioterápico. Evite o uso de ácidos faciais antes do processo."
    }
  };

  if (pixData) {
    return (
      <div className="container pix-container" style={{ marginTop: '50px' }}>
        <h2 className="title">Quase lá, linda! ✨</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Escaneie o QR Code abaixo para pagar o sinal e garantir sua vaga na agenda.
          O valor será descontado no dia do atendimento!
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

  return (
    <div>
      {/* 1. APRESENTAÇÃO E CONTATO (GIOVANNA BEAUTY) */}
      <header className="hero-section">
        <h1 className="hero-title">Giovanna Beauty</h1>
        <p className="hero-subtitle">Realçando a sua beleza natural com sofisticação e cuidado</p>
        <div className="contact-badges">
          <p>📍 Rua Ari Carneiro Fernandes, n. 155 - Jardim dos Francos</p>
          <p>📱 WhatsApp: (11) 99362-7584</p>
          <p>📸 Instagram: <a href="https://instagram.com/giovannasoares_beauty" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none'}}>@giovannasoares_beauty</a></p>
        </div>
      </header>

      {/* 2. CATÁLOGO DE SERVIÇOS (VEIO PARA O TOPO) */}
      <h2 className="title" style={{marginTop: '40px'}}>Nosso Catálogo</h2>
      <p style={{textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.95rem'}}>Clique no card para entender como o procedimento é feito</p>
      
      <section className="catalog-grid">
        <div className="catalog-card" onClick={() => setActiveModal('cilios')} style={{cursor: 'pointer'}}>
          <img src="https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600" alt="Volume Brasileiro" />
          <div className="catalog-card-body">
            <h4>Volume Brasileiro e Extensões</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal', marginBottom: '5px'}}>Técnicas com manutenção</p>
            <p>Ver Detalhes e Explicação</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('capping')} style={{cursor: 'pointer'}}>
          <img src="https://images.unsplash.com/photo-1620052579624-9adfa8ee9c51?q=80&w=600" alt="Técnica Capping" />
          <div className="catalog-card-body">
            <h4>Técnica Capping Premium</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal', marginBottom: '5px'}}>Retenção 30+ dias (Sem manutenção)</p>
            <p>Ver Detalhes e Explicação</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('sobrancelhas')} style={{cursor: 'pointer'}}>
          <img src="https://images.unsplash.com/photo-1512496015851-a90838d54446?q=80&w=600" alt="Brow Lamination" />
          <div className="catalog-card-body">
            <h4>Sobrancelhas e Lamination</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal', marginBottom: '5px'}}>Design, Henna e Alinhamento</p>
            <p>Ver Detalhes e Explicação</p>
          </div>
        </div>
      </section>

      {/* 3. REGRAS DE AGENDAMENTO E SINAL (VEIO DEPOIS DO CATÁLOGO) */}
      <section className="info-box">
        <h3>✨ Como funciona o nosso atendimento?</h3>
        <ul>
          <li><strong>Garantia de Horário (Sinal):</strong> Para assegurar sua vaga com organização, solicitamos um pagamento de sinal automático via Pix (R$ 30,00 para Cílios | R$ 15,00 para Sobrancelhas).</li>
          <li><strong>Abatimento do Valor:</strong> O valor do sinal é integralmente descontado do preço do serviço no dia do atendimento.</li>
          <li><strong>Tempo de Procedimento:</strong> Vá com tempo! Cílios demoram de 2h a 3h, e sobrancelhas de 40min a 1h50. Cada minuto faz diferença no resultado.</li>
        </ul>
      </section>

      {/* 4. FORMULÁRIO DE RESERVA */}
      <div className="container" ref={formRef} style={{ marginBottom: '80px' }}>
        <h2 className="title">Agende sua Sessão</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Seu Nome Completo</label>
            <input type="text" name="client_name" required onChange={handleChange} placeholder="Ex: Maria Silva" />
          </div>
          
          <div className="form-group">
            <label>Número do seu WhatsApp</label>
            <input type="tel" name="client_phone" required onChange={handleChange} placeholder="(11) 99999-9999" />
          </div>
          
          <div className="form-group">
            <label>Escolha o Procedimento Comercial</label>
            <select name="service_id" required onChange={handleChange} value={formData.service_id} style={{width:'100%', padding:'14px', borderRadius:'10px', border:'1px solid var(--border-color)'}}>
              <option value="" disabled>Selecione o serviço desejado...</option>
              {services.map(srv => (
                <option key={srv.id} value={srv.id}>
                  [{srv.category ? srv.category.toUpperCase() : 'SERVIÇO'}] {srv.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Escolha o Dia e Horário</label>
            <input type="datetime-local" name="scheduled_at" required onChange={handleChange} />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Gerando Pix de Segurança...' : 'Confirmar Horário e Ir para o Pagamento'}
          </button>
        </form>
      </div>

      {/* --- RENDERIZAÇÃO DO MODAL DINÂMICO --- */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
            <h3 className="modal-title">{modalDetails[activeModal].title}</h3>
            <p className="modal-text">{modalDetails[activeModal].text}</p>
            <div className="modal-alert">{modalDetails[activeModal].alert}</div>
            <button className="btn-primary" onClick={scrollToForm}>Quero Agendar Esse!</button>
          </div>
        </div>
      )}
    </div>
  );
}