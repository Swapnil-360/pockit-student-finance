"""
Pockit Smart Coach Engine.
Proprietary student financial intelligence layer integrating live Three-Bucket cashflow metrics,
ML gradient-boosted risk prediction, and deep personalized coaching.
"""

from typing import List, Dict, Any, Optional
import json
import math
import re
import random
from google import genai
from google.genai import types
from config import GEMINI_API_KEY
from models import (
    StudentInput,
    CompositeScores,
    RiskDriver,
    AdviceBlock,
    AiCoachResponse,
    PurchaseSimulationResponse,
    AskCoachResponse
)


def _call_gemini_json(prompt: str, temperature: float = 0.85) -> Optional[Dict[str, Any]]:
    """Safe helper to call Gemini with temperature diversity and robust JSON parsing."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None

    try:
        client = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options=types.HttpOptions(
                timeout=6000,
                retry_options=types.HttpRetryOptions(attempts=1)
            )
        )
        try:
            # Preferred current SDK method
            cfg = types.GenerateContentConfig(temperature=temperature)
            res = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=cfg
            )
            raw = res.text.strip()
        except Exception:
            # Fallback to interactions API
            interaction = client.interactions.create(
                model="gemini-2.5-flash",
                input=prompt
            )
            raw = interaction.output_text.strip()

        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        return json.loads(raw)
    except Exception:
        return None


def get_local_fallback_advice(
    tier: str,
    drivers: List[RiskDriver],
    student_data: StudentInput,
    composite: CompositeScores
) -> AdviceBlock:
    """Intelligent rule-based fallback advice tailored to Bangladeshi university students."""
    en_advice: List[str] = []
    bn_advice: List[str] = []

    if tier == "HIGH RISK":
        en_advice.append("Implement the 48-Hour Rule: Wait 48 hours before purchasing any non-essential item or online deal.")
        bn_advice.append("৪৮ ঘণ্টার নিয়ম অনুসরণ করুন: যেকোনো অপ্রয়োজনীয় জিনিস কেনার আগে অন্তত ৪৮ ঘণ্টা ভাবুন।")

        if student_data.money_saved_per_month == '0':
            en_advice.append("Set aside an automated emergency fund of at least 500 Tk immediately upon receiving monthly allowance.")
            bn_advice.append("মাসিক টাকা পাওয়ার সাথে সাথেই অন্তত ৫০০ টাকা আলাদা বিকাশ বা নগদ অ্যাকাউন্টে জরুরি ফান্ড হিসেবে জমিয়ে রাখুন।")
        else:
            en_advice.append("Temporarily pause dining out and food delivery apps to preserve your end-of-month cash reserve.")
            bn_advice.append("মাসের শেষ দিনগুলোতে ক্যাশ টাকার সংকট এড়াতে ফুড ডেলিভারি ও রেস্টুরেন্টে খাওয়া সাময়িক বন্ধ রাখুন।")

        en_advice.append("Track every single cash and bKash transaction daily using Pockit Ledger.")
        bn_advice.append("প্রতিদিনের প্রতিটি খুচরা ও মোবাইল ব্যাংকিং খরচের হিসাব পকেট লেজারে লিখে রাখুন।")

    elif tier == "MODERATE RISK":
        en_advice.append("Divide your remaining spendable pool into weekly cash envelopes to avoid running dry before month-end.")
        bn_advice.append("আপনার বাকি টাকাগুলোকে সাপ্তাহিক ভাগে ভাগ করে নির্দিষ্ট বাজেট তৈরি করুন।")

        en_advice.append("Aim to protect a monthly target savings of 500–1,000 Tk by trimming discretionary hangout spending.")
        bn_advice.append("দৈনন্দিন চা-নাস্তা ও আড্ডার খরচে সামান্য নিয়ন্ত্রণ এনে প্রতি মাসে অন্তত ৫০০–১,০০০ টাকা সঞ্চয় সুরক্ষিত রাখুন।")

        en_advice.append("Review your mobile banking statements weekly to spot recurring unnecessary charges.")
        bn_advice.append("সপ্তাহে অন্তত একবার বিকাশ বা নগদ লেনদেনের হিস্ট্রি চেক করুন অপ্রয়োজনীয় খরচ চিহ্নিত করতে।")

    else:  # LOW RISK
        en_advice.append("Excellent financial discipline! Your target savings and safe daily burn rate are well balanced.")
        bn_advice.append("চমৎকার আর্থিক শৃঙ্খলা! আপনার লক্ষ্যমাত্রা অনুযায়ী সঞ্চয় ও খরচের গতি দারুণ সুরক্ষিত।")

        en_advice.append("Maintain your weekly expense tracking habit to stay prepared for semester final or project expenses.")
        bn_advice.append("সেমিস্টার ফাইনাল ও প্রজেক্টের খরচের জন্য প্রস্তুত থাকতে নিয়মিত খরচের হিসাব রাখার অভ্যাসটি বজায় রাখুন।")

        en_advice.append("Consider allocating surplus savings into skill development courses or books.")
        bn_advice.append("আপনার অতিরিক্ত সঞ্চয়ের একটি অংশ নতুন স্কিল শেখার কোর্স বা শিক্ষণীয় বই কেনায় কাজে লাগাতে পারেন।")

    return AdviceBlock(english=en_advice, bengali=bn_advice)


def generate_gemini_advice(
    risk_score: float,
    tier: str,
    drivers: List[RiskDriver],
    student_data: StudentInput,
    composite: CompositeScores
) -> AdviceBlock:
    """Generate personalized bilingual advice via Pockit Smart Coach intelligence layer."""
    prompt = f"""
