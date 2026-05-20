from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- SCHEMAS PARA SERVIÇOS ---
class ServiceBase(BaseModel):
    name: str
    category: str
    base_price: float
    deposit_amount: float
    estimated_minutes: int

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int

    class Config:
        from_attributes = True

# --- SCHEMAS PARA CLIENTES ---
class ClientBase(BaseModel):
    name: str
    phone: str
    has_henna_allergy: bool = False
    medical_restrictions: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- SCHEMAS PARA O FINANCEIRO ---
class FinancialBase(BaseModel):
    total_value: float
    deposit_paid: float
    balance_due: float
    payment_method: Optional[str] = None
    machine_fee_applied: bool = False

class FinancialResponse(FinancialBase):
    id: int
    appointment_id: int

    class Config:
        from_attributes = True

# --- SCHEMAS PARA AGENDAMENTOS ---
class AppointmentBase(BaseModel):
    client_id: int
    service_id: int
    scheduled_at: datetime
    is_maintenance: bool = False

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    status: str
    # Incluímos os detalhes do serviço e financeiro na resposta do agendamento
    service: Optional[ServiceResponse] = None
    financial: Optional[FinancialResponse] = None

    class Config:
        from_attributes = True