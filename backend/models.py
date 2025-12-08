from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

class Role(str, enum.Enum):
    OPERATION_MANAGER = "Operation Manager"
    MAINTENANCE = "Maintenance"

class Garage(str, enum.Enum):
    NORTH = "North"
    SOUTH = "South"

class BusLocation(str, enum.Enum):
    NORTH_GARAGE = "North Garage"
    SOUTH_GARAGE = "South Garage"
    ON_SERVICE = "On Service"

class Severity(str, enum.Enum):
    SEV1 = "SEV1"
    SEV2 = "SEV2"
    SEV3 = "SEV3"

class WorkOrderStatus(str, enum.Enum):
    OPEN = "Open"
    FIXED = "Fixed"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(Enum(Role))
    assigned_garage = Column(Enum(Garage), nullable=True)

class Bus(Base):
    __tablename__ = "buses"
    id = Column(String, primary_key=True, index=True)
    location = Column(Enum(BusLocation))
    mileage = Column(Integer, default=0)
    last_service_mileage = Column(Integer, default=0)
    model = Column(String)
    due_for_pm = Column(Boolean, default=False)
    
    work_orders = relationship("WorkOrder", back_populates="bus")

    @property
    def status(self):
        # This will be handled in Pydantic or logic, but logical representation:
        # Ready: No open WorkOrders
        # Critical: At least one SEV1 WorkOrder
        # Needs Maintenance: Only SEV2/SEV3 WorkOrders
        pass

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(String, ForeignKey("buses.id"))
    date = Column(DateTime, default=datetime.utcnow)
    reported_by = Column(String)
    severity = Column(Enum(Severity), nullable=True) # Null if PM
    description = Column(String)
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.OPEN)
    is_pm = Column(Boolean, default=False)

    bus = relationship("Bus", back_populates="work_orders")
    used_parts = relationship("UsedPart", back_populates="work_order")

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True)
    quantity = Column(Integer, default=0)
    threshold = Column(Integer, default=10)
    garage = Column(Enum(Garage))

class UsedPart(Base):
    __tablename__ = "used_parts"
    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id"))
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    quantity_used = Column(Integer)

    work_order = relationship("WorkOrder", back_populates="used_parts")
    inventory = relationship("Inventory")
