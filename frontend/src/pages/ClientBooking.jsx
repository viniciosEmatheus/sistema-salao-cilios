import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

// Cards do catálogo: a foto, o texto de apoio e o modal de cada procedimento.
const CATALOGO = [
  { id: 'brasileiro', img: '/fotos/volume-brasileiro-fio-y.png', alt: 'Volume Brasileiro Studio Bellart',
    fallback: 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600', titulo: 'Volume Brasileiro', sub: 'Fio Y' },
  { id: 'egipcio', img: '/fotos/volume-egipicio-fio-4D.png', alt: 'Volume Egípcio Studio Bellart',
    fallback: 'https://images.unsplash.com/photo-1512496015851-a90838d54446?q=80&w=600', titulo: 'Volume Egípcio', sub: 'Fio 4D' },
  { id: 'luxxo', img: '/fotos/volume-luxxo-fio-5D.png', alt: 'Volume Luxxo e Glamour Studio Bellart',
    fallback: 'https://images.unsplash.com/photo-1620052579624-9adfa8ee9c51?q=80&w=600', titulo: 'Volume Luxxo / Glamour', sub: 'Fios 5D e 6D' },
  { id: 'foxy', img: '/fotos/volume-foxxy-eyes.png', alt: 'Foxy Eyes Studio Bellart',
    fallback: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=600', titulo: 'Volume Foxy Eyes', sub: 'Curvatura M' },
  { id: 'capping', img: '/fotos/volume-mega-brasileiro.png', alt: 'Técnica Capping Studio Bellart',
    fallback: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=600', titulo: 'Técnica Capping', sub: 'Mega Retenção (sem manutenção)' },
  { id: 'sobrancelhas', img: '/fotos/brow-lamination.png', alt: 'Sobrancelhas e Lamination Studio Bellart',
    fallback: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=600', titulo: 'Sobrancelhas', sub: 'Lamination, Henna e Design' },
];

export default function ClientBooking() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
    scheduled_date: '',
    scheduled_time: ''
  });

  // Horários disponíveis: 08h00 até 19h30, de 30 em 30 minutos
  const timeSlots = [];
  for (let h = 8; h < 20; h++) {
    timeSlots.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 19) timeSlots.push(`${String(h).padStart(2,'0')}:30`);
  }
  
  const [pixData, setPixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // Controla qual modal está aberto
  
  const formRef = useRef(null);

  // Rola até uma seção (a rota usa #, então não dá para usar âncoras comuns)
  const irPara = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

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
    if (!formData.scheduled_date || !formData.scheduled_time) {
      alert("Por favor, escolha a data e o horário.");
      return;
    }
    const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    if (scheduledAt < new Date()) {
      alert("Não é possível agendar em uma data ou horário que já passou.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        service_id: parseInt(formData.service_id),
        scheduled_at: scheduledAt.toISOString()
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

  const scrollToForm = (serviceFilter) => {
    setActiveModal(null);
    // Pré-seleciona o serviço correspondente ao card clicado
    if (serviceFilter && services.length > 0) {
      const match =
        services.find(s => s.name.includes(serviceFilter) && s.name.includes('Aplicação')) ||
        services.find(s => s.name.includes(serviceFilter));
      if (match) {
        setFormData(prev => ({ ...prev, service_id: String(match.id) }));
      }
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Conteúdos dos Modais baseados rigorosamente no catálogo técnico
  const modalDetails = {
    brasileiro: {
      title: "Volume Brasileiro (Fio Y)",
      text: "Aplicação delicada utilizando o Fio Y, garantindo um resultado leve e harmônico para o dia a dia. O procedimento leva em torno de 2h a 3h.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Brasileiro"
    },
    egipcio: {
      title: "Volume Egípcio (Fio 4D)",
      text: "Técnica que utiliza o Fio 4D para proporcionar mais preenchimento e um olhar marcante, ideal para quem busca um meio-termo entre o natural e o volumoso.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Egípcio"
    },
    luxxo: {
      title: "Volume Luxxo (Fio 5D) e Glamour (Fio 6D)",
      text: "Para quem ama cílios bem cheios! O Fio 5D e 6D entregam o máximo de volume e destaque para um olhar incrivelmente poderoso.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Luxxo"
    },
    foxy: {
      title: "Volume Foxy Eyes (Curvatura M)",
      text: "Utilizando Fio 5D com Curvatura M, essa técnica cria um efeito delineado que alonga e puxa o olhar para as extremidades. Extremamente sedutor.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Foxy"
    },
    capping: {
      title: "Técnicas Capping (Sem Manutenção)",
      text: "A revolução! Usamos a técnica 'Capping Sanduíche' (um fio acoplado por cima e outro por baixo do fio natural). Aumenta o volume e a durabilidade para 30 dias ou mais, eliminando a necessidade de manutenções.",
      alert: "✨ Perfeito para rotinas corridas. Disponível nos volumes Mega Brasileiro, Egípcio e Luxxo.",
      serviceFilter: "CAPPING"
    },
    sobrancelhas: {
      title: "Sobrancelhas e Lamination",
      text: "A Brow Lamination alisa e engrossa os fios (durabilidade de 30 a 50 dias). Também oferecemos Design Personalizado com ou sem Henna e depilação de buço.",
      alert: "⚠️ Brow Lamination não é indicada para gestantes, lactantes ou pessoas em tratamento quimioterápico.",
      serviceFilter: "Lamination Simples"
    },
    remocao: {
      title: "Remoções Químicas",
      text: "Usamos produto específico que dilui a cola e remove a extensão sem prejudicar seus fios naturais.",
      alert: "Temos valores diferenciados para cílios feitos por nós ou de outras profissionais.",
      serviceFilter: "Remoção Química"
    }
  };

  if (pixData) {
    const bookedService = services.find(s => String(s.id) === String(formData.service_id));
    const bookedDate = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    const formattedDate = bookedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    const formattedTime = formData.scheduled_time.replace(':', 'h');
    const hasPix = pixData.pix_qr_code_base64 && pixData.pix_copia_cola;

    return (
      <div className="container pix-container" style={{ marginTop: '50px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>✅</div>
        <h2 className="title">Horário Confirmado!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontSize: '0.95rem' }}>
          Seu agendamento foi salvo com sucesso, {pixData.client_name?.split(' ')[0]}!
        </p>

        {/* Resumo do agendamento */}
        <div style={{
          background: '#fdf1f6', borderRadius: '12px', padding: '20px',
          marginBottom: '25px', textAlign: 'left', lineHeight: '2'
        }}>
          <p>💅 <strong>{bookedService?.name || pixData.service_name}</strong></p>
          <p>📅 {formattedDate} às {formattedTime}</p>
          <p>📍 Rua Exemplo, 100 - São Paulo</p>
          <p>💰 Total: <strong>R$ {pixData.total_value?.toFixed(2).replace('.', ',')}</strong>
            {pixData.deposit_amount > 0 && ` · Sinal: R$ ${pixData.deposit_amount?.toFixed(2).replace('.', ',')}`}
          </p>
        </div>

        {/* Pix — só aparece se foi gerado */}
        {hasPix && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-main)' }}>
              Pague o sinal para garantir sua vaga:
            </p>
            <img src={`data:image/jpeg;base64,${pixData.pix_qr_code_base64}`} alt="QR Code Pix" className="pix-qrcode" />
            <p style={{ marginBottom: '8px', fontWeight: 'bold', marginTop: '16px' }}>Ou Pix Copia e Cola:</p>
            <textarea readOnly value={pixData.pix_copia_cola} className="pix-textarea" />
            <button className="btn-primary" onClick={() => navigator.clipboard.writeText(pixData.pix_copia_cola)}>
              Copiar Código Pix
            </button>
          </div>
        )}

        <button
          className="btn-primary"
          style={{ background: 'var(--text-muted)', marginTop: '10px' }}
          onClick={() => {
            setPixData(null);
            setFormData({ client_name: '', client_phone: '', service_id: '', scheduled_date: '', scheduled_time: '' });
          }}
        >
          Fazer Novo Agendamento
        </button>
      </div>
    );
  }

  return (
    <div className="lp">
      {/* Navegação rápida entre os tópicos da página */}
      <nav className="lp-nav" aria-label="Seções da página">
        <span className="lp-nav-marca">Studio Bellart</span>
        <div className="lp-nav-links">
          <button onClick={() => irPara('procedimentos')}>Procedimentos</button>
          <button onClick={() => irPara('como-funciona')}>Como funciona</button>
          <button className="lp-nav-cta" onClick={() => irPara('agendar')}>Agendar</button>
        </div>
      </nav>

      {/* 1. APRESENTAÇÃO E CONTATO */}
      <header className="hero-section">
        <p className="hero-badge">✦ Studio de Beleza ✦</p>
        <h1 className="hero-title">Studio Bellart</h1>
        <div className="hero-divider"></div>
        <p className="hero-subtitle">Realçando a sua beleza natural com sofisticação e cuidado</p>

        <div className="hero-cta">
          <button className="btn-primary" onClick={() => irPara('agendar')}>Agendar meu horário</button>
          <button className="btn-ghost" onClick={() => irPara('procedimentos')}>Ver procedimentos</button>
        </div>

        <div className="contact-badges">
          <div className="contact-item">
            <span className="contact-icon">📍</span>
            <p>São Paulo · SP<br/><small>Endereço enviado na confirmação</small></p>
          </div>

          <div className="contact-item">
            <span className="contact-icon">📱</span>
            <p>WhatsApp<br/>
              <a
                href="https://wa.me/5511999999999?text=Oi%2C%20vi%20o%20cat%C3%A1logo%20no%20site%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida..."
                target="_blank"
                rel="noreferrer"
                className="contact-link"
              >
                (11) 99999-9999
              </a>
            </p>
          </div>
        </div>
      </header>

      {/* 2. PROCEDIMENTOS */}
      <section id="procedimentos" className="lp-secao">
        <div className="lp-cab">
          <p className="lp-eyebrow">Procedimentos</p>
          <h2 className="lp-h2">Nosso catálogo</h2>
          <p className="lp-sub">Clique em um procedimento para entender como ele é feito.</p>
        </div>

        <div className="catalog-grid">
          {CATALOGO.map((c) => (
            <button key={c.id} type="button" className="catalog-card" onClick={() => setActiveModal(c.id)}>
              <img src={c.img} alt={c.alt} loading="lazy" onError={(e) => { e.target.src = c.fallback; }} />
              <div className="catalog-card-body">
                <h4>{c.titulo}</h4>
                <p>{c.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. COMO FUNCIONA */}
      <section id="como-funciona" className="lp-secao lp-secao-alt">
        <div className="lp-cab">
          <p className="lp-eyebrow">Como funciona</p>
          <h2 className="lp-h2">Do agendamento ao atendimento</h2>
          <p className="lp-sub">Três coisas para você saber antes de marcar.</p>
        </div>

        <ol className="passos">
          <li className="passo">
            <span className="passo-n">1</span>
            <h3>Garanta seu horário com o sinal</h3>
            <p>Para assegurar sua vaga com organização, pedimos um sinal automático via Pix: <strong>R$ 30,00</strong> para cílios e <strong>R$ 15,00</strong> para sobrancelhas.</p>
          </li>
          <li className="passo">
            <span className="passo-n">2</span>
            <h3>O sinal abate o valor</h3>
            <p>O valor do sinal é integralmente descontado do preço do serviço no dia do atendimento.</p>
          </li>
          <li className="passo">
            <span className="passo-n">3</span>
            <h3>Vá com tempo</h3>
            <p>Cílios levam de 2h a 3h e sobrancelhas de 40min a 1h50. Cada minuto faz diferença no resultado.</p>
          </li>
        </ol>
      </section>

      {/* 4. AGENDAMENTO */}
      <section id="agendar" className="lp-secao" ref={formRef}>
        <div className="lp-cab">
          <p className="lp-eyebrow">Agendamento</p>
          <h2 className="lp-h2">Agende sua sessão</h2>
          <p className="lp-sub">Leva menos de um minuto. O Pix do sinal é gerado na hora.</p>
        </div>

        <div className="container">
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
                <label>Escolha o Dia</label>
                <input
                  type="date"
                  name="scheduled_date"
                  required
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.scheduled_date}
                />
              </div>
    
              <div className="form-group">
                <label>Escolha o Horário</label>
                <select name="scheduled_time" required onChange={handleChange} value={formData.scheduled_time}
                  style={{width:'100%', padding:'14px', borderRadius:'10px', border:'1px solid var(--border-color)'}}>
                  <option value="" disabled>Selecione o horário...</option>
                  {timeSlots.map(t => (
                    <option key={t} value={t}>
                      {t.replace(':', 'h')}
                    </option>
                  ))}
                </select>
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Gerando Pix de Segurança...' : 'Confirmar Horário e Ir para o Pagamento'}
              </button>
            </form>
        </div>
      </section>

      <footer className="lp-rodape">
        <p>Studio Bellart · São Paulo, SP</p>
        <p>Demonstração do sistema de agendamento da Ordem Certa</p>
      </footer>

      {/* --- RENDERIZAÇÃO DO MODAL DINÂMICO --- */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
            <h3 className="modal-title">{modalDetails[activeModal].title}</h3>
            <p className="modal-text">{modalDetails[activeModal].text}</p>
            <div className="modal-alert">{modalDetails[activeModal].alert}</div>
            <button className="btn-primary" onClick={() => scrollToForm(modalDetails[activeModal].serviceFilter)}>Quero Agendar Esse!</button>
          </div>
        </div>
      )}
    </div>
  );
}