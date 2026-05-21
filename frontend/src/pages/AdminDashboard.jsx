import { useState, useEffect } from 'react';
import api from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmtDate = (s) => {
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const fmtData = (s) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtHora = (s) => {
  const d = new Date(s);
  const m = d.getMinutes();
  return `${d.getHours()}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
};

const fmtTel = (p) => {
  const d = (p || '').replace(/\D/g, '');
  return d.startsWith('55') ? d : `55${d}`;
};

const abrirWpp = (phone, msg) =>
  window.open(`https://wa.me/${fmtTel(phone)}?text=${encodeURIComponent(msg)}`, '_blank');

const msgConfirmacao = (apt) => {
  const sinal = (apt.financial?.total_value - apt.financial?.balance_due) || 0;
  return `Arrasou! ✨✨\n\nSeu horário está confirmado com sucesso!\n\n📅 Data: ${fmtData(apt.scheduled_at)}\n⏰ Horário: ${fmtHora(apt.scheduled_at)}\n📍 Local: Rua Ari Carneiro Fernandes 155\n💅 Procedimento: ${apt.service?.name}\n✅ Valor: ${fmt(apt.financial?.total_value)} - Sinal ${fmt(sinal)} PG ☑️\n\nEstou te esperando pra te deixar ainda mais linda ✨💅\n\nQualquer imprevisto, me avisa com antecedência, tá bom?`;
};

const msgLembrete = (apt) =>
  `Oi, meu amor! ✨\n\nPassando pra te lembrar do seu horário comigo.\n\n📅 Data: ${fmtData(apt.scheduled_at)}\n⏰ Horário: ${fmtHora(apt.scheduled_at)}\n📍 Local: Rua Ari Carneiro Fernandes 155\n\nTe espero pra te deixar ainda mais linda ✨💅\n\nPeço que chegue no horário certinho, tá bom? 💕\nQualquer imprevisto, me avisa.`;

const CORES = ['#d8438b', '#128C7E', '#f59e0b', '#6366f1', '#10b981', '#ef4444'];

const timeSlots = [];
for (let h = 8; h < 20; h++) {
  timeSlots.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 19) timeSlots.push(`${String(h).padStart(2, '0')}:30`);
}

// ─── Componentes de UI ───────────────────────────────────────────────────────

const Card = ({ children, style }) => (
  <div style={{
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
    padding: '20px', ...style
  }}>{children}</div>
);

const StatCard = ({ label, value, sub, color }) => (
  <Card style={{ textAlign: 'center', borderTop: `4px solid ${color || 'var(--primary-color)'}` }}>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>{label}</p>
    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: color || 'var(--primary-color)' }}>{value}</p>
    {sub && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{sub}</p>}
  </Card>
);

const BtnWpp = ({ label, color, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, minWidth: '140px', padding: '9px 12px',
    background: color, color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer'
  }}>{label}</button>
);

// ─── ABA: AGENDA ─────────────────────────────────────────────────────────────

