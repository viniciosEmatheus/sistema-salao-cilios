from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

# IMPORTAÇÕES CORRIGIDAS (SEM O PONTO)
import models, schemas, services
from database import engine, get_db

# Cria as tabelas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lash Salon API", version="1.0.0")

# ... resto do seu código

# Configuração de CORS para permitir que o frontend faça requisições
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, substitua pelo domínio do seu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Webservice do Salão de Cílios rodando perfeitamente no Render!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/appointments/", response_model=schemas.AppointmentResponse)
def create_appointment(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    # 1. Valida se o serviço escolhido realmente existe
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
        
    # 2. Busca o cliente pelo WhatsApp. Se não existir, cria um novo na hora.
    user = db.query(models.User).filter(models.User.phone == booking.client_phone).first()
    if not user:
        user = models.User(name=booking.client_name, phone=booking.client_phone)
        db.add(user)
        db.commit()
        db.refresh(user) # Atualiza o objeto com o ID gerado pelo banco
        
    # 3. Gera o agendamento com o status inicial 'PENDING'
    appointment = models.Appointment(
        client_id=user.id,
        service_id=service.id,
        scheduled_at=booking.scheduled_at,
        status=models.AppointmentStatus.PENDING
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    return appointment

@app.post("/appointments/", response_model=schemas.AppointmentResponse)
def create_appointment(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
        
    user = db.query(models.User).filter(models.User.phone == booking.client_phone).first()
    if not user:
        user = models.User(name=booking.client_name, phone=booking.client_phone)
        db.add(user)
        db.commit()
        db.refresh(user) 
        
    appointment = models.Appointment(
        client_id=user.id,
        service_id=service.id,
        scheduled_at=booking.scheduled_at,
        status=models.AppointmentStatus.PENDING
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # NOVO: Gerar a cobrança do sinal no Mercado Pago
    description = f"Sinal para {service.name} no salão"
    pix_data = services.create_pix_payment(
        appointment_id=appointment.id,
        description=description,
        amount=service.deposit_amount, # O valor do sinal configurado no serviço
        client_email=user.email
    )
    
    # Se falhar a comunicação com o Mercado Pago, podemos apagar o agendamento ou manter como PENDING
    if "error" in pix_data:
        raise HTTPException(status_code=400, detail=f"Erro ao gerar Pix: {pix_data['error']}")
        
    # Atualiza o ID do pagamento no banco para rastrearmos depois
    appointment.payment_id = str(pix_data["payment_id"])
    db.commit()
    db.refresh(appointment)
    
    # Injetamos os dados do Pix manualmente na resposta para o front-end
    return {
        "id": appointment.id,
        "client_id": appointment.client_id,
        "service_id": appointment.service_id,
        "scheduled_at": appointment.scheduled_at,
        "payment_id": appointment.payment_id,
        "pix_copia_cola": pix_data["qr_code"],
        "pix_qr_code_base64": pix_data["qr_code_base64"]
    }

@app.post("/webhooks/mercadopago", status_code=status.HTTP_200_OK)
async def mercadopago_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Rota que o Mercado Pago chama automaticamente a cada mudança de status do Pix.
    """
    # 1. Captura os dados enviados pelo Mercado Pago
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload inválido")

    # O Mercado Pago envia notificações de vários tipos. Nós só queremos as de 'payment'.
    if payload.get("type") == "payment":
        payment_id = payload.get("data", {}).get("id")
        
        if not payment_id:
            return {"message": "ID do pagamento não encontrado no payload"}

        # 2. Consulta o Mercado Pago usando o SDK para checar o status real e atualizado
        # Isso evita "ataques de falsificação de webhook" (fakes), pois validamos direto na fonte.
        payment_info_response = services.sdk.payment().get(payment_id)
        payment_info = payment_info_response.get("response")

        if not payment_info or "error" in payment_info:
            raise HTTPException(status_code=400, detail="Não foi possível validar o pagamento junto ao Mercado Pago")

        # 3. Verifica o status da transação e a referência do agendamento
        mp_status = payment_info.get("status")
        # Lembra do external_reference que enviamos na criação? Ele guarda o ID do agendamento!
        appointment_id = payment_info.get("external_reference")

        if appointment_id:
            # Busca o agendamento no nosso banco de dados
            appointment = db.query(models.Appointment).filter(models.Appointment.id == int(appointment_id)).first()
            
            if appointment:
                # Se o status no Mercado Pago for 'approved', confirmamos o agendamento
                if mp_status == "approved" and appointment.status == models.AppointmentStatus.PENDING:
                    appointment.status = models.AppointmentStatus.CONFIRMED
                    db.commit()
                    
                    # TODO: Aqui dispararemos o alerta de marcação (WhatsApp) para o cliente e dona
                    print(f"Sucesso! Agendamento {appointment.id} confirmado via Pix.")
                    
                # Se o pagamento foi cancelado ou recusado
                elif mp_status in ["cancelled", "rejected"] and appointment.status == models.AppointmentStatus.PENDING:
                    appointment.status = models.AppointmentStatus.CANCELED
                    db.commit()

    # O Mercado Pago exige que retornemos o status 200 ou 201 rapidamente, 
    # caso contrário eles continuam tentando reenviar a mesma notificação.
    return {"status": "success"}

@app.get("/admin/dashboard", response_model=schemas.AdminDashboardResponse)
def get_admin_dashboard(db: Session = Depends(get_db)):
    """
    Retorna as métricas financeiras do mês atual e os próximos agendamentos.
    Em produção, essa rota DEVE ser protegida por autenticação (ex: JWT).
    """
    now = datetime.now()
    
    # Filtra apenas os agendamentos do mês e ano atuais
    current_month_appointments = db.query(models.Appointment).join(models.Service).filter(
        func.extract('month', models.Appointment.scheduled_at) == now.month,
        func.extract('year', models.Appointment.scheduled_at) == now.year
    )
    
    # Calcula Faturamento Confirmado (CONFIRMED e COMPLETED)
    confirmed_revenue = current_month_appointments.filter(
        models.Appointment.status.in_([models.AppointmentStatus.CONFIRMED, models.AppointmentStatus.COMPLETED])
    ).with_entities(func.sum(models.Service.price)).scalar() or 0.0

    # Calcula Faturamento Pendente (PENDING)
    pending_revenue = current_month_appointments.filter(
        models.Appointment.status == models.AppointmentStatus.PENDING
    ).with_entities(func.sum(models.Service.price)).scalar() or 0.0

    # Próximos agendamentos (do momento atual em diante) para os Alertas de Marcação na tela
    upcoming = db.query(models.Appointment).filter(
        models.Appointment.scheduled_at >= now,
        models.Appointment.status != models.AppointmentStatus.CANCELED
    ).order_by(models.Appointment.scheduled_at.asc()).limit(10).all()

    return {
        "metrics": {
            "current_month_revenue": confirmed_revenue,
            "pending_revenue": pending_revenue,
            "estimated_total_revenue": confirmed_revenue + pending_revenue,
            "total_appointments_month": current_month_appointments.count()
        },
        "upcoming_appointments": upcoming
    }