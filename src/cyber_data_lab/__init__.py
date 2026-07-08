"""
cyber_data_lab
==============

Um laboratório de análise exploratória de dados (EDA) voltado para
**segurança da informação e redes de computadores**, com um núcleo
matemático implementado do zero.

O pacote combina duas filosofias:

* **Implementar do zero** os conceitos-chave (entropia de Shannon,
  informação mútua, divergência KL, PCA, distância de Mahalanobis) para
  entender a matemática por dentro.
* **Reaproveitar bibliotecas maduras** (``numpy``, ``scipy``,
  ``scikit-learn``) para o restante do fluxo de análise.

Módulos principais
-------------------
``information_theory``
    Entropia, informação mútua e divergências — a espinha dorsal
    matemática da detecção de anomalias em tráfego e da identificação
    de domínios gerados por algoritmo (DGA).
``statistics``
    Estatística descritiva e testes de hipótese.
``dimensionality``
    Análise de Componentes Principais (PCA) via decomposição espectral
    e SVD.
``anomaly_detection``
    Detectores estatísticos de anomalias (z-score, IQR, Mahalanobis,
    Isolation Forest).
``data_generation``
    Gerador sintético e reprodutível de fluxos (*flows*) de rede.
``loaders``
    Carregamento de dados sintéticos ou do dataset real NSL-KDD.
``viz``
    Auxiliares de visualização.
"""

from __future__ import annotations

__version__ = "0.1.0"

from . import (
    anomaly_detection,
    data_generation,
    dimensionality,
    information_theory,
    loaders,
    statistics,
)

__all__ = [
    "information_theory",
    "statistics",
    "dimensionality",
    "anomaly_detection",
    "data_generation",
    "loaders",
    "__version__",
]
