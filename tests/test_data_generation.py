"""Testes do gerador de dados sintéticos."""

import pytest

from cyber_data_lab import information_theory as it
from cyber_data_lab.data_generation import FlowConfig, generate_flows


def test_generate_flows_row_count():
    df = generate_flows(FlowConfig(n_flows=2000, seed=0))
    assert len(df) == 2000


def test_reproducible_with_same_seed():
    a = generate_flows(FlowConfig(n_flows=500, seed=7))
    b = generate_flows(FlowConfig(n_flows=500, seed=7))
    assert a.equals(b)


def test_attack_ratio_is_respected():
    df = generate_flows(FlowConfig(n_flows=10000, attack_ratio=0.2, seed=1))
    frac = df["is_attack"].mean()
    assert frac == pytest.approx(0.2, abs=0.01)


def test_expected_columns_present():
    df = generate_flows(FlowConfig(n_flows=100, seed=2))
    for col in ["duration", "src_bytes", "dst_bytes", "packets", "dst_port",
                "distinct_dst_ports", "domain", "label", "bytes_ratio",
                "bytes_per_packet", "is_attack"]:
        assert col in df.columns


def test_port_scan_has_higher_port_entropy_than_benign():
    df = generate_flows(FlowConfig(n_flows=20000, seed=3))
    benign_ports = df.loc[df["label"] == "benign", "dst_port"]
    scan_ports = df.loc[df["label"] == "port_scan", "dst_port"]
    assert it.shannon_entropy(scan_ports) > it.shannon_entropy(benign_ports)


def test_dga_domains_have_higher_char_entropy():
    df = generate_flows(FlowConfig(n_flows=20000, seed=4))
    benign_dom = df.loc[df["label"] == "benign", "domain"]
    dga_dom = df.loc[df["label"] == "dga_c2", "domain"]
    benign_h = benign_dom.map(it.char_entropy).mean()
    dga_h = dga_dom.map(it.char_entropy).mean()
    assert dga_h > benign_h


def test_invalid_config_raises():
    with pytest.raises(ValueError):
        FlowConfig(n_flows=0)
    with pytest.raises(ValueError):
        FlowConfig(attack_ratio=1.5)