You are the Pockit Smart Coach, an empathetic, encouraging campus elder brother/sister (Bhai/Apu) mentor for a Bangladeshi university student.
Tone: Warm, human, friendly, and practical—like a supportive senior sharing wisdom over campus tong-er cha.
Anti-Repetition Rule: Vary your advice and phrasing dynamically. Avoid generic robotic corporate tips.

Student verified financial profile:
- Financial Risk Score: {risk_score}% ({tier})
- Monthly Available Money: {student_data.total_monthly_money} Tk
- Living Arrangement: {student_data.where_you_live}
- Money Saved Monthly: {student_data.money_saved_per_month} Tk
- Borrowed from friends: {student_data.borrowed_from_friends}
- Spending Tracking Habit: {student_data.track_spending}/5
- Awareness Score: {composite.awareness_score}/5.0
- Impulse Buying Score: {composite.impulse_score}/5.0
- Primary Vulnerabilities: {', '.join([d.feature for d in drivers])}

Generate exactly 3 specific, highly actionable recommendations for this student.
Each recommendation must be provided in natural, friendly English and in conversational, relatable Bengali (আন্তরিক ও সাবলীল বাংলা, যেমন 'টেনশন নিও না...', 'মেস ভাড়াটা আগে আলাদা রাখলে...').
Strict Rule: Do not mention any AI company names or model versions.

