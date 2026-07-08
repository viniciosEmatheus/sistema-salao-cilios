"""Testes das medidas de teoria da informação."""

import math

import numpy as np
import pytest

from cyber_data_lab import information_theory as it


def test_entropy_fair_coin_is_one_bit():
    assert it.shannon_entropy([0, 0, 1, 1]) == pytest.approx(1.0)


def test_entropy_constant_is_zero():
    assert it.shannon_entropy(["a", "a", "a"]) == 0.0


def test_entropy_uniform_is_log_k():
    # 8 símbolos equiprováveis → 3 bits.
    data = list(range(8)) * 10
    assert it.shannon_entropy(data) == pytest.approx(3.0)


def test_entropy_base_e_gives_nats():
    # Moeda justa: ln(2) nats.
    assert it.shannon_entropy([0, 1], base=math.e) == pytest.approx(math.log(2))


def test_normalized_entropy_bounds():
    uniform = it.normalized_entropy(list(range(16)))
    skewed = it.normalized_entropy([0] * 100 + [1])
    assert uniform == pytest.approx(1.0)
    assert 0.0 <= skewed < 0.2


def test_mutual_information_of_variable_with_itself_equals_entropy():
    x = [0, 0, 1, 1, 2, 2]
    assert it.mutual_information(x, x) == pytest.approx(it.shannon_entropy(x))


def test_mutual_information_independent_is_zero():
    rng = np.random.default_rng(0)
    x = rng.integers(0, 4, size=20000)
    y = rng.integers(0, 4, size=20000)
    # Variáveis independentes → MI próxima de zero (viés amostral pequeno).
    assert it.mutual_information(x, y) < 0.01


def test_mutual_information_is_non_negative():
    rng = np.random.default_rng(1)
    x = rng.integers(0, 5, size=500)
    y = rng.integers(0, 5, size=500)
    assert it.mutual_information(x, y) >= 0.0


def test_conditional_entropy_reduces_uncertainty():
    x = [0, 0, 1, 1]
    # H(X|X) = 0.
    assert it.conditional_entropy(x, x) == pytest.approx(0.0, abs=1e-9)


def test_kl_divergence_zero_for_identical_distributions():
    p = np.array([0.2, 0.3, 0.5])
    assert it.kl_divergence(p, p) == pytest.approx(0.0, abs=1e-9)


def test_kl_divergence_is_non_negative():
    p = np.array([0.1, 0.9])
    q = np.array([0.5, 0.5])
    assert it.kl_divergence(p, q) > 0.0


def test_kl_divergence_is_asymmetric():
    p = np.array([0.1, 0.9])
    q = np.array([0.6, 0.4])
    assert it.kl_divergence(p, q) != pytest.approx(it.kl_divergence(q, p))


def test_js_divergence_is_symmetric_and_bounded():
    p = np.array([0.1, 0.4, 0.5])
    q = np.array([0.6, 0.3, 0.1])
    jsd_pq = it.js_divergence(p, q)
    jsd_qp = it.js_divergence(q, p)
    assert jsd_pq == pytest.approx(jsd_qp)
    assert 0.0 <= jsd_pq <= 1.0


def test_char_entropy_detects_dga_like_strings():
    # Domínio legítimo tem entropia de caracteres menor que um estilo-DGA.
    assert it.char_entropy("google") < it.char_entropy("kq3v9z7wx1p")


def test_shannon_entropy_empty_is_zero():
    assert it.shannon_entropy([]) == 0.0


def test_kl_divergence_shape_mismatch_raises():
    with pytest.raises(ValueError):
        it.kl_divergence(np.array([0.5, 0.5]), np.array([1.0]))
