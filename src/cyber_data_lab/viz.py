r"""
Auxiliares de visualização
===========================

Funções finas sobre ``matplotlib`` para as figuras recorrentes da EDA de
segurança. Todas retornam o ``Axes`` para permitir composição, e nenhuma
chama ``plt.show()`` — quem chama decide exibir ou salvar.

``matplotlib`` é uma dependência opcional; o import é adiado para dentro
das funções, de modo que o restante do pacote funciona sem ele.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np

__all__ = [
    "plot_distribution",
    "plot_correlation_heatmap",
    "plot_scree",
    "plot_pca_scatter",
]


def _get_ax(ax):
    import matplotlib.pyplot as plt

    if ax is None:
        _, ax = plt.subplots(figsize=(7, 4.5))
    return ax


def plot_distribution(values: Sequence[float], *, bins: int = 60,
                      log_x: bool = False, title: str | None = None, ax=None):
    """Histograma de uma métrica, com opção de eixo x em escala log.

    Métricas de rede (bytes, duração) são fortemente assimétricas; a
    escala log costuma revelar a estrutura multimodal (ex.: separação
    entre fluxos benignos e de ataque).
    """
    ax = _get_ax(ax)
    arr = np.asarray(values, dtype=float)
    arr = arr[np.isfinite(arr)]
    if log_x:
        arr = arr[arr > 0]
        bins_edges = np.logspace(np.log10(arr.min()), np.log10(arr.max()), bins)
        ax.set_xscale("log")
    else:
        bins_edges = bins
    ax.hist(arr, bins=bins_edges, color="#4C72B0", alpha=0.85, edgecolor="white")
    ax.set_ylabel("frequência")
    if title:
        ax.set_title(title)
    return ax


def plot_correlation_heatmap(df, *, columns: Sequence[str] | None = None,
                             method: str = "spearman", ax=None):
    """Mapa de calor de correlação entre atributos numéricos.

    Usa Spearman por padrão — robusto a relações monotônicas não lineares,
    frequentes em dados de rede.
    """
    import matplotlib.pyplot as plt

    ax = _get_ax(ax)
    numeric = df[columns] if columns is not None else df.select_dtypes("number")
    corr = numeric.corr(method=method)
    im = ax.imshow(corr.values, cmap="coolwarm", vmin=-1, vmax=1)
    ax.set_xticks(range(len(corr.columns)))
    ax.set_xticklabels(corr.columns, rotation=90, fontsize=8)
    ax.set_yticks(range(len(corr.columns)))
    ax.set_yticklabels(corr.columns, fontsize=8)
    ax.set_title(f"Correlação ({method})")
    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    return ax


def plot_scree(explained_variance_ratio: Sequence[float], ax=None):
    """*Scree plot*: variância explicada por componente + curva acumulada."""
    ax = _get_ax(ax)
    ratio = np.asarray(explained_variance_ratio, dtype=float)
    idx = np.arange(1, ratio.size + 1)
    ax.bar(idx, ratio, color="#55A868", alpha=0.85, label="individual")
    ax.plot(idx, np.cumsum(ratio), color="#C44E52", marker="o", label="acumulada")
    ax.axhline(0.9, ls="--", color="gray", lw=1, label="90%")
    ax.set_xlabel("componente principal")
    ax.set_ylabel("variância explicada")
    ax.set_title("Scree plot")
    ax.legend()
    return ax


def plot_pca_scatter(scores: np.ndarray, labels: Sequence, *,
                     max_points: int = 5000, ax=None):
    """Dispersão dos dois primeiros componentes principais, colorida por rótulo."""
    ax = _get_ax(ax)
    scores = np.asarray(scores, dtype=float)
    labels = np.asarray(labels)
    if scores.shape[0] > max_points:
        rng = np.random.default_rng(0)
        sel = rng.choice(scores.shape[0], size=max_points, replace=False)
        scores, labels = scores[sel], labels[sel]
    for lab in np.unique(labels):
        m = labels == lab
        ax.scatter(scores[m, 0], scores[m, 1], s=6, alpha=0.5, label=str(lab))
    ax.set_xlabel("PC1")
    ax.set_ylabel("PC2")
    ax.set_title("Projeção PCA")
    ax.legend(markerscale=2, fontsize=8)
    return ax