Respond ONLY with a valid JSON object:
{{
  "english": [
    "actionable tip 1 in natural, friendly English",
    "actionable tip 2 in natural, friendly English",
    "actionable tip 3 in natural, friendly English"
  ],
  "bengali": [
    "বাস্তবধর্মী আন্তরিক পরামর্শ ১ বাংলায়",
    "বাস্তবধর্মী আন্তরিক পরামর্শ ২ বাংলায়",
    "বাস্তবধর্মী আন্তরিক পরামর্শ ৩ বাংলায়"
  ]
}}
"""

    parsed = _call_gemini_json(prompt, temperature=0.85)
    if parsed:
        en_list = parsed.get("english", [])
        bn_list = parsed.get("bengali", [])
        if len(en_list) > 0 and len(bn_list) > 0:
            return AdviceBlock(english=en_list, bengali=bn_list)

    return get_local_fallback_advice(tier, drivers, student_data, composite)


def get_daily_coaching(user_id: str, metrics: Dict[str, Any], query_status: Optional[Dict[str, Any]] = None) -> AiCoachResponse:
    """Generate personalized daily financial coaching using Pockit Smart Coach."""
    risk_score = metrics.get("current_risk", {}).risk_score_pct if hasattr(metrics.get("current_risk"), "risk_score_pct") else 35.0
    risk_tier = metrics.get("current_risk", {}).risk_tier if hasattr(metrics.get("current_risk"), "risk_tier") else "LOW RISK"
    daily_safe = float(metrics.get("daily_safe_to_spend", 250.0))
    days_left = int(metrics.get("days_remaining", 15))
    balance = float(metrics.get("remaining_balance", 4000.0))
    burn_status = metrics.get("burn_rate_status", "healthy")
    categories = metrics.get("category_breakdown", {})

    target_savings = float(metrics.get("target_savings", 0.0))
    fixed_obligations = float(metrics.get("fixed_obligations_spent", 0.0))
    spendable_variable_pool = float(metrics.get("spendable_variable_pool", 0.0))
    dipping_into_savings = bool(metrics.get("dipping_into_savings", False))
    savings_intact = not dipping_into_savings

    q_used = query_status.get("queries_used", 0) if query_status else 0
    q_rem = query_status.get("queries_remaining", 10) if query_status else 10
    q_limit = query_status.get("daily_limit", 10) if query_status else 10

    # Determine default urgency
    if burn_status == "critical" or risk_score >= 70 or daily_safe < 100 or dipping_into_savings:
        urgency = "alert"
    elif burn_status == "caution" or risk_score >= 40 or daily_safe < 180:
        urgency = "caution"
    else:
        urgency = "normal"

    # Dynamic empathetic student fallbacks with natural variation
    if urgency == "alert":
        if dipping_into_savings:
            fallback_daily_en = random.choice([
                f"Hold the line! Further spending will cut into your ৳{int(target_savings)} protected savings across the remaining {days_left} days.",
                f"Defensive mode activated: your daily allowance is tapped out, so pause non-essentials to preserve your ৳{int(target_savings)} savings goal.",
                f"Let's protect your safety net! We have {days_left} days left—avoiding extra purchases shields your ৳{int(target_savings)} savings completely."
            ])
            fallback_daily_bn = random.choice([
                f"একটু সাবধান হতে হবে! আর খরচ করলে আপনার ৳{int(target_savings)} সুরক্ষিত সঞ্চয়ে টান পড়বে (বাকি {days_left} দিন)।",
                f"টেনশন নিয়ো না, তবে অপ্রয়োজনীয় খরচ পুরোপুরি থামিয়ে ৳{int(target_savings)} জমানো টাকা রক্ষা করা এখন সবচেয়ে জরুরি।",
                f"মাসটা নিরাপদে শেষ করতে হবে—বাকি {days_left} দিনে অতিরিক্ত খরচ এড়িয়ে ৳{int(target_savings)} সঞ্চয় সুরক্ষিত রাখো।"
            ])
        else:
            fallback_daily_en = random.choice([
                f"Resourceful campus mode! Capping daily spending strictly at {daily_safe} Tk lets your {balance} Tk stretch comfortably over all {days_left} days.",
                f"Keep it steady! Limiting today's cashflow to {daily_safe} Tk ensures you won't need to ask friends for loans before month-end.",
                f"You've got this! Stick to {daily_safe} Tk/day for the next {days_left} days and you'll reach the next allowance smoothly."
            ])
            fallback_daily_bn = random.choice([
                f"চলো একটু হিসেব করে চলি! বাকি {days_left} দিনের জন্য দৈনিক খরচ {daily_safe} টাকার মধ্যে রাখলে কোনো ধারদেনা ছাড়াই মাস পার হবে।",
                f"অযথা টেনশন করার দরকার নেই—প্রতিদিন {daily_safe} টাকার ভেতরে চললে তোমার {balance} টাকা সুন্দরভাবে কুলিয়ে যাবে।",
                f"বন্ধুদের কাছ থেকে ধার নেওয়ার চেয়ে এখন একটু সতর্ক থাকা ভালো! আজ খরচ {daily_safe} টাকায় সীমাবদ্ধ রাখো।"
            ])

        fallback_cut_en = random.choice([
            "Completely pause restaurant outings, app deliveries, and impulse snacks until next allowance.",
            "Skip food delivery apps and outside cafes for a few days—hall and mess meals are your best friends right now."
        ])
        fallback_cut_bn = random.choice([
            "পরবর্তী মাসের টাকা পাওয়ার আগ পর্যন্ত বাইরে খাওয়া, ফুড ডেলিভারি ও অপ্রয়োজনীয় স্ন্যাকস কেনা সাময়িক বন্ধ রাখুন।",
            "কয়েকটা দিন ফুডপান্ডা আর দামি ক্যাফে পরিহার করো—মেস বা হলের খাবারে থাকলে পকেটে টান পড়বে না।"
        ])
        fallback_tips_en = [
            "Stick to university hall dining or mess meals instead of outside cafes.",
            "Use campus commuter buses or walk short distances instead of taking solo rickshaws."
        ]
        fallback_tips_bn = [
            "বাইরের রেস্টুরেন্টের বদলে বিশ্ববিদ্যালয়ের হল বা মেসের খাবার খাওয়ার চেষ্টা করুন।",
            "অল্প দূরত্বের জন্য একা রিকশা না নিয়ে হেঁটে বা বন্ধুদের সাথে শেয়ার করে যাতায়াত করুন।"
        ]
    elif urgency == "caution":
        fallback_daily_en = random.choice([
            f"Spend with mindful intention! Your daily safe limit is {daily_safe} Tk/day with ৳{int(target_savings)} in protected savings completely intact.",
            f"You're in good shape! Budgeting around {daily_safe} Tk each day lets you enjoy campus life while keeping your savings secure.",
            f"Looking solid! Stick around {daily_safe} Tk/day across the next {days_left} days and you'll finish this month with a nice surplus."
        ])
        fallback_daily_bn = random.choice([
            f"পরিকল্পনা করে খরচ করুন। আপনার দৈনিক নিরাপদ সীমা {daily_safe} টাকা এবং ৳{int(target_savings)} সঞ্চয় সুরক্ষিত রয়েছে।",
            f"সবকিছু দারুণ নিয়ন্ত্রণে আছে! প্রতিদিন {daily_safe} টাকার মধ্যে খরচ রাখলে সঞ্চয়ও বাঁচবে, ক্যাম্পাসের আড্ডাও চলবে।",
            f"সাবলীলভাবে এগিয়ে যাও! বাকি {days_left} দিনের জন্য দৈনিক {daily_safe} টাকা খরচ করলে মাস শেষে চমৎকার উদ্বৃত্ত থাকবে।"
        ])
        fallback_cut_en = "Review your mobile wallet transactions—frequent small bKash payments can quietly drain your wallet."
        fallback_cut_bn = "মোবাইল ব্যাংকিং হিস্ট্রি চেক করুন—ঘন ঘন ছোটখাটো বিকাশ বা নগদ পেমেন্ট দ্রুত টাকা শেষ করে ফেলে।"
        fallback_tips_en = [
            "Buy study materials and books second-hand from Nilkhet or borrow from seniors.",
            "Cook shared meals in mess on weekends rather than ordering expensive takeout."
        ]
        fallback_tips_bn = [
            "নীলক্ষেত বা সিনিয়রদের থেকে পুরোনো বই ও লেকচার শিট সংগ্রহ করুন।",
            "ছুটির দিনে বাইরে অর্ডার না করে মেসে বন্ধুরা মিলে রান্না করে খাওয়ার অভ্যাস করুন।"
        ]
    else:
        fallback_daily_en = random.choice([
            f"Awesome financial discipline! You have {daily_safe} Tk safe to spend per day with ৳{int(target_savings)} target savings secured.",
            f"You're cruising smoothly! With {daily_safe} Tk safe per day and intact savings, you're ahead of the curve this month.",
            f"Great job staying on track! At {daily_safe} Tk/day, you've got plenty of room for both daily meals and your dream goals."
        ])
        fallback_daily_bn = random.choice([
            f"আপনার খরচের গতি দারুণ নিয়ন্ত্রিত! বাকি {days_left} দিনের জন্য প্রতিদিন {daily_safe} টাকা নিরাপদ বরাদ্দ এবং ৳{int(target_savings)} সঞ্চয় সুরক্ষিত আছে।",
            f"চমৎকার শৃঙ্খলা! প্রতিদিন {daily_safe} টাকা নিরাপদ বাজেট আর ৳{int(target_savings)} সঞ্চয় অক্ষুণ্ণ রেখে তুমি দারুণ এগোচ্ছ।",
            f"সাবাশ! তোমার খরচের গতি একদম নিখুঁত—দৈনিক {daily_safe} টাকা খরচের পরেও তোমার স্বপ্নের লক্ষ্যের টাকা সুরক্ষিত।"
        ])
        fallback_cut_en = "Maintain your current spending discipline and allocate any surplus directly to your student savings fund."
        fallback_cut_bn = "বর্তমান সুশৃঙ্খল অভ্যাস বজায় রাখুন এবং উদ্বৃত্ত টাকা স্টুডেন্ট সেভিংসে যুক্ত করুন।"
        fallback_tips_en = [
            f"Protect your ৳{int(target_savings)} target savings in a separate bKash savings or DPS.",
            "Keep an eye on semester exam fees and book costs scheduled next month."
        ]
        fallback_tips_bn = [
            f"আপনার ৳{int(target_savings)} লক্ষ্যমাত্রার সঞ্চয় আলাদা বিকাশ সেভিংস বা ডিপিএসে অক্ষুণ্ণ রাখুন।",
            "সামনের সেমিস্টার ফাইনাল বা ল্যাব ফির জন্য আগে থেকেই প্রস্তুতি রাখুন।"
        ]

    prompt = f"""
