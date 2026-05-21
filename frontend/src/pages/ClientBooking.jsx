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
    brasileiro: {
      title: "Volume Brasileiro (Fio Y)",
      text: "Aplicação delicada utilizando o Fio Y, garantindo um resultado leve e harmônico para o dia a dia. O procedimento leva em torno de 2h a 3h.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato."
    },
    egipcio: {
      title: "Volume Egípcio (Fio 4D)",
      text: "Técnica que utiliza o Fio 4D para proporcionar mais preenchimento e um olhar marcante, ideal para quem busca um meio-termo entre o natural e o volumoso.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato."
    },
    luxxo: {
      title: "Volume Luxxo (Fio 5D) e Glamour (Fio 6D)",
      text: "Para quem ama cílios bem cheios! O Fio 5D e 6D entregam o máximo de volume e destaque para um olhar incrivelmente poderoso.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato."
    },
    foxy: {
      title: "Volume Foxy Eyes (Curvatura M)",
      text: "Utilizando Fio 5D com Curvatura M, essa técnica cria um efeito delineado que alonga e puxa o olhar para as extremidades. Extremamente sedutor.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato."
    },
    capping: {
      title: "Técnicas Capping (Sem Manutenção)",
      text: "A revolução! Usamos a técnica 'Capping Sanduíche' (um fio acoplado por cima e outro por baixo do fio natural). Aumenta o volume e a durabilidade para 30 dias ou mais, eliminando a necessidade de manutenções.",
      alert: "✨ Perfeito para rotinas corridas. Disponível nos volumes Mega Brasileiro, Egípcio e Luxxo."
    },
    sobrancelhas: {
      title: "Sobrancelhas e Lamination",
      text: "A Brow Lamination alisa e engrossa os fios (durabilidade de 30 a 50 dias). Também oferecemos Design Personalizado com ou sem Henna e depilação de buço.",
      alert: "⚠️ Brow Lamination não é indicada para gestantes, lactantes ou pessoas em tratamento quimioterápico."
    },
    remocao: {
      title: "Remoções Químicas",
      text: "Usamos produto específico que dilui a cola e remove a extensão sem prejudicar seus fios naturais.",
      alert: "Temos valores diferenciados para cílios feitos por nós ou de outras profissionais."
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

      {/* CATÁLOGO VISUAL DETALHADO */}
      <h2 className="title" style={{marginTop: '40px'}}>Nosso Catálogo</h2>
      <p style={{textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.95rem'}}>Clique no card para entender como o procedimento é feito</p>
      
      <section className="catalog-grid">
        
        <div className="catalog-card" onClick={() => setActiveModal('brasileiro')} style={{cursor: 'pointer'}}>
          {/* O link já está pronto para receber sua foto! */}
          <img src="/fotos/volume-brasileiro.jpg" alt="Volume Brasileiro" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Brasileiro</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Fio Y</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('egipcio')} style={{cursor: 'pointer'}}>
          <img src="/fotos/volume-egipcio.jpg" alt="Volume Egípcio" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1512496015851-a90838d54446?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Egípcio</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Fio 4D</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('luxxo')} style={{cursor: 'pointer'}}>
          <img src="/fotos/volume-luxxo.jpg" alt="Volume Luxxo e Glamour" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1620052579624-9adfa8ee9c51?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Luxxo / Glamour</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Fios 5D e 6D</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('foxy')} style={{cursor: 'pointer'}}>
          <img src="/fotos/foxy-eyes.jpg" alt="Foxy Eyes" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Foxy Eyes</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Curvatura M</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('capping')} style={{cursor: 'pointer'}}>
          <img src="/fotos/capping.jpg" alt="Técnica Capping" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Técnica Capping</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Sem manutenção (30+ dias)</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('sobrancelhas')} style={{cursor: 'pointer'}}>
          <img src="/fotos/sobrancelhas.jpg" alt="Sobrancelhas e Lamination" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Sobrancelhas</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Lamination, Henna e Design</p>
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