"""Testes das estatísticas descritivas e testes de hipótese."""

import numpy as np
import pytest
from scipy import stats as sp_stats

from cyber_data_lab import statistics as st


def test_describe_matches_numpy():
    rng = np.random.default_rng(0)
    x = rng.normal(5, 2, size=1000)
    d = st.describe(x)
    assert d.n == 1000
    assert d.mean == pytest.approx(x.mean())
    assert d.median == pytest.approx(np.median(x))
    assert d.std == pytest.approx(x.std(ddof=1))


def test_skewness_symmetric_near_zero():
    rng = np.random.default_rng(1)
    x = rng.normal(size=50000)
    assert abs(st.skewness(x)) < 0.1


def test_skewness_matches_scipy():
    rng = np.random.default_rng(2)
    x = rng.exponential(size=2000)  # assimétrica à direita
    assert st.skewness(x) == pytest.approx(sp_stats.skew(x), rel=1e-6)


def test_kurtosis_normal_near_zero_excess():
    rng = np.random.default_rng(3)
    x = rng.normal(size=100000)
    assert abs(st.kurtosis(x, excess=True)) < 0.1


def test_kurtosis_matches_scipy():
    rng = np.random.default_rng(4)
    x = rng.standard_t(df=5, size=5000)
    assert st.kurtosis(x, excess=True) == pytest.approx(
        sp_stats.kurtosis(x, fisher=True), rel=1e-6
    )


def test_coefficient_of_variation():
    x = np.array([10.0, 12.0, 8.0, 11.0, 9.0])
    assert st.coefficient_of_variation(x) == pytest.approx(
        x.std(ddof=1) / x.mean()
    )


def test_tukey_fences():
    x = list(range(100))
    lo, hi = st.tukey_fences(x, k=1.5)
    q1, q3 = 24.75, 74.25
    assert lo == pytest.approx(q1 - 1.5 * (q3 - q1))
    assert hi == pytest.approx(q3 + 1.5 * (q3 - q1))


def test_welch_t_test_detects_difference():
    rng = np.random.default_rng(5)
    a = rng.normal(0, 1, size=500)
    b = rng.normal(1, 1, size=500)
    res = st.welch_t_test(a, b)
    assert res.reject_null
    assert res.p_value < 0.05


def test_welch_t_test_no_false_positive():
    rng = np.random.default_rng(6)
    a = rng.normal(0, 1, size=1000)
    b = rng.normal(0, 1, size=1000)
    res = st.welch_t_test(a, b)
    assert not res.reject_null


def test_mann_whitney_detects_shift():
    rng = np.random.default_rng(7)
    a = rng.exponential(1.0, size=500)
    b = rng.exponential(2.0, size=500)
    res = st.mann_whitney_u(a, b)
    assert res.reject_null


def test_describe_raises_on_empty():
    with pytest.raises(ValueError):
        st.describe([])


def test_test_result_summary_string():
    res = st.TestResult("dummy", 1.23, 0.01)
    assert "rejeita H0" in res.summary()
