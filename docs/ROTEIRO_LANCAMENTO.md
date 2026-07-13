# 🚀 Roteiro de Lançamento — cyber-data-lab

> Do protótipo ao produto: um plano honesto do que existe hoje até um
> serviço comercial de detecção de intrusão, com os **portões de segurança
> e conformidade embutidos em cada fase**. Ancorado numa revisão de
> segurança do código atual (13/07/2026).
>
> Versão visual e interativa deste roteiro: veja o site (`site/index.html`)
> e o painel publicado.

---

## Ponto de partida — revisão de segurança

A superfície de ataque **atual é pequena**: o produto ainda é uma
biblioteca de pesquisa offline mais um site estático. É a base limpa ideal
para construir com segurança desde o primeiro dia.

**✓ Motor de detecção (Python) — baixo risco**
- Nenhum padrão perigoso: sem `eval`, `exec`, `pickle`, `subprocess`, `socket` ou chamadas de rede.
- Única entrada externa: leitura de CSV local (`pandas.read_csv`) — sem desserialização insegura.
- Sem segredos ou credenciais no código.
- 56 testes automatizados travam a corretude da matemática a cada alteração.

**✓ Site / landing (estático) — baixo risco**
- 100% estático: sem backend, sem banco de dados, sem estado no servidor.
- Não coleta dados: nenhum formulário, cookie, `localStorage` ou rastreamento.
- Zero chamadas a terceiros — todo o JS/CSS é próprio e embutido.
- Dados exibidos são 100% sintéticos.

**⚠ Onde os riscos aparecem (no futuro)**
- Coletar tráfego real de clientes → dado sensível em trânsito e repouso.
- Multi-tenant: vazamento de dados entre clientes é o risco nº 1 de um SaaS.
- O próprio modelo vira alvo (envenenamento) — o cérebro do site é a defesa.
- Agente coletor na rede do cliente → privilégio, atualização, credenciais.
- Cadeia de suprimentos: dependências e pipeline de build.
- Autenticação, API e painel → superfície web clássica (OWASP Top 10).

---

## As seis fases

| Fase | Nome | Estado | Prazo estimado |
|------|------|--------|----------------|
| 0 | Fundação | ✅ concluído | feito |
| 1 | Validação científica | 🔵 em curso | ~3–5 semanas |
| 2 | Coletor & piloto | próxima | ~6–10 semanas |
| 3 | Plataforma multi-tenant | próxima | ~10–16 semanas |
| 4 | Conformidade & certificação | contínuo | 6–12 meses |
| 5 | Lançamento & operação | meta | GA + contínuo |

### Fase 0 — Fundação ✅
**Objetivo:** provar a ciência e ter uma vitrine pública do produto.
- **Entregas:** motor com matemática do zero + 56 testes; pipeline de EDA reproduzível; landing page + simulador do cérebro; deploy estático e código aberto.
- **🔒 Portão:** superfície mínima confirmada por varredura; apenas dados sintéticos.
- **Pronto quando:** o site está no ar e o `pytest` passa verde no CI.

### Fase 1 — Validação científica 🔵
**Objetivo:** sair do dado sintético e provar o detector contra um benchmark real.
- **Entregas:** rodar o pipeline sobre o **NSL-KDD**; curvas ROC/PR e matriz de confusão; reduzir falsos positivos; relatório comparativo aberto.
- **🔒 Portão:** dataset de licença compatível, sem PII; resultados versionados e reproduzíveis.
- **Pronto quando:** as métricas em dado real estão publicadas e batem com a promessa da landing.

### Fase 2 — Coletor & piloto
**Objetivo:** levar o motor ao tráfego real de um cliente amigo — a prova de valor de 14 dias.
- **Entregas:** agente coletor (NetFlow/IPFIX/pcap → fluxos); ingestão + treino do perfil "normal" por cliente; painel de alertas; 1–3 pilotos com relatório.
- **🔒 Portão:** anonimização na borda (só metadados de fluxo saem); criptografia em trânsito (mTLS) e repouso; coletor com privilégio mínimo e auto-atualização assinada; termo de tratamento de dados assinado.
- **Pronto quando:** um piloto real gera alertas úteis sem que dado bruto do cliente saia da rede dele.