You are the Pockit Smart Coach, an empathetic, encouraging elder campus mentor (Bhai/Apu) for a Bangladeshi university student.
Tone: Warm, human, friendly, and motivating—like a caring senior giving honest advice over campus tong-er cha.
Anti-Repetition Rule: Vary your phrasing, greetings, and sentence structures uniquely on every turn. Do NOT use identical corporate formulas or robotic templates.

Review their live Three-Bucket student finances:
- Total Remaining Balance: {balance} Tk
- Days Remaining: {days_left} days
- Fixed Rent & Mess Obligations: {fixed_obligations} Tk
- Protected Target Savings: {target_savings} Tk (Status: {'Intact & Safe' if savings_intact else 'Dipping into savings!'})
- Spendable Variable Pool: {spendable_variable_pool} Tk
- Safe Daily Spending Limit: {daily_safe} Tk/day
- ML Risk Score: {risk_score}% ({risk_tier})
- Burn Rate Status: {burn_status}
- Current Category Spend: {json.dumps(categories)}

Produce actionable daily guidance in JSON:
1. "daily_budget_advice_en": 1 warm, human, encouraging sentence guiding their daily limit and savings in English.
2. "daily_budget_advice_bn": Same guidance in natural, conversational Bengali (সহজ, আন্তরিক ও সাবলীল বাংলা).
3. "category_cut_advice_en": 1 practical recommendation on which expense to trim today.
4. "category_cut_advice_bn": Same cut advice in friendly Bengali.
5. "campus_tips_en": 2 practical tips tailored to Bangladeshi campus life (Nilkhet books, mess cooking, sharing rickshaws, canteen meals).
6. "campus_tips_bn": 2 practical campus tips in Bengali.
7. "urgency_level": exactly one of "normal", "caution", or "alert".

