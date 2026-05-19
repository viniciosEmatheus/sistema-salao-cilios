from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

# Enum para controlar o status do agendamento de forma segura
class AppointmentStatus(enum.Enum):
    PENDING = "pending"       # Cliente escolheu o horário, aguardando o Pix do sinal
    CONFIRMED = "confirmed"   # Sinal pago (Mercado Pago aprovou)
    COMPLETED = "completed"   # Procedimento realizado
    CANCELED = "canceled"     # Cliente desistiu ou não pagou o sinal no tempo limite

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    phone = Column(String, unique=True, nullable=False) # WhatsApp para envio de alertas
    email = Column(String, unique=True, nullable=True)
    is_admin = Column(Boolean, default=False) # True para a dona do salão
    
    appointments = relationship("Appointment", back_populates="client")

class Service(Base):
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False) # Ex: Volume Russo, Manutenção
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)             # Valor total (ex: 150.00)
    deposit_amount = Column(Float, nullable=False)    # Valor do sinal (ex: 50.00)
    
    appointments = relationship("Appointment", back_populates="service")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"))
    service_id = Column(Integer, ForeignKey("services.id"))
    
    scheduled_at = Column(DateTime, nullable=False) # Data e hora da marcação
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.PENDING)
    
    # Dados de Pagamento
    payment_id = Column(String, nullable=True) # ID da transação no Mercado Pago
    
    # Feedback do cliente após o serviço
    feedback_score = Column(Integer, nullable=True) # Ex: 1 a 5 estrelas
    feedback_text = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamentos
    client = relationship("User", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")