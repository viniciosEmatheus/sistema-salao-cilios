# Dados

Este diretório guarda os datasets. Os arquivos brutos **não** são
versionados (veja o `.gitignore`) — apenas as instruções para obtê-los.

## Dados sintéticos (padrão, offline)

Nada a baixar. O gerador em
`cyber_data_lab.data_generation.generate_flows` produz um dataset de
fluxos de rede rotulado e reprodutível, em memória:

```python
from cyber_data_lab.loaders import load_synthetic

df = load_synthetic(n_flows=20_000, seed=42)
```

## NSL-KDD (dataset real de detecção de intrusão)

O [NSL-KDD](https://www.unb.ca/cic/datasets/nsl.html) é uma versão
saneada do KDD Cup 1999, sem os registros duplicados que enviesavam os
classificadores. É um clássico para benchmark de detecção de intrusão.

### Como obter

1. Baixe o dataset da página da Universidade de New Brunswick (CIC):
   <https://www.unb.ca/cic/datasets/nsl.html>
2. Coloque os arquivos `KDDTrain+.txt` e `KDDTest+.txt` **neste
   diretório** (`data/`).
3. Carregue com:

   ```python
   from cyber_data_lab.loaders import load_nsl_kdd

   train = load_nsl_kdd(split="train")
   test = load_nsl_kdd(split="test")
   ```

O carregador aplica os nomes de coluna canônicos (41 atributos + rótulo +
dificuldade) e adiciona uma coluna binária `is_attack`.

> **Nota:** o dataset é distribuído para fins de pesquisa. Confira os
> termos de uso na página do CIC antes de redistribuir.