Strict Rule: Do not mention Google, Gemini, or external LLM providers.
Respond ONLY with valid JSON matching these keys.
"""

    parsed = _call_gemini_json(prompt, temperature=0.85)
    if parsed:
        return AiCoachResponse(
            daily_budget_advice_en=parsed.get("daily_budget_advice_en", fallback_daily_en),
            daily_budget_advice_bn=parsed.get("daily_budget_advice_bn", fallback_daily_bn),
            category_cut_advice_en=parsed.get("category_cut_advice_en", fallback_cut_en),
            category_cut_advice_bn=parsed.get("category_cut_advice_bn", fallback_cut_bn),
            campus_tips_en=parsed.get("campus_tips_en", fallback_tips_en),
            campus_tips_bn=parsed.get("campus_tips_bn", fallback_tips_bn),
            urgency_level=parsed.get("urgency_level", urgency),
            queries_used=q_used,
            queries_remaining=q_rem,
            daily_limit=q_limit,
            target_savings=target_savings,
            fixed_obligations=fixed_obligations,
            spendable_variable_pool=spendable_variable_pool,
            savings_intact=savings_intact
        )

    return AiCoachResponse(
        daily_budget_advice_en=fallback_daily_en,
        daily_budget_advice_bn=fallback_daily_bn,
        category_cut_advice_en=fallback_cut_en,
        category_cut_advice_bn=fallback_cut_bn,
        campus_tips_en=fallback_tips_en,
        campus_tips_bn=fallback_tips_bn,
        urgency_level=urgency,
        queries_used=q_used,
        queries_remaining=q_rem,
        daily_limit=q_limit,
        target_savings=target_savings,
        fixed_obligations=fixed_obligations,
        spendable_variable_pool=spendable_variable_pool,
        savings_intact=savings_intact
    )


def simulate_purchase_advice(
    current_metrics: Dict[str, Any],
    simulated_metrics: Dict[str, Any],
    item_title: str,
    amount: float,
    category: str,
    goal_info: Optional[Dict[str, Any]] = None
) -> PurchaseSimulationResponse:
    """Evaluates purchase impact before a student spends, predicting risk delta, safe daily limit drop, target savings impact, and dream goal timeline delay."""
    curr_risk = current_metrics["current_risk"].risk_score_pct if hasattr(current_metrics["current_risk"], "risk_score_pct") else 30.0
    sim_risk = simulated_metrics["current_risk"].risk_score_pct if hasattr(simulated_metrics["current_risk"], "risk_score_pct") else 35.0
    risk_delta = round(sim_risk - curr_risk, 1)

    curr_daily = float(current_metrics.get("daily_safe_to_spend", 250.0))
    sim_daily = float(simulated_metrics.get("daily_safe_to_spend", 200.0))
    daily_delta = round(sim_daily - curr_daily, 1)

    curr_tier = current_metrics["current_risk"].risk_tier if hasattr(current_metrics["current_risk"], "risk_tier") else "LOW RISK"
    sim_tier = simulated_metrics["current_risk"].risk_tier if hasattr(simulated_metrics["current_risk"], "risk_tier") else "LOW RISK"

    rem_bal = float(simulated_metrics.get("remaining_balance", 0.0))
    days_left = int(current_metrics.get("days_remaining", 15))
    target_savings = float(current_metrics.get("target_savings", 0.0))
    new_spendable_pool = float(simulated_metrics.get("spendable_variable_pool", 0.0))

    # Evaluate savings impact
    if target_savings > 0 and new_spendable_pool < 0:
        dip_amount = abs(new_spendable_pool)
        savings_impact_en = f"Breaks into your ৳{int(target_savings)} target savings goal by ৳{int(dip_amount)}!"
        savings_impact_bn = f"আপনার ৳{int(target_savings)} লক্ষ্যমাত্রার সঞ্চয় থেকে ৳{int(dip_amount)} খরচ হয়ে যাবে!"
    elif target_savings > 0:
        savings_impact_en = f"Your ৳{int(target_savings)} target savings goal remains 100% protected."
        savings_impact_bn = f"আপনার ৳{int(target_savings)} সঞ্চয়ের লক্ষ্যমাত্রা সম্পূর্ণ সুরক্ষিত থাকবে।"
    else:
        savings_impact_en = "No monthly target savings currently configured."
        savings_impact_bn = "বর্তমানে কোনো নির্দিষ্ট সঞ্চয়ের লক্ষ্য সেট করা নেই।"

    # Evaluate goal delay impact
    goal_delay_en = None
    goal_delay_bn = None
    if goal_info and goal_info.get("monthly_commitment", 0) > 0:
        delay_m = math.ceil(amount / float(goal_info["monthly_commitment"]))
        goal_title = goal_info.get("title", "Goal")
        goal_delay_en = f"Buying this will delay your '{goal_title}' goal by ~{delay_m} month{'s' if delay_m > 1 else ''}."
        goal_delay_bn = f"এটি কেনা আপনার '{goal_title}' অর্জনের লক্ষ্যকে প্রায় {delay_m} মাস বিলম্বিত করবে।"

    # Determine verdict
    if sim_risk >= 70.0 or sim_daily < 90 or rem_bal <= 0 or (target_savings > 0 and new_spendable_pool < 0):
        verdict = "AVOID"
        verdict_bn = "কেনা থেকে বিরত থাকুন"
        default_reason_en = f"Spending {amount} Tk on '{item_title}' will drop your safe daily limit from {curr_daily} to {sim_daily} Tk/day for {days_left} remaining days and elevate risk to {sim_risk}%."
        default_reason_bn = f"'{item_title}'-এ {amount} টাকা খরচ করলে আপনার দৈনিক নিরাপদ সীমা {curr_daily} থেকে কমে {sim_daily} টাকায় নামবে এবং ঝুঁকি বেড়ে {sim_risk}% হবে।"
        default_alt_en = "Postpone this purchase until next month or look for a pre-owned/shared alternative."
        default_alt_bn = "এই খরচটি আগামী মাসের জন্য স্থগিত রাখুন, অথবা কোনো কম খরচের বিকল্প ভাবুন।"
    elif sim_risk >= 40.0 or risk_delta >= 6.0 or sim_daily < 160:
        verdict = "WARN"
        verdict_bn = "সতর্কতার সাথে বিবেচনা করুন"
        default_reason_en = f"This purchase will decrease your daily safe allowance by {abs(daily_delta)} Tk/day, leaving {sim_daily} Tk/day."
        default_reason_bn = f"এই খরচের ফলে আপনার দৈনিক নিরাপদ বাজেট {abs(daily_delta)} টাকা কমে {sim_daily} টাকা হবে।"
        default_alt_en = "Wait 48 hours to confirm if it is essential, or cut hangout snacks to compensate."
        default_alt_bn = "৪৮ ঘণ্টার নিয়ম মেনে দেখুন এটি আসলেই জরুরি কি না, অথবা অন্য কোনো খরচ কমিয়ে ক্ষতিপূরণ করুন।"
    else:
        verdict = "PROCEED"
        verdict_bn = "নিরাপদে কিনতে পারেন"
        default_reason_en = f"You have sufficient budget buffer. Your remaining safe allowance will be {sim_daily} Tk/day at {sim_risk}% risk."
        default_reason_bn = f"আপনার যথেষ্ট আর্থিক সক্ষমতা রয়েছে। এই খরচের পরেও প্রতিদিন {sim_daily} টাকা নিরাপদ বরাদ্দ থাকবে।"
        default_alt_en = "Proceed with your purchase and log the expense in your ledger right away."
        default_alt_bn = "নিরাপদে কিনতে পারেন এবং কেনা শেষেই পকেট লেজারে হিসাব লিখে রাখুন।"

    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return PurchaseSimulationResponse(
            item_title=item_title,
            amount=amount,
            category=category,
            current_risk_pct=curr_risk,
            simulated_risk_pct=sim_risk,
            risk_pct_change=risk_delta,
            current_daily_safe=curr_daily,
            simulated_daily_safe=sim_daily,
            daily_safe_change=daily_delta,
            current_tier=curr_tier,
            simulated_tier=sim_tier,
            verdict=verdict,
            verdict_bn=verdict_bn,
            ai_reasoning_en=default_reason_en,
            ai_reasoning_bn=default_reason_bn,
            alternative_suggestion_en=default_alt_en,
            alternative_suggestion_bn=default_alt_bn,
            savings_goal_impact=savings_impact_en,
            savings_goal_impact_bn=savings_impact_bn,
            new_spendable_pool=new_spendable_pool,
            goal_delay_en=goal_delay_en,
            goal_delay_bn=goal_delay_bn
        )

    prompt = f"""
