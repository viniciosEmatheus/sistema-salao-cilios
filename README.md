# 🛡️ cyber-data-lab

> Um laboratório de **análise exploratória de dados (EDA)** voltado para
> **segurança da informação e redes**, com um núcleo matemático
> implementado do zero.

`cyber-data-lab` mistura duas filosofias de propósito: **implementar do
zero** os conceitos matemáticos que sustentam a detecção de intrusão
(entropia de Shannon, informação mútua, divergências, PCA, distância de
Mahalanobis) — para entender a matemática por dentro — e **reaproveitar
bibliotecas maduras** (`numpy`, `scipy`, `scikit-learn`) para o restante
do fluxo de análise.

O projeto roda **imediatamente e offline**, gerando um dataset sintético
e realista de fluxos de rede. Quando quiser, é só plugar o dataset real
**NSL-KDD**.

---

## ✨ Por que segurança de redes + teoria da informação?

Segurança de redes é um dos domínios onde a teoria da informação e a
estatística realmente brilham:

| Fenômeno de ataque | Assinatura matemática |
|---|---|
| **Port scan** | Alta **entropia de portas** de destino (conexões espalhadas por milhares de portas) |
| **DGA / C2** | Alta **entropia de caracteres** nos nomes de domínio gerados por algoritmo |
| **DDoS** | Entropia de portas ≈ 0 + taxa de pacotes extrema (cauda pesada) |
| **Exfiltração** | Fluxos longos, razão de bytes de saída elevada |
| **Anomalias em geral** | Grande **distância de Mahalanobis** ao perfil de tráfego normal |

---

## 📐 O núcleo matemático

**Entropia de Shannon** — incerteza de uma fonte discreta:

$$H(X) = -\sum_{x} p(x)\,\log_2 p(x)$$

**Informação mútua** — quanto um atributo "conta" sobre o rótulo:

$$I(X; Y) = \sum_{x,y} p(x,y)\,\log_2\frac{p(x,y)}{p(x)\,p(y)} = H(X) - H(X\mid Y)$$

**Divergência de Kullback-Leibler** — custo (em bits) de assumir a
distribuição errada:

$$D_{\mathrm{KL}}(P\,\|\,Q) = \sum_x p(x)\,\log_2\frac{p(x)}{q(x)}$$

**PCA** (via SVD) — direções de máxima variância, autovetores de
$\Sigma = \tfrac{1}{n-1}X^\top X$:

$$X = U S V^\top \quad\Longrightarrow\quad \lambda_i = \frac{s_i^2}{n-1}$$

**Distância de Mahalanobis** — distância ao centro corrigida pela
covariância; sob normalidade, $D_M^2 \sim \chi^2_d$ dá um limiar com
significância estatística:

$$D_M(\mathbf{x}) = \sqrt{(\mathbf{x}-\boldsymbol{\mu})^\top \Sigma^{-1}(\mathbf{x}-\boldsymbol{\mu})}$$

---

## 📦 Estrutura

```
cyber-data-lab/
├── src/cyber_data_lab/
│   ├── information_theory.py   # entropia, informação mútua, KL/JS  (do zero)
│   ├── statistics.py           # descritiva + testes de hipótese
│   ├── dimensionality.py       # PCA via SVD                        (do zero)
│   ├── anomaly_detection.py    # z-score, IQR, Mahalanobis, IsoForest
│   ├── data_generation.py      # gerador sintético de fluxos de rede
│   ├── loaders.py              # dados sintéticos ou NSL-KDD real
│   └── viz.py                  # auxiliares de visualização
├── notebooks/eda.py            # pipeline de EDA de ponta a ponta
├── tests/                      # 56 testes (pytest) validando a matemática
├── data/                       # datasets locais (ver data/README.md)
└── reports/                    # figuras geradas
```

---

## 🚀 Começando

```bash
# 1. Crie o ambiente e instale (com ferramentas de dev)
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"          # ou: make install-dev

# 2. Rode a análise exploratória completa (offline, dados sintéticos)
python notebooks/eda.py          # ou: make eda

# 3. Rode os testes
pytest                           # ou: make test
```

### Uso da API

```python
from cyber_data_lab.loaders import load_synthetic
from cyber_data_lab import information_theory as it
from cyber_data_lab.anomaly_detection import MahalanobisDetector

df = load_synthetic(n_flows=20_000, seed=42)

# Entropia da porta de destino por classe → o port scan salta aos olhos
for label, g in df.groupby("label"):
    print(label, round(it.shannon_entropy(g["dst_port"]), 2))

# Detector de anomalias treinado só com tráfego benigno
benign = df[df.is_attack == 0][["duration", "src_bytes", "packets"]].to_numpy()
det = MahalanobisDetector(alpha=0.01).fit(benign)
```

---

## 🔬 O que o pipeline de EDA faz

`notebooks/eda.py` percorre uma investigação completa:

1. **Caracterização** — estatística descritiva (assimetria/curtose revelam
   as caudas pesadas típicas de tráfego de rede).
2. **Testes de hipótese** — Welch e Mann-Whitney contrastam benigno vs.
   ataque.
3. **Teoria da informação** — entropia de portas isola o *port scan*;
   entropia de caracteres isola o *DGA*.
4. **Seleção de atributos** — ranqueia atributos por informação mútua com
   o rótulo.
5. **PCA do zero** — projeta o espaço de atributos e mede a variância
   explicada.
6. **Detecção de anomalias** — Mahalanobis treinado só em tráfego benigno
   recupera as intrusões (precisão/recall/F1).

Resultado típico da seção de teoria da informação:

```
Entropia de Shannon da porta de destino, por classe (bits):
        benign:  2.999
          ddos:  0.000
        dga_c2:  1.582
     port_scan: 10.411   ← varredura espalha conexões por milhares de portas
```

---

## 🧪 Qualidade

- **56 testes** (`pytest`) validando propriedades matemáticas (ex.:
  $I(X;X) = H(X)$, $D_{\mathrm{KL}}(P\|P)=0$, ortonormalidade dos
  componentes do PCA, $D_M^2$ vs. autovalores da covariância).
- **Doctests** nos exemplos das docstrings.
- **Ruff** para lint e formatação.

```bash
make test    # pytest + cobertura
make lint    # ruff
```

---

## 📚 Dados reais: NSL-KDD

O gerador sintético torna o projeto autônomo, mas você pode usar o
clássico **NSL-KDD** de detecção de intrusão — veja
[`data/README.md`](data/README.md) para o download e o carregamento com
`cyber_data_lab.loaders.load_nsl_kdd`.

---

## 🗺️ Ideias de próximos passos

- Detecção de DGA supervisionada usando entropia de caracteres + n-gramas.
- Análise de séries temporais do *beaconing* de C2 (periodicidade).
- Curvas ROC/PR comparando os detectores de anomalia.
- Estimador de informação mútua contínuo (kNN / Kraskov).

---

## 📄 Licença

[MIT](LICENSE).
