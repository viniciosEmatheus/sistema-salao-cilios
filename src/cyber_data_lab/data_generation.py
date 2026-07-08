r"""
Geração de dados sintéticos de rede
===================================

Produz um conjunto reprodutível de *flows* (fluxos) de rede que imita as
características estatísticas do tráfego real — para que o projeto rode do
zero, **offline**, sem baixar nenhum dataset.

Cada linha é um fluxo agregado (à la NetFlow) com atributos comuns em
detecção de intrusão. O gerador mistura tráfego **benigno** com quatro
famílias de **ataque**, cada uma com uma assinatura estatística distinta:

============  ===========================================================
Classe        Assinatura
============  ===========================================================
benign        Durações e volumes log-normais; poucas portas de destino.
port_scan     Muitas portas de destino distintas, pouquíssimos bytes,
              fluxos curtíssimos → **alta entropia de portas**.
ddos          Enorme taxa de pacotes para uma única porta; fluxos curtos.
dga_c2         Beaconing periódico; nomes de domínio de **alta entropia**.
data_exfil    Fluxos longos, muitos bytes enviados, razão de saída alta.
============  ===========================================================

As distribuições foram escolhidas para serem *plausíveis*, não para
reproduzir uma captura específica — o objetivo é EDA didática.
"""

from __future__ import annotations

import string
from dataclasses import dataclass

import numpy as np
import pandas as pd

__all__ = ["FlowConfig", "generate_flows", "random_domain"]

_BENIGN_PORTS = np.array([80, 443, 22, 53, 123, 8080, 993, 587])
_LEGIT_DOMAIN_STEMS = [
    "google", "cloudflare", "github", "wikipedia", "amazon",
    "microsoft", "netflix", "mozilla", "apache", "python",
]


@dataclass(frozen=True)
class FlowConfig:
    """Parâmetros da geração de fluxos.

    Attributes
    ----------
    n_flows:
        Número total de fluxos a gerar.
    attack_ratio:
        Fração de fluxos que são de ataque (o resto é benigno).
    seed:
        Semente do gerador aleatório, para reprodutibilidade.
    """

    n_flows: int = 20_000
    attack_ratio: float = 0.18
    seed: int = 42

    def __post_init__(self) -> None:
        if self.n_flows <= 0:
            raise ValueError("n_flows deve ser positivo.")
        if not 0.0 <= self.attack_ratio < 1.0:
            raise ValueError("attack_ratio deve estar em [0, 1).")


def random_domain(rng: np.random.Generator, malicious: bool) -> str:
    """Gera um nome de domínio legítimo ou estilo-DGA (alta entropia)."""
    if malicious:
        length = int(rng.integers(12, 24))
        alphabet = string.ascii_lowercase + string.digits
        stem = "".join(rng.choice(list(alphabet), size=length))
    else:
        stem = str(rng.choice(_LEGIT_DOMAIN_STEMS))
    tld = str(rng.choice(["com", "net", "org", "io"]))
    return f"{stem}.{tld}"


def _lognormal(rng, mean_log, sigma_log, size):
    return rng.lognormal(mean=mean_log, sigma=sigma_log, size=size)


def _benign(rng: np.random.Generator, n: int) -> pd.DataFrame:
    duration = _lognormal(rng, 0.5, 1.0, n)  # segundos
    src_bytes = _lognormal(rng, 6.5, 1.4, n)
    dst_bytes = _lognormal(rng, 6.0, 1.5, n)
    packets = np.clip(rng.poisson(20, n) + 1, 1, None)
    return pd.DataFrame(
        {
            "duration": duration,
            "src_bytes": src_bytes,
            "dst_bytes": dst_bytes,
            "packets": packets,
            "dst_port": rng.choice(_BENIGN_PORTS, size=n),
            "distinct_dst_ports": rng.integers(1, 4, n),
            "domain": [random_domain(rng, False) for _ in range(n)],
            "label": "benign",
        }
    )


def _port_scan(rng: np.random.Generator, n: int) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "duration": _lognormal(rng, -2.0, 0.5, n),  # muito curtos
            "src_bytes": rng.integers(0, 60, n).astype(float),
            "dst_bytes": rng.integers(0, 40, n).astype(float),
            "packets": rng.integers(1, 4, n),
            "dst_port": rng.integers(1, 65535, n),  # varredura ampla
            "distinct_dst_ports": rng.integers(80, 500, n),  # muitas portas
            "domain": [random_domain(rng, False) for _ in range(n)],
            "label": "port_scan",
        }
    )


