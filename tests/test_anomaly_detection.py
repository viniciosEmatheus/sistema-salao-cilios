"""Testes dos detectores de anomalias."""

import numpy as np
import pytest

from cyber_data_lab.anomaly_detection import (
    ANOMALY,
    NORMAL,
    IQRDetector,
    MahalanobisDetector,
    ZScoreDetector,
)


def test_zscore_flags_extreme_point():
    x = np.concatenate([np.zeros(100), [50.0]])
    det = ZScoreDetector(threshold=3.0).fit(x)
    pred = det.predict(x)
    assert pred[-1] == ANOMALY
    assert (pred[:-1] == NORMAL).all()


def test_zscore_robust_resists_masking():
    # Vários outliers não devem inflar a escala a ponto de escondê-los.
    x = np.concatenate([np.random.default_rng(0).normal(size=200), [20, 22, 25]])
    det = ZScoreDetector(threshold=3.5, robust=True).fit(x)
    assert (det.predict([20, 22, 25]) == ANOMALY).all()


def test_iqr_detector_bounds():
    x = list(range(100)) + [1000]
    det = IQRDetector(k=1.5).fit(x)
    assert det.predict([1000])[0] == ANOMALY
    assert det.predict([50])[0] == NORMAL


def test_mahalanobis_flags_off_axis_point():
    rng = np.random.default_rng(1)
    # Nuvem correlacionada ao longo da diagonal.
    base = rng.normal(size=(1000, 2))
    x = np.column_stack([base[:, 0], base[:, 0] + 0.1 * base[:, 1]])
    det = MahalanobisDetector(alpha=0.01).fit(x)
    # Ponto fora do eixo de correlação (mesma magnitude, direção errada).
    off_axis = np.array([[3.0, -3.0]])
    assert det.predict(off_axis)[0] == ANOMALY


def test_mahalanobis_score_matches_manual():
    rng = np.random.default_rng(2)
    x = rng.normal(size=(500, 3))
    det = MahalanobisDetector().fit(x)
    point = np.array([[1.0, -1.0, 0.5]])
    diff = point[0] - det.mean_
    expected = diff @ det.inv_cov_ @ diff
    assert det.score(point)[0] == pytest.approx(expected)


def test_mahalanobis_most_points_normal():
    rng = np.random.default_rng(3)
    x = rng.normal(size=(5000, 4))
    det = MahalanobisDetector(alpha=0.01).fit(x)
    frac_anom = np.mean(det.predict(x) == ANOMALY)
    # ~1% esperado pela construção; deixamos folga.
    assert frac_anom < 0.03


def test_score_before_fit_raises():
    with pytest.raises(RuntimeError):
        ZScoreDetector().score([1, 2, 3])
