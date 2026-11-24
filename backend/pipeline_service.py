"""
Hybrid ML Inference Engine for Student Financial Management & Risk Warning System.
Combines baseline student profile with live real-time daily expense tracking
to dynamically project month-end burn rate and re-evaluate financial risk (0–100%).
"""

import calendar
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import pandas as pd

from config import DATASET_PATH, MODEL_PATH
from database import db
from models import RiskDriver, RiskScoreSummary
from train_model import ORDINAL_MAPS, normalize_dashes, train_and_save_model


class HybridPipelineService:
    def __init__(self):
        self.model = None
        self._ensure_model_loaded()

    def _ensure_model_loaded(self):
        if not MODEL_PATH.exists():
            print(f"Model file not found at {MODEL_PATH}. Training automatically from dataset...")
            self.model = train_and_save_model(DATASET_PATH, MODEL_PATH)
        else:
            self.model = joblib.load(MODEL_PATH)

    def evaluate_live_student_risk(
        self,
        user_id: str,
        simulated_expense: Optional[Dict[str, Any]] = None,
        trigger_event: str = "expense_added"
    ) -> Tuple[RiskScoreSummary, Dict[str, Any]]:
        """
        Dynamically aggregates live expenses, projects month-end burn rates,
        constructs the verified 24-feature DataFrame, and runs Gradient Boosting inference.
        """
        profile = db.get_profile(user_id)
        if not profile:
            if user_id == "demo_student_001":
                profile = db.get_profile("demo_student_001") or {}
            else:
                # Authentic new user awaiting onboarding setup - return pristine clean state
                now = datetime.now()
                _, days_in_month = calendar.monthrange(now.year, now.month)
                days_remaining = max(1, days_in_month - now.day + 1)
                metrics = {
                    "month": now.strftime("%Y-%m"),
                    "monthly_allowance": 0.0,
                    "total_income_added": 0.0,
                    "total_spent": 0.0,
                    "remaining_balance": 0.0,
                    "days_remaining": days_remaining,
                    "daily_safe_to_spend": 0.0,
                    "projected_month_end_savings": 0.0,
                    "burn_rate_status": "healthy",
                    "category_breakdown": {},
                    "daily_trend": [],
                    "target_savings": 0.0,
                    "fixed_obligations_spent": 0.0,
                    "variable_spent": 0.0,
                    "spendable_variable_pool": 0.0,
                    "dipping_into_savings": False,
                    "savings_warning_en": None,
                    "savings_warning_bn": None,
                    "recalibration_note_en": "Complete onboarding to set your daily budget limit.",
                    "recalibration_note_bn": "দৈনিক বাজেট সীমা সেট করতে অনবোর্ডিং সম্পন্ন করুন।",
                }
                summary = RiskScoreSummary(
                    risk_score_pct=10.0,
                    risk_tier="LOW RISK",
                    risk_tier_bn="কম ঝুঁকি",
                    summary_warning_en="Awaiting initial profile setup. Complete onboarding to activate live ML forecasting.",
                    summary_warning_bn="প্রোফাইল সেটআপের অপেক্ষায় রয়েছে। লাইভ এআই পর্যবেক্ষণ চালু করতে অনবোর্ডিং সম্পন্ন করুন।",
                    top_drivers=[]
                )
                return summary, metrics

        # 1. Fetch live monthly aggregates
        now = datetime.now()
        month_str = now.strftime("%Y-%m")
        aggregates = db.get_monthly_aggregates(user_id, month_str)

        categories = dict(aggregates.get("categories", {}))
        total_spent = float(aggregates.get("total_spent", 0.0))
        mobile_tx = int(aggregates.get("mobile_transaction_count", 0))

        # Apply simulation if present (e.g. "Ask AI Before I Buy")
        if simulated_expense:
            sim_cat = simulated_expense.get("category", "Other")
            sim_amt = float(simulated_expense.get("amount", 0.0))
            categories[sim_cat] = categories.get(sim_cat, 0.0) + sim_amt
            total_spent += sim_amt

        # 2. Timing & Budget Projections
        _, days_in_month = calendar.monthrange(now.year, now.month)
        current_day = now.day
        days_remaining = max(1, days_in_month - current_day + 1)
        day_progress = max(0.1, min(1.0, current_day / days_in_month))

        # Real-time multi-source funds added vs baseline profile allowance
        # Baseline allowance represents regular monthly support (e.g. from family)
        # Extra incomes logged (Tuition, Freelancing, Scholarship, Gift) add ON TOP of baseline!
        # Logged 'Family' income fulfills or updates the baseline family support.
        total_income_added = db.get_monthly_income_total(user_id, month_str)
        baseline_allowance = float(profile.get("monthly_allowance_fixed", 10000.0))

        incomes = db.get_incomes(user_id, month_str)
        family_income = sum(float(inc.get("amount", 0.0)) for inc in incomes if inc.get("source") == "Family")
        extra_income = sum(float(inc.get("amount", 0.0)) for inc in incomes if inc.get("source") != "Family")

        base_funds = max(baseline_allowance, family_income)
        monthly_allowance = round(base_funds + extra_income, 1)
        
        # --- THREE-BUCKET FINANCIAL ARCHITECTURE ---
        # Bucket 1: Fixed Essential Obligations (Rent + Mess Meal Advance + Academic Tuition Allocation)
        rent_paid = categories.get("Rent", 0.0)
        mess_paid = categories.get("Mess Meal Advance", 0.0)
        academic_paid = categories.get("Academic", 0.0)
        fixed_obligations_spent = rent_paid + mess_paid + academic_paid

        enable_mess = profile.get("enable_mess_meals")
        if enable_mess is None:
            enable_mess = (profile.get("where_you_live") == "Mess-hostel")
        else:
            enable_mess = bool(enable_mess)

        fixed_rent_baseline = float(profile.get("monthly_rent_fixed", 0.0))
        fixed_mess_baseline = float(profile.get("mess_meal_fixed", 0.0)) if enable_mess else 0.0
        fixed_academic_baseline = float(profile.get("academic_fee_fixed", 0.0))
        fixed_baseline_total = fixed_rent_baseline + fixed_mess_baseline + fixed_academic_baseline

        # Partial Obligation Protection:
        # Any unspent portion of the baseline fixed living costs remains protected and ring-fenced!
        # If the student paid more than baseline (e.g. rent increase), the actual higher spend is reserved.
        unpaid_fixed_obligations = max(0.0, fixed_baseline_total - fixed_obligations_spent)
        total_fixed_reserved = fixed_obligations_spent + unpaid_fixed_obligations
        fixed_obligations = total_fixed_reserved

        # Bucket 2: Monthly Target Savings (Ring-fenced when target_savings > 0)
        target_savings = float(profile.get("target_savings", 0.0))

        # Bucket 3: Variable Daily Pocket (Food, Transport, Personal Care, Snacks, etc.)
        variable_spent = sum(amt for cat, amt in categories.items() if cat not in ("Rent", "Mess Meal Advance", "Academic"))

        # Exact Spendable Variable Pool & Dynamic Safe Daily Limit formula
        spendable_variable_pool = round(monthly_allowance - total_fixed_reserved - target_savings - variable_spent, 1)
        remaining_balance = round(monthly_allowance - total_spent, 1)

        # Projected spend pacing
        projected_spend = total_spent / day_progress if day_progress > 0.05 else total_spent * 2
        projected_savings = max(0.0, monthly_allowance - projected_spend)

        # Dynamic Recalibration & Savings Overdraft Detection
        dipping_into_savings = False
        savings_warning_en = None
        savings_warning_bn = None

        if spendable_variable_pool <= 0 or remaining_balance <= 0:
            daily_safe = 0.0
            burn_status = "critical"
            if target_savings > 0:
                dipping_into_savings = True
                savings_warning_en = f"Daily budget exhausted — further spending will dip into your ৳{int(target_savings)} Savings Goal!"
                savings_warning_bn = f"দৈনিক বাজেট শেষ — অতিরিক্ত খরচ আপনার ৳{int(target_savings)} সঞ্চয়ের লক্ষ্যমাত্রাকে ক্ষুণ্ণ করবে!"
            else:
                savings_warning_en = "Daily spending limit reached for this month."
                savings_warning_bn = "এই মাসের জন্য নির্ধারিত দৈনিক খরচের সীমা অতিক্রম করেছে।"
        else:
            daily_safe = max(0.0, round(spendable_variable_pool / days_remaining, 1))
            if daily_safe < 150:
                burn_status = "caution"
            else:
                burn_status = "healthy"

        # Recalibration micro-note
        if daily_safe > 0:
            recalibration_note_en = f"Recalibrated to ৳{daily_safe}/day across remaining {days_remaining} days."
            recalibration_note_bn = f"বাকি {days_remaining} দিনের জন্য দৈনিক নিরাপদ সীমা ৳{daily_safe} এ সমন্বয় করা হয়েছে।"
        else:
            recalibration_note_en = "Spendable pool is exhausted. Protect remaining funds."
            recalibration_note_bn = "ব্যয়যোগ্য বাজেট শেষ। অবশিষ্ট অর্থ নিরাপদে রক্ষা করুন।"

        # 3. Dynamic Feature Mapping to Ordinal Brackets
        # Dynamic Total Monthly Money Bracket (Evaluated on total effective monthly funds)
        if monthly_allowance < 5000:
            total_money_bracket = "<5k"
        elif monthly_allowance <= 10000:
            total_money_bracket = "5–10k"
        elif monthly_allowance <= 15000:
            total_money_bracket = "10–15k"
        elif monthly_allowance <= 20000:
            total_money_bracket = "15–20k"
        else:
            total_money_bracket = ">20k"

        # A. Rent/Accommodation Bracket (Strictly accommodation & housing bills)
        rent_spent = (rent_paid if rent_paid > 0 else fixed_rent_baseline) + categories.get("Bills", 0.0)
        if rent_spent <= 0:
            rent_bracket = "0"
        elif rent_spent < 3000:
            rent_bracket = "<3k"
        elif rent_spent < 6000:
            rent_bracket = "3–6k"
        elif rent_spent < 9000:
            rent_bracket = "6–9k"
        else:
            rent_bracket = ">9k"

        # B. Food Bracket (Projected monthly pace + fixed mess meal pool)
        actual_mess_food = mess_paid if mess_paid > 0 else fixed_mess_baseline
        variable_food_proj = (categories.get("Food", 0.0) / day_progress) if day_progress > 0.1 else categories.get("Food", 0.0) * 3
        food_proj = actual_mess_food + variable_food_proj
        if food_proj < 3000:
            food_bracket = "<3k"
        elif food_proj < 5000:
            food_bracket = "3–5k"
        elif food_proj < 7000:
            food_bracket = "5–7k"
        else:
            food_bracket = ">7k"

        # C. Transport Bracket (Projected)
        trans_proj = (categories.get("Transport", 0.0) / day_progress) if day_progress > 0.1 else categories.get("Transport", 0.0) * 3
        if trans_proj < 1000:
            trans_bracket = "<1k"
        elif trans_proj < 2000:
            trans_bracket = "1–2k"
        elif trans_proj < 3000:
            trans_bracket = "2–3k"
        else:
            trans_bracket = ">3k"

        # D. Entertainment / Discretionary Bracket (Projected)
        discretionary_actual = (
            categories.get("Entertainment", 0.0) +
            categories.get("Other", 0.0) +
            categories.get("Snacks", 0.0) +
            categories.get("Personal Care", 0.0) +
            categories.get("Health", 0.0)
        )
        ent_proj = (discretionary_actual / day_progress) if day_progress > 0.1 else discretionary_actual * 3
        if ent_proj < 1000:
            ent_bracket = "<1k"
        elif ent_proj < 2000:
            ent_bracket = "1–2k"
        else:
            ent_bracket = ">2k"

        # E. Savings Bracket (#1 Risk Factor!)
        # Incorporates protected target savings unless variable pool has overspent into it
        if dipping_into_savings:
            effective_savings = max(0.0, target_savings + spendable_variable_pool)
        else:
            effective_savings = max(target_savings, projected_savings)

        if effective_savings <= 0 or remaining_balance <= 0:
            savings_bracket = "0"
        elif effective_savings < 500:
            savings_bracket = "<500"
        elif effective_savings < 1000:
            savings_bracket = "500–1k"
        else:
            savings_bracket = ">1k"

        # F. Mobile Banking Usage
        if mobile_tx > 14 or profile.get("mobile_banking_use") == "Daily":
            mobile_use_bracket = "Daily"
        elif mobile_tx >= 4 or profile.get("mobile_banking_use") == "Weekly":
            mobile_use_bracket = "Weekly"
        else:
            mobile_use_bracket = "Rarely"

        # G. Borrowed from Friends
        borrow_count = int(categories.get("Borrowing", 0.0) > 0)
        base_borrow = profile.get("borrowed_from_friends_baseline", "Never")
        if borrow_count > 2 or base_borrow == "3+":
            borrow_bracket = "3+"
        elif borrow_count >= 1 or base_borrow == "1–2":
            borrow_bracket = "1–2"
        else:
            borrow_bracket = "Never"

        # 4. Construct Exact 24-Column DataFrame
        def get_ord(col: str, val: str) -> int:
            order = ORDINAL_MAPS[col]
            mapping = {normalize_dashes(v): idx for idx, v in enumerate(order)}
            cleaned = normalize_dashes(val)
            return mapping.get(cleaned, 0)

        aware_score = float(profile.get("awareness_score", 3.0))
        impulse_score = float(profile.get("impulse_score", 3.0))

        row_dict = {
            'Gender': profile.get('gender', 'Male'),
            'Age (Years)': int(profile.get('age', 21)),
            'Year of study': get_ord('Year of study', profile.get('year_of_study', '2nd year')),
            'University type': profile.get('university_type', 'Public'),
            'Where you live': profile.get('where_you_live', 'Mess-hostel'),
            'Total monthly money available (Tk)': get_ord('Total monthly money available (Tk)', total_money_bracket),
            'Main source of money': profile.get('main_source_of_money', 'Family'),

            'Do you earn your own income?': 'Yes' if (extra_income > 0 or profile.get('do_you_earn_income') == 'Yes') else 'No',
            'Monthly rent/accommodation (Tk)': get_ord('Monthly rent/accommodation (Tk)', rent_bracket),
            'Monthly food (Tk)': get_ord('Monthly food (Tk)', food_bracket),
            'Monthly transport (Tk)': get_ord('Monthly transport (Tk)', trans_bracket),
            'Monthly online shopping / eating-out / entertainment (Tk)': get_ord('Monthly online shopping / eating-out / entertainment (Tk)', ent_bracket),
            'I track my spending': int(profile.get('track_spending', 3)),
            'Money saved per month (Tk)': get_ord('Money saved per month (Tk)', savings_bracket),
            'Mobile banking use (bKash/Nagad/Rocket)': get_ord('Mobile banking use (bKash/Nagad/Rocket)', mobile_use_bracket),
            'Borrowed money from friends in last 3 months': get_ord('Borrowed money from friends in last 3 months', borrow_bracket),
            'aware_balance': int(profile.get('aware_balance', 3)),
            'aware_weekly_track': int(profile.get('aware_weekly_track', 3)),
            'aware_check_before_buy': int(profile.get('aware_check_before_buy', 3)),
            'impulse_spontaneous': int(profile.get('impulse_spontaneous', 3)),
            'impulse_discounts': int(profile.get('impulse_discounts', 3)),
            'impulse_regret': int(profile.get('impulse_regret', 3)),
            'awareness_score': aware_score,
            'impulse_score': impulse_score,
        }

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

        df = pd.DataFrame([row_dict])[col_order]

        # 5. Hybrid Risk Scoring (Demographic ML Prior + Real-Time Live Pacing)
        # Baseline demographic prediction from trained gradient boosting model
        base_ml_prob = float(self.model.predict_proba(df)[0][1])

        # Dynamic Live Pacing Risk (0.0 to 1.0)
        # When essential living costs (rent & mess meals) are covered, evaluate safe discretionary buffer
        if spendable_variable_pool <= 0 or remaining_balance <= 0 or dipping_into_savings:
            # Overdrafted or exhausted variable pocket
            live_pacing_risk = 0.92
        elif daily_safe >= 250.0:
            # Very generous daily buffer for tea/snacks with rent & meals prepaid: LOW RISK (12% - 22%)
            live_pacing_risk = max(0.12, 0.22 - ((daily_safe - 250.0) / 250.0) * 0.10)
        elif daily_safe >= 180.0:
            # Healthy daily safe limit (22% - 32%)
            live_pacing_risk = 0.22 + ((250.0 - daily_safe) / 70.0) * 0.10
        elif daily_safe >= 120.0:
            # Moderate pocket allowance (34% - 48%)
            live_pacing_risk = 0.34 + ((180.0 - daily_safe) / 60.0) * 0.14
        elif daily_safe >= 70.0:
            # Tight pocket allowance (50% - 68%)
            live_pacing_risk = 0.50 + ((120.0 - daily_safe) / 50.0) * 0.18
        else:
            # Critical low daily allowance (<70 Tk/day)
            live_pacing_risk = 0.70 + ((70.0 - daily_safe) / 70.0) * 0.22

        # Dynamic Weighting Schedule based on Month Progress:
        # Day 1-7: 50% baseline ML, 50% live pacing (early month, spending patterns emerging)
        # Day 8-20: 30% baseline ML, 70% live pacing (mid month, empirical discipline proven)
        # Day 21+: 10% baseline ML, 90% live pacing! (late month, actual cashflow survival is empirical reality!)
        if day_progress < 0.23:
            hybrid_prob = 0.50 * base_ml_prob + 0.50 * live_pacing_risk
        elif day_progress < 0.67:
            hybrid_prob = 0.30 * base_ml_prob + 0.70 * live_pacing_risk
        else:
            hybrid_prob = 0.10 * base_ml_prob + 0.90 * live_pacing_risk

        # If user is logging consistently or has positive savings protected, reward financial discipline
        if target_savings > 0 and not dipping_into_savings:
            hybrid_prob = max(0.10, hybrid_prob - 0.05)

        if int(profile.get('track_spending', 3)) >= 4 or aware_score >= 3.8:
            hybrid_prob = max(0.08, hybrid_prob - 0.06)

        # Safety Clamps based on true daily safe limit:
        # When essential living/mess costs are ring-fenced and daily pocket allowance is high,
        # demographic survey priors must never falsely flag the user as Critical High Risk!
        if not dipping_into_savings and spendable_variable_pool > 0:
            if daily_safe >= 250.0:
                hybrid_prob = min(0.30, hybrid_prob)
            elif daily_safe >= 180.0:
                hybrid_prob = min(0.42, hybrid_prob)
            elif daily_safe >= 120.0:
                hybrid_prob = min(0.58, hybrid_prob)

        risk_pct = round(min(98.0, max(5.0, hybrid_prob * 100)), 1)

        # 6. Risk Tiering & Bilingual Warnings
        if risk_pct >= 70.0:
            tier = "HIGH RISK"
            tier_bn = "উচ্চ ঝুঁকি"
            warn_en = "Critical Warning: Projected to run out of money before month-end. Cut non-essential spending immediately and adhere strictly to your daily limit."
            warn_bn = "জরুরি সতর্কতা: মাস শেষ হওয়ার আগেই টাকা ফুরিয়ে যাওয়ার তীব্র ঝুঁকি রয়েছে। অপ্রয়োজনীয় খরচ এখনই বন্ধ করুন এবং দৈনিক বাজেট মেনে চলুন।"
        elif risk_pct >= 40.0:
            tier = "MODERATE RISK"
            tier_bn = "মাঝারি ঝুঁকি"
            warn_en = "Caution: Moderate financial vulnerability detected. Monitor food & bKash transactions and preserve your end-of-month cash reserve."
            warn_bn = "সতর্কতা: মাঝারি আর্থিক ঝুঁকি। খাবার ও মোবাইল ব্যাংকিং খরচে সংযত থাকুন এবং জরুরি সঞ্চয় অক্ষুণ্ণ রাখুন।"
        else:
            tier = "LOW RISK"
            tier_bn = "কম ঝুঁকি"
            warn_en = "Safe: Your daily spending burn rate is stable. Keep logging transactions and maintain your monthly savings pace."
            warn_bn = "নিরাপদ: আপনার খরচের গতি অত্যন্ত নিয়ন্ত্রিত ও স্থিতিশীল। নিয়মিত হিসাব রাখুন এবং সঞ্চয় ধরে রাখুন।"

        # 7. Extract Triggered Top Drivers
        drivers: List[RiskDriver] = []
        if savings_bracket == "0":
            drivers.append(RiskDriver(
                feature="Projected Savings",
                feature_bn="মাসিক সঞ্চয়",
                severity="critical",
                description_en="Current spending burn pace leaves 0 Tk projected savings.",
                description_bn="বর্তমান খরচের গতি বজায় থাকলে মাস শেষে কোনো সঞ্চয় অবশিষ্ট থাকবে না।"
            ))
        elif savings_bracket == "<500":
            drivers.append(RiskDriver(
                feature="Projected Savings",
                feature_bn="মাসিক সঞ্চয়",
                severity="warning",
                description_en="Low projected savings (<500 Tk) creates emergency vulnerability.",
                description_bn="৫০০ টাকার কম সম্ভাব্য সঞ্চয় জরুরি প্রয়োজনে বাজেট সংকটের ঝুঁকি বাড়ায়।"
            ))

        if ent_bracket == ">2k":
            drivers.append(RiskDriver(
                feature="Entertainment & Shopping",
                feature_bn="শপিং ও বিনোদন খরচ",
                severity="critical",
                description_en="Discretionary & hangout spending is running higher than recommended.",
                description_bn="বাইরে খাওয়া ও শপিংয়ের খরচ প্রস্তাবিত সীমার চেয়ে অনেক বেশি।"
            ))

        if borrow_bracket in ["1–2", "3+"]:
            drivers.append(RiskDriver(
                feature="Peer Debt",
                feature_bn="বন্ধুদের থেকে ঋণ",
                severity="warning" if borrow_bracket == "1–2" else "critical",
                description_en="Recent borrowing indicates tight liquidity.",
                description_bn="ধার নেওয়ার প্রবণতা মাস শেষের তারল্য সংকটের পূর্বাভাস দেয়।"
            ))

        if daily_safe < 120 and remaining_balance > 0:
            drivers.append(RiskDriver(
                feature="Daily Spending Cap",
                feature_bn="দৈনিক খরচ সীমা",
                severity="warning" if daily_safe >= 70 else "critical",
                description_en=f"Daily safe allowance is very tight at only {daily_safe} Tk/day.",
                description_bn=f"দৈনিক খরচের নিরাপদ সীমা মাত্র {daily_safe} টাকা/দিন।"
            ))

        # Positive contextual drivers for students with low risk and secured living arrangements
        if fixed_obligations > 0:
            parts_en = []
            parts_bn = []
            if fixed_rent_baseline > 0:
                parts_en.append(f"৳{int(fixed_rent_baseline)} rent")
                parts_bn.append(f"ভাড়া ৳{int(fixed_rent_baseline)}")
            if fixed_mess_baseline > 0:
                parts_en.append(f"৳{int(fixed_mess_baseline)} meals")
                parts_bn.append(f"মেস খাবার ৳{int(fixed_mess_baseline)}")
            if fixed_academic_baseline > 0:
                parts_en.append(f"৳{int(fixed_academic_baseline)} tuition")
                parts_bn.append(f"টিউশন ৳{int(fixed_academic_baseline)}")

            oblig_detail_en = " + ".join(parts_en) if parts_en else f"৳{int(fixed_obligations)}"
            oblig_detail_bn = " + ".join(parts_bn) if parts_bn else f"৳{int(fixed_obligations)}"

            drivers.append(RiskDriver(
                feature="Fixed Costs Prepaid",
                feature_bn="মেস ও আবাসন খরচ সমন্বয়",
                severity="positive" if risk_pct < 40 else "warning",
                description_en=f"Fixed obligations ({oblig_detail_en}) are budgeted; daily limit reflects pure pocket spending.",
                description_bn=f"স্থির আবাসন ও মেস খরচ ({oblig_detail_bn}) সংরক্ষিত; দৈনিক সীমা শুধুমাত্র খুচরা পকেট খরচের জন্য।"
            ))

        if target_savings > 0 and not dipping_into_savings:
            drivers.append(RiskDriver(
                feature="Target Savings Secured",
                feature_bn="সুরক্ষিত মাসিক সঞ্চয়",
                severity="positive",
                description_en=f"৳{int(target_savings)} savings goal is protected from daily variable spending.",
                description_bn=f"৳{int(target_savings)} জমানোর লক্ষ্য দৈনিক খরচ থেকে সুরক্ষিত রয়েছে।"
            ))

        summary = RiskScoreSummary(
            risk_score_pct=risk_pct,
            risk_tier=tier,
            risk_tier_bn=tier_bn,
            summary_warning_en=warn_en,
            summary_warning_bn=warn_bn,
            top_drivers=drivers[:3]
        )

        metrics = {
            "user_id": user_id,
            "month": month_str,
            "monthly_allowance": monthly_allowance,
            "total_income_added": total_income_added,
            "fixed_rent": fixed_rent_baseline,
            "mess_meal_fixed": fixed_mess_baseline,
            "academic_fee_fixed": fixed_academic_baseline,
            "total_spent": total_spent,
            "remaining_balance": remaining_balance,
            "days_remaining": days_remaining,
            "daily_safe_to_spend": daily_safe,
            "projected_month_end_savings": projected_savings,
            "burn_rate_status": burn_status,
            "category_breakdown": categories,
            "daily_trend": aggregates.get("daily_trend", []),
            "current_risk": summary,
            "target_savings": target_savings,
            "fixed_obligations_spent": fixed_obligations,
            "variable_spent": variable_spent,
            "spendable_variable_pool": spendable_variable_pool,
            "dipping_into_savings": dipping_into_savings,
            "savings_warning_en": savings_warning_en,
            "savings_warning_bn": savings_warning_bn,
            "recalibration_note_en": recalibration_note_en,
            "recalibration_note_bn": recalibration_note_bn,
            "enable_mess_meals": enable_mess,
            # Pass through raw survey row representation for retraining format
            "survey_row": row_dict
        }


        # Record snapshot in history if not a temporary simulation
        if not simulated_expense:
            db.record_risk_snapshot(
                user_id=user_id,
                risk_score_pct=risk_pct,
                risk_tier=tier,
                risk_tier_bn=tier_bn,
                monthly_spent_total=total_spent,
                projected_savings=projected_savings,
                daily_safe_to_spend=daily_safe,
                top_drivers=[d.model_dump() for d in drivers[:3]],
                trigger_event=trigger_event
            )

        return summary, metrics

    def predict_risk(self, student: Any) -> Tuple[float, str, str, str, str, Any, List[RiskDriver]]:
        """Direct inference from StudentInput model for standalone scoring."""
        from models import CompositeScores

        aware_score = round((student.aware_balance + student.aware_weekly_track + student.aware_check_before_buy) / 3.0, 2)
        impulse_score = round((student.impulse_spontaneous + student.impulse_discounts + student.impulse_regret) / 3.0, 2)
        composite = CompositeScores(awareness_score=aware_score, impulse_score=impulse_score)

        def get_ord(col: str, val: str) -> int:
            order = ORDINAL_MAPS[col]
            mapping = {normalize_dashes(v): idx for idx, v in enumerate(order)}
            return mapping.get(normalize_dashes(val), 0)

        row_dict = {
            'Gender': student.gender,
            'Age (Years)': int(student.age),
            'Year of study': get_ord('Year of study', student.year_of_study),
            'University type': student.university_type,
            'Where you live': student.where_you_live,
            'Total monthly money available (Tk)': get_ord('Total monthly money available (Tk)', student.total_monthly_money),
            'Main source of money': student.main_source_of_money,
            'Do you earn your own income?': student.do_you_earn_income,
            'Monthly rent/accommodation (Tk)': get_ord('Monthly rent/accommodation (Tk)', student.monthly_rent),
            'Monthly food (Tk)': get_ord('Monthly food (Tk)', student.monthly_food),
            'Monthly transport (Tk)': get_ord('Monthly transport (Tk)', student.monthly_transport),
            'Monthly online shopping / eating-out / entertainment (Tk)': get_ord('Monthly online shopping / eating-out / entertainment (Tk)', student.monthly_entertainment),
            'I track my spending': int(student.track_spending),
            'Money saved per month (Tk)': get_ord('Money saved per month (Tk)', student.money_saved_per_month),
            'Mobile banking use (bKash/Nagad/Rocket)': get_ord('Mobile banking use (bKash/Nagad/Rocket)', student.mobile_banking_use),
            'Borrowed money from friends in last 3 months': get_ord('Borrowed money from friends in last 3 months', student.borrowed_from_friends),
            'aware_balance': int(student.aware_balance),
            'aware_weekly_track': int(student.aware_weekly_track),
            'aware_check_before_buy': int(student.aware_check_before_buy),
            'impulse_spontaneous': int(student.impulse_spontaneous),
            'impulse_discounts': int(student.impulse_discounts),
            'impulse_regret': int(student.impulse_regret),
            'awareness_score': aware_score,
            'impulse_score': impulse_score,
        }

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

        df = pd.DataFrame([row_dict])[col_order]
        prob = self.model.predict_proba(df)[0][1]
        risk_pct = round(prob * 100, 1)

        if risk_pct >= 70.0:
            tier, tier_bn = "HIGH RISK", "উচ্চ ঝুঁকি"
            warn_en = "Critical Warning: High probability of running out of money before month-end."
            warn_bn = "জরুরি সতর্কতা: মাস শেষ হওয়ার আগেই টাকা ফুরিয়ে যাওয়ার তীব্র ঝুঁকি রয়েছে।"
        elif risk_pct >= 40.0:
            tier, tier_bn = "MODERATE RISK", "মাঝারি ঝুঁকি"
            warn_en = "Caution: Moderate financial vulnerability detected."
            warn_bn = "সতর্কতা: মাঝারি আর্থিক ঝুঁকি চিহ্নিত হয়েছে।"
        else:
            tier, tier_bn = "LOW RISK", "কম ঝুঁকি"
            warn_en = "Safe: Your spending habits indicate strong financial control."
            warn_bn = "নিরাপদ: আপনার খরচের অভ্যাস অত্যন্ত সুসংহত ও নিরাপদ।"

        drivers: List[RiskDriver] = []
        if student.money_saved_per_month == "0":
            drivers.append(RiskDriver(
                feature="Monthly Savings (0 Tk)",
                feature_bn="মাসিক সঞ্চয় (০ টাকা)",
                severity="critical",
                description_en="Zero monthly savings eliminates your safety cushion for unexpected academic or emergency costs.",
                description_bn="কোনো মাসিক সঞ্চয় না থাকা জরুরি বা অপ্রত্যাশিত খরচের সময় বড় ঝুঁকি তৈরি করে।"
            ))
        if student.borrowed_from_friends in ["1–2", "3+"]:
            drivers.append(RiskDriver(
                feature="Borrowing from Friends",
                feature_bn="বন্ধুদের কাছ থেকে ঋণ",
                severity="warning" if student.borrowed_from_friends == "1–2" else "critical",
                description_en="Regular borrowing indicates chronic mid-month cash shortages.",
                description_bn="ধার নেওয়ার অভ্যাস মাসের মাঝামাঝি সময়ে তারল্য ঘাটতির সুস্পষ্ট লক্ষণ।"
            ))
        if impulse_score >= 3.67:
            drivers.append(RiskDriver(
                feature="High Impulse Spending",
                feature_bn="ঝোঁকের মাথায় অতিরিক্ত খরচ",
                severity="warning",
                description_en=f"Elevated impulse score ({impulse_score}/5.0) leads to unplanned leakages.",
                description_bn=f"উচ্চ ইমপালস স্কোর ({impulse_score}/৫.০) পরিকল্পনাহীন খরচের দিকে পরিচালিত করে।"
            ))

        return risk_pct, tier, tier_bn, warn_en, warn_bn, composite, drivers[:3]


hybrid_pipeline = HybridPipelineService()
pipeline_service = hybrid_pipeline

