import sys
from fastapi.testclient import TestClient
from main import app
from database import db

client = TestClient(app)

def test_three_bucket_and_coach():
    print("\n--- Testing Three-Bucket Financial Architecture & Smart Coach ---")

    # 1. Use Demo Student & Activate Pro for Testing
    user_id = "demo_student_001"
    pro_toggle = client.post("/api/subscription/demo-pro-toggle", json={"user_id": user_id, "enable": True})
    assert pro_toggle.status_code == 200

    # Set Target Savings to 1000 Tk
    res = client.put(f"/api/user/{user_id}/target-savings", json={"target_savings": 1000.0})
    assert res.status_code == 200, f"Target savings update failed: {res.text}"
    data = res.json()
    assert data["target_savings"] == 1000.0
    print(f"1. Target Savings set to: {data['target_savings']} Tk")

    # Fetch Dashboard
    dash_res = client.get(f"/api/dashboard/{user_id}")
    assert dash_res.status_code == 200, f"Dashboard fetch failed: {dash_res.text}"
    dash = dash_res.json()

    print(f"2. Dashboard Three-Bucket Metrics:")
    print(f"   - Target Savings: ৳{dash.get('target_savings')}")
    print(f"   - Fixed Obligations (Rent/Mess): ৳{dash.get('fixed_obligations_spent')}")
    print(f"   - Variable Spent: ৳{dash.get('variable_spent')}")
    print(f"   - Spendable Variable Pool: ৳{dash.get('spendable_variable_pool')}")
    print(f"   - Dipping Into Savings: {dash.get('dipping_into_savings')}")
    print(f"   - Safe Daily Spend: ৳{dash.get('daily_safe_to_spend')}/day")
    print(f"   - Coach Queries: {dash.get('coach_queries_remaining')} / {dash.get('coach_daily_limit')} remaining")

    assert "target_savings" in dash
    assert "fixed_obligations_spent" in dash
    assert "spendable_variable_pool" in dash
    assert "coach_queries_remaining" in dash

    # 3. Test Interactive Smart Coach Q&A
    print("\n3. Testing Smart Coach Interactive Q&A:")
    coach_req = {
        "user_id": user_id,
        "question": "Can I afford hanging out with friends at a cafe this weekend for ৳400?"
    }
    coach_res = client.post("/api/coach/ask", json=coach_req)
    assert coach_res.status_code == 200, f"Coach Q&A failed: {coach_res.text}"
    coach_ans = coach_res.json()
    print(f"   - Answer (EN): {coach_ans['answer_en'][:120]}...")
    print(f"   - Answer (BN): {coach_ans['answer_bn'][:120]}...")
    print(f"   - Queries Used: {coach_ans['queries_used']}, Remaining: {coach_ans['queries_remaining']}")

    # Verify zero mention of Gemini/Google in the response
    assert "gemini" not in coach_ans["answer_en"].lower(), "Detected 'Gemini' in English answer!"
    assert "google" not in coach_ans["answer_en"].lower(), "Detected 'Google' in English answer!"
    assert "জেমিনাই" not in coach_ans["answer_bn"], "Detected 'জেমিনাই' in Bengali answer!"
    assert "গুগল" not in coach_ans["answer_bn"], "Detected 'গুগল' in Bengali answer!"
    print("   ✓ White-label check passed: ZERO mentions of external LLM providers!")

    # 4. Test Purchase Simulator with Target Savings Impact
    print("\n4. Testing Purchase Simulator with Target Savings Impact:")
    sim_req = {
        "user_id": user_id,
        "item_title": "Winter Jacket",
        "amount": 1500.0,
        "category": "Entertainment"
    }
    sim_res = client.post("/api/ai-coach/simulate", json=sim_req)
    assert sim_res.status_code == 200, f"Simulator failed: {sim_res.text}"
    sim = sim_res.json()
    print(f"   - Verdict: {sim['verdict']} ({sim['verdict_bn']})")
    print(f"   - Savings Goal Impact: {sim.get('savings_goal_impact')}")
    print(f"   - New Spendable Pool: ৳{sim.get('new_spendable_pool')}")
    assert "savings_goal_impact" in sim
    assert "new_spendable_pool" in sim

    print("\n=======================================================")
    print("ALL THREE-BUCKET & SMART COACH VERIFICATION TESTS PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_three_bucket_and_coach()
