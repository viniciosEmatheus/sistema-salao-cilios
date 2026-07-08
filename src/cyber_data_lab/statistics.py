r"""
Estatística descritiva e inferencial
=====================================

Um conjunto enxuto de estatísticas implementadas do zero (com ``numpy``
apenas como motor de álgebra vetorial) mais dois testes de hipótese
clássicos delegados ao ``scipy`` — a filosofia "mista" do projeto.

As estatísticas descritivas são úteis em EDA de segurança para
caracterizar distribuições de bytes, durações de fluxo e contagens de
pacotes, que costumam ser fortemente assimétricas e de cauda pesada.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from scipy import stats as _sp_stats

__all__ = [
    "DescriptiveStats",
    "describe",
    "coefficient_of_variation",
    "skewness",
    "kurtosis",
    "iqr",
    "tukey_fences",
    "welch_t_test",
    "mann_whitney_u",
    "TestResult",
]


@dataclass(frozen=True)
class DescriptiveStats:
    """Resumo descritivo de um vetor numérico unidimensional."""

    n: int
    mean: float
    std: float
    minimum: float
    q1: float
    median: float
    q3: float
    maximum: float
    skewness: float
    kurtosis: float

    def as_dict(self) -> dict[str, float]:
        return {
            "n": self.n,
            "mean": self.mean,
            "std": self.std,
            "min": self.minimum,
            "q1": self.q1,
            "median": self.median,
            "q3": self.q3,
            "max": self.maximum,
            "skewness": self.skewness,
            "kurtosis": self.kurtosis,
        }


def _clean(x: Sequence[float]) -> np.ndarray:
    arr = np.asarray(x, dtype=float).ravel()
    arr = arr[~np.isnan(arr)]
    if arr.size == 0:
        raise ValueError("O vetor está vazio após remover NaNs.")
    return arr


def skewness(x: Sequence[float]) -> float:
    r"""Assimetria (terceiro momento padronizado), estimador de Fisher-Pearson.

    .. math::

        g_1 = \frac{\frac{1}{n}\sum (x_i - \bar{x})^3}
                   {\left(\frac{1}{n}\sum (x_i - \bar{x})^2\right)^{3/2}}
    """
    arr = _clean(x)
    m = arr.mean()
    diff = arr - m
    m2 = np.mean(diff**2)
    m3 = np.mean(diff**3)
    if m2 == 0:
        return 0.0
    return float(m3 / m2**1.5)


def kurtosis(x: Sequence[float], excess: bool = True) -> float:
    r"""Curtose (quarto momento padronizado).

    Por padrão retorna a *curtose em excesso* (subtraindo 3, de modo que
    a normal tem curtose 0). Distribuições de tráfego de rede costumam
    ter curtose alta (caudas pesadas → *bursts* e *outliers*).
    """
    arr = _clean(x)
    diff = arr - arr.mean()
    m2 = np.mean(diff**2)
    m4 = np.mean(diff**4)
    if m2 == 0:
        return 0.0
    k = m4 / m2**2
    return float(k - 3.0 if excess else k)


def coefficient_of_variation(x: Sequence[float]) -> float:
    r"""Coeficiente de variação :math:`CV = \sigma / \mu` (adimensional).

    Permite comparar a dispersão relativa entre variáveis de escalas
    diferentes (ex.: bytes vs. duração de fluxo).
    """
    arr = _clean(x)
    mu = arr.mean()
    if mu == 0:
        return float("nan")
    return float(arr.std(ddof=1) / mu)


def iqr(x: Sequence[float]) -> float:
    """Amplitude interquartílica :math:`Q_3 - Q_1`."""
    arr = _clean(x)
    q1, q3 = np.percentile(arr, [25, 75])
    return float(q3 - q1)


def tukey_fences(x: Sequence[float], k: float = 1.5) -> tuple[float, float]:
    r"""Cercas de Tukey para *outliers*: :math:`[Q_1 - k\cdot IQR,\; Q_3 + k\cdot IQR]`.

    ``k = 1.5`` marca *outliers* "leves"; ``k = 3.0`` marca *outliers*
    "extremos".
    """
    arr = _clean(x)
    q1, q3 = np.percentile(arr, [25, 75])
    spread = q3 - q1
    return float(q1 - k * spread), float(q3 + k * spread)


def describe(x: Sequence[float]) -> DescriptiveStats:
    """Resumo descritivo completo de um vetor numérico."""
    arr = _clean(x)
    q1, med, q3 = np.percentile(arr, [25, 50, 75])
    return DescriptiveStats(
        n=int(arr.size),
        mean=float(arr.mean()),
        std=float(arr.std(ddof=1)) if arr.size > 1 else 0.0,
        minimum=float(arr.min()),
        q1=float(q1),
        median=float(med),
        q3=float(q3),
        maximum=float(arr.max()),
        skewness=skewness(arr),
        kurtosis=kurtosis(arr),
    )


@dataclass(frozen=True)
class TestResult:
    """Resultado de um teste de hipótese."""

    name: str
    statistic: float
    p_value: float
    alpha: float = 0.05

    @property
    def reject_null(self) -> bool:
        """``True`` se rejeitamos :math:`H_0` no nível ``alpha``."""
        return self.p_value < self.alpha

    def summary(self) -> str:
        decisao = "rejeita H0" if self.reject_null else "não rejeita H0"
        return (
            f"{self.name}: estatística={self.statistic:.4f}, "
            f"p={self.p_value:.4g} ({decisao} @ alpha={self.alpha})"
        )


def welch_t_test(
    a: Sequence[float], b: Sequence[float], alpha: float = 0.05
) -> TestResult:
    r"""Teste t de Welch para diferença de médias (variâncias desiguais).

    :math:`H_0`: as duas amostras têm a mesma média. Preferível ao teste
    t de Student quando as variâncias diferem — comum ao comparar tráfego
    benigno vs. de ataque.
    """
    stat, p = _sp_stats.ttest_ind(
        _clean(a), _clean(b), equal_var=False
    )
    return TestResult("Welch t-test", float(stat), float(p), alpha)


def mann_whitney_u(
    a: Sequence[float], b: Sequence[float], alpha: float = 0.05
) -> TestResult:
    r"""Teste U de Mann-Whitney (não paramétrico).

    :math:`H_0`: as duas distribuições são iguais. Não assume
    normalidade — ideal para as distribuições fortemente assimétricas de
    métricas de rede.
    """
    stat, p = _sp_stats.mannwhitneyu(
        _clean(a), _clean(b), alternative="two-sided"
    )
    return TestResult("Mann-Whitney U", float(stat), float(p), alpha)
