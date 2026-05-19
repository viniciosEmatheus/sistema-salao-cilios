import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# A URL do banco de dados. No Render, você definirá isso nas variáveis de ambiente (Environment Variables).
# O SQLite fica como fallback (plano B) para você testar localmente no seu PC antes de subir.
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./lash_salon.db" # Arquivo local criado caso não encontre o Postgres
)

# O SQLite exige um parâmetro extra para evitar erros de thread no FastAPI
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

# O "engine" é o motor que gerencia a comunicação do Python com o banco de dados
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

# A sessão é o que usaremos para realizar as consultas (INSERT, SELECT, UPDATE)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Função auxiliar (Dependência) para abrir e fechar a conexão automaticamente a cada requisição
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()