from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models import Role, Garage, BusLocation, Severity, WorkOrderStatus

class UserBase(BaseModel):
    email: str
    role: Role
    assigned_garage: Optional[Garage] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

class WorkOrderBase(BaseModel):
    description: str
    severity: Optional[Severity] = None
    is_pm: bool = False

class WorkOrderCreate(WorkOrderBase):
    bus_id: str
    reported_by: str

class WorkOrder(WorkOrderBase):
    id: int
    bus_id: str
    date: datetime
    reported_by: Optional[str] = None
    status: WorkOrderStatus
    class Config:
        orm_mode = True

class BusBase(BaseModel):
    id: str
    model: str
    location: BusLocation
    mileage: int
    last_service_mileage: int
    due_for_pm: bool

class Bus(BusBase):
    status: str # Calculated field: Ready, Critical, Needs Maintenance
    class Config:
        orm_mode = True

class InventoryBase(BaseModel):
    item_name: str
    quantity: int
    threshold: int
    garage: Garage

class Inventory(InventoryBase):
    id: int
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UsedPartBase(BaseModel):
    inventory_id: int
    work_order_id: int
    quantity_used: int

class UsedPartCreate(UsedPartBase):
    pass

class UsedPart(UsedPartBase):
    id: int
    class Config:
        orm_mode = True
