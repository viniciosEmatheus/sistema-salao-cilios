from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import mercadopago
import os

import models
import schemas
from database import engine, SessionLocal

# Cria as tabelas no banco de dados
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Salão de Cílios - Giovanna Soares")

# Configuração de CORS (Permite o frontend conversar com o backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração Mercado Pago (Pega a variável de ambiente no Render ou usa uma de teste)
MP_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "APP_USR-TESTE-123")
sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# Dependência do Banco de Dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- SCHEMA EXTRA: O TRADUTOR DO FRONTEND ---
# O frontend manda tudo junto num formulário só. Este schema organiza isso.
class BookingRequest(BaseModel):
    client_name: str
    client_phone: str
    service_id: int
    scheduled_at: datetime
    is_maintenance: bool = False
    has_henna_allergy: bool = False
    medical_restrictions: Optional[str] = None

# --- ROTAS DE SERVIÇO ---

@app.post("/services/", response_model=schemas.ServiceResponse)
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db)):
    db_service = models.Service(**service.dict())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@app.get("/services/", response_model=list[schemas.ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()

# --- ROTA PRINCIPAL: AGENDAMENTO E PIX ---

@app.post("/appointments/")
def create_booking(booking: BookingRequest, db: Session = Depends(get_db)):
    # 1. Verifica se o serviço existe e puxa os valores (Ex: 130 de base, 30 de sinal)
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")

    # 2. Busca a cliente pelo telefone ou cria uma nova silenciosamente
    client = db.query(models.Client).filter(models.Client.phone == booking.client_phone).first()
    if not client:
        client = models.Client(
            name=booking.client_name,
            phone=booking.client_phone,
            has_henna_allergy=booking.has_henna_allergy,
            medical_restrictions=booking.medical_restrictions
        )
        db.add(client)
        db.commit()
        db.refresh(client)

    # 3. Matemática Financeira
    total_value = service.base_price
    balance_due = total_value - service.deposit_amount # O que falta pagar na hora

    # 4. Salva o Agendamento
    appointment = models.Appointment(
        client_id=client.id,
        service_id=service.id,
        scheduled_at=booking.scheduled_at,
        is_maintenance=booking.is_maintenance
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # 5. Salva a Ficha Financeira no banco
    financial = models.Financial(
        appointment_id=appointment.id,
        total_value=total_value,
        deposit_paid=0.0, # O Pix foi gerado, mas ainda não compensou
        balance_due=balance_due
    )
    db.add(financial)
    db.commit()

    # 6. Prepara o Mercado Pago
    payment_data = {
        "transaction_amount": service.deposit_amount,
        "description": f"Sinal - {service.name} (Horário #{appointment.id})",
        "payment_method_id": "pix",
        "payer": {
            "email": "cliente@giovannasoares.com", # MP exige e-mail, usamos um genérico
            "first_name": client.name
        }
    }

    # Se a chave for a de teste, manda um Pix falso para não quebrar a tela
    if MP_ACCESS_TOKEN == "APP_USR-TESTE-123":
        return {
            "message": "Agendamento salvo (Modo Teste sem chave MP)",
            "appointment_id": appointment.id,
            "pix_copia_cola": "ChavePixFalsaParaTestesDoSistema",
            "pix_qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            "total_value": total_value,
            "deposit_amount": service.deposit_amount,
            "balance_due": balance_due
        }

    # Gera o Pix real
    mp_response = sdk.payment().create(payment_data)
    
    if mp_response["status"] != 201:
        raise HTTPException(status_code=400, detail="Erro ao gerar o Pix com o Mercado Pago.")

    pix_info = mp_response["response"]["point_of_interaction"]["transaction_data"]
    
    return {
        "message": "Agendamento criado com sucesso!",
        "appointment_id": appointment.id,
        "pix_copia_cola": pix_info["qr_code"],
        "pix_qr_code_base64": pix_info["qr_code_base64"],
        "total_value": total_value,
        "deposit_amount": service.deposit_amount,
        "balance_due": balance_due
    }