from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
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

    # Tenta gerar o Pix (se falhar, o agendamento já está salvo e retorna sucesso sem Pix)
    pix_copia_cola = None
    pix_qr_code_base64 = None

    if MP_ACCESS_TOKEN == "APP_USR-TESTE-123":
        # Modo de teste: não gera Pix real
        pass
    else:
        try:
            mp_response = sdk.payment().create(payment_data)
            if mp_response["status"] == 201:
                pix_info = mp_response["response"]["point_of_interaction"]["transaction_data"]
                pix_copia_cola = pix_info["qr_code"]
                pix_qr_code_base64 = pix_info["qr_code_base64"]
        except Exception:
            pass  # Agendamento salvo; Pix será resolvido manualmente

    return {
        "message": "Agendamento criado com sucesso!",
        "appointment_id": appointment.id,
        "pix_copia_cola": pix_copia_cola,
        "pix_qr_code_base64": pix_qr_code_base64,
        "total_value": total_value,
        "deposit_amount": service.deposit_amount,
        "balance_due": balance_due,
        "service_name": service.name,
        "client_name": client.name
    }

@app.get("/appointments/", response_model=list[schemas.AppointmentResponse])
def get_appointments(db: Session = Depends(get_db)):
    return db.query(models.Appointment).order_by(models.Appointment.scheduled_at.asc()).all()

# --- ROTA ADMIN: AGENDAMENTO SEM PIX ---
@app.post("/appointments/admin/")
def create_admin_booking(booking: BookingRequest, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")

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

    total_value = service.base_price
    balance_due = total_value - service.deposit_amount

    appointment = models.Appointment(
        client_id=client.id,
        service_id=service.id,
        scheduled_at=booking.scheduled_at,
        is_maintenance=booking.is_maintenance
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    financial = models.Financial(
        appointment_id=appointment.id,
        total_value=total_value,
        deposit_paid=0.0,
        balance_due=balance_due
    )
    db.add(financial)
    db.commit()

    return {"message": "Atendimento criado com sucesso!", "appointment_id": appointment.id}

# --- ROTA: REAGENDAR ---
class RescheduleRequest(BaseModel):
    scheduled_at: datetime

@app.put("/appointments/{appointment_id}/reagendar/")
def reagendar_appointment(appointment_id: int, data: RescheduleRequest, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    appointment.scheduled_at = data.scheduled_at
    db.commit()
    return {"message": "Reagendado com sucesso!"}

# --- ROTA: CANCELAR ---
@app.delete("/appointments/{appointment_id}/")
def cancelar_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    db.delete(appointment)
    db.commit()
    return {"message": "Agendamento cancelado!"}

# --- ROTAS: BLOQUEIO DE AGENDA ---
@app.post("/blocked-slots/", response_model=schemas.BlockedSlotResponse)
def create_blocked_slot(slot: schemas.BlockedSlotCreate, db: Session = Depends(get_db)):
    db_slot = models.BlockedSlot(**slot.dict())
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

# --- ROTA: BLOQUEIO POR PERÍODO (início → fim) ---
class BlockedRangeRequest(BaseModel):
    date_start: str
    date_end: str
    reason: Optional[str] = None

@app.post("/blocked-slots/range/")
def create_blocked_range(data: BlockedRangeRequest, db: Session = Depends(get_db)):
    from datetime import date as date_type, timedelta
    try:
        start = date_type.fromisoformat(data.date_start)
        end   = date_type.fromisoformat(data.date_end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")
    if end < start:
        raise HTTPException(status_code=400, detail="A data final deve ser igual ou posterior à data inicial.")
    created = []
    current = start
    while current <= end:
        existing = db.query(models.BlockedSlot).filter(models.BlockedSlot.date == current.isoformat()).first()
        if not existing:
            slot = models.BlockedSlot(date=current.isoformat(), reason=data.reason)
            db.add(slot)
            created.append(current.isoformat())
        current += timedelta(days=1)
    db.commit()
    return {"message": f"{len(created)} dia(s) bloqueado(s).", "dates": created}

@app.get("/blocked-slots/", response_model=list[schemas.BlockedSlotResponse])
def get_blocked_slots(db: Session = Depends(get_db)):
    return db.query(models.BlockedSlot).order_by(models.BlockedSlot.date.asc()).all()

@app.delete("/blocked-slots/{slot_id}/")
def delete_blocked_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(models.BlockedSlot).filter(models.BlockedSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado.")
    db.delete(slot)
    db.commit()
    return {"message": "Bloqueio removido!"}

# --- ROTA: ESTATÍSTICAS ---
@app.get("/stats/")
def get_stats(db: Session = Depends(get_db)):
    total_appointments = db.query(models.Appointment).count()

    service_counts = db.query(
        models.Service.name,
        models.Service.category,
        func.count(models.Appointment.id).label("total")
    ).outerjoin(models.Appointment, models.Service.id == models.Appointment.service_id)\
     .group_by(models.Service.id)\
     .order_by(func.count(models.Appointment.id).desc())\
     .all()

    fin = db.query(
        func.coalesce(func.sum(models.Financial.total_value), 0).label("receita"),
        func.coalesce(func.sum(models.Financial.deposit_paid), 0).label("sinais"),
        func.coalesce(func.sum(models.Financial.balance_due), 0).label("pendente")
    ).first()

    ticket_medio = round(float(fin.receita) / total_appointments, 2) if total_appointments > 0 else 0

    return {
        "total_appointments": total_appointments,
        "ticket_medio": ticket_medio,
        "services": [{"name": s.name, "category": s.category, "total": s.total} for s in service_counts],
        "total_revenue": float(fin.receita),
        "total_deposits": float(fin.sinais),
        "total_pending": float(fin.pendente),
    }