def _ddos(rng: np.random.Generator, n: int) -> pd.DataFrame:
    port = int(rng.choice([80, 443]))
    return pd.DataFrame(
        {
            "duration": _lognormal(rng, -1.0, 0.4, n),
            "src_bytes": _lognormal(rng, 4.0, 0.6, n),
            "dst_bytes": rng.integers(0, 50, n).astype(float),
            "packets": np.clip(rng.poisson(600, n), 100, None),  # rajada enorme
            "dst_port": np.full(n, port),
            "distinct_dst_ports": np.ones(n, dtype=int),
            "domain": [random_domain(rng, False) for _ in range(n)],
            "label": "ddos",
        }
    )


def _dga_c2(rng: np.random.Generator, n: int) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "duration": _lognormal(rng, -0.5, 0.3, n),  # beacons curtos e regulares
            "src_bytes": _lognormal(rng, 5.0, 0.5, n),
            "dst_bytes": _lognormal(rng, 5.2, 0.5, n),
            "packets": np.clip(rng.poisson(8, n) + 1, 1, None),
            "dst_port": rng.choice([443, 8443, 53], size=n),
            "distinct_dst_ports": rng.integers(1, 3, n),
            "domain": [random_domain(rng, True) for _ in range(n)],  # alta entropia
            "label": "dga_c2",
        }
    )


def _data_exfil(rng: np.random.Generator, n: int) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "duration": _lognormal(rng, 3.5, 0.8, n),  # fluxos longos
            "src_bytes": _lognormal(rng, 11.0, 0.9, n),  # muitos bytes de saída
            "dst_bytes": _lognormal(rng, 4.0, 0.7, n),
            "packets": np.clip(rng.poisson(300, n), 50, None),
            "dst_port": rng.choice([443, 22, 21], size=n),
            "distinct_dst_ports": rng.integers(1, 3, n),
            "domain": [random_domain(rng, rng.random() < 0.5) for _ in range(n)],
            "label": "data_exfil",
        }
    )


_ATTACKS = {
    "port_scan": _port_scan,
    "ddos": _ddos,
    "dga_c2": _dga_c2,
    "data_exfil": _data_exfil,
}


def generate_flows(config: FlowConfig | None = None) -> pd.DataFrame:
    """Gera um ``DataFrame`` de fluxos de rede rotulados.

    Colunas produzidas
    -------------------
    ``duration`` (s), ``src_bytes``, ``dst_bytes``, ``packets``,
    ``dst_port``, ``distinct_dst_ports``, ``domain``, ``label`` e alguns
    atributos derivados (``bytes_ratio``, ``bytes_per_packet``,
    ``is_attack``).

    Examples
    --------
    >>> df = generate_flows(FlowConfig(n_flows=1000, seed=0))
    >>> len(df)
    1000
    >>> set(df["label"].unique()) <= {"benign", "port_scan", "ddos",
    ...                               "dga_c2", "data_exfil"}
    True
    """
    config = config or FlowConfig()
    rng = np.random.default_rng(config.seed)

    n_attack = int(round(config.n_flows * config.attack_ratio))
    n_benign = config.n_flows - n_attack

    frames = [_benign(rng, n_benign)]

    # Distribui os fluxos de ataque entre as famílias com pesos plausíveis.
    weights = np.array([0.4, 0.25, 0.2, 0.15])  # scan, ddos, dga, exfil
    names = list(_ATTACKS.keys())
    counts = rng.multinomial(n_attack, weights)
    for name, count in zip(names, counts, strict=True):
        if count > 0:
            frames.append(_ATTACKS[name](rng, int(count)))

    df = pd.concat(frames, ignore_index=True)
    df = df.sample(frac=1.0, random_state=config.seed).reset_index(drop=True)

    # Atributos derivados úteis para EDA.
    df["bytes_ratio"] = df["src_bytes"] / (df["dst_bytes"] + 1.0)
    df["bytes_per_packet"] = (df["src_bytes"] + df["dst_bytes"]) / df["packets"]
    df["is_attack"] = (df["label"] != "benign").astype(int)

    return df
