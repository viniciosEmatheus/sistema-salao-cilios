r"""
Análise Exploratória de Segurança de Redes — pipeline de ponta a ponta
======================================================================

Roteiro executável que demonstra o pacote inteiro sobre o dataset
sintético de fluxos. Pode ser rodado como script::

    python notebooks/eda.py

ou convertido em notebook com jupytext. Cada seção imprime resultados no
terminal e, se ``matplotlib`` estiver disponível, salva figuras em
``reports/``.

Fio condutor da análise
-----------------------
1. Carregar e caracterizar os fluxos (estatística descritiva).
2. Contrastar tráfego benigno vs. de ataque com testes de hipótese.
3. Usar **teoria da informação** para separar as assinaturas de ataque
   (entropia de portas para *scan*, entropia de caracteres para DGA).
4. Selecionar atributos por **informação mútua** com o rótulo.
5. Projetar o espaço de atributos com **PCA do zero**.
6. Sinalizar anomalias com **distância de Mahalanobis** e avaliar.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from cyber_data_lab import information_theory as it
from cyber_data_lab import statistics as st
from cyber_data_lab.anomaly_detection import ANOMALY, MahalanobisDetector
from cyber_data_lab.dimensionality import PCA
from cyber_data_lab.loaders import load_synthetic

REPORTS = Path(__file__).resolve().parents[1] / "reports"

# Atributos numéricos usados na parte multivariada.
NUMERIC_FEATURES = [
    "duration", "src_bytes", "dst_bytes", "packets",
    "distinct_dst_ports", "bytes_ratio", "bytes_per_packet",
]


def _rule(title: str) -> None:
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def _try_savefig(fig, name: str) -> None:
    """Salva a figura em reports/ se possível; ignora falhas silenciosamente."""
    try:
        REPORTS.mkdir(exist_ok=True)
        fig.savefig(REPORTS / name, dpi=120, bbox_inches="tight")
        print(f"  [figura salva] reports/{name}")
    except Exception as exc:  # pragma: no cover
        print(f"  [aviso] não foi possível salvar {name}: {exc}")


def section_overview(df: pd.DataFrame) -> None:
    _rule("1. Visão geral do dataset")
    print(f"Fluxos: {len(df):,}  |  Atributos: {df.shape[1]}")
    print("\nDistribuição de classes:")
    print(df["label"].value_counts().to_string())
    print(f"\nProporção de ataques: {df['is_attack'].mean():.1%}")

    _rule("1b. Estatística descritiva (bytes de origem, escala log)")
    d = st.describe(np.log10(df["src_bytes"] + 1))
    for k, v in d.as_dict().items():
        print(f"  {k:>10}: {v:.4f}")
    print(
        "\nA curtose alta e a assimetria confirmam caudas pesadas — típico de "
        "tráfego de rede."
    )


def section_hypothesis_tests(df: pd.DataFrame) -> None:
    _rule("2. Benigno vs. ataque — testes de hipótese")
    benign = df.loc[df["is_attack"] == 0]
    attack = df.loc[df["is_attack"] == 1]
    for feat in ["duration", "packets", "distinct_dst_ports"]:
        welch = st.welch_t_test(benign[feat], attack[feat])
        mwu = st.mann_whitney_u(benign[feat], attack[feat])
        print(f"\n[{feat}]")
        print("  " + welch.summary())
        print("  " + mwu.summary())


def section_information_theory(df: pd.DataFrame) -> None:
    _rule("3. Teoria da informação — assinaturas de ataque")

    print("Entropia de Shannon da porta de destino, por classe (bits):")
    for label, grp in df.groupby("label"):
        h = it.shannon_entropy(grp["dst_port"])
        print(f"  {label:>12}: {h:6.3f}")
    print(
        "\n→ 'port_scan' tem entropia de portas muito mais alta: a varredura "
        "espalha conexões por milhares de portas."
    )

    print("\nEntropia média de caracteres do domínio, por classe (bits):")
    ent = df.assign(dom_h=df["domain"].map(it.char_entropy))
    for label, grp in ent.groupby("label"):
        print(f"  {label:>12}: {grp['dom_h'].mean():6.3f}")
    print(
        "\n→ 'dga_c2' se destaca: domínios gerados por algoritmo se aproximam "
        "de uma fonte uniforme de caracteres."
    )


def section_mutual_information(df: pd.DataFrame) -> pd.Series:
    _rule("4. Seleção de atributos por informação mútua com o rótulo")
    # MI é definida sobre variáveis discretas: discretizamos por quantis.
    y = df["is_attack"].to_numpy()
    scores = {}
    for feat in NUMERIC_FEATURES:
        binned = pd.qcut(df[feat].rank(method="first"), q=20, labels=False)
        scores[feat] = it.mutual_information(binned.to_numpy(), y)
    mi = pd.Series(scores).sort_values(ascending=False)
    print("Informação mútua I(atributo; is_attack), em bits:")
    for feat, val in mi.items():
        bar = "█" * int(val * 60)
        print(f"  {feat:>18}: {val:.4f} {bar}")
    return mi


def section_pca(df: pd.DataFrame) -> np.ndarray:
    _rule("5. PCA do zero sobre os atributos numéricos")
    x = df[NUMERIC_FEATURES].to_numpy(dtype=float)
    # Padroniza (z-score) para o PCA não ser dominado pela escala.
    x = (x - x.mean(axis=0)) / (x.std(axis=0) + 1e-12)

    pca = PCA().fit(x)
    ratio = pca.result_.explained_variance_ratio
    cum = pca.result_.cumulative_variance_ratio
    print("Variância explicada por componente:")
    for i, (r, c) in enumerate(zip(ratio, cum), start=1):
        print(f"  PC{i}: {r:6.1%}   (acumulada {c:6.1%})")
    n90 = int(np.searchsorted(cum, 0.90) + 1)
    print(f"\n→ {n90} componentes explicam ≥ 90% da variância.")

    scores = pca.transform(x)

    # Figuras (se matplotlib estiver instalado).
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        from cyber_data_lab import viz

        fig1, ax1 = plt.subplots(figsize=(7, 4.5))
        viz.plot_scree(ratio, ax=ax1)
        _try_savefig(fig1, "scree_plot.png")

        fig2, ax2 = plt.subplots(figsize=(7, 5))
        viz.plot_pca_scatter(scores, df["label"].to_numpy(), ax=ax2)
        _try_savefig(fig2, "pca_scatter.png")
        plt.close("all")
    except Exception as exc:  # pragma: no cover
        print(f"  [aviso] matplotlib indisponível, pulando figuras: {exc}")

    return scores


def section_anomaly_detection(df: pd.DataFrame) -> None:
    _rule("6. Detecção de anomalias multivariada (Mahalanobis)")
    x = df[NUMERIC_FEATURES].to_numpy(dtype=float)
    x = np.log1p(np.clip(x, 0, None))  # estabiliza as caudas pesadas

    # Ajusta o modelo de "normalidade" APENAS com tráfego benigno.
    benign_mask = df["is_attack"].to_numpy() == 0
    det = MahalanobisDetector(alpha=0.01).fit(x[benign_mask])

    pred = det.predict(x)
    y = df["is_attack"].to_numpy()
    flagged = pred == ANOMALY

    tp = int(np.sum(flagged & (y == 1)))
    fp = int(np.sum(flagged & (y == 0)))
    fn = int(np.sum(~flagged & (y == 1)))
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else 0.0
    )

    print("Modelo de normalidade ajustado só com fluxos benignos.")
    print(f"  Sinalizados como anomalia: {flagged.sum():,}")
    print(f"  Precisão: {precision:.1%}   Recall: {recall:.1%}   F1: {f1:.3f}")
    print(
        "\n→ Um detector puramente estatístico, sem rótulos de ataque no "
        "treino, já recupera boa parte das intrusões."
    )


def main() -> None:
    df = load_synthetic(n_flows=20_000, seed=42)
    section_overview(df)
    section_hypothesis_tests(df)
    section_information_theory(df)
    section_mutual_information(df)
    section_pca(df)
    section_anomaly_detection(df)
    _rule("Fim da análise")
    print("Figuras (se geradas) estão em reports/.")


if __name__ == "__main__":
    main()
