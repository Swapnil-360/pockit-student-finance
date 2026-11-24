from pipeline_service import pipeline_service as ps
from database import db
import json

print("=== 1. TEST LIVE ACCOUNTS ===")
for uid, label in [
    ('d8ec566d-366a-5cdb-bd00-b77a74100c09', 'ACCOUNT 1 d8ec'),
    ('b939adb7-8969-5da2-b80c-40859a4c3c02', 'ACCOUNT 2 b939')
]:
    s, m = ps.evaluate_live_student_risk(uid, trigger_event='test')
    print(f"\n{label}:")
    print(f"  Monthly allowance:  ৳{m['monthly_allowance']}")
    print(f"  Total spent:        ৳{m['total_spent']}")
    print(f"  Fixed reserved:     ৳{m['fixed_obligations_spent']}")
    print(f"  Spendable pool:     ৳{m['spendable_variable_pool']}")
    print(f"  Days remaining:     {m['days_remaining']}")
    print(f"  Daily safe:         ৳{m['daily_safe_to_spend']}/day")
    print(f"  Risk score:         {s.risk_score_pct}% ({s.risk_tier} / {s.risk_tier_bn})")
    print(f"  Burn status:        {m['burn_rate_status']}")
    print(f"  Top driver:         {s.top_drivers[0].description_en if s.top_drivers else 'None'}")

print("\n=== 2. TEST SCREENSHOT CONDITION: Mess-hostel vs Rented flat ===")
orig_p = db.get_profile('d8ec566d-366a-5cdb-bd00-b77a74100c09')
orig_loc = orig_p.get('where_you_live', 'Rented flat')

for loc in ['Mess-hostel', 'Rented flat', 'Hall', 'With family']:
    db.save_profile('d8ec566d-366a-5cdb-bd00-b77a74100c09', {'where_you_live': loc})
    s, m = ps.evaluate_live_student_risk('d8ec566d-366a-5cdb-bd00-b77a74100c09', trigger_event='test')
    print(f"  Living in {loc:12} -> Risk: {s.risk_score_pct}% ({s.risk_tier}) | Daily: ৳{m['daily_safe_to_spend']}/day")

# Restore original
db.save_profile('d8ec566d-366a-5cdb-bd00-b77a74100c09', {'where_you_live': orig_loc})

print("\n=== 3. TEST PARTIAL OBLIGATION PROTECTION ===")
# Simulate: baseline rent=4500, mess=3000 (total=7500).
# If student logged only 2000 towards rent, total reserved must still be 7500!
s_sim, m_sim = ps.evaluate_live_student_risk(
    'd8ec566d-366a-5cdb-bd00-b77a74100c09',
    simulated_expense={'category': 'Rent', 'amount': 2000.0}
)
print(f"  Simulated ৳2,000 partial rent paid:")
print(f"  Fixed obligations reserved: ৳{m_sim['fixed_obligations_spent']}")
print(f"  Spendable variable pool:    ৳{m_sim['spendable_variable_pool']}")
print(f"  Daily safe:                 ৳{m_sim['daily_safe_to_spend']}/day")
assert m_sim['fixed_obligations_spent'] == 7500.0, "Partial obligation protection failed!"
print("  >>> PASS: Partial payment protection correctly reserved full ৳7,500!")