### Fase 3 — Plataforma multi-tenant
**Objetivo:** transformar o piloto num serviço que atende muitos clientes com isolamento garantido.
- **Entregas:** autenticação, RBAC e painel multi-cliente; API e marca branca (MSPs); alertas por e-mail/Slack e trilha de auditoria; backups, observabilidade e SLOs.
- **🔒 Portão:** isolamento entre tenants testado (risco nº 1); SSDLC (SAST, DAST, scan de dependências no CI); gestão de segredos (cofre) e rotação de chaves; **pentest externo** antes do primeiro cliente pago; modelagem de ameaças + defesa contra envenenamento do modelo.
- **Pronto quando:** o pentest não encontra falha alta/crítica e o vazamento entre tenants é comprovadamente impossível.

### Fase 4 — Conformidade & certificação
**Objetivo:** ganhar o direito de vender para setores regulados.
- **Entregas:** LGPD formal (registro de tratamento, DPIA, DPA); política de resposta a incidentes e disclosure; **ISO/IEC 27001** (SGSI); **SOC 2 Tipo II**.
- **🔒 Portão:** auditoria externa sem não-conformidades maiores; runbook de incidentes testado; retenção/eliminação de dados conforme LGPD.
- **Pronto quando:** o quadro de conformidade do site sai de "planejado" para "certificado", com evidência.

### Fase 5 — Lançamento & operação
**Objetivo:** disponibilidade geral, operação 24×7 e melhoria contínua.
- **Entregas:** GA com SLA e planos publicados; plantão (on-call), status page e SLOs; explicabilidade (XAI/ShaTS) no painel; roadmap de federação real (NEBULA).
- **🔒 Portão:** programa de gestão de vulnerabilidades ativo; pentest anual + bug bounty; revisão de segurança em todo release.
- **Pronto quando:** clientes pagantes operam em produção com SLA cumprido e incidentes sob processo.

---

## Matriz de risco da produtização

| Risco | Severidade | Mitigação | Resolve na |
|-------|-----------|-----------|------------|
| Vazamento de dados entre clientes (multi-tenant) | 🔴 crítico | Isolamento por tenant testado; chaves por cliente; testes de fuga automatizados | Fase 3 |
| Dado bruto sensível saindo da rede do cliente | 🔴 crítico | Anonimização na borda — só metadados; mTLS + repouso cifrado | Fase 2 |
| Envenenamento do próprio modelo de detecção | 🟠 alto | Auditoria de reputação (o cérebro do site) + validação de atualizações | Fase 3 |
| Comprometimento do agente coletor | 🟠 alto | Privilégio mínimo, binário assinado, auto-update verificado, sem shell remoto | Fase 2 |
| Cadeia de suprimentos (dependências e build) | 🟡 médio | Pin de versões, scan de dependências no CI, SBOM, build reproduzível | Fase 3 |
| Superfície web (auth, API, painel — OWASP) | 🟡 médio | RBAC, rate limiting, SAST/DAST no CI, pentest externo | Fase 3 |

---

## Portões de todo release (a partir da Fase 3)

Automatizados no CI sempre que possível — segurança como parte do fluxo, não um evento.

- **🔍 SAST + DAST** — análise estática e dinâmica a cada PR, bloqueando merge com falha alta.
- **📦 Dependências** — scan de CVEs e SBOM gerado; nenhuma dependência com vulnerabilidade crítica conhecida.
- **🔑 Segredos** — secret scanning no repositório e no histórico; segredos só no cofre.
- **🧪 Testes + cobertura** — suíte verde e cobertura mínima; testes de isolamento entre tenants incluídos.
- **🛡️ Modelagem de ameaças** — toda mudança que abre nova superfície passa por revisão antes do código.
- **📝 Trilha de auditoria** — logs imutáveis de acesso e de cada anomalia tratada (evidência para LGPD e clientes).

---

*Documento vivo — revisar a cada fase concluída. Prazos são estimativas para
uma equipe pequena e devem ser recalibrados a cada marco.*
