"""
Smoke test suite for the Student Financial Risk Pipeline and API.
"""

from pipeline_service import pipeline_service
from models import StudentInput
from gemini_advisor import generate_gemini_advice
from feedback_store import feedback_store

print("=== 1. TEST HIGH-RISK STUDENT (from Notebook Cell 12) ===")
high_risk_student = StudentInput(
    gender="Male",
    age=22,
    year_of_study="3rd year",
    university_type="Private",
    where_you_live="Mess-hostel",
    total_monthly_money="5-10k",  # Test standard hyphen! Should normalize to 5–10k
    main_source_of_money="Family",
    do_you_earn_income="No",
    monthly_rent="3-6k",          # Test standard hyphen!
    monthly_food="3-5k",          # Test standard hyphen!
    monthly_transport="1-2k",     # Test standard hyphen!
    monthly_entertainment="1-2k", # Test standard hyphen!
    track_spending=2,
    money_saved_per_month="0",
    mobile_banking_use="Daily",
    borrowed_from_friends="1-2",  # Test standard hyphen!
    aware_balance=2,
    aware_weekly_track=2,
    aware_check_before_buy=2,
    impulse_spontaneous=4,
    impulse_discounts=4,
    impulse_regret=3
)

score, tier, tier_bn, warn_en, warn_bn, comp, drivers = pipeline_service.predict_risk(high_risk_student)
print(f"Risk Score: {score}% | Tier: {tier} ({tier_bn})")
print(f"Awareness Score: {comp.awareness_score} | Impulse Score: {comp.impulse_score}")
print(f"Top Drivers Count: {len(drivers)}")
for d in drivers:
    print(f"  - [{d.severity}] {d.feature}: {d.description_en}")

advice = generate_gemini_advice(score, tier, drivers, high_risk_student, comp)
print("\nGenerated Advice:")
print("English:", advice.english)
print("Bengali:", advice.bengali)

print("\n=== 2. TEST LOW-RISK STUDENT ===")
low_risk_student = StudentInput(
    gender="Female",
    age=20,
    year_of_study="2nd year",
    university_type="Public",
    where_you_live="With family",
    total_monthly_money="10–15k",
    main_source_of_money="Family",
    do_you_earn_income="No",
    monthly_rent="0",
    monthly_food="<3k",
    monthly_transport="<1k",
    monthly_entertainment="<1k",
    track_spending=5,
    money_saved_per_month=">1k",
    mobile_banking_use="Weekly",
    borrowed_from_friends="Never",
    aware_balance=5,
    aware_weekly_track=5,
    aware_check_before_buy=5,
    impulse_spontaneous=1,
    impulse_discounts=1,
    impulse_regret=1
)

score_l, tier_l, tier_bn_l, warn_en_l, warn_bn_l, comp_l, drivers_l = pipeline_service.predict_risk(low_risk_student)
print(f"Risk Score: {score_l}% | Tier: {tier_l} ({tier_bn_l})")
print(f"Awareness Score: {comp_l.awareness_score} | Impulse Score: {comp_l.impulse_score}")

print("\n=== 3. TEST RETRAINING FEEDBACK STORAGE ===")
rec_id = feedback_store.record_feedback(
    prediction_id="test-pred-123",
    actual_ran_out_of_money=True,
    feedback_notes="Ran out of money due to unexpected medical bills.",
    student_inputs=high_risk_student.model_dump()
)
print(f"Feedback stored successfully with ID: {rec_id}. Total count: {feedback_store.get_count()}")

print("\nALL SMOKE TESTS PASSED FLUIDLY!")

