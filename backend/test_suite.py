"""
Comprehensive Automated Test Suite for Student Financial Risk & Warning Backend.
Verifies all auth, profile, live expense tracking, dynamic ML scoring,
Gemini 2.5 Flash coaching, purchase simulation, and retraining check-in endpoints.
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_full_pipeline():
    print("\n--- 1. Testing System Health & Schema Options ---")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health = res.json()
    print(f"Health check: {health}")
    assert health["status"] == "healthy"
    assert health["model_loaded"] is True

    res = client.get("/schema-options")
    assert res.status_code == 200
    assert len(res.json()["steps"]) == 4
    print("Schema options verified (4 steps).")

    print("\n--- 2. Testing 1-Click Demo Login ---")
    res = client.post("/api/auth/demo")
    assert res.status_code == 200
    demo_auth = res.json()
    print(f"Demo Auth user: {demo_auth['user']['full_name']} (ID: {demo_auth['user']['id']})")
    assert demo_auth["user"]["is_demo"] is True
    assert demo_auth["has_profile"] is True

    demo_id = demo_auth["user"]["id"]

    print("\n--- 3. Testing User Registration & Custom Profile Onboarding ---")
    import uuid
    test_email = f"student_{uuid.uuid4().hex[:8]}@univ.edu.bd"
    res = client.post("/api/auth/register", json={

        "email": test_email,
        "password": "securepassword123",
        "full_name": "Nafis Rahman"
    })
    assert res.status_code == 200
    auth_data = res.json()
    user_id = auth_data["user"]["id"]
    print(f"Registered user: {auth_data['user']['full_name']} (ID: {user_id})")

    # Onboarding Baseline Profile
    onboarding_payload = {
        "user_id": user_id,
        "gender": "Male",
        "age": 22,
        "year_of_study": "3rd year",
        "university_type": "Public",
        "where_you_live": "Mess-hostel",
        "total_monthly_money": "5–10k",
        "monthly_allowance_fixed": 9000.0,
        "monthly_rent_fixed": 3500.0,
        "savings_goal_fixed": 1000.0,
        "main_source_of_money": "Family",
        "do_you_earn_income": "No",
        "track_spending": 3,
        "mobile_banking_use": "Daily",
        "borrowed_from_friends_baseline": "1–2",
        "aware_balance": 3,
        "aware_weekly_track": 3,
        "aware_check_before_buy": 3,
        "impulse_spontaneous": 4,
        "impulse_discounts": 4,
        "impulse_regret": 3
    }
    res = client.post("/api/onboarding", json=onboarding_payload)
    assert res.status_code == 200
    prof = res.json()
    print(f"Saved Profile: awareness_score={prof['awareness_score']}, impulse_score={prof['impulse_score']}")
    assert prof["awareness_score"] == 3.0
    assert prof["impulse_score"] == 3.67

    print("\n--- 4. Testing Initial Dashboard ---")
    res = client.get(f"/api/dashboard/{user_id}")
    assert res.status_code == 200
    dash = res.json()
    print(f"Initial Dashboard: Allowance={dash['monthly_allowance']} Tk, Daily Safe={dash['daily_safe_to_spend']} Tk/day, Risk={dash['current_risk']['risk_score_pct']}% ({dash['current_risk']['risk_tier']})")
    assert dash["monthly_allowance"] == 9000.0

    print("\n--- 5. Testing Daily Expense Logging & Dynamic Risk Updates ---")
    # Log 1: Food expense
    res = client.post("/api/expenses", json={
        "user_id": user_id,
        "amount": 250.0,
        "category": "Food",
        "payment_method": "Cash",
        "note": "Lunch with friends at cafeteria"
    })
    assert res.status_code == 200
    exp_res1 = res.json()
    print(f"Expense 1 added: 250 Tk -> New Daily Safe={exp_res1['daily_safe_to_spend']} Tk, Risk={exp_res1['updated_risk']['risk_score_pct']}%")

    # Add Income: Tuition Job 4000 Tk
    res = client.post("/api/incomes", json={
        "user_id": user_id,
        "amount": 4000.0,
        "source": "Tuition-job",
        "payment_method": "bKash",
        "note": "Class 10 physics tuition payment"
    })
    assert res.status_code == 200
    inc_res = res.json()
    print(f"Income added: 4000 Tk -> New Total Monthly Money={inc_res['total_monthly_money']} Tk, Daily Safe={inc_res['daily_safe_to_spend']} Tk")

    # Log 2: Entertainment/Shopping expense
    res = client.post("/api/expenses", json={
        "user_id": user_id,
        "amount": 1800.0,
        "category": "Entertainment",
        "payment_method": "bKash",
        "note": "Sneakers discount deal"
    })
    assert res.status_code == 200
    exp_res2 = res.json()
    print(f"Expense 2 added: 1800 Tk -> New Daily Safe={exp_res2['daily_safe_to_spend']} Tk, Risk={exp_res2['updated_risk']['risk_score_pct']}%")

    # Calendar Ledger
    res = client.get(f"/api/ledger/{user_id}")
    assert res.status_code == 200
    ledger = res.json()
    print(f"Calendar Ledger: Total Income={ledger['total_income']} Tk, Total Expense={ledger['total_expense']} Tk, Net={ledger['net_balance']} Tk, Days with transactions={len(ledger['calendar_days'])}")
    assert len(ledger['transactions']) >= 3

    # PIN Security
    res = client.post("/api/auth/set-pin", json={"user_id": user_id, "pin": "1234"})
    assert res.status_code == 200
    res = client.post("/api/auth/verify-pin", json={"user_id": user_id, "pin": "1234"})
    assert res.status_code == 200
    print("PIN Security: 4-digit PIN 1234 set and verified successfully.")

    # Pro Subscription Toggle
    res = client.post("/api/subscription/demo-pro-toggle", json={"user_id": user_id, "enable": True})
    assert res.status_code == 200
    res = client.get(f"/api/subscription/status/{user_id}")
    assert res.status_code == 200
    sub_stat = res.json()
    print(f"Pro Subscription Status: is_pro={sub_stat['is_pro']}, tier={sub_stat['tier']}")
    assert sub_stat['is_pro'] is True


    # List expenses
    res = client.get(f"/api/expenses/{user_id}")
    assert res.status_code == 200
    exp_list = res.json()
    print(f"Total expenses retrieved: {len(exp_list)}")
    assert len(exp_list) == 2

    print("\n--- 6. Testing AI Financial Coach (Gemini 2.5 Flash / Fallback) ---")
    res = client.post("/api/ai-coach", json={"user_id": user_id})
    assert res.status_code == 200
    coach = res.json()
    print(f"AI Coach advice (EN): {coach['daily_budget_advice_en']}")
    print(f"AI Coach advice (BN): {coach['daily_budget_advice_bn']}")
    print(f"Campus tips (EN): {coach['campus_tips_en']}")
    print(f"Campus tips (BN): {coach['campus_tips_bn']}")
    assert len(coach["campus_tips_en"]) >= 2

    print("\n--- 7. Testing 'Ask AI Before I Buy' Purchase Simulator ---")
    res = client.post("/api/ai-coach/simulate", json={
        "user_id": user_id,
        "item_title": "Noise Cancelling Headphones",
        "amount": 2500.0,
        "category": "Entertainment"
    })
    assert res.status_code == 200
    sim = res.json()
    print(f"Purchase Simulation: Item='{sim['item_title']}', Amount={sim['amount']} Tk")
    print(f"Risk: {sim['current_risk_pct']}% -> {sim['simulated_risk_pct']}% (Delta: {sim['risk_pct_change']}%)")
    print(f"Daily Safe: {sim['current_daily_safe']} Tk -> {sim['simulated_daily_safe']} Tk")
    print(f"Verdict: {sim['verdict']} ({sim['verdict_bn']})")
    print(f"AI Reasoning (BN): {sim['ai_reasoning_bn']}")
    assert sim["verdict"] in ["PROCEED", "WARN", "AVOID"]

    print("\n--- 8. Testing Month-End Check-In & Retraining Export ---")
    res = client.post("/api/month-end-checkin", json={
        "user_id": user_id,
        "month": "2026-11",
        "actual_ran_out_of_money": False,
        "feedback_notes": "Managed to stay within budget using daily safe limits!"
    })
    assert res.status_code == 200
    checkin = res.json()
    print(f"Check-in recorded: {checkin['message']} (Total records: {checkin['total_retraining_records']})")
    assert checkin["total_retraining_records"] >= 1

    res = client.get("/api/month-end-checkin/export")
    assert res.status_code == 200
    export_data = res.json()
    print(f"Exported records: {export_data['total_records']}")
    assert export_data["total_records"] >= 1

    print("\n--- 9. Testing Expense Deletion ---")
    to_delete = exp_list[0]["id"]
    res = client.delete(f"/api/expenses/{to_delete}?user_id={user_id}")
    assert res.status_code == 200
    del_res = res.json()
    print(f"Deleted expense {to_delete}. New risk: {del_res['updated_risk']['risk_score_pct']}%")

    print("\n--- 10. Testing Monthly Calendar Archive ---")
    res = client.post(f"/api/archives/run-month-end?user_id={user_id}&month=2026-11")
    assert res.status_code == 200
    arch_res = res.json()
    print(f"Archived month: {arch_res['message']} (Archive ID: {arch_res['archive_id']})")
    res = client.get(f"/api/archives/{user_id}")
    assert res.status_code == 200
    archives = res.json()
    print(f"Total Archives retrieved: {len(archives)}")
    assert len(archives) >= 1

    print("\n==========================================")
    print("ALL 10 BACKEND INTEGRATION TESTS PASSED 100%!")
    print("==========================================\n")

    # Clean up temporary test user so Admin Panel & Supabase stay clean
    try:
        from database import db
        db.delete_user(user_id)
    except Exception:
        pass


if __name__ == "__main__":
    test_full_pipeline()
