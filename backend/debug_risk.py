"""Debug script to evaluate risk for both accounts and expose ML base_ml_prob"""
from pipeline_service import pipeline_service as ps
from database import db
import json
import calendar
from datetime import datetime
from train_model import ORDINAL_MAPS, normalize_dashes
import pandas as pd
import joblib
from config import MODEL_PATH

model = joblib.load(MODEL_PATH)

for uid, label in [
    ('d8ec566d-366a-5cdb-bd00-b77a74100c09', 'ACCOUNT-1 d8ec'),
    ('b939adb7-8969-5da2-b80c-40859a4c3c02', 'ACCOUNT-2 b939')
]:
    summary, m = ps.evaluate_live_student_risk(uid, trigger_event='debug')
    profile = db.get_profile(uid)
    
    print(f'\n{"="*60}')
    print(f'  {label} | where_you_live={profile.get("where_you_live")}')
    print(f'{"="*60}')
    print(f'  monthly_allowance    = {m["monthly_allowance"]}')
    print(f'  total_spent          = {m["total_spent"]}')
    print(f'  fixed_obligations    = {m["fixed_obligations_spent"]}')
    print(f'  target_savings       = {m["target_savings"]}')
    print(f'  variable_spent       = {m["variable_spent"]}')
    print(f'  spendable_var_pool   = {m["spendable_variable_pool"]}')
    print(f'  days_remaining       = {m["days_remaining"]}')
    print(f'  daily_safe           = {m["daily_safe_to_spend"]}')
    print(f'  dipping_into_savings = {m["dipping_into_savings"]}')
    print(f'  FINAL risk_pct       = {summary.risk_score_pct}%')
    print(f'  FINAL risk_tier      = {summary.risk_tier}')
    
    # Reconstruct the DataFrame to get base_ml_prob
    row = m.get("survey_row", {})
    col_order = [
        'Gender', 'Age (Years)', 'Year of study', 'University type', 'Where you live',
        'Total monthly money available (Tk)', 'Main source of money', 'Do you earn your own income?',
        'Monthly rent/accommodation (Tk)', 'Monthly food (Tk)', 'Monthly transport (Tk)',
        'Monthly online shopping / eating-out / entertainment (Tk)', 'I track my spending',
        'Money saved per month (Tk)', 'Mobile banking use (bKash/Nagad/Rocket)',
        'Borrowed money from friends in last 3 months', 'aware_balance', 'aware_weekly_track',
        'aware_check_before_buy', 'impulse_spontaneous', 'impulse_discounts',
        'impulse_regret', 'awareness_score', 'impulse_score'
    ]
    df = pd.DataFrame([row])[col_order]
    base_ml_prob = float(model.predict_proba(df)[0][1])
    
    # Calculate live pacing risk
    daily_safe = m["daily_safe_to_spend"]
    spendable = m["spendable_variable_pool"]
    remaining = m["monthly_allowance"] - m["total_spent"]
    dipping = m["dipping_into_savings"]
    
    if spendable <= 0 or remaining <= 0 or dipping:
        live_pacing_risk = 0.92
    elif daily_safe >= 250.0:
        live_pacing_risk = max(0.15, 0.26 - ((daily_safe - 250.0) / 250.0) * 0.10)
    elif daily_safe >= 180.0:
        live_pacing_risk = 0.28 + ((250.0 - daily_safe) / 70.0) * 0.08
    elif daily_safe >= 120.0:
        live_pacing_risk = 0.38 + ((180.0 - daily_safe) / 60.0) * 0.12
    elif daily_safe >= 70.0:
        live_pacing_risk = 0.52 + ((120.0 - daily_safe) / 50.0) * 0.18
    else:
        live_pacing_risk = 0.72 + ((70.0 - daily_safe) / 70.0) * 0.20
    
    now = datetime.now()
    _, days_in_month = calendar.monthrange(now.year, now.month)
    day_progress = max(0.1, min(1.0, now.day / days_in_month))
    
    if day_progress < 0.20:
        hybrid = 0.60 * base_ml_prob + 0.40 * live_pacing_risk
    elif day_progress < 0.55:
        hybrid = 0.40 * base_ml_prob + 0.60 * live_pacing_risk
    else:
        hybrid = 0.20 * base_ml_prob + 0.80 * live_pacing_risk
    
    print(f'\n  --- ML INTERNALS ---')
    print(f'  base_ml_prob         = {base_ml_prob:.4f} ({base_ml_prob*100:.1f}%)')
    print(f'  live_pacing_risk     = {live_pacing_risk:.4f} ({live_pacing_risk*100:.1f}%)')
    print(f'  day_progress         = {day_progress:.3f} (day {now.day}/{days_in_month})')
    weight_ml = 0.20 if day_progress >= 0.55 else (0.40 if day_progress >= 0.20 else 0.60)
    weight_live = 1 - weight_ml
    print(f'  weight_ml            = {weight_ml}')
    print(f'  weight_live          = {weight_live}')
    print(f'  hybrid_raw           = {hybrid:.4f} ({hybrid*100:.1f}%)')
    print(f'  where_you_live       = {row.get("Where you live")}')
    print(f'  survey_row keys:')
    for k, v in row.items():
        print(f'    {k}: {v}')

