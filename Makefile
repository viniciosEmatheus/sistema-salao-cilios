.PHONY: help install install-dev test lint format eda clean

help:
	@echo "Alvos disponíveis:"
	@echo "  install       Instala o pacote e as dependências de execução"
	@echo "  install-dev   Instala com as ferramentas de desenvolvimento (pytest, ruff)"
	@echo "  test          Roda a suíte de testes com cobertura"
	@echo "  lint          Verifica o estilo com ruff"
	@echo "  format        Formata/organiza imports com ruff"
	@echo "  eda           Executa a análise exploratória (notebooks/eda.py)"
	@echo "  clean         Remove artefatos de build e caches"

install:
	pip install -e .

install-dev:
	pip install -e ".[dev,notebooks]"

test:
	pytest --cov=cyber_data_lab --cov-report=term-missing

lint:
	ruff check src tests

format:
	ruff check --fix src tests
	ruff format src tests

eda:
	python notebooks/eda.py

clean:
	rm -rf build dist *.egg-info src/*.egg-info .pytest_cache .ruff_cache .coverage htmlcov
	find . -type d -name __pycache__ -exec rm -rf {} +
