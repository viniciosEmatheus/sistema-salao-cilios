r"""
Teoria da Informação
=====================

Implementações *from scratch* das medidas de teoria da informação que
sustentam boa parte da análise de segurança de redes.

Por que teoria da informação em segurança?
------------------------------------------
* **Entropia de portas/IPs**: um *port scan* ou um *sweep* de rede
  distribui conexões por muitos destinos/portas, elevando a entropia.
* **Detecção de DGA**: domínios gerados por algoritmo (usados por
  malware para *command-and-control*) têm entropia de caracteres muito
  mais alta do que domínios legítimos.
* **Tráfego criptografado / comprimido**: aproxima-se de uma fonte de
  máxima entropia.
* **Seleção de atributos**: a *informação mútua* mede o quanto um
  atributo "conta" sobre o rótulo (benigno/ataque).

Definições
----------
Entropia de Shannon (em bits, log base 2):

.. math::

    H(X) = -\sum_{x} p(x) \, \log_2 p(x)

Informação mútua:

.. math::

    I(X; Y) = \sum_{x, y} p(x, y) \, \log_2 \frac{p(x, y)}{p(x)\,p(y)}
            = H(X) - H(X \mid Y)

Divergência de Kullback-Leibler:

.. math::

    D_{\mathrm{KL}}(P \,\|\, Q) = \sum_{x} p(x) \, \log_2 \frac{p(x)}{q(x)}
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable, Sequence

import numpy as np

__all__ = [
    "shannon_entropy",
    "normalized_entropy",
    "joint_entropy",
    "conditional_entropy",
    "mutual_information",
    "kl_divergence",
    "js_divergence",
    "char_entropy",
]

_EPS = 1e-12


def _as_probabilities(counts: np.ndarray) -> np.ndarray:
    """Converte um vetor de contagens/pesos não negativos em uma distribuição."""
    counts = np.asarray(counts, dtype=float)
    if np.any(counts < 0):
        raise ValueError("As contagens não podem ser negativas.")
    total = counts.sum()
    if total <= 0:
        raise ValueError("A soma das contagens deve ser positiva.")
    return counts / total


def shannon_entropy(data: Iterable, base: float = 2.0) -> float:
    r"""Entropia de Shannon de uma amostra de símbolos discretos.

    Estima :math:`H(X) = -\sum_x p(x) \log_b p(x)` a partir das
    frequências empíricas dos símbolos em ``data``.

    Parameters
    ----------
    data:
        Sequência de símbolos *hashable* (ints, strings, tuplas...).
    base:
        Base do logaritmo. ``2`` retorna bits; ``np.e`` retorna nats.

    Returns
    -------
    float
        Entropia estimada, em ``[0, log_b(k)]`` para ``k`` símbolos
        distintos.

    Examples
    --------
    >>> round(shannon_entropy([0, 0, 1, 1]), 6)  # moeda justa
    1.0
    >>> shannon_entropy([7, 7, 7, 7])  # sem incerteza
    0.0
    """
    counts = np.fromiter(Counter(data).values(), dtype=float)
    if counts.size == 0:
        return 0.0
    p = counts / counts.sum()
    # O `+ 0.0` normaliza o zero-negativo (-0.0) que surge quando H = 0.
    return float(-np.sum(p * (np.log(p) / np.log(base)))) + 0.0


def normalized_entropy(data: Iterable, base: float = 2.0) -> float:
    r"""Entropia normalizada (*efficiency*) no intervalo :math:`[0, 1]`.

    Divide a entropia observada pela entropia máxima possível
    :math:`\log_b k`, onde ``k`` é o número de símbolos distintos.
    Útil para comparar fontes com alfabetos de tamanhos diferentes.
    """
    counts = np.fromiter(Counter(data).values(), dtype=float)
    k = counts.size
    if k <= 1:
        return 0.0
    max_entropy = np.log(k) / np.log(base)
    return float(shannon_entropy(data, base=base) / max_entropy)


def _joint_counts(x: Sequence, y: Sequence) -> Counter:
    if len(x) != len(y):
        raise ValueError("x e y devem ter o mesmo comprimento.")
    return Counter(zip(x, y, strict=True))


def joint_entropy(x: Sequence, y: Sequence, base: float = 2.0) -> float:
    r"""Entropia conjunta :math:`H(X, Y)`."""
    counts = np.fromiter(_joint_counts(x, y).values(), dtype=float)
    p = counts / counts.sum()
    # O `+ 0.0` normaliza o zero-negativo (-0.0) que surge quando H = 0.
    return float(-np.sum(p * (np.log(p) / np.log(base)))) + 0.0


def conditional_entropy(x: Sequence, y: Sequence, base: float = 2.0) -> float:
    r"""Entropia condicional :math:`H(X \mid Y) = H(X, Y) - H(Y)`.

    Mede a incerteza remanescente sobre ``x`` uma vez conhecido ``y``.
    """
    return joint_entropy(x, y, base=base) - shannon_entropy(y, base=base)


def mutual_information(x: Sequence, y: Sequence, base: float = 2.0) -> float:
    r"""Informação mútua :math:`I(X; Y) = H(X) + H(Y) - H(X, Y)`.

    Quantifica a redução de incerteza sobre ``x`` ao observar ``y``
    (e vice-versa). Vale ``0`` sse e somente se ``x`` e ``y`` são
    independentes; caso contrário é positiva.

    Examples
    --------
    >>> x = [0, 0, 1, 1]
    >>> round(mutual_information(x, x), 6)  # I(X;X) = H(X)
    1.0
    """
    hx = shannon_entropy(x, base=base)
    hy = shannon_entropy(y, base=base)
    hxy = joint_entropy(x, y, base=base)
    # Clampa em 0 para absorver erro numérico (I nunca é negativa).
    return float(max(0.0, hx + hy - hxy))


def kl_divergence(
    p: np.ndarray, q: np.ndarray, base: float = 2.0
) -> float:
    r"""Divergência de Kullback-Leibler :math:`D_{\mathrm{KL}}(P \| Q)`.

    Mede quantos bits extras são gastos, em média, ao codificar amostras
    de ``P`` usando um código otimizado para ``Q``. **Não é simétrica**.

    Ambos os vetores são normalizados para somar 1. Um :math:`\epsilon`
    pequeno é adicionado a ``q`` para evitar divisão por zero — de modo
    que o suporte de ``P`` deve estar contido no de ``Q``.

    Raises
    ------
    ValueError
        Se ``p`` e ``q`` tiverem formatos diferentes.
    """
    p = _as_probabilities(p)
    q = _as_probabilities(q)
    if p.shape != q.shape:
        raise ValueError("p e q devem ter o mesmo formato.")
    q = q + _EPS
    q = q / q.sum()
    mask = p > 0
    return float(np.sum(p[mask] * (np.log(p[mask] / q[mask]) / np.log(base))))


def js_divergence(p: np.ndarray, q: np.ndarray, base: float = 2.0) -> float:
    r"""Divergência de Jensen-Shannon — versão simétrica e limitada da KL.

    .. math::

        \mathrm{JSD}(P \| Q) = \tfrac{1}{2} D_{\mathrm{KL}}(P \| M)
                             + \tfrac{1}{2} D_{\mathrm{KL}}(Q \| M),
        \quad M = \tfrac{1}{2}(P + Q)

    Em bits, está em :math:`[0, 1]`. Sua raiz quadrada é uma métrica de
    verdade (satisfaz a desigualdade triangular).
    """
    p = _as_probabilities(p)
    q = _as_probabilities(q)
    m = 0.5 * (p + q)
    return float(0.5 * kl_divergence(p, m, base) + 0.5 * kl_divergence(q, m, base))


def char_entropy(text: str, base: float = 2.0) -> float:
    r"""Entropia de caracteres de uma string — detector clássico de DGA.

    Domínios legítimos (``google``, ``facebook``) tendem a ter entropia
    de caracteres mais baixa do que domínios gerados por algoritmo
    (``kq3v9z7wx1p``), que se aproximam de uma fonte uniforme.

    Examples
    --------
    >>> char_entropy("aaaa")
    0.0
    >>> char_entropy("google") < char_entropy("xq3v9z7w")
    True
    """
    if not text:
        return 0.0
    return shannon_entropy(list(text), base=base)