function AgendaTab({ appointments, onRefresh }) {
  const [reagendando, setReagendando] = useState(null);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [salvando, setSalvando] = useState(false);

  const confirmarReagendamento = async (apt) => {
    if (!novaData || !novaHora) return alert('Escolha data e horário.');
    setSalvando(true);
    try {
      const dt = new Date(`${novaData}T${novaHora}:00`).toISOString();
      await api.put(`/appointments/${apt.id}/reagendar/`, { scheduled_at: dt });
      setReagendando(null);
      onRefresh();
    } catch { alert('Erro ao reagendar.'); }
    finally { setSalvando(false); }
  };

  const cancelar = async (id) => {
    if (!window.confirm('Cancelar este atendimento?')) return;
    try {
      await api.delete(`/appointments/${id}/`);
      onRefresh();
    } catch { alert('Erro ao cancelar.'); }
  };

  if (!appointments.length) return <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Nenhum agendamento encontrado.</p>;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {appointments.map(apt => (
        <Card key={apt.id} style={{ borderLeft: '5px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{apt.client?.name}</h3>
            <span style={{ background: '#fdf1f6', color: 'var(--primary-color)', padding: '4px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              {fmtDate(apt.scheduled_at)}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
            <p>📱 {apt.client?.phone}</p>
            <p>💅 {apt.service?.name}</p>
            <p>💰 Total: <strong>{fmt(apt.financial?.total_value)}</strong></p>
            <p style={{ color: '#d9534f', fontWeight: 'bold' }}>🏷️ Receber: {fmt(apt.financial?.balance_due)}</p>
          </div>

          {apt.client?.medical_restrictions && (
            <div style={{ background: '#fff3cd', color: '#856404', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px' }}>
              ⚠️ {apt.client.medical_restrictions}
            </div>
          )}

          {/* Reagendamento inline */}
          {reagendando === apt.id ? (
            <div style={{ background: '#fdf1f6', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--primary-color)' }}>📅 Novo horário</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                <select value={novaHora} onChange={e => setNovaHora(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <option value="">Horário...</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t.replace(':', 'h')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => confirmarReagendamento(apt)} disabled={salvando}
                  style={{ flex: 1, padding: '9px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : '✅ Confirmar'}
                </button>
                <button onClick={() => setReagendando(null)}
                  style={{ padding: '9px 16px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <BtnWpp label="✅ Confirmação" color="#25D366" onClick={() => abrirWpp(apt.client?.phone, msgConfirmacao(apt))} />
            <BtnWpp label="⏰ Lembrete" color="#128C7E" onClick={() => abrirWpp(apt.client?.phone, msgLembrete(apt))} />
            <button onClick={() => { setReagendando(apt.id); setNovaData(''); setNovaHora(''); }}
              style={{ flex: 1, minWidth: '100px', padding: '9px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer' }}>
              🔄 Remarcar
            </button>
            <button onClick={() => cancelar(apt.id)}
              style={{ flex: 1, minWidth: '100px', padding: '9px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer' }}>
              ✕ Cancelar
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── ABA: NOVO ATENDIMENTO ───────────────────────────────────────────────────

function NovoAtendimentoTab({ services, onRefresh }) {
  const [form, setForm] = useState({ client_name: '', client_phone: '', service_id: '', scheduled_date: '', scheduled_time: '', medical_restrictions: '' });
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.service_id || !form.scheduled_date || !form.scheduled_time) {
      return alert('Preencha todos os campos obrigatórios.');
    }
    setLoading(true);
    try {
      await api.post('/appointments/admin/', {
        client_name: form.client_name,
        client_phone: form.client_phone,
        service_id: parseInt(form.service_id),
        scheduled_at: new Date(`${form.scheduled_date}T${form.scheduled_time}:00`).toISOString(),
        medical_restrictions: form.medical_restrictions || null
      });
      setSucesso(true);
      setForm({ client_name: '', client_phone: '', service_id: '', scheduled_date: '', scheduled_time: '', medical_restrictions: '' });
      onRefresh();
      setTimeout(() => setSucesso(false), 3000);
    } catch { alert('Erro ao criar atendimento.'); }
    finally { setLoading(false); }
  };

  return (
    <Card style={{ maxWidth: '500px' }}>
      <h3 style={{ color: 'var(--primary-color)', marginBottom: '20px', fontWeight: '700' }}>➕ Novo Atendimento</h3>
      {sucesso && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
          ✅ Atendimento criado com sucesso!
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {[
          { label: 'Nome da Cliente *', name: 'client_name', type: 'text', placeholder: 'Ex: Maria Silva' },
          { label: 'WhatsApp *', name: 'client_phone', type: 'tel', placeholder: '(11) 99999-9999' },
        ].map(f => (
          <div key={f.name} className="form-group">
            <label>{f.label}</label>
            <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} required />
          </div>
        ))}

        <div className="form-group">
          <label>Procedimento *</label>
          <select name="service_id" value={form.service_id} onChange={handleChange} required
            style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <option value="">Selecione...</option>
            {services.map(s => <option key={s.id} value={s.id}>[{s.category?.toUpperCase()}] {s.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Data *</label>
            <input type="date" name="scheduled_date" value={form.scheduled_date} onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} required />
          </div>
          <div className="form-group">
            <label>Horário *</label>
            <select name="scheduled_time" value={form.scheduled_time} onChange={handleChange} required
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <option value="">Horário...</option>
              {timeSlots.map(t => <option key={t} value={t}>{t.replace(':', 'h')}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Restrições médicas (opcional)</label>
          <input type="text" name="medical_restrictions" value={form.medical_restrictions} onChange={handleChange}
            placeholder="Ex: Gestante, alergia a cola..." />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Atendimento'}
        </button>
      </form>
    </Card>
  );
}

// ─── ABA: ESTATÍSTICAS ────────────────────────────────────────────────────────

function EstatisticasTab({ stats, appointments }) {
  if (!stats) return <p style={{ color: 'var(--text-muted)' }}>Carregando estatísticas...</p>;

  const top10 = (stats.services || []).filter(s => s.total > 0).slice(0, 10);
  const catData = ['cilios', 'sobrancelha', 'remocao'].map(cat => ({
    name: cat === 'cilios' ? 'Cílios' : cat === 'sobrancelha' ? 'Sobrancelhas' : 'Remoções',
    value: (stats.services || []).filter(s => s.category === cat).reduce((a, s) => a + s.total, 0)
  })).filter(c => c.value > 0);

  const proximos7 = appointments.filter(a => {
    const d = new Date(a.scheduled_at);
    const hoje = new Date();
    const em7 = new Date(); em7.setDate(hoje.getDate() + 7);
    return d >= hoje && d <= em7;
  }).length;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        <StatCard label="Total de Atendimentos" value={stats.total_appointments} color="#d8438b" />
        <StatCard label="Próximos 7 dias" value={proximos7} color="#6366f1" />
        <StatCard label="Ticket Médio" value={fmt(stats.ticket_medio)} color="#f59e0b" />
      </div>

      {/* Gráfico de barras — serviços mais agendados */}
      {top10.length > 0 && (
        <Card>
          <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>📊 Serviços mais agendados</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#d8438b" radius={[0, 6, 6, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gráfico de pizza — por categoria */}
      {catData.length > 0 && (
        <Card>
          <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>🥧 Distribuição por categoria</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {catData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stats.total_appointments === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
          Nenhum dado ainda. Os gráficos aparecem conforme os agendamentos forem criados.
        </p>
      )}
    </div>
  );
}

// ─── ABA: FINANCEIRO ─────────────────────────────────────────────────────────

function FinanceiroTab({ stats }) {
  if (!stats) return <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>;

  const projecaoMensal = stats.ticket_medio * 20; // estimativa de 20 atendimentos/mês
  const taxaRecebimento = stats.total_revenue > 0
    ? ((stats.total_deposits / stats.total_revenue) * 100).toFixed(0)
    : 0;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard label="Receita Total Gerada" value={fmt(stats.total_revenue)} color="#d8438b" sub="Soma de todos os atendimentos" />
        <StatCard label="Sinais Recebidos" value={fmt(stats.total_deposits)} color="#25D366" sub="Pix confirmados" />
        <StatCard label="A Receber no Dia" value={fmt(stats.total_pending)} color="#f59e0b" sub="Saldo dos atendimentos" />
      </div>

      {/* Projeção e métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard label="Ticket Médio" value={fmt(stats.ticket_medio)} color="#6366f1" sub="Por atendimento" />
        <StatCard label="Projeção Mensal" value={fmt(projecaoMensal)} color="#128C7E" sub="Base: 20 atend./mês" />
        <StatCard label="Taxa de Recebimento" value={`${taxaRecebimento}%`} color="#ec4899" sub="Sinais / Total gerado" />
      </div>

      {/* Tabela por categoria */}
      <Card>
        <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>💰 Faturamento por categoria</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#fdf1f6' }}>
                {['Categoria', 'Atendimentos', 'Receita estimada'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--primary-color)', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'cilios', label: '💅 Cílios' },
                { cat: 'sobrancelha', label: '🪄 Sobrancelhas' },
                { cat: 'remocao', label: '🧪 Remoções' },
              ].map(({ cat, label }) => {
                const itens = (stats.services || []).filter(s => s.category === cat);
                const total = itens.reduce((a, s) => a + s.total, 0);
                const receita = total * stats.ticket_medio;
                return (
                  <tr key={cat} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px' }}>{label}</td>
                    <td style={{ padding: '10px 14px' }}>{total}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{fmt(receita)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── ABA: CONFIGURAÇÕES ──────────────────────────────────────────────────────

// Agrupa datas consecutivas com mesmo motivo para exibição como faixa
function agruparBloqueios(slots) {
  if (!slots.length) return [];
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const groups = [];
  let grupo = { ids: [sorted[0].id], inicio: sorted[0].date, fim: sorted[0].date, reason: sorted[0].reason };

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    prevDate.setDate(prevDate.getDate() + 1);
    const prevNext = prevDate.toISOString().split('T')[0];
    const mesmomotivo = sorted[i].reason === sorted[i - 1].reason;
    if (prevNext === sorted[i].date && mesmomotivo) {
      grupo.ids.push(sorted[i].id);
      grupo.fim = sorted[i].date;
    } else {
      groups.push(grupo);
      grupo = { ids: [sorted[i].id], inicio: sorted[i].date, fim: sorted[i].date, reason: sorted[i].reason };
    }
  }
  groups.push(grupo);
  return groups;
}

function fmtDiaMes(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function ConfiguracoesTab({ blockedSlots, onRefresh }) {
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd]     = useState('');
  const [reason, setReason]       = useState('');
  const [loading, setLoading]     = useState(false);

  const hoje = new Date().toISOString().split('T')[0];

  const bloquear = async () => {
    if (!dateStart) return alert('Escolha a data de início.');
    const fim = dateEnd || dateStart;
    if (fim < dateStart) return alert('A data final deve ser igual ou posterior à data inicial.');
    setLoading(true);
    try {
      await api.post('/blocked-slots/range/', {
        date_start: dateStart,
        date_end: fim,
        reason: reason || null,
      });
      setDateStart(''); setDateEnd(''); setReason('');
      onRefresh();
    } catch { alert('Erro ao bloquear período.'); }
    finally { setLoading(false); }
  };

  const desbloquearGrupo = async (ids) => {
    const plural = ids.length > 1 ? `os ${ids.length} dias deste período` : 'este dia';
    if (!window.confirm(`Desbloquear ${plural}?`)) return;
    try {
      await Promise.all(ids.map(id => api.delete(`/blocked-slots/${id}/`)));
      onRefresh();
    } catch { alert('Erro ao desbloquear.'); }
  };

  const grupos = agruparBloqueios(blockedSlots);

  return (
    <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
      {/* Fechar agenda */}
      <Card>
        <h3 style={{ color: 'var(--primary-color)', marginBottom: '8px', fontWeight: '700' }}>🔒 Fechar agenda</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>
          Selecione um dia ou período. As datas bloqueadas não aparecerão para agendamento.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Data de início *</label>
            <input
              type="date"
              value={dateStart}
              min={hoje}
              onChange={e => {
                setDateStart(e.target.value);
                // auto-preenche fim com o mesmo dia se ainda não foi escolhido
                if (!dateEnd || dateEnd < e.target.value) setDateEnd(e.target.value);
              }}
            />
          </div>
          <div className="form-group">
            <label>Data de fim</label>
            <input
              type="date"
              value={dateEnd}
              min={dateStart || hoje}
              onChange={e => setDateEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Motivo (opcional)</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: Viagem, compromisso pessoal, feriado..."
          />
        </div>

        <button className="btn-primary" onClick={bloquear} disabled={loading}>
          {loading ? 'Bloqueando...' : '🔒 Bloquear período'}
        </button>
      </Card>

      {/* Períodos bloqueados */}
      <Card>
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>
          📅 Períodos bloqueados
          {blockedSlots.length > 0 && (
            <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>
              ({blockedSlots.length} dia{blockedSlots.length > 1 ? 's' : ''})
            </span>
          )}
        </h3>

        {grupos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma data bloqueada no momento.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {grupos.map((g, i) => {
              const isSingleDay = g.inicio === g.fim;
              const label = isSingleDay
                ? `📅 ${fmtDiaMes(g.inicio)}`
                : `📅 ${fmtDiaMes(g.inicio)} → ${fmtDiaMes(g.fim)}`;
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', background: '#fdf1f6', borderRadius: '8px', gap: '10px'
                }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--primary-color)', fontSize: '0.95rem' }}>{label}</strong>
                    {!isSingleDay && (
                      <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        ({g.ids.length} dias)
                      </span>
                    )}
                    {g.reason && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '3px 0 0' }}>{g.reason}</p>
                    )}
                  </div>
                  <button onClick={() => desbloquearGrupo(g.ids)} style={{
                    background: '#fee2e2', color: '#dc2626', border: 'none',
                    borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                    fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap'
                  }}>
                    Desbloquear
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

const TABS = [
  { id: 'agenda',     label: '📅 Agenda' },
  { id: 'novo',       label: '➕ Novo Atendimento' },
  { id: 'stats',      label: '📊 Estatísticas' },
  { id: 'financeiro', label: '💰 Financeiro' },
  { id: 'config',     label: '⚙️ Configurações' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('agenda');
  const [appointments, setAppointments] = useState([]);
  const [services, setServices]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const fetchAll = async () => {
    try {
      const [a, s, st, b] = await Promise.all([
        api.get('/appointments/'),
        api.get('/services/'),
        api.get('/stats/'),
        api.get('/blocked-slots/'),
      ]);
      setAppointments(a.data);
      setServices(s.data);
      setStats(st.data);
      setBlockedSlots(b.data);
    } catch (err) {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '80px' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
      <h2 className="title">Carregando painel...</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Se demorar muito, o servidor pode estar iniciando — aguarde 30 segundos.</p>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', marginTop: '80px', padding: '20px' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
      <h2 className="title" style={{ color: '#d9534f' }}>Servidor offline</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
      <button className="btn-primary" style={{ maxWidth: '220px', margin: '0 auto' }}
        onClick={() => { setError(null); setLoading(true); fetchAll(); }}>
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border-color)', padding: '16px 24px' }}>
        <h2 style={{ color: 'var(--primary-color)', fontWeight: '800', fontSize: '1.5rem', margin: 0 }}>
          ✨ Painel da Giovanna
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border-color)', display: 'flex', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '14px 18px',
            border: 'none', background: 'none',
            borderBottom: activeTab === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === tab.id ? '700' : '400',
            cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.88rem', transition: 'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
        {activeTab === 'agenda'     && <AgendaTab appointments={appointments} onRefresh={fetchAll} />}
        {activeTab === 'novo'       && <NovoAtendimentoTab services={services} onRefresh={fetchAll} />}
        {activeTab === 'stats'      && <EstatisticasTab stats={stats} appointments={appointments} />}
        {activeTab === 'financeiro' && <FinanceiroTab stats={stats} />}
        {activeTab === 'config'     && <ConfiguracoesTab blockedSlots={blockedSlots} onRefresh={fetchAll} />}
      </div>
    </div>
  );
}
