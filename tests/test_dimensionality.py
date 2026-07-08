"""Testes do PCA implementado do zero."""

import numpy as np
import pytest

from cyber_data_lab.dimensionality import PCA


def test_explained_variance_ratio_sums_to_one():
    rng = np.random.default_rng(0)
    x = rng.normal(size=(500, 6))
    pca = PCA().fit(x)
    assert pca.result_.explained_variance_ratio.sum() == pytest.approx(1.0)


def test_first_component_captures_dominant_variance():
    rng = np.random.default_rng(1)
    x = rng.normal(size=(1000, 4))
    x[:, 0] *= 15  # infla drasticamente a variância do primeiro eixo
    pca = PCA(n_components=2).fit(x)
    assert pca.result_.explained_variance_ratio[0] > 0.9


def test_components_are_orthonormal():
    rng = np.random.default_rng(2)
    x = rng.normal(size=(300, 5))
    comps = PCA().fit(x).result_.components
    gram = comps @ comps.T
    assert np.allclose(gram, np.eye(comps.shape[0]), atol=1e-8)


def test_transform_shape():
    rng = np.random.default_rng(3)
    x = rng.normal(size=(200, 8))
    z = PCA(n_components=3).fit_transform(x)
    assert z.shape == (200, 3)


def test_transform_is_centered():
    rng = np.random.default_rng(4)
    x = rng.normal(5, 2, size=(400, 3))
    z = PCA().fit_transform(x)
    assert np.allclose(z.mean(axis=0), 0.0, atol=1e-8)


def test_inverse_transform_reconstructs_full_rank():
    rng = np.random.default_rng(5)
    x = rng.normal(size=(150, 4))
    pca = PCA().fit(x)  # todos os componentes → reconstrução exata
    x_rec = pca.inverse_transform(pca.transform(x))
    assert np.allclose(x, x_rec, atol=1e-8)


def test_variance_matches_covariance_eigenvalues():
    rng = np.random.default_rng(6)
    x = rng.normal(size=(1000, 4))
    pca = PCA().fit(x)
    cov = np.cov(x, rowvar=False)
    eigvals = np.sort(np.linalg.eigvalsh(cov))[::-1]
    assert np.allclose(pca.result_.explained_variance, eigvals, atol=1e-6)


def test_whiten_produces_unit_variance():
    rng = np.random.default_rng(7)
    x = rng.normal(size=(2000, 5))
    z = PCA(whiten=True).fit_transform(x)
    assert np.allclose(z.var(axis=0, ddof=1), 1.0, atol=0.05)


def test_invalid_n_components_raises():
    with pytest.raises(ValueError):
        PCA(n_components=0)
