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
    TOTAL_BUSES = 300
    MAX_NORTH = 24
    MAX_SOUTH = 19

    # Choose which bus indices will be assigned to North and South garages
    all_indices = list(range(1, TOTAL_BUSES + 1))
    north_indices = set(random.sample(all_indices, min(MAX_NORTH, TOTAL_BUSES)))
    remaining = [i for i in all_indices if i not in north_indices]
    south_indices = set(random.sample(remaining, min(MAX_SOUTH, len(remaining))))

    for i in range(1, TOTAL_BUSES + 1):
        # Use TL-{number} as bus id
        bus_id = f"TL-{i}"
        if i in north_indices:
            location = BusLocation.NORTH_GARAGE
        elif i in south_indices:
            location = BusLocation.SOUTH_GARAGE
        else:
            location = BusLocation.ON_SERVICE

        # Generate mileage first, then ensure last_service_mileage <= mileage
        mileage = random.randint(5000, 150000)
        # last service between (mileage - 20000) and mileage to keep realistic history,
        # but not negative
        last_service_mileage = random.randint(max(0, mileage - 20000), mileage - 3560)

        buses.append(Bus(
            id=bus_id,
            location=location,
            mileage=mileage,
            last_service_mileage=last_service_mileage, # will check for PM logic separate
            model=random.choice(["Volvo 7900", "New Flyer Xcelsior", "Gillig Low Floor"]),
            due_for_pm=False
        ))
    
    db.add_all(buses)
    db.commit()

    # PM Trigger Logic
    for bus in buses:
        if (bus.mileage - bus.last_service_mileage > 5000) and not bus.due_for_pm:
            bus.due_for_pm = True
            
            # Check for open PM workorder
            existing_pm = db.query(WorkOrder).filter(
                WorkOrder.bus_id == bus.id,
                WorkOrder.is_pm == True,
                WorkOrder.status == WorkOrderStatus.OPEN
            ).first()
            
            if not existing_pm:
                pm_wo = WorkOrder(
                    bus_id=bus.id,
                    severity=None,
                    description="Periodic Preventive Maintenance",
                    is_pm=True,
                    status=WorkOrderStatus.OPEN,
                    reported_by="System"
                )
                db.add(pm_wo)
    db.commit()

    # WorkOrders
    issue_pool_sev1 = [
        "Engine overheating — immediate shutdown",
        "Brake hydraulic failure — unsafe to operate",
        "Steering loss — vehicle control compromised",
        "Transmission locked in gear — cannot shift",
        "Fuel leak detected — fire hazard",
        "Air brake compressor failure",
        "Major coolant system breach",
        "Loss of braking assist — urgent",
        "Severe electrical short causing stalls",
    ]
    issue_pool_sev2 = [
        "Door mechanism jammed intermittently",
        "AC cooling weak — needs service",
        "Suspension air leak — reduced ride quality",
        "Alternator output low — charging issues",
        "Wheelchair ramp sensor fault",
        "Exhaust clamp loose — excessive noise",
        "Intermittent engine misfire",
        "Fuel pressure regulator fault",
    ]
    issue_pool_sev3 = [
        "Broken passenger seat",
        "Wiper blades streaking",
        "Headlight bulb dim",
        "Minor body panel dent",
        "Seat fabric tear",
        "Interior light flicker",
        "Cabin heater low output",
        "Loose trim panel rattling",
    ]

    # Define desired counts
    MAX_SEV1 = 33
    MAX_SEV23 = 46  # combined SEV2 + SEV3
    PM_DUE_COUNT = 18
    PM_OVERDUE_COUNT = 22

    # Operate only on buses located in garages for assigning work orders
    garage_buses = [b for b in buses if b.location in (BusLocation.NORTH_GARAGE, BusLocation.SOUTH_GARAGE)]
    available_ids = list(range(len(garage_buses)))
    # Maintain a separate pool for PM selection so PM can coexist with issue WOs
    available_ids_pm = list(range(len(garage_buses)))

    # Helper to sample unique indices from available_ids
    def pick(n):
        nonlocal available_ids
        n = min(n, len(available_ids))
        picked = random.sample(available_ids, n)
        # remove picked
        available_ids = [i for i in available_ids if i not in picked]
        return picked

    # PM picks should not be constrained by SEV picks; allow overlap
    def pick_pm(n):
        nonlocal available_ids_pm
        n = min(n, len(available_ids_pm))
        picked = random.sample(available_ids_pm, n)
        # Do not remove picked from PM pool to allow multiple PM categories if needed
        return picked

    # Pick SEV1 buses
    sev1_indices = pick(MAX_SEV1)
    for idx in sev1_indices:
        bus = garage_buses[idx]
        wo = WorkOrder(
            bus_id=bus.id,
            description=random.choice(issue_pool_sev1),
            severity=Severity.SEV1,
            status=WorkOrderStatus.OPEN,
            is_pm=False,
        )
        db.add(wo)

    # Pick SEV2/3 buses
    sev23_indices = pick(MAX_SEV23)
    for idx in sev23_indices:
        bus = garage_buses[idx]
        sev = Severity.SEV2 if random.random() < 0.5 else Severity.SEV3
        desc = random.choice(issue_pool_sev2 if sev == Severity.SEV2 else issue_pool_sev3)
        wo = WorkOrder(
            bus_id=bus.id,
            description=desc,
            severity=sev,
            status=WorkOrderStatus.OPEN,
            is_pm=False,
        )
        db.add(wo)

    # Pick PM due (not overdue) and PM overdue buses
    pm_due_indices = pick_pm(PM_DUE_COUNT)
    for idx in pm_due_indices:
        bus = garage_buses[idx]
        # set last_service_mileage to make it due (5,001-9,999)
        bus.last_service_mileage = bus.mileage - random.randint(5001, 9999)
        bus.due_for_pm = True
        wo = WorkOrder(
            bus_id=bus.id,
            description="Periodic Preventive Maintenance",
            severity=None,
            status=WorkOrderStatus.OPEN,
            is_pm=True,
        )
        db.add(wo)

    pm_overdue_indices = pick_pm(PM_OVERDUE_COUNT)
    for idx in pm_overdue_indices:
        bus = garage_buses[idx]
        # set last_service_mileage to make it overdue (>10000)
        bus.last_service_mileage = bus.mileage - random.randint(10001, 15000)
        bus.due_for_pm = True
        wo = WorkOrder(
            bus_id=bus.id,
            description="Periodic Preventive Maintenance",
            severity=None,
            status=WorkOrderStatus.OPEN,
            is_pm=True,
        )
        db.add(wo)

    # Optionally add a few small random low-priority WOs on remaining buses (without exceeding totals)
    # We'll add up to 10 extra SEV3s if there are still available garage buses
    extra_pool = min(10, len(available_ids))
    extra_indices = pick(extra_pool)
    for idx in extra_indices:
        bus = garage_buses[idx]
        wo = WorkOrder(
            bus_id=bus.id,
            description=random.choice(issue_pool_sev3),
            severity=Severity.SEV3,
            status=WorkOrderStatus.OPEN,
            is_pm=False,
        )
        db.add(wo)

    # Inventory
    inventory = [
        Inventory(item_name="Brake Pads (Heavy Duty)", quantity=8, threshold=10, garage=Garage.NORTH),
        Inventory(item_name="Brake Pads (Heavy Duty)", quantity=15, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Engine Oil (Bulk Barrel)", quantity=120, threshold=50, garage=Garage.NORTH),
        Inventory(item_name="Engine Oil (Bulk Barrel)", quantity=90, threshold=50, garage=Garage.SOUTH),
        Inventory(item_name="Air Filter (Engine)", quantity=4, threshold=5, garage=Garage.NORTH),
        Inventory(item_name="Air Filter (Engine)", quantity=12, threshold=5, garage=Garage.SOUTH),
        Inventory(item_name="Front Tire (Standard)", quantity=25, threshold=10, garage=Garage.NORTH),
        Inventory(item_name="Front Tire (Standard)", quantity=19, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Wiper Blades (32-in)", quantity=6, threshold=5, garage=Garage.NORTH),
        Inventory(item_name="Wiper Blades (32-in)", quantity=3, threshold=5, garage=Garage.SOUTH),
        Inventory(item_name="Alternator (Bosch)", quantity=2, threshold=5, garage=Garage.NORTH),
        Inventory(item_name="Alternator (Bosch)", quantity=11, threshold=5, garage=Garage.SOUTH),
        Inventory(item_name="Headlight Bulb (LED)", quantity=35, threshold=10, garage=Garage.NORTH),
        Inventory(item_name="Headlight Bulb (LED)", quantity=18, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Starter Motor (Diesel)", quantity=22, threshold=10, garage=Garage.NORTH),
        Inventory(item_name="Starter Motor (Diesel)", quantity=4, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Coolant (Bulk)", quantity=45, threshold=15, garage=Garage.NORTH),
        Inventory(item_name="Coolant (Bulk)", quantity=28, threshold=15, garage=Garage.SOUTH),
        Inventory(item_name="Fan Belt (Serpentine)", quantity=3, threshold=10, garage=Garage.NORTH),
        Inventory(item_name="Fan Belt (Serpentine)", quantity=25, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Fuel Injector (Common)", quantity=7, threshold=5, garage=Garage.NORTH),
        Inventory(item_name="Turbocharger (Model X)", quantity=1, threshold=5, garage=Garage.NORTH),
        Inventory(item_name="Seat Fabric Roll (Blue)", quantity=15, threshold=10, garage=Garage.NORTH),
        Inventory(item_name="North-Specific Lift Fluid", quantity=60, threshold=30, garage=Garage.NORTH),
        Inventory(item_name="Diagnostic Cable Set", quantity=2, threshold=5, garage=Garage.NORTH),
        Inventory(item_name="South-Specific Lift Fluid", quantity=5, threshold=30, garage=Garage.SOUTH),
        Inventory(item_name="AC Compressor (Bus)", quantity=3, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Wheelchair Ramp Motor", quantity=12, threshold=5, garage=Garage.SOUTH),
        Inventory(item_name="Body Panel (Side Door)", quantity=8, threshold=10, garage=Garage.SOUTH),
        Inventory(item_name="Transmission Filter Kit", quantity=7, threshold=5, garage=Garage.SOUTH),
    ]
    
    db.add_all(inventory)
    db.commit()
    print("Seeding complete.")
    db.close()

if __name__ == "__main__":
    seed_data()