A university student in Bangladesh is asking the Pockit Smart Coach: "Should I buy '{item_title}' for {amount} Tk (Category: {category})?"
You are their friendly, trusted campus elder mentor (Bhai/Apu). Tone: warm, human, empathetic, and encouraging.

Three-Bucket Financial Status:
- Current Risk: {curr_risk}% ({curr_tier}) -> After Purchase: {sim_risk}% ({sim_tier})
- Current Daily Safe Limit: {curr_daily} Tk/day -> After Purchase: {sim_daily} Tk/day (Change: {daily_delta} Tk across {days_left} days)
- Protected Target Savings: {target_savings} Tk
- New Spendable Variable Pool: {new_spendable_pool} Tk
- Algorithmic Verdict: {verdict} ({verdict_bn})

Provide concise, empathetic student guidance in JSON:
1. "ai_reasoning_en": 1 warm, clear sentence explaining the verdict with real empathy.
2. "ai_reasoning_bn": 1 warm, clear sentence in natural conversational Bengali (সহজ, আন্তরিক ও বাস্তবমুখী বাংলা).
3. "alternative_suggestion_en": 1 smart campus alternative (Nilkhet pre-owned, shared with friends, 48-hour cool-off, or mess meal).
4. "alternative_suggestion_bn": 1 smart alternative in friendly Bengali.

