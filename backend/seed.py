import random
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, Bus, WorkOrder, Inventory, Role, Garage, BusLocation, Severity, WorkOrderStatus
# NOTE: Passwords stored in plaintext for debugging/login convenience.
def get_password_hash(password):
    # Identity function kept for compatibility with existing calls.
    return password

def seed_data():
    # Drop existing tables to ensure schema changes (like renaming password column) apply.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing data
    db.query(User).delete()
    db.query(WorkOrder).delete()
    db.query(Bus).delete()
    db.query(Inventory).delete()
    db.commit()

    # Users
    users = [
        User(email="jeff@transitland.com", password=get_password_hash("jeff"), role=Role.MAINTENANCE, assigned_garage=Garage.NORTH),
        User(email="tiff@transitland.com", password=get_password_hash("tiff"), role=Role.MAINTENANCE, assigned_garage=Garage.SOUTH),
        User(email="mike@transitland.com", password=get_password_hash("mike"), role=Role.OPERATION_MANAGER, assigned_garage=None),
    ]
    db.add_all(users)

    # Buses
    buses = []
    for i in range(1, 301):
        bus_id = f"N-{100+i}" if i % 2 != 0 else f"S-{200+i}"
        location = random.choice(list(BusLocation))
        # Ensure ID alignment with garage approximately
        if bus_id.startswith("N") and location == BusLocation.SOUTH_GARAGE:
             location = BusLocation.NORTH_GARAGE
        if bus_id.startswith("S") and location == BusLocation.NORTH_GARAGE:
             location = BusLocation.SOUTH_GARAGE
        
        buses.append(Bus(
            id=bus_id,
            location=location,
            mileage=random.randint(5000, 150000),
            last_service_mileage=random.randint(5000, 150000), # will check for PM logic separate
            model=random.choice(["Volvo 7900", "New Flyer Xcelsior", "Gillig Low Floor"]),
            due_for_pm=False
        ))
    
    # Apply specific conditions
    # 10 Due for PM (+5000 to +10000)
    for i in range(10):
        bus = buses[i]
        bus.last_service_mileage = bus.mileage - random.randint(5001, 9999)
        bus.due_for_pm = True
    
    # 10 Overdue (> 10000)
    for i in range(10, 20):
        bus = buses[i]
        bus.last_service_mileage = bus.mileage - random.randint(10001, 15000)
        bus.due_for_pm = True

    # 10 Critical (SEV1 WorkOrder) -> Will add WO later
    critical_indices = range(20, 30)

    # 6 Critical AND Overdue
    critical_overdue_indices = range(30, 36)
    for i in critical_overdue_indices:
        bus = buses[i]
        bus.last_service_mileage = bus.mileage - random.randint(10001, 15000)
        bus.due_for_pm = True

    db.add_all(buses)
    db.commit()

    # WorkOrders
    # Creating Critical WOs
    for i in critical_indices:
        wo = WorkOrder(
            bus_id=buses[i].id,
            description="Engine failure",
            severity=Severity.SEV1,
            status=WorkOrderStatus.OPEN
        )
        db.add(wo)
    
    for i in critical_overdue_indices:
        wo = WorkOrder(
            bus_id=buses[i].id,
            description="Brake system critical failure",
            severity=Severity.SEV1,
            status=WorkOrderStatus.OPEN
        )
        db.add(wo)
    
    # Add some random WOs
    for _ in range(20):
        bus = random.choice(buses)
        wo = WorkOrder(
             bus_id=bus.id,
             description="Broken Seat",
             severity=Severity.SEV3,
             status=WorkOrderStatus.OPEN
        )
        db.add(wo)

    # Inventory
    inventory = [
        Inventory(item_name="Brake Pads", quantity=5, threshold=10, garage=Garage.NORTH),
        Inventory(item_name="Brake Pads", quantity=5, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Oil", quantity=50, threshold=20, garage=Garage.NORTH),
        Inventory(item_name="Oil", quantity=50, threshold=20, garage=Garage.SOUTH),
    ]
    # 10 Random items
    for i in range(10):
        inventory.append(Inventory(
            item_name=f"Part-{i}",
            quantity=random.randint(0, 50),
            threshold=5,
            garage=random.choice(list(Garage))
        ))
    
    db.add_all(inventory)
    db.commit()
    print("Seeding complete.")
    db.close()

if __name__ == "__main__":
    seed_data()
