from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Rental Tenant Manager")
api_router = APIRouter(prefix="/api")


# ---------- Helpers ----------
def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: dict) -> dict:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


# ---------- Models ----------
class BuildingIn(BaseModel):
    name: str
    address: Optional[str] = ""
    description: Optional[str] = ""
    image: Optional[str] = ""  # base64 data URL


class Building(BuildingIn):
    id: str
    created_at: str


class TenantIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    building_id: str
    unit_number: Optional[str] = ""
    join_date: str  # YYYY-MM-DD
    monthly_rent: float
    deposit: float = 0
    rent_due_day: int = 5  # day of month rent is due
    status: Literal["active", "vacated"] = "active"
    notes: Optional[str] = ""
    dues_notes: Optional[str] = ""  # notes about pending/overdue prior rents
    avatar: Optional[str] = ""  # base64


class Tenant(TenantIn):
    id: str
    created_at: str


class RentHistoryEntry(BaseModel):
    previous_rent: float
    new_rent: float
    updated_at: str
    note: Optional[str] = ""


class PaymentIn(BaseModel):
    tenant_id: str
    amount: float
    month: str  # YYYY-MM (rent period)
    payment_date: str  # YYYY-MM-DD (date payment was actually made)
    method: Literal["cash", "upi", "bank", "cheque", "card", "other"]
    payment_type: Literal["monthly", "custom", "deposit"] = "monthly"
    sent_to: Optional[str] = ""  # where the payment landed (e.g. "HDFC UPI", "Owner cash")
    notes: Optional[str] = ""
    receipt_image: Optional[str] = ""  # base64
    is_deposit: bool = False  # kept for backward-compat


class Payment(PaymentIn):
    id: str
    building_id: str
    created_at: str


class ExpenseIn(BaseModel):
    building_id: str
    title: str
    description: Optional[str] = ""
    amount: float
    expense_date: str
    paid_by: Literal["owner", "tenant"] = "owner"
    tenant_id: Optional[str] = ""
    receipt_image: Optional[str] = ""


class Expense(ExpenseIn):
    id: str
    created_at: str


# ---------- Buildings ----------
@api_router.get("/buildings", response_model=List[Building])
async def list_buildings():
    items = await db.buildings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api_router.post("/buildings", response_model=Building)
async def create_building(payload: BuildingIn):
    doc = {**payload.model_dump(), "id": new_id(), "created_at": now_iso()}
    await db.buildings.insert_one(doc)
    return clean(doc)


@api_router.get("/buildings/{building_id}", response_model=Building)
async def get_building(building_id: str):
    doc = await db.buildings.find_one({"id": building_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Building not found")
    return doc


@api_router.put("/buildings/{building_id}", response_model=Building)
async def update_building(building_id: str, payload: BuildingIn):
    updated = await db.buildings.find_one_and_update(
        {"id": building_id},
        {"$set": payload.model_dump()},
        return_document=True,
        projection={"_id": 0},
    )
    if not updated:
        raise HTTPException(404, "Building not found")
    return updated


@api_router.delete("/buildings/{building_id}")
async def delete_building(building_id: str):
    result = await db.buildings.delete_one({"id": building_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Building not found")
    # cascade delete
    await db.tenants.delete_many({"building_id": building_id})
    await db.payments.delete_many({"building_id": building_id})
    await db.expenses.delete_many({"building_id": building_id})
    return {"ok": True}


# ---------- Tenants ----------
@api_router.get("/tenants")
async def list_tenants(building_id: Optional[str] = None, status: Optional[str] = None):
    q = {}
    if building_id:
        q["building_id"] = building_id
    if status:
        q["status"] = status
    items = await db.tenants.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # attach building name
    building_ids = list({t["building_id"] for t in items})
    b_map = {}
    if building_ids:
        async for b in db.buildings.find({"id": {"$in": building_ids}}, {"_id": 0}):
            b_map[b["id"]] = b.get("name")
    # compute current status of rent for this month
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    for t in items:
        t["building_name"] = b_map.get(t["building_id"], "Unknown")
        paid = await db.payments.find_one(
            {"tenant_id": t["id"], "month": current_month, "is_deposit": False}
        )
        t["current_month_paid"] = bool(paid)
    return items


@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(payload: TenantIn):
    b = await db.buildings.find_one({"id": payload.building_id})
    if not b:
        raise HTTPException(400, "Building not found")
    doc = {
        **payload.model_dump(),
        "id": new_id(),
        "created_at": now_iso(),
        "rent_history": [],
    }
    await db.tenants.insert_one(doc)
    return clean(doc)


@api_router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str):
    t = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Tenant not found")
    b = await db.buildings.find_one({"id": t["building_id"]}, {"_id": 0})
    t["building"] = b
    # Ensure rent_history exists in response
    t.setdefault("rent_history", [])
    t.setdefault("dues_notes", "")
    return t


@api_router.put("/tenants/{tenant_id}", response_model=Tenant)
async def update_tenant(tenant_id: str, payload: TenantIn):
    existing = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Tenant not found")

    update_doc = payload.model_dump()
    # Track rent changes
    old_rent = float(existing.get("monthly_rent", 0))
    new_rent = float(update_doc.get("monthly_rent", 0))
    if old_rent != new_rent:
        history_entry = {
            "previous_rent": old_rent,
            "new_rent": new_rent,
            "updated_at": now_iso(),
            "note": "",
        }
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$push": {"rent_history": history_entry}},
        )

    updated = await db.tenants.find_one_and_update(
        {"id": tenant_id},
        {"$set": update_doc},
        return_document=True,
        projection={"_id": 0},
    )
    return updated


class DuesNoteIn(BaseModel):
    dues_notes: str


@api_router.patch("/tenants/{tenant_id}/dues-note")
async def update_dues_note(tenant_id: str, payload: DuesNoteIn):
    result = await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"dues_notes": payload.dues_notes}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Tenant not found")
    return {"ok": True}


@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str):
    result = await db.tenants.delete_one({"id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Tenant not found")
    await db.payments.delete_many({"tenant_id": tenant_id})
    return {"ok": True}


@api_router.get("/tenants/{tenant_id}/payments")
async def tenant_payments(tenant_id: str):
    items = (
        await db.payments.find({"tenant_id": tenant_id}, {"_id": 0})
        .sort("payment_date", -1)
        .to_list(1000)
    )
    return items


# ---------- Payments ----------
@api_router.get("/payments")
async def list_payments(
    building_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    month: Optional[str] = None,
):
    q = {}
    if building_id:
        q["building_id"] = building_id
    if tenant_id:
        q["tenant_id"] = tenant_id
    if month:
        q["month"] = month
    items = (
        await db.payments.find(q, {"_id": 0})
        .sort("payment_date", -1)
        .to_list(2000)
    )
    # enrich
    tenant_ids = list({p["tenant_id"] for p in items})
    t_map = {}
    if tenant_ids:
        async for t in db.tenants.find({"id": {"$in": tenant_ids}}, {"_id": 0}):
            t_map[t["id"]] = {"name": t["name"], "unit_number": t.get("unit_number", "")}
    for p in items:
        info = t_map.get(p["tenant_id"], {})
        p["tenant_name"] = info.get("name", "Unknown")
        p["unit_number"] = info.get("unit_number", "")
    return items


@api_router.post("/payments", response_model=Payment)
async def create_payment(payload: PaymentIn):
    tenant = await db.tenants.find_one({"id": payload.tenant_id})
    if not tenant:
        raise HTTPException(400, "Tenant not found")
    data = payload.model_dump()
    # Keep is_deposit in sync with payment_type for backward compatibility
    data["is_deposit"] = data.get("payment_type") == "deposit"
    doc = {
        **data,
        "id": new_id(),
        "building_id": tenant["building_id"],
        "created_at": now_iso(),
    }
    await db.payments.insert_one(doc)
    return clean(doc)


@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str):
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Payment not found")
    return {"ok": True}


# ---------- Expenses ----------
@api_router.get("/expenses")
async def list_expenses(building_id: Optional[str] = None):
    q = {}
    if building_id:
        q["building_id"] = building_id
    items = (
        await db.expenses.find(q, {"_id": 0})
        .sort("expense_date", -1)
        .to_list(2000)
    )
    # enrich building name
    b_ids = list({e["building_id"] for e in items})
    b_map = {}
    if b_ids:
        async for b in db.buildings.find({"id": {"$in": b_ids}}, {"_id": 0}):
            b_map[b["id"]] = b.get("name")
    t_ids = [e.get("tenant_id") for e in items if e.get("tenant_id")]
    t_map = {}
    if t_ids:
        async for t in db.tenants.find({"id": {"$in": t_ids}}, {"_id": 0}):
            t_map[t["id"]] = t.get("name")
    for e in items:
        e["building_name"] = b_map.get(e["building_id"], "Unknown")
        e["tenant_name"] = t_map.get(e.get("tenant_id", ""), "")
    return items


@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseIn):
    b = await db.buildings.find_one({"id": payload.building_id})
    if not b:
        raise HTTPException(400, "Building not found")
    doc = {**payload.model_dump(), "id": new_id(), "created_at": now_iso()}
    await db.expenses.insert_one(doc)
    return clean(doc)


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Expense not found")
    return {"ok": True}


# ---------- Dashboard ----------
@api_router.get("/dashboard/summary")
async def dashboard_summary():
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")

    total_buildings = await db.buildings.count_documents({})
    total_tenants = await db.tenants.count_documents({"status": "active"})

    # Income for current month (non-deposit)
    income_agg = await db.payments.aggregate([
        {"$match": {"month": current_month, "is_deposit": False}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    month_income = income_agg[0]["total"] if income_agg else 0

    # Total expenses this month
    expense_agg = await db.expenses.aggregate([
        {"$match": {"expense_date": {"$regex": f"^{current_month}"}, "paid_by": "owner"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    month_expenses = expense_agg[0]["total"] if expense_agg else 0

    # Expected rent (sum of active tenants' monthly_rent)
    expected_agg = await db.tenants.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "total": {"$sum": "$monthly_rent"}}}
    ]).to_list(1)
    expected_rent = expected_agg[0]["total"] if expected_agg else 0

    # Tenants pending for current month
    active_tenants = await db.tenants.find({"status": "active"}, {"_id": 0}).to_list(1000)
    pending = []
    for t in active_tenants:
        paid = await db.payments.find_one(
            {"tenant_id": t["id"], "month": current_month, "is_deposit": False}
        )
        if not paid:
            b = await db.buildings.find_one({"id": t["building_id"]}, {"_id": 0})
            pending.append({
                "id": t["id"],
                "name": t["name"],
                "unit_number": t.get("unit_number", ""),
                "monthly_rent": t["monthly_rent"],
                "rent_due_day": t.get("rent_due_day", 5),
                "building_name": b.get("name") if b else "",
            })

    # Last 6 months trend
    months = []
    for i in range(5, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        months.append(f"{y:04d}-{m:02d}")

    income_by_month = defaultdict(float)
    async for p in db.payments.find({"month": {"$in": months}, "is_deposit": False}, {"_id": 0}):
        income_by_month[p["month"]] += p["amount"]

    expense_by_month = defaultdict(float)
    async for e in db.expenses.find({"paid_by": "owner"}, {"_id": 0}):
        prefix = e["expense_date"][:7]
        if prefix in months:
            expense_by_month[prefix] += e["amount"]

    trend = [
        {
            "month": m,
            "income": round(income_by_month[m], 2),
            "expenses": round(expense_by_month[m], 2),
        }
        for m in months
    ]

    # Recent payments (5)
    recent_payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    for p in recent_payments:
        t = await db.tenants.find_one({"id": p["tenant_id"]}, {"_id": 0})
        p["tenant_name"] = t["name"] if t else "Unknown"

    return {
        "total_buildings": total_buildings,
        "total_tenants": total_tenants,
        "month_income": round(month_income, 2),
        "month_expenses": round(month_expenses, 2),
        "expected_rent": round(expected_rent, 2),
        "pending_count": len(pending),
        "pending_tenants": pending,
        "trend": trend,
        "recent_payments": recent_payments,
        "current_month": current_month,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
