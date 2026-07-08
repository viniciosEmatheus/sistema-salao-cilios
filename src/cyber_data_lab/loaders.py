r"""
Carregamento de dados
======================

Duas fontes de dados:

* **Sintética** (padrão): gerada em memória por
  :func:`cyber_data_lab.data_generation.generate_flows`. Sempre
  disponível, sem rede.
* **NSL-KDD**: dataset clássico de detecção de intrusão. Como este
  ambiente pode não ter acesso à internet, o carregador procura o arquivo
  localmente em ``data/`` e dá instruções claras caso ele não exista.

O NSL-KDD é uma versão saneada do KDD Cup 1999, sem os registros
duplicados que enviesavam os classificadores. Veja ``data/README.md``.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .data_generation import FlowConfig, generate_flows

__all__ = ["load_synthetic", "load_nsl_kdd", "NSL_KDD_COLUMNS", "default_data_dir"]

# As 41 features + rótulo + dificuldade do NSL-KDD, na ordem canônica.
NSL_KDD_COLUMNS = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes",
    "land", "wrong_fragment", "urgent", "hot", "num_failed_logins",
    "logged_in", "num_compromised", "root_shell", "su_attempted", "num_root",
    "num_file_creations", "num_shells", "num_access_files",
    "num_outbound_cmds", "is_host_login", "is_guest_login", "count",
    "srv_count", "serror_rate", "srv_serror_rate", "rerror_rate",
    "srv_rerror_rate", "same_srv_rate", "diff_srv_rate",
    "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count",
    "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate",
    "dst_host_serror_rate", "dst_host_srv_serror_rate",
    "dst_host_rerror_rate", "dst_host_srv_rerror_rate", "label", "difficulty",
]


def default_data_dir() -> Path:
    """Diretório ``data/`` na raiz do repositório."""
    return Path(__file__).resolve().parents[2] / "data"


def load_synthetic(
    n_flows: int = 20_000, attack_ratio: float = 0.18, seed: int = 42
) -> pd.DataFrame:
    """Carrega o dataset sintético de fluxos de rede.

    Encaminha para :func:`generate_flows`; existe para dar uma API de
    carregamento uniforme junto de :func:`load_nsl_kdd`.
    """
    return generate_flows(
        FlowConfig(n_flows=n_flows, attack_ratio=attack_ratio, seed=seed)
    )


def load_nsl_kdd(
    path: str | Path | None = None, split: str = "train"
) -> pd.DataFrame:
    """Carrega o NSL-KDD a partir de um CSV local (``KDDTrain+`` / ``KDDTest+``).

    Parameters
    ----------
    path:
        Caminho para o arquivo. Se ``None``, procura em
        ``data/KDDTrain+.txt`` (ou ``KDDTest+.txt``).
    split:
        ``"train"`` ou ``"test"`` — usado apenas para escolher o arquivo
        padrão quando ``path`` é ``None``.

    Raises
    ------
    FileNotFoundError
        Com instruções de download, caso o arquivo não esteja presente.
    """
    if path is None:
        fname = "KDDTrain+.txt" if split == "train" else "KDDTest+.txt"
        path = default_data_dir() / fname
    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            f"Arquivo NSL-KDD não encontrado em '{path}'.\n"
            "Baixe o dataset e coloque-o em data/. Instruções em "
            "data/README.md.\n"
            "Enquanto isso, use load_synthetic() para rodar tudo offline."
        )

    df = pd.read_csv(path, header=None, names=NSL_KDD_COLUMNS)
    # Rótulo binário auxiliar: 'normal' vs. qualquer ataque.
    df["is_attack"] = (df["label"] != "normal").astype(int)
    return df
