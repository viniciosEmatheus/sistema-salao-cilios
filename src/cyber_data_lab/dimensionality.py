r"""
Redução de dimensionalidade — PCA do zero
==========================================

Análise de Componentes Principais implementada a partir da álgebra
linear, sem depender do ``sklearn.decomposition.PCA``. Serve tanto de
ferramenta de EDA (visualizar em 2D um espaço de atributos de rede de
alta dimensão) quanto de exercício matemático.

A matemática
------------
Dada uma matriz de dados centralizada :math:`X \in \mathbb{R}^{n \times d}`,
a matriz de covariância amostral é

.. math::

    \Sigma = \frac{1}{n - 1} X^\top X.

Os componentes principais são os autovetores de :math:`\Sigma`,
ordenados pelos autovalores (a variância explicada por cada eixo). Em
vez de formar :math:`\Sigma` explicitamente, usamos a **decomposição em
valores singulares** (SVD) de :math:`X`, numericamente mais estável:

.. math::

    X = U S V^\top,
    \qquad \Sigma = \frac{1}{n-1} V S^2 V^\top.

As colunas de :math:`V` são os componentes principais e
:math:`\lambda_i = s_i^2 / (n - 1)` são os autovalores correspondentes.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

__all__ = ["PCA", "PCAResult"]


@dataclass
class PCAResult:
    """Contêiner com o resultado de um ajuste de :class:`PCA`."""

    components: np.ndarray  # (n_components, d) — autovetores nas linhas
    explained_variance: np.ndarray  # (n_components,) — autovalores
    explained_variance_ratio: np.ndarray  # (n_components,)
    mean: np.ndarray  # (d,) — média usada na centralização
    singular_values: np.ndarray = field(default_factory=lambda: np.empty(0))

    @property
    def cumulative_variance_ratio(self) -> np.ndarray:
        """Variância explicada acumulada — útil para o *scree plot*."""
        return np.cumsum(self.explained_variance_ratio)


class PCA:
    r"""Análise de Componentes Principais via SVD.

    Parameters
    ----------
    n_components:
        Número de componentes a reter. Se ``None``, retém todos.
    whiten:
        Se ``True``, escala cada componente projetada para variância
        unitária (útil antes de alguns detectores de anomalia).

    Attributes
    ----------
    result_:
        :class:`PCAResult` preenchido após :meth:`fit`.

    Examples
    --------
    >>> import numpy as np
    >>> rng = np.random.default_rng(0)
    >>> x = rng.normal(size=(200, 5))
    >>> x[:, 0] *= 10            # primeira direção domina a variância
    >>> pca = PCA(n_components=2).fit(x)
    >>> bool(pca.result_.explained_variance_ratio[0] > 0.5)
    True
    """

    def __init__(self, n_components: int | None = None, whiten: bool = False):
        if n_components is not None and n_components < 1:
            raise ValueError("n_components deve ser >= 1.")
        self.n_components = n_components
        self.whiten = whiten
        self.result_: PCAResult | None = None

    def fit(self, x: np.ndarray) -> PCA:
        """Ajusta os componentes principais a ``x`` (formato ``(n, d)``)."""
        x = np.asarray(x, dtype=float)
        if x.ndim != 2:
            raise ValueError("x deve ser uma matriz 2D (n_amostras, n_atributos).")
        n, d = x.shape
        if n < 2:
            raise ValueError("São necessárias pelo menos 2 amostras.")

        mean = x.mean(axis=0)
        x_centered = x - mean

        # SVD econômica: mais estável do que autodecomposição da covariância.
        _, s, vt = np.linalg.svd(x_centered, full_matrices=False)

        explained_variance = (s**2) / (n - 1)
        total = explained_variance.sum()
        ratio = explained_variance / total if total > 0 else explained_variance

        k = self.n_components or min(n, d)
        k = min(k, vt.shape[0])

        self.result_ = PCAResult(
            components=vt[:k],
            explained_variance=explained_variance[:k],
            explained_variance_ratio=ratio[:k],
            mean=mean,
            singular_values=s[:k],
        )
        return self

    def transform(self, x: np.ndarray) -> np.ndarray:
        """Projeta ``x`` no subespaço principal aprendido."""
        if self.result_ is None:
            raise RuntimeError("Chame fit() antes de transform().")
        x = np.asarray(x, dtype=float)
        projected = (x - self.result_.mean) @ self.result_.components.T
        if self.whiten:
            scale = np.sqrt(self.result_.explained_variance)
            scale[scale == 0] = 1.0
            projected = projected / scale
        return projected

    def fit_transform(self, x: np.ndarray) -> np.ndarray:
        """Conveniência: :meth:`fit` seguido de :meth:`transform`."""
        return self.fit(x).transform(x)

    def inverse_transform(self, z: np.ndarray) -> np.ndarray:
        """Reconstrói uma aproximação de ``x`` a partir das projeções ``z``."""
        if self.result_ is None:
            raise RuntimeError("Chame fit() antes de inverse_transform().")
        z = np.asarray(z, dtype=float)
        if self.whiten:
            scale = np.sqrt(self.result_.explained_variance)
            z = z * scale
        return z @ self.result_.components + self.result_.mean
