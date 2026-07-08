r"""
Detecção de anomalias
======================

Detectores estatísticos de anomalias com uma interface comum de
``fit`` / ``predict`` / ``score``. Vão do trivial (z-score univariado) ao
multivariado (distância de Mahalanobis), com um invólucro para o
Isolation Forest do ``scikit-learn`` — novamente a filosofia mista.

Convenção de rótulos
--------------------
``predict`` retorna ``+1`` para pontos **normais** e ``-1`` para
**anomalias**, seguindo a convenção do ``scikit-learn``.
"""

from __future__ import annotations

from typing import Protocol

import numpy as np
from scipy import stats as _sp_stats

try:  # Isolation Forest é opcional; o resto do módulo funciona sem ele.
    from sklearn.ensemble import IsolationForest as _SkIForest

    _HAS_SKLEARN = True
except ImportError:  # pragma: no cover
    _HAS_SKLEARN = False

__all__ = [
    "AnomalyDetector",
    "ZScoreDetector",
    "IQRDetector",
    "MahalanobisDetector",
    "IsolationForestDetector",
]

NORMAL = 1
ANOMALY = -1


class AnomalyDetector(Protocol):
    """Interface comum a todos os detectores."""

    def fit(self, x: np.ndarray) -> AnomalyDetector: ...
    def score(self, x: np.ndarray) -> np.ndarray: ...
    def predict(self, x: np.ndarray) -> np.ndarray: ...


class ZScoreDetector:
    r"""Detector univariado por escore-z (robusto opcional via mediana/MAD).

    Marca como anomalia todo ponto cujo escore padronizado excede
    ``threshold`` em módulo. No modo robusto usa a mediana e o desvio
    absoluto mediano (MAD), muito menos sensíveis a *outliers*:

    .. math::

        z_i = \frac{x_i - \tilde{x}}{1.4826 \cdot \mathrm{MAD}}.

    O fator ``1.4826`` torna o MAD um estimador consistente do desvio
    padrão sob normalidade.
    """

    def __init__(self, threshold: float = 3.0, robust: bool = True):
        self.threshold = threshold
        self.robust = robust
        self.center_: float | None = None
        self.scale_: float | None = None

    def fit(self, x: np.ndarray) -> ZScoreDetector:
        arr = np.asarray(x, dtype=float).ravel()
        if self.robust:
            self.center_ = float(np.median(arr))
            mad = float(np.median(np.abs(arr - self.center_)))
            self.scale_ = 1.4826 * mad if mad > 0 else float(arr.std(ddof=1))
        else:
            self.center_ = float(arr.mean())
            self.scale_ = float(arr.std(ddof=1))
        if not self.scale_:
            self.scale_ = 1.0
        return self

    def score(self, x: np.ndarray) -> np.ndarray:
        """Retorna |z| para cada ponto (quanto maior, mais anômalo)."""
        if self.center_ is None:
            raise RuntimeError("Chame fit() antes de score().")
        arr = np.asarray(x, dtype=float).ravel()
        return np.abs((arr - self.center_) / self.scale_)

    def predict(self, x: np.ndarray) -> np.ndarray:
        return np.where(self.score(x) > self.threshold, ANOMALY, NORMAL)


class IQRDetector:
    """Detector univariado por cercas de Tukey (amplitude interquartílica)."""

    def __init__(self, k: float = 1.5):
        self.k = k
        self.lower_: float | None = None
        self.upper_: float | None = None

    def fit(self, x: np.ndarray) -> IQRDetector:
        arr = np.asarray(x, dtype=float).ravel()
        q1, q3 = np.percentile(arr, [25, 75])
        spread = q3 - q1
        self.lower_ = float(q1 - self.k * spread)
        self.upper_ = float(q3 + self.k * spread)
        return self

    def score(self, x: np.ndarray) -> np.ndarray:
        """Distância (normalizada) para fora das cercas; 0 se dentro."""
        if self.lower_ is None or self.upper_ is None:
            raise RuntimeError("Chame fit() antes de score().")
        arr = np.asarray(x, dtype=float).ravel()
        width = max(self.upper_ - self.lower_, 1e-12)
        below = np.clip(self.lower_ - arr, 0, None)
        above = np.clip(arr - self.upper_, 0, None)
        return (below + above) / width

    def predict(self, x: np.ndarray) -> np.ndarray:
        arr = np.asarray(x, dtype=float).ravel()
        inside = (arr >= self.lower_) & (arr <= self.upper_)
        return np.where(inside, NORMAL, ANOMALY)


class MahalanobisDetector:
    r"""Detector multivariado pela distância de Mahalanobis.

    A distância de Mahalanobis leva em conta a covariância entre
    atributos, medindo a distância ao centro em unidades de desvio
    padrão *ao longo de cada direção*:

    .. math::

        D_M(\mathbf{x}) = \sqrt{(\mathbf{x} - \boldsymbol{\mu})^\top
                                \Sigma^{-1}
                                (\mathbf{x} - \boldsymbol{\mu})}.

    Sob dados gaussianos, :math:`D_M^2` segue uma distribuição
    :math:`\chi^2_d`, o que fornece um limiar com significância
    estatística: usa-se o quantil ``1 - alpha`` de :math:`\chi^2_d`.
    """

    def __init__(self, alpha: float = 0.01):
        self.alpha = alpha
        self.mean_: np.ndarray | None = None
        self.inv_cov_: np.ndarray | None = None
        self.threshold_: float | None = None

    def fit(self, x: np.ndarray) -> MahalanobisDetector:
        x = np.asarray(x, dtype=float)
        if x.ndim != 2:
            raise ValueError("x deve ser 2D (n_amostras, n_atributos).")
        self.mean_ = x.mean(axis=0)
        cov = np.cov(x, rowvar=False)
        # Regularização de Tikhonov para garantir invertibilidade.
        cov = np.atleast_2d(cov) + 1e-6 * np.eye(x.shape[1])
        self.inv_cov_ = np.linalg.inv(cov)
        # Limiar via quantil da qui-quadrado com d graus de liberdade.
        self.threshold_ = float(
            _sp_stats.chi2.ppf(1 - self.alpha, df=x.shape[1])
        )
        return self

    def score(self, x: np.ndarray) -> np.ndarray:
        """Distância de Mahalanobis ao quadrado (comparável ao limiar chi2)."""
        if self.mean_ is None or self.inv_cov_ is None:
            raise RuntimeError("Chame fit() antes de score().")
        x = np.atleast_2d(np.asarray(x, dtype=float))
        diff = x - self.mean_
        # Forma quadrática linha a linha: sum((diff @ inv_cov) * diff).
        return np.einsum("ij,jk,ik->i", diff, self.inv_cov_, diff)

    def predict(self, x: np.ndarray) -> np.ndarray:
        return np.where(self.score(x) > self.threshold_, ANOMALY, NORMAL)


class IsolationForestDetector:
    """Invólucro fino sobre ``sklearn.ensemble.IsolationForest``.

    Fornece a mesma interface dos detectores caseiros. Requer o
    ``scikit-learn`` instalado.
    """

    def __init__(self, contamination: float = 0.05, random_state: int = 42, **kwargs):
        if not _HAS_SKLEARN:  # pragma: no cover
            raise ImportError(
                "scikit-learn é necessário para o IsolationForestDetector."
            )
        self._model = _SkIForest(
            contamination=contamination, random_state=random_state, **kwargs
        )

    def fit(self, x: np.ndarray) -> IsolationForestDetector:
        self._model.fit(np.atleast_2d(np.asarray(x, dtype=float)))
        return self

    def score(self, x: np.ndarray) -> np.ndarray:
        """Escore de anomalia: quanto maior, mais anômalo."""
        # score_samples é maior para pontos normais; invertemos o sinal.
        return -self._model.score_samples(np.atleast_2d(np.asarray(x, dtype=float)))

    def predict(self, x: np.ndarray) -> np.ndarray:
        return self._model.predict(np.atleast_2d(np.asarray(x, dtype=float)))