Strict Rule: Do not mention Google, Gemini, or external LLM providers.
Respond ONLY with valid JSON matching these keys.
"""

    parsed = _call_gemini_json(prompt, temperature=0.75)
    if parsed:
        return PurchaseSimulationResponse(
            item_title=item_title,
            amount=amount,
            category=category,
            current_risk_pct=curr_risk,
            simulated_risk_pct=sim_risk,
            risk_pct_change=risk_delta,
            current_daily_safe=curr_daily,
            simulated_daily_safe=sim_daily,
            daily_safe_change=daily_delta,
            current_tier=curr_tier,
            simulated_tier=sim_tier,
            verdict=verdict,
            verdict_bn=verdict_bn,
            ai_reasoning_en=parsed.get("ai_reasoning_en", default_reason_en),
            ai_reasoning_bn=parsed.get("ai_reasoning_bn", default_reason_bn),
            alternative_suggestion_en=parsed.get("alternative_suggestion_en", default_alt_en),
            alternative_suggestion_bn=parsed.get("alternative_suggestion_bn", default_alt_bn),
            savings_goal_impact=savings_impact_en,
            savings_goal_impact_bn=savings_impact_bn,
            new_spendable_pool=new_spendable_pool,
            goal_delay_en=goal_delay_en,
            goal_delay_bn=goal_delay_bn
        )

    return PurchaseSimulationResponse(
        item_title=item_title,
        amount=amount,
        category=category,
        current_risk_pct=curr_risk,
        simulated_risk_pct=sim_risk,
        risk_pct_change=risk_delta,
        current_daily_safe=curr_daily,
        simulated_daily_safe=sim_daily,
        daily_safe_change=daily_delta,
        current_tier=curr_tier,
        simulated_tier=sim_tier,
        verdict=verdict,
        verdict_bn=verdict_bn,
        ai_reasoning_en=default_reason_en,
        ai_reasoning_bn=default_reason_bn,
        alternative_suggestion_en=default_alt_en,
        alternative_suggestion_bn=default_alt_bn,
        savings_goal_impact=savings_impact_en,
        savings_goal_impact_bn=savings_impact_bn,
        new_spendable_pool=new_spendable_pool,
        goal_delay_en=goal_delay_en,
        goal_delay_bn=goal_delay_bn
    )


def ask_smart_coach(
    user_id: str,
    question: str,
    metrics: Dict[str, Any],
    query_status: Dict[str, Any]
) -> AskCoachResponse:
    """Answers a personalized student financial question in real-time with context awareness."""
    q_used = query_status.get("queries_used", 0)
    q_rem = query_status.get("queries_remaining", 10)
    q_limit = query_status.get("daily_limit", 10)

    daily_safe = float(metrics.get("daily_safe_to_spend", 250.0))
    days_left = int(metrics.get("days_remaining", 15))
    balance = float(metrics.get("remaining_balance", 4000.0))
    target_savings = float(metrics.get("target_savings", 0.0))
    spendable_pool = float(metrics.get("spendable_variable_pool", 0.0))
    risk_score = metrics.get("current_risk", {}).risk_score_pct if hasattr(metrics.get("current_risk"), "risk_score_pct") else 35.0

    # Local empathetic fallback logic with natural variety
    default_en_options = [
        f"Hey! Based on your live budget, you have ৳{daily_safe}/day safe to spend across the next {days_left} days while keeping your ৳{int(target_savings)} savings goal intact. If you plan a hangout or special treat, keep it under ৳{int(daily_safe * 1.4)} so you don't feel the pinch tomorrow!",
        f"Good thinking to check in! Right now you're looking at ৳{daily_safe} per day for the remaining {days_left} days. Your ৳{int(target_savings)} target savings are protected—just keep unnecessary bKash impulsive orders in check and you'll sail through comfortably.",
        f"Listen, you've got ৳{balance} remaining for {days_left} days. That gives you a solid safe cushion of ৳{daily_safe}/day after ring-fencing your ৳{int(target_savings)} savings. Stay consistent on mess and canteen meals and you won't need to stress before month-end."
    ]
    default_bn_options = [
        f"আরে ভাই/আপু! তোমার হিসাব অনুযায়ী আগামী {days_left} দিনের জন্য প্রতিদিন ৳{daily_safe} করে নিরাপদ খরচ করতে পারবে এবং ৳{int(target_savings)} সঞ্চয় অক্ষুণ্ণ থাকবে। বাইরে আড্ডা দিলে খরচটা ৳{int(daily_safe * 1.4)}-এর মধ্যে রাখলে মাস শেষে একদম চাপ পড়বে না!",
        f"দারুণ কাজ করেছ আগেভাগেই জেনে নেওয়ার জন্য! এখন তোমার হাতে প্রতিদিনের জন্য ৳{daily_safe} নিরাপদ বরাদ্দ আছে। জমানো ৳{int(target_savings)} টাকা পুরোপুরি সুরক্ষিত—শুধু হুটহাট ফুড ডেলিভারি বা ছোটখাটো অনলাইন খরচগুলো একটু নজরে রেখো।",
        f"শোনো, বাকি {days_left} দিনের জন্য ৳{balance} হাতে আছে, অর্থাৎ দৈনিক ৳{daily_safe} নিরাপদে খরচ করা সম্ভব। মেসের ভাড়া আর খাবারের টাকাটা আলাদা থাকলে কোনো টেনশন ছাড়া সুন্দরভাবে মাস শেষ করতে পারবে!"
    ]
    default_en = random.choice(default_en_options)
    default_bn = random.choice(default_bn_options)

    prompt = f"""
