from pydantic import BaseModel
from datetime import datetime
from typing import List

# Payload que o frontend vai enviar no momento do agendamento
class BookingCreate(BaseModel):
    client_name: str
    client_phone: str      # Usaremos o telefone como identificador único
    service_id: int
    scheduled_at: datetime

# Formato da resposta que a API devolverá
class AppointmentResponse(BaseModel):
    id: int
    client_id: int
    service_id: int
    scheduled_at: datetime
    
    # O Pydantic V2 usa from_attributes para converter objetos do SQLAlchemy em JSON
    class Config:
        from_attributes = True

class AppointmentResponse(BaseModel):
    id: int
    client_id: int
    service_id: int
    scheduled_at: datetime
    
    # Novos campos para o front-end exibir o Pix
    payment_id: str | None = None
    pix_copia_cola: str | None = None
    pix_qr_code_base64: str | None = None
    
    class Config:
        from_attributes = True

class DashboardMetrics(BaseModel):
    current_month_revenue: float     # Faturamento já garantido (sinal pago ou concluído)
    pending_revenue: float           # Faturamento aguardando Pix
    estimated_total_revenue: float   # Garantido + Pendente
    total_appointments_month: int    # Quantidade de clientes no mês

class AdminDashboardResponse(BaseModel):
    metrics: DashboardMetrics
    upcoming_appointments: List[AppointmentResponse] # Para a lista de alertas