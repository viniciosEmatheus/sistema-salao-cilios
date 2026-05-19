from database import SessionLocal
import models

# Abre a conexão
db = SessionLocal()

# Cria os dois serviços que colocamos no frontend
servico1 = models.Service(name="Volume Russo", description="Cílios volumosos", price=150.00, deposit_amount=50.00)
servico2 = models.Service(name="Manutenção", description="Manutenção clássica", price=80.00, deposit_amount=30.00)

# Salva no banco
db.add(servico1)
db.add(servico2)
db.commit()

print("Serviços criados com sucesso no banco de dados!")