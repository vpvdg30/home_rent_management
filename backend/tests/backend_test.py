"""Backend tests for rental manager - iteration 2 (payment_type, sent_to, rent_history, dues_notes)."""
import os
import pytest
import requests
from datetime import date

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def building():
    r = requests.post(f"{API}/buildings", json={"name": "TEST_Building_Iter2", "address": "Test"})
    assert r.status_code == 200, r.text
    b = r.json()
    yield b
    requests.delete(f"{API}/buildings/{b['id']}")


@pytest.fixture()
def tenant(building):
    payload = {
        "name": "TEST_Tenant_Iter2",
        "phone": "555",
        "email": "t@test.com",
        "building_id": building["id"],
        "unit_number": "A1",
        "join_date": "2025-01-01",
        "monthly_rent": 10000,
        "deposit": 20000,
        "rent_due_day": 5,
        "status": "active",
    }
    r = requests.post(f"{API}/tenants", json=payload)
    assert r.status_code == 200, r.text
    t = r.json()
    yield t
    requests.delete(f"{API}/tenants/{t['id']}")


class TestTenantRentHistoryAndDues:
    def test_get_tenant_has_empty_rent_history_and_dues(self, tenant):
        r = requests.get(f"{API}/tenants/{tenant['id']}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("rent_history") == []
        assert data.get("dues_notes") == ""

    def test_rent_change_appends_history(self, tenant, building):
        # First change 10000 -> 12000
        payload = {
            "name": tenant["name"], "phone": "", "email": "",
            "building_id": building["id"], "unit_number": "A1",
            "join_date": "2025-01-01", "monthly_rent": 12000, "deposit": 20000,
            "rent_due_day": 5, "status": "active",
        }
        r = requests.put(f"{API}/tenants/{tenant['id']}", json=payload)
        assert r.status_code == 200

        # Second change 12000 -> 13500
        payload["monthly_rent"] = 13500
        r2 = requests.put(f"{API}/tenants/{tenant['id']}", json=payload)
        assert r2.status_code == 200

        # No-op update (same rent)
        r3 = requests.put(f"{API}/tenants/{tenant['id']}", json=payload)
        assert r3.status_code == 200

        g = requests.get(f"{API}/tenants/{tenant['id']}").json()
        history = g["rent_history"]
        assert len(history) == 2, f"Expected 2 entries, got {len(history)}: {history}"
        assert history[0]["previous_rent"] == 10000
        assert history[0]["new_rent"] == 12000
        assert history[1]["previous_rent"] == 12000
        assert history[1]["new_rent"] == 13500
        for h in history:
            assert "updated_at" in h
            assert "note" in h

    def test_dues_note_patch(self, tenant):
        r = requests.patch(f"{API}/tenants/{tenant['id']}/dues-note",
                           json={"dues_notes": "Nov 2025 pending 5000"})
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        g = requests.get(f"{API}/tenants/{tenant['id']}").json()
        assert g["dues_notes"] == "Nov 2025 pending 5000"

    def test_dues_note_404(self):
        r = requests.patch(f"{API}/tenants/nonexistent-id/dues-note",
                           json={"dues_notes": "x"})
        assert r.status_code == 404


class TestPaymentsNewFields:
    def test_create_custom_payment_with_sent_to(self, tenant):
        payload = {
            "tenant_id": tenant["id"], "amount": 5000, "month": "2025-01",
            "payment_date": "2025-01-15", "method": "upi",
            "payment_type": "custom", "sent_to": "HDFC UPI",
        }
        r = requests.post(f"{API}/payments", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["payment_type"] == "custom"
        assert p["sent_to"] == "HDFC UPI"
        assert p["is_deposit"] is False

        # Verify in listing
        lst = requests.get(f"{API}/payments", params={"tenant_id": tenant["id"]}).json()
        found = [x for x in lst if x["id"] == p["id"]][0]
        assert found["sent_to"] == "HDFC UPI"
        assert found["payment_type"] == "custom"

    def test_deposit_payment_syncs_is_deposit(self, tenant):
        payload = {
            "tenant_id": tenant["id"], "amount": 20000, "month": "2025-01",
            "payment_date": "2025-01-01", "method": "bank",
            "payment_type": "deposit", "sent_to": "SBI A/C",
        }
        r = requests.post(f"{API}/payments", json=payload)
        assert r.status_code == 200
        p = r.json()
        assert p["payment_type"] == "deposit"
        assert p["is_deposit"] is True
        assert p["sent_to"] == "SBI A/C"

    def test_monthly_payment_default(self, tenant):
        payload = {
            "tenant_id": tenant["id"], "amount": 10000, "month": "2025-02",
            "payment_date": "2025-02-05", "method": "cash",
            "payment_type": "monthly", "sent_to": "Cash to owner",
        }
        r = requests.post(f"{API}/payments", json=payload)
        assert r.status_code == 200
        p = r.json()
        assert p["is_deposit"] is False
        assert p["payment_type"] == "monthly"