You are the Pockit Smart Coach, an empathetic, witty, encouraging campus elder brother/sister (Bhai/Apu) mentor for Bangladeshi university students.
The student has asked: "{question}"

Live Three-Bucket Student Budget Context:
- Available Total Balance: {balance} Tk
- Days Remaining in Month: {days_left} days
- Safe Daily Spending Limit: {daily_safe} Tk/day
- Spendable Variable Pool: {spendable_pool} Tk
- Protected Target Savings: {target_savings} Tk
- Current ML Risk Score: {risk_score}%

CRITICAL PERSONA GUIDELINES:
1. Warm, Friendly & Human: Talk like a real, supportive senior sharing tea at a campus tong stall. Be genuine, empathetic, and encouraging. Never sound like a cold robot, corporate disclaimer, or generic calculator.
2. Dynamic Uniqueness: Vary your opening greeting and sentence structure on EVERY turn! Do NOT start with repetitive boilerplate like "Based on your current numbers...". Start with natural conversation (e.g. "Hey!", "Good thinking to check first!", "Shon (listen), here's the honest deal with your budget...", "Totally get where you're coming from...", "Arey, let's look at this together...").
3. Concrete Numbers & Realistic Alternatives: Give them the exact math from their budget (daily safe limit, impact on savings), but pair it with relatable campus life hacks (sharing rickshaws, canteen vs outside food, buying second-hand Nilkhet notes, waiting 48 hours).
4. Natural Bengali: In "answer_bn", speak in warm, natural, colloquial Bengali (সহজ, আন্তরিক ও সাবলীল বাংলা, যেমন: 'আরে ভাই/আপু...', 'দারুণ সিদ্ধান্ত...', 'কোনো চিন্তা কোরো না...', 'মেস ভাড়াটা আলাদা রাখলে...').

Strict Rule: Do not mention Google, Gemini, or external LLM providers.
Respond ONLY with a valid JSON object matching:
{{
  "answer_en": "2-3 sentences in friendly, natural English with specific numbers and empathetic advice.",
  "answer_bn": "2-3 sentences in warm, culturally relatable, natural Bengali."
}}
"""

    parsed = _call_gemini_json(prompt, temperature=0.85)
    if parsed:
        return AskCoachResponse(
            answer_en=parsed.get("answer_en", default_en),
            answer_bn=parsed.get("answer_bn", default_bn),
            queries_used=q_used,
            queries_remaining=q_rem,
            daily_limit=q_limit,
            is_pro=True
        )

    return AskCoachResponse(
        answer_en=default_en,
        answer_bn=default_bn,
        queries_used=q_used,
        queries_remaining=q_rem,
        daily_limit=q_limit,
        is_pro=True
    )
