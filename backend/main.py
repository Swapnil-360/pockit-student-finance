"""
FastAPI Server for Student Financial Management & Risk Warning System (শিক্ষার্থীর অর্থ ব্যবস্থাপনা).
Integrates:
- User Authentication (Registration, Login, 1-Click Instant Demo, Password Reset)
- App Lock PIN Security (4-Digit Hash Verification)
- Baseline Student Profile & Likert Habit Assessment
- Multi-Source Income Inflow Tracking (Family, Tuition, Freelance, Scholarship, Gift/Other)
- Real-Time Calendar & Dynamic Ledger (1st to 28th/30th/31st Cashflow Tracking)
- Hybrid Dynamic ML Inference (Gradient Boosting Pipeline from financial_risk_model.pkl)
- Real-Time Daily Safe-to-Spend Projections: (Monthly Funds Added - Fixed Rent - Total Spent) / Days Remaining
- Freemium + Pro AI Subscription Engine (Tk 50/Month with bKash/Nagad verification & Demo Toggle)
- Bilingual Gemini 2.5 Flash Financial Coach & Pre-Purchase Impact Simulator ("Ask AI Before I Buy")
- Monthly Archive Engine & Retraining Dataset Check-In (Exact 24-Column Schema)
"""

from contextlib import asynccontextmanager
import io
import json
import uuid
from typing import Any, Dict, List, Optional
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from config import PORT, HOST, ENVIRONMENT, MODEL_PATH
from database import db
from admin_routes import router as admin_router
from models import (
    UserRegisterRequest,
    UserLoginRequest,
    GoogleAuthRequest,
    UpdateProfileRequest,
    BudgetBaselineUpdateRequest,
    UpdateTargetSavingsRequest,
    AvatarUploadRequest,
    AvatarUploadResponse,
    AuthResponse,
    UserData,
    BaselineProfileRequest,
    ProfileResponse,
    ExpenseCreateRequest,
    ExpenseItem,
    IncomeCreateRequest,
    IncomeItem,
    CalendarLedgerResponse,
    SubscriptionTrxRequest,
    SubscriptionStatusResponse,
    DemoProToggleRequest,
    SetPinRequest,
    VerifyPinRequest,
    ForgotPasswordRequest,
    MonthlyArchiveItem,
    DashboardResponse,
    RiskScoreSummary,
    AiCoachRequest,
    AiCoachResponse,
    AskCoachRequest,
    AskCoachResponse,
    PurchaseSimulationRequest,
    PurchaseSimulationResponse,
    MonthEndCheckinRequest,
    MonthEndCheckinResponse,
    SavingsGoalModel,
    CreateGoalRequest,
    BoostGoalRequest,
    SweepLeftoverRequest,
    ToggleGoalPauseRequest,
    # Monthly Statement & Executive Report
    MonthlyReportResponse,
    # Campus Peer Debts & Mess Meals
    PeerDebtCreateRequest,
    PeerDebtItem,
    PeerDebtSummaryResponse,
    MessMealLogRequest,
    MessMealRateUpdateRequest,
    MessTotalMealsUpdateRequest,
    MessAdvanceUpdateRequest,
    MessToggleRequest,
    MessSummaryResponse,
    # Legacy / Compatibility schemas
    StudentInput,
    RiskPredictionResponse,
    FeedbackRequest,
    FeedbackResponse
)
from pipeline_service import pipeline_service
from gemini_advisor import (
    generate_gemini_advice,
    get_daily_coaching,
    simulate_purchase_advice,
    ask_smart_coach
)
from feedback_store import feedback_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing Student Financial Risk ML Backend...")
    pipeline_service._ensure_model_loaded()
    yield
    print("Shutting down backend...")


app = FastAPI(
    title="Student Financial Management & Risk Warning API",
    description="FastAPI service for student budgeting, dynamic ML risk warning, multi-source income, and Gemini 2.5 Flash coaching",
    version="2.1.0",
    lifespan=lifespan
)

# Enable CORS for cross-platform Expo React Native mobile apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)


# --- 1. SYSTEM HEALTH & METADATA ---
@app.get("/")
def read_root():
    return {
        "system": "Student Financial Management & Risk Warning System (শিক্ষার্থীর অর্থ ব্যবস্থাপনা)",
        "version": "2.1.0",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    model_ready = pipeline_service.model is not None
    return {
        "status": "healthy",
        "model_loaded": model_ready,
        "model_file_exists": MODEL_PATH.exists()
    }


@app.get("/schema-options")
def get_schema_options():
    """Returns bilingual metadata and options for the Onboarding wizard."""
    return {
        "steps": [
            {
                "step": 1,
                "title_en": "Student Demographics",
                "title_bn": "শিক্ষার্থীর পরিচিতি",
                "fields": [
                    {
                        "name": "gender",
                        "label_en": "Gender",
                        "label_bn": "লিঙ্গ",
                        "type": "select",
                        "options": [
                            {"value": "Male", "label_en": "Male", "label_bn": "পুরুষ"},
                            {"value": "Female", "label_en": "Female", "label_bn": "নারী"}
                        ]
                    },
                    {
                        "name": "age",
                        "label_en": "Age (Years)",
                        "label_bn": "বয়স (বছর)",
                        "type": "number",
                        "default": 21,
                        "min": 16,
                        "max": 35
                    },
                    {
                        "name": "year_of_study",
                        "label_en": "Year of Study",
                        "label_bn": "অধ্যয়নের বর্ষ",
                        "type": "select",
                        "options": [
                            {"value": "1st year", "label_en": "1st Year", "label_bn": "১ম বর্ষ"},
                            {"value": "2nd year", "label_en": "2nd Year", "label_bn": "২য় বর্ষ"},
                            {"value": "3rd year", "label_en": "3rd Year", "label_bn": "৩য় বর্ষ"},
                            {"value": "4th year", "label_en": "4th Year", "label_bn": "৪র্থ বর্ষ"},
                            {"value": "Masters", "label_en": "Masters", "label_bn": "মাস্টার্স"}
                        ]
                    },
                    {
                        "name": "university_type",
                        "label_en": "University Type",
                        "label_bn": "বিশ্ববিদ্যালয়ের ধরন",
                        "type": "select",
                        "options": [
                            {"value": "Public", "label_en": "Public University", "label_bn": "পাবলিক বিশ্ববিদ্যালয়"},
                            {"value": "Private", "label_en": "Private University", "label_bn": "বেসরকারি বিশ্ববিদ্যালয়"},
                            {"value": "National University college", "label_en": "National University / College", "label_bn": "জাতীয় বিশ্ববিদ্যালয় / কলেজ"}
                        ]
                    },
                    {
                        "name": "where_you_live",
                        "label_en": "Living Arrangement",
                        "label_bn": "বসবাসের স্থান",
                        "type": "select",
                        "options": [
                            {"value": "With family", "label_en": "With Family", "label_bn": "পরিবারের সাথে"},
                            {"value": "Mess-hostel", "label_en": "Mess / Hostel", "label_bn": "মেস / হোস্টেল"},
                            {"value": "Hall", "label_en": "University Hall", "label_bn": "বিশ্ববিদ্যালয় হল"},
                            {"value": "Rented flat", "label_en": "Rented Flat", "label_bn": "ভাড়া বাসা"}
                        ]
                    }
                ]
            },
            {
                "step": 2,
                "title_en": "Income & Baseline Budget",
                "title_bn": "আর্থিক উৎস ও মাসিক বাজেট",
                "fields": [
                    {
                        "name": "total_monthly_money",
                        "label_en": "Total Monthly Money Available",
                        "label_bn": "মাসে মোট প্রাপ্ত অর্থ (টাকা)",
                        "type": "select",
                        "options": [
                            {"value": "<5k", "label_en": "Under 5,000 Tk", "label_bn": "৫,০০০ টাকার কম"},
                            {"value": "5–10k", "label_en": "5,000 – 10,000 Tk", "label_bn": "৫,০০০ – ১০,০০০ টাকা"},
                            {"value": "10–15k", "label_en": "10,000 – 15,000 Tk", "label_bn": "১০,০০০ – ১৫,০০০ টাকা"},
                            {"value": "15–20k", "label_en": "15,000 – 20,000 Tk", "label_bn": "১৫,০০০ – ২০,০০০ টাকা"},
                            {"value": ">20k", "label_en": "Above 20,000 Tk", "label_bn": "২০,০০০ টাকার বেশি"}
                        ]
                    },
                    {
                        "name": "monthly_allowance_fixed",
                        "label_en": "Exact Monthly Allowance (Tk)",
                        "label_bn": "মাসিক সুনির্দিষ্ট বাজেট/টাকা (টাকায়)",
                        "type": "number",
                        "default": 8000,
                        "min": 1000
                    },
                    {
                        "name": "monthly_rent_fixed",
                        "label_en": "Fixed Rent / Accommodation (Tk)",
                        "label_bn": "নির্দিষ্ট মেস বা বাসা ভাড়া (টাকা)",
                        "type": "number",
                        "default": 3000,
                        "min": 0
                    },
                    {
                        "name": "target_savings",
                        "label_en": "Protected Monthly Target Savings (Tk)",
                        "label_bn": "সুরক্ষিত মাসিক সঞ্চয়ের লক্ষ্য (টাকা)",
                        "type": "number",
                        "default": 500,
                        "min": 0
                    },
                    {
                        "name": "savings_goal_fixed",
                        "label_en": "Monthly Savings Target (Tk)",
                        "label_bn": "মাসিক সঞ্চয়ের লক্ষ্য (টাকা)",
                        "type": "number",
                        "default": 1000,
                        "min": 0
                    },
                    {
                        "name": "main_source_of_money",
                        "label_en": "Main Source of Money",
                        "label_bn": "অর্থের প্রধান উৎস",
                        "type": "select",
                        "options": [
                            {"value": "Family", "label_en": "Family", "label_bn": "পরিবার"},
                            {"value": "Tuition-job", "label_en": "Tuition / Part-time Job", "label_bn": "টিউশন / চাকরি"},
                            {"value": "Loan", "label_en": "Loan / Debt", "label_bn": "ঋণ / ধার"},
                            {"value": "Mixed", "label_en": "Mixed Sources", "label_bn": "মিশ্র উৎস"}
                        ]
                    },
                    {
                        "name": "do_you_earn_income",
                        "label_en": "Do You Earn Your Own Income?",
                        "label_bn": "আপনার কি নিজস্ব উপার্জন আছে?",
                        "type": "select",
                        "options": [
                            {"value": "No", "label_en": "No", "label_bn": "না"},
                            {"value": "Yes", "label_en": "Yes", "label_bn": "হ্যাঁ"}
                        ]
                    }
                ]
            },
            {
                "step": 3,
                "title_en": "Financial Habits",
                "title_bn": "আর্থিক অভ্যাস",
                "fields": [
                    {
                        "name": "track_spending",
                        "label_en": "I track my spending regularly (1–5)",
                        "label_bn": "আমি নিয়মিত খরচের হিসাব রাখি (১–৫)",
                        "type": "likert",
                        "min": 1,
                        "max": 5
                    },
                    {
                        "name": "mobile_banking_use",
                        "label_en": "Mobile Banking (bKash/Nagad/Rocket)",
                        "label_bn": "মোবাইল ব্যাংকিং ব্যবহারের ফ্রিকোয়েন্সি",
                        "type": "select",
                        "options": [
                            {"value": "Rarely", "label_en": "Rarely", "label_bn": "খুব কম"},
                            {"value": "Weekly", "label_en": "Weekly", "label_bn": "সাপ্তাহিক"},
                            {"value": "Daily", "label_en": "Daily", "label_bn": "দৈনিক"}
                        ]
                    },
                    {
                        "name": "borrowed_from_friends_baseline",
                        "label_en": "Borrowed from Friends (Last 3 Months)",
                        "label_bn": "গত ৩ মাসে বন্ধুদের থেকে ধার নেওয়ার হার",
                        "type": "select",
                        "options": [
                            {"value": "Never", "label_en": "Never", "label_bn": "কখনও না"},
                            {"value": "1–2", "label_en": "1 to 2 times", "label_bn": "১ – ২ বার"},
                            {"value": "3+", "label_en": "3 or more times", "label_bn": "৩ বার বা তার বেশি"}
                        ]
                    }
                ]
            },
            {
                "step": 4,
                "title_en": "Behavioral Habits (Likert 1–5)",
                "title_bn": "আচরণগত অভ্যাস (স্কেল ১–৫)",
                "fields": [
                    {
                        "name": "aware_balance",
                        "label_en": "I always know roughly how much money I have left.",
                        "label_bn": "আমার কাছে আনুমানিক কত টাকা অবশিষ্ট আছে তা আমি সব সময় জানি।",
                        "type": "likert"
                    },
                    {
                        "name": "aware_weekly_track",
                        "label_en": "I keep track of where most of my money goes each week.",
                        "label_bn": "প্রতি সপ্তাহে আমার সিংহভাগ টাকা কোথায় খরচ হয় তার হিসাব রাখি।",
                        "type": "likert"
                    },
                    {
                        "name": "aware_check_before_buy",
                        "label_en": "I check my balance/expenses before making non-essential purchases.",
                        "label_bn": "অপ্রয়োজনীয় কেনাকাটার আগে আমি আমার ব্যালেন্স বা বাজেট যাচাই করি।",
                        "type": "likert"
                    },
                    {
                        "name": "impulse_spontaneous",
                        "label_en": "I often buy things on the spur of the moment without planning.",
                        "label_bn": "আমি প্রায়ই কোনো পরিকল্পনা ছাড়া ঝোঁকের মাথায় কেনাকাটা করি।",
                        "type": "likert"
                    },
                    {
                        "name": "impulse_discounts",
                        "label_en": "I find it hard to resist discounts, flash sales, or cravings.",
                        "label_bn": "ডিসকাউন্ট, ফ্ল্যাশ সেল বা খাবারের লোভ সামলানো আমার জন্য কঠিন হয়।",
                        "type": "likert"
                    },
                    {
                        "name": "impulse_regret",
                        "label_en": "I frequently regret unplanned purchases shortly after buying them.",
                        "label_bn": "পরিকল্পনাহীন কেনাকাটা করার কিছু পরেই আমি প্রায়ই অনুতপ্ত হই।",
                        "type": "likert"
                    }
                ]
            }
        ]
    }


# --- 2. AUTHENTICATION & SECURITY ENDPOINTS ---
@app.post("/api/auth/register", response_model=AuthResponse)
def register_user(req: UserRegisterRequest):
    try:
        user = db.create_user(req.email, req.password, req.full_name)
        token = f"token_{user['id']}"
        pro_info = db.check_pro_status(user['id'])
        return AuthResponse(
            status="success",
            user=UserData(
                id=user['id'],
                email=user['email'],
                full_name=user['full_name'],
                is_demo=False,
                is_pro=pro_info['is_pro'],
                has_pin=False,
                avatar_url=user.get('avatar_url'),
                subscription_expiry=pro_info.get('expiry')
            ),
            has_profile=False,
            token=token
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(req: UserLoginRequest):
    user = db.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    profile = db.get_profile(user['id'])
    token = f"token_{user['id']}"
    pro_info = db.check_pro_status(user['id'])
    has_pin = bool(user.get('pin_code_hash'))
    return AuthResponse(
        status="success",
        user=UserData(
            id=user['id'],
            email=user['email'],
            full_name=user['full_name'],
            calling_name=user.get('calling_name'),
            is_demo=bool(user.get('is_demo', 0)),
            is_pro=pro_info['is_pro'],
            has_pin=has_pin,
            avatar_url=user.get('avatar_url'),
            subscription_expiry=pro_info.get('expiry')
        ),
        has_profile=profile is not None,
        token=token
    )


@app.post("/api/auth/google", response_model=AuthResponse)
def google_sign_in(req: GoogleAuthRequest):
    """Sign In / Sign Up using Google account with avatar and name."""
    user = db.google_auth(req.email, req.full_name, req.avatar_url)
    profile = db.get_profile(user['id'])
    token = f"token_{user['id']}"
    pro_info = db.check_pro_status(user['id'])
    has_pin = bool(user.get('pin_code_hash'))
    return AuthResponse(
        status="success",
        user=UserData(
            id=user['id'],
            email=user['email'],
            full_name=user['full_name'],
            calling_name=user.get('calling_name'),
            is_demo=bool(user.get('is_demo', 0)),
            is_pro=pro_info['is_pro'],
            has_pin=has_pin,
            avatar_url=user.get('avatar_url'),
            subscription_expiry=pro_info.get('expiry')
        ),
        has_profile=profile is not None,
        token=token
    )


@app.get("/api/user/by-email/{email}", response_model=AuthResponse)
def get_user_by_email(email: str):
    """Restores user profile and authentication context by email (useful on cloud cold starts)."""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    profile = db.get_profile(user["id"])
    token = f"token_{user['id']}"
    pro_info = db.check_pro_status(user['id'])
    has_pin = bool(user.get('pin_code_hash'))
    return AuthResponse(
        status="success",
        user=UserData(
            id=user['id'],
            email=user['email'],
            full_name=user['full_name'],
            calling_name=user.get('calling_name'),
            is_demo=bool(user.get('is_demo', 0)),
            is_pro=pro_info['is_pro'],
            has_pin=has_pin,
            avatar_url=user.get('avatar_url'),
            subscription_expiry=pro_info.get('expiry')
        ),
        has_profile=profile is not None,
        token=token
    )


@app.post("/api/auth/demo", response_model=AuthResponse)
def demo_login():
    """1-Click instant login as pre-seeded demo student."""
    user = db.get_user("demo_student_001")
    if not user:
        db._ensure_demo_user()
        user = db.get_user("demo_student_001")

    profile = db.get_profile("demo_student_001")
    pro_info = db.check_pro_status("demo_student_001")
    return AuthResponse(
        status="success",
        user=UserData(
            id=user['id'],
            email=user['email'],
            full_name=user['full_name'],
            is_demo=True,
            is_pro=pro_info['is_pro'],
            has_pin=bool(user.get('pin_code_hash')),
            avatar_url=user.get('avatar_url'),
            subscription_expiry=pro_info.get('expiry')
        ),
        has_profile=profile is not None,
        token="token_demo_student_001"
    )


@app.put("/api/user/{user_id}/profile")
def update_student_profile(user_id: str, req: UpdateProfileRequest):
    """Update student name, avatar photo, and academic/housing details in database."""
    res = db.update_user_profile(
        user_id=user_id,
        full_name=req.full_name,
        calling_name=req.calling_name,
        avatar_url=req.avatar_url,
        university_type=req.university_type,
        year_of_study=req.year_of_study,
        where_you_live=req.where_you_live,
        enable_mess_meals=req.enable_mess_meals,
        monthly_allowance_fixed=req.monthly_allowance_fixed,
        monthly_rent_fixed=req.monthly_rent_fixed,
        mess_meal_fixed=req.mess_meal_fixed,
        academic_fee_fixed=req.academic_fee_fixed,
        target_savings=req.target_savings,
        savings_goal_fixed=req.savings_goal_fixed
    )
    if not res.get("user"):
        raise HTTPException(status_code=404, detail="Student user not found.")

    pipeline_service.evaluate_live_student_risk(user_id, trigger_event="profile_updated")
    pro_info = db.check_pro_status(user_id)
    user_data = UserData(
        id=res["user"]['id'],
        email=res["user"]['email'],
        full_name=res["user"]['full_name'],
        is_demo=bool(res["user"].get('is_demo', 0)),
        is_pro=pro_info['is_pro'],
        has_pin=bool(res["user"].get('pin_code_hash')),
        avatar_url=res["user"].get('avatar_url'),
        subscription_expiry=pro_info.get('expiry')
    )
    return {
        "status": "success",
        "user": user_data,
        "profile": res.get("profile")
    }


@app.post("/api/user/{user_id}/avatar", response_model=AvatarUploadResponse)
def upload_student_avatar(user_id: str, req: AvatarUploadRequest):
    """Uploads user avatar to Supabase Cloud Storage ('avatars' bucket) and updates profile."""
    avatar_url = db.upload_avatar_to_storage(user_id, req.image_data)
    return AvatarUploadResponse(avatar_url=avatar_url, status="success")


@app.put("/api/user/{user_id}/target-savings")
def update_student_target_savings(user_id: str, req: UpdateTargetSavingsRequest):
    """Directly sets or updates the protected monthly target savings goal."""
    success = db.update_target_savings(user_id, req.target_savings)
    if not success:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    summary, metrics = pipeline_service.evaluate_live_student_risk(
        user_id,
        trigger_event="target_savings_updated"
    )
    return {
        "status": "success",
        "target_savings": req.target_savings,
        "daily_safe_to_spend": metrics["daily_safe_to_spend"],
        "spendable_variable_pool": metrics["spendable_variable_pool"],
        "updated_risk": summary,
        "dipping_into_savings": metrics["dipping_into_savings"]
    }


@app.put("/api/user/{user_id}/budget-baseline")
def update_student_budget_baseline(user_id: str, req: BudgetBaselineUpdateRequest):
    """
    Dedicated endpoint allowing students to update their baseline money parameters:
    total funds, fixed rent/mess, mess meal advance, academic fee, and target savings anytime.
    Recalibrates the Three-Bucket financial system and live Gradient Boosting ML risk warning.
    """
    profile = db.update_budget_baseline(
        user_id=user_id,
        monthly_allowance_fixed=req.monthly_allowance_fixed,
        monthly_rent_fixed=req.monthly_rent_fixed,
        mess_meal_fixed=req.mess_meal_fixed,
        academic_fee_fixed=req.academic_fee_fixed,
        target_savings=req.target_savings,
        savings_goal_fixed=req.savings_goal_fixed
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    summary, metrics = pipeline_service.evaluate_live_student_risk(
        user_id,
        trigger_event="budget_baseline_updated"
    )
    return {
        "status": "success",
        "profile": ProfileResponse(**profile),
        "daily_safe_to_spend": metrics["daily_safe_to_spend"],
        "spendable_variable_pool": metrics["spendable_variable_pool"],
        "updated_risk": summary
    }


@app.post("/api/auth/set-pin")
def set_app_pin(req: SetPinRequest):
    success = db.set_user_pin(req.user_id, req.pin)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to set App Lock PIN.")
    return {"status": "success", "message": "App Lock PIN updated successfully."}


@app.post("/api/auth/verify-pin")
def verify_app_pin(req: VerifyPinRequest):
    valid = db.verify_user_pin(req.user_id, req.pin)
    if not valid:
        raise HTTPException(status_code=401, detail="Incorrect 4-digit PIN.")
    return {"status": "success", "valid": True}


@app.post("/api/auth/forgot-password")
def forgot_password_reset(req: ForgotPasswordRequest):
    success = db.reset_user_password(req.email, req.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="No student account found with this email.")
    return {"status": "success", "message": "Password reset successfully. You can now log in."}


@app.delete("/api/user/{user_id}")
def delete_student_account(user_id: str):
    """Permanently deletes student account and all related records from database."""
    try:
        success = db.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Student account could not be found.")
        return {"status": "success", "message": "Account and all associated records permanently removed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {str(e)}")


@app.post("/api/user/delete")
def delete_student_account_post(payload: Dict[str, Any]):
    """Alternative POST endpoint for account deletion."""
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required.")
    try:
        success = db.delete_user(user_id)
        return {"status": "success", "message": "Account and all associated records permanently removed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {str(e)}")


# --- 3. PROFILE & ONBOARDING ENDPOINTS ---
@app.post("/api/onboarding", response_model=ProfileResponse)
def save_onboarding_profile(req: BaselineProfileRequest):
    try:
        profile_data = req.model_dump()
        saved = db.save_profile(req.user_id, profile_data)
        pipeline_service.evaluate_live_student_risk(req.user_id, trigger_event="onboarding_completed")
        return ProfileResponse(**saved)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {str(e)}")


@app.get("/api/profile/{user_id}", response_model=ProfileResponse)
def get_student_profile(user_id: str):
    profile = db.get_profile(user_id)
    if not profile and "@" in user_id:
        user = db.get_user_by_email(user_id)
        if user:
            profile = db.get_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    return ProfileResponse(**profile)


# --- 4. MULTI-SOURCE INCOMES & EXPENSES ENDPOINTS ---
@app.post("/api/incomes")
def add_monthly_income(req: IncomeCreateRequest):
    """Adds funds to the student's monthly wallet anytime from Family, Tuition, Freelance, etc."""
    try:
        new_inc = db.add_income(
            user_id=req.user_id,
            amount=req.amount,
            source=req.source,
            payment_method=req.payment_method,
            note=req.note,
            date=req.date
        )
        summary, metrics = pipeline_service.evaluate_live_student_risk(
            req.user_id,
            trigger_event=f"income_added_{req.source.lower()}"
        )
        return {
            "status": "success",
            "income": new_inc,
            "updated_risk": summary,
            "daily_safe_to_spend": metrics["daily_safe_to_spend"],
            "remaining_balance": metrics["remaining_balance"],
            "total_monthly_money": metrics["monthly_allowance"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add income: {str(e)}")


@app.get("/api/incomes/{user_id}", response_model=List[IncomeItem])
def list_incomes(
    user_id: str,
    month: Optional[str] = Query(None, description="YYYY-MM"),
    limit: int = Query(50, ge=1, le=200)
):
    incomes = db.get_incomes(user_id=user_id, month=month, limit=limit)
    return [IncomeItem(**i) for i in incomes]


@app.delete("/api/incomes/{income_id}")
def delete_income(income_id: str, user_id: str = Query(..., description="User ID owner")):
    success = db.delete_income(income_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Income entry not found or unauthorized.")

    summary, metrics = pipeline_service.evaluate_live_student_risk(
        user_id,
        trigger_event="income_deleted"
    )
    return {
        "status": "success",
        "message": "Income entry deleted",
        "updated_risk": summary,
        "daily_safe_to_spend": metrics["daily_safe_to_spend"],
        "remaining_balance": metrics["remaining_balance"]
    }


@app.post("/api/expenses")
def add_daily_expense(req: ExpenseCreateRequest):
    try:
        new_exp = db.add_expense(
            user_id=req.user_id,
            amount=req.amount,
            category=req.category,
            payment_method=req.payment_method,
            note=req.note,
            date=req.date
        )
        summary, metrics = pipeline_service.evaluate_live_student_risk(
            req.user_id,
            trigger_event=f"expense_added_{req.category.lower()}"
        )
        return {
            "status": "success",
            "expense": new_exp,
            "updated_risk": summary,
            "daily_safe_to_spend": metrics["daily_safe_to_spend"],
            "remaining_balance": metrics["remaining_balance"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add expense: {str(e)}")


@app.get("/api/expenses/{user_id}", response_model=List[ExpenseItem])
def list_expenses(
    user_id: str,
    month: Optional[str] = Query(None, description="YYYY-MM"),
    category: Optional[str] = Query(None, description="Food, Transport, Rent, etc."),
    limit: int = Query(50, ge=1, le=200)
):
    expenses = db.get_expenses(user_id=user_id, month=month, category=category, limit=limit)
    return [ExpenseItem(**e) for e in expenses]


@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: str, user_id: str = Query(..., description="User ID owner")):
    success = db.delete_expense(expense_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized.")

    summary, metrics = pipeline_service.evaluate_live_student_risk(
        user_id,
        trigger_event="expense_deleted"
    )
    return {
        "status": "success",
        "message": "Expense deleted successfully",
        "updated_risk": summary,
        "daily_safe_to_spend": metrics["daily_safe_to_spend"],
        "remaining_balance": metrics["remaining_balance"]
    }


# --- 5. CALENDAR & DYNAMIC LEDGER (1st to 28th/30th/31st) ---
@app.get("/api/ledger/{user_id}", response_model=CalendarLedgerResponse)
def get_monthly_calendar_ledger(
    user_id: str,
    month: Optional[str] = Query(None, description="YYYY-MM")
):
    """Returns daily net cashflow and chronological unified ledger for the active calendar cycle."""
    ledger = db.get_calendar_ledger(user_id, month)
    return CalendarLedgerResponse(**ledger)


# --- 6. DASHBOARD ENDPOINT ---
@app.get("/api/dashboard/{user_id}", response_model=DashboardResponse)
def get_user_dashboard(user_id: str):
    try:
        summary, metrics = pipeline_service.evaluate_live_student_risk(
            user_id,
            trigger_event="dashboard_view"
        )
        recent = db.get_expenses(user_id=user_id, limit=8)
        pro_info = db.check_pro_status(user_id)
        query_status = db.get_coach_query_status(user_id)
        active_goal = db.get_active_goal(user_id)
        streak_summary = db.get_streak_summary(user_id, check_in_today=True)
        streak = int(streak_summary.get("current_streak", 0))

        return DashboardResponse(
            user_id=user_id,
            month=metrics["month"],
            monthly_allowance=metrics["monthly_allowance"],
            total_income_added=metrics.get("total_income_added", 0.0),
            total_spent=metrics["total_spent"],
            remaining_balance=metrics["remaining_balance"],
            days_remaining=metrics["days_remaining"],
            daily_safe_to_spend=metrics["daily_safe_to_spend"],
            projected_month_end_savings=metrics["projected_month_end_savings"],
            burn_rate_status=metrics["burn_rate_status"],
            category_breakdown=metrics["category_breakdown"],
            daily_trend=metrics["daily_trend"],
            recent_expenses=[ExpenseItem(**e) for e in recent],
            current_risk=summary,
            is_pro=pro_info["is_pro"],
            pro_tier=pro_info["tier"],
            target_savings=metrics.get("target_savings", 0.0),
            fixed_obligations_spent=metrics.get("fixed_obligations_spent", 0.0),
            fixed_rent=metrics.get("fixed_rent", 0.0),
            mess_meal_fixed=metrics.get("mess_meal_fixed", 0.0),
            academic_fee_fixed=metrics.get("academic_fee_fixed", 0.0),
            enable_mess_meals=metrics.get("enable_mess_meals"),
            variable_spent=metrics.get("variable_spent", 0.0),
            spendable_variable_pool=metrics.get("spendable_variable_pool", 0.0),
            dipping_into_savings=metrics.get("dipping_into_savings", False),
            savings_warning_en=metrics.get("savings_warning_en"),
            savings_warning_bn=metrics.get("savings_warning_bn"),
            recalibration_note_en=metrics.get("recalibration_note_en"),
            recalibration_note_bn=metrics.get("recalibration_note_bn"),
            coach_queries_used=query_status["queries_used"],
            coach_queries_remaining=query_status["queries_remaining"],
            coach_daily_limit=query_status["daily_limit"],
            active_goal=active_goal,
            on_track_streak=streak,
            streak_summary=streak_summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {str(e)}")


# --- 7. FREEMIUM + PRO AI SUBSCRIPTION (Tk 50/Month) ---
@app.post("/api/subscription/submit-trx")
def submit_pro_subscription(req: SubscriptionTrxRequest):
    """Submits manual bKash/Nagad Transaction ID for Tk 50/Month Pro AI activation."""
    res = db.submit_subscription_payment(
        user_id=req.user_id,
        payment_method=req.payment_method,
        trx_id=req.trx_id,
        amount=req.amount
    )
    return res


@app.post("/api/subscription/demo-pro-toggle")
def toggle_demo_pro_tier(req: DemoProToggleRequest):
    """Instant 1-click Pro toggle for developer and evaluator testing."""
    db.toggle_demo_pro(req.user_id, req.get_is_enabled())
    pro_info = db.check_pro_status(req.user_id)
    return {
        "status": "success",
        "is_pro": pro_info["is_pro"],
        "tier": pro_info["tier"],
        "message": "Pro status updated successfully."
    }


@app.get("/api/subscription/status/{user_id}", response_model=SubscriptionStatusResponse)
def get_user_subscription_status(user_id: str):
    pro_info = db.check_pro_status(user_id)
    return SubscriptionStatusResponse(
        user_id=user_id,
        is_pro=pro_info["is_pro"],
        tier=pro_info["tier"],
        subscription_expiry=pro_info.get("expiry"),
        expiry=pro_info.get("expiry")
    )


# --- 8. TAKATRACK SMART COACH & PURCHASE SIMULATOR ---
@app.post("/api/ai-coach", response_model=AiCoachResponse)
def get_ai_coach_guidance(req: AiCoachRequest):
    """Generates bilingual guidance via TakaTrack Smart Coach."""
    try:
        pro_info = db.check_pro_status(req.user_id)
        is_pro = pro_info["is_pro"]

        _, metrics = pipeline_service.evaluate_live_student_risk(
            req.user_id,
            trigger_event="coach_consult"
        )
        query_status = db.get_coach_query_status(req.user_id)

        advice = get_daily_coaching(req.user_id, metrics, query_status)
        advice.is_pro = is_pro
        advice.requires_upgrade = not is_pro
        return advice
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart Coach error: {str(e)}")


@app.post("/api/coach/ask", response_model=AskCoachResponse)
def ask_smart_coach_question(req: AskCoachRequest):
    """Interactive TakaTrack Smart Coach Q&A with daily fair-use limit (10 queries/day)."""
    try:
        pro_info = db.check_pro_status(req.user_id)
        if not pro_info["is_pro"]:
            raise HTTPException(
                status_code=403,
                detail="TakaTrack Smart Coach Q&A is a Pro feature. Please upgrade for Tk 50/mo."
            )

        query_status = db.get_coach_query_status(req.user_id)
        if query_status["queries_remaining"] <= 0:
            raise HTTPException(
                status_code=429,
                detail="Daily Smart Coach query limit reached (10/10). Resets at midnight."
            )

        updated_status = db.use_coach_query(req.user_id)
        _, metrics = pipeline_service.evaluate_live_student_risk(
            req.user_id,
            trigger_event="coach_question_asked"
        )
        return ask_smart_coach(req.user_id, req.question, metrics, updated_status)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart Coach error: {str(e)}")


@app.post("/api/ai-coach/simulate", response_model=PurchaseSimulationResponse)
def simulate_purchase(req: PurchaseSimulationRequest):
    """'Ask AI Before I Buy': Evaluates purchase impact on risk & daily safe allowance before spending."""
    try:
        # Current metrics
        _, curr_metrics = pipeline_service.evaluate_live_student_risk(req.user_id)
        # Simulated metrics
        _, sim_metrics = pipeline_service.evaluate_live_student_risk(
            req.user_id,
            simulated_expense={"category": req.category, "amount": req.amount}
        )

        active_goal = db.get_active_goal(req.user_id)

        simulation = simulate_purchase_advice(
            current_metrics=curr_metrics,
            simulated_metrics=sim_metrics,
            item_title=req.item_title,
            amount=req.amount,
            category=req.category,
            goal_info=active_goal
        )
        return simulation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


# --- 8.5 SAVINGS GOALS (DREAM GOAL VAULT & TIMELINE) ---
@app.get("/api/goals/{user_id}", response_model=List[SavingsGoalModel])
def get_user_goals(user_id: str):
    """Fetches all savings goals for the user, with dynamically computed progress and timeline."""
    goals = db.get_user_goals(user_id)
    return [SavingsGoalModel(**g) for g in goals]


@app.post("/api/goals", response_model=SavingsGoalModel)
def create_goal(req: CreateGoalRequest):
    """Creates a new Dream Goal with monthly ring-fencing commitment."""
    try:
        goal = db.create_savings_goal(
            user_id=req.user_id,
            title=req.title,
            target_amount=req.target_amount,
            monthly_commitment=req.monthly_commitment,
            initial_saved=req.initial_saved,
            category=req.category,
            planning_mode=req.planning_mode,
            target_months=req.target_months or 6,
            target_date=req.target_date
        )
        pipeline_service.evaluate_live_student_risk(req.user_id, trigger_event="goal_created")
        return SavingsGoalModel(**goal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Create goal error: {str(e)}")


@app.put("/api/goals/{goal_id}/boost", response_model=SavingsGoalModel)
def boost_goal(goal_id: str, req: BoostGoalRequest):
    """Instant Boost: Deposits extra cash into Goal Vault anytime, accelerating completion date."""
    try:
        goal = db.boost_savings_goal(goal_id, req.user_id, req.amount)
        if not goal:
            raise HTTPException(status_code=404, detail="Savings goal not found")
        pipeline_service.evaluate_live_student_risk(req.user_id, trigger_event="goal_boosted")
        return SavingsGoalModel(**goal)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Boost goal error: {str(e)}")


@app.put("/api/goals/{goal_id}/toggle-pause", response_model=SavingsGoalModel)
def toggle_goal_pause(goal_id: str, req: ToggleGoalPauseRequest):
    """Toggles Pause/Skip for this month with empathetic dynamic timeline adjustment."""
    try:
        goal = db.toggle_goal_pause(goal_id, req.user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Savings goal not found")
        pipeline_service.evaluate_live_student_risk(req.user_id, trigger_event="goal_pause_toggled")
        return SavingsGoalModel(**goal)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Toggle pause error: {str(e)}")


@app.post("/api/goals/{goal_id}/sweep", response_model=SavingsGoalModel)
def sweep_leftover(goal_id: str, req: SweepLeftoverRequest):
    """1-Tap Month-End Sweep: Sweeps unspent variable pocket money into the active goal vault."""
    try:
        goal = db.sweep_leftover_to_goal(goal_id, req.user_id, req.amount)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal or user not found")
        pipeline_service.evaluate_live_student_risk(req.user_id, trigger_event="goal_swept")
        return SavingsGoalModel(**goal)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sweep leftover error: {str(e)}")


@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: str, user_id: str = Query(..., description="User ID owner")):
    """Permanently deletes a savings goal and recalibrates protected target savings & live risk."""
    try:
        success = db.delete_savings_goal(goal_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Savings goal not found or unauthorized.")
        summary, metrics = pipeline_service.evaluate_live_student_risk(
            user_id,
            trigger_event="goal_deleted"
        )
        return {
            "status": "success",
            "message": "Savings goal deleted successfully",
            "updated_risk": summary,
            "daily_safe_to_spend": metrics["daily_safe_to_spend"],
            "remaining_balance": metrics["remaining_balance"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete goal error: {str(e)}")


@app.get("/api/streak/leaderboard")
def get_streak_leaderboard_endpoint(user_id: Optional[str] = Query(None)):
    """Returns Top 10 Streak Leaderboard, requesting user's rank, active streak offers, and user's applications."""
    try:
        lb = db.get_streak_leaderboard(user_id=user_id, limit=10)
        offers = db.get_streak_offers(include_inactive=False)
        apps = db.get_user_offer_applications(user_id) if user_id else []
        return {**lb, "offers": offers, "applications": apps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leaderboard error: {str(e)}")


@app.post("/api/streak/{user_id}/apply-offer")
def apply_streak_offer_endpoint(user_id: str, offer_id: str = Query("offer_30d_smart_coach")):
    """Allows eligible users (e.g. 30+ continuous streak days) to apply for the Smart Coach Pro offer."""
    try:
        app_record = db.apply_for_streak_offer(user_id, offer_id)
        return {"status": "success", "application": app_record}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Offer application error: {str(e)}")


@app.get("/api/streak/{user_id}")
def get_user_streak(user_id: str):
    """Returns continuous streak, 7-day calendar status, 80% monthly target, and First-100 30-day challenge status."""
    try:
        summary = db.get_streak_summary(user_id, check_in_today=True)
        summary["on_track_streak"] = summary.get("current_streak", 0)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streak error: {str(e)}")


@app.post("/api/streak/{user_id}/checkin")
def checkin_user_streak(user_id: str):
    """Explicit daily check-in endpoint updating continuous streak and First-100 milestone."""
    try:
        summary = db.get_streak_summary(user_id, check_in_today=True)
        summary["on_track_streak"] = summary.get("current_streak", 0)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streak check-in error: {str(e)}")


# --- 8.6 CAMPUS PEER DEBT & LENDING (দেনা-পাওনা / ধারের খাতা) ---
@app.post("/api/debts", response_model=PeerDebtItem)
def create_peer_debt_endpoint(req: PeerDebtCreateRequest):
    """Logs money borrowed from or lent to friends (আমি পাবো / আমি দেবো)."""
    try:
        debt = db.add_peer_debt(
            user_id=req.user_id,
            debt_type=req.type,
            person_name=req.person_name,
            amount=req.amount,
            note=req.note,
            due_date=req.due_date
        )
        return PeerDebtItem(**debt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record debt: {str(e)}")


@app.get("/api/debts/{user_id}", response_model=PeerDebtSummaryResponse)
def get_peer_debts_endpoint(user_id: str, status: Optional[str] = Query("all")):
    """Returns all campus peer debts, total owed to me, total I owe, and net balance."""
    try:
        res = db.get_peer_debts(user_id, status=status or "all")
        return PeerDebtSummaryResponse(
            status="success",
            debts=[PeerDebtItem(**d) for d in res["debts"]],
            total_owed_to_me=res["total_owed_to_me"],
            total_i_owe=res["total_i_owe"],
            net_peer_balance=res["net_peer_balance"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch peer debts: {str(e)}")


@app.put("/api/debts/{debt_id}/settle")
def settle_peer_debt_endpoint(debt_id: str, user_id: str = Query(...)):
    """1-Tap Settle: Marks debt as repaid and automatically replenishes/updates student daily budget."""
    try:
        res = db.settle_peer_debt(debt_id, user_id, create_transaction=True)
        if not res:
            raise HTTPException(status_code=404, detail="Debt record not found")
        # Recalibrate live ML risk and daily safe limit
        summary, metrics = pipeline_service.evaluate_live_student_risk(
            user_id,
            trigger_event="peer_debt_settled"
        )
        return {
            "status": "success",
            "message": "Peer debt settled successfully",
            "daily_safe_to_spend": metrics["daily_safe_to_spend"],
            "remaining_balance": metrics["remaining_balance"],
            "updated_risk": summary
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to settle debt: {str(e)}")


@app.delete("/api/debts/{debt_id}")
def delete_peer_debt_endpoint(debt_id: str, user_id: str = Query(...)):
    """Deletes a peer debt entry."""
    success = db.delete_peer_debt(debt_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Debt record not found")
    return {"status": "success", "message": "Debt entry deleted"}


# --- 8.7 PERSONAL MESS MEAL & DEPOSIT ASSISTANT (আমার মেস মিল ও হিসাব) ---
@app.post("/api/mess/meal")
def log_mess_meal_endpoint(req: MessMealLogRequest):
    """1-Tap Daily Meal Logger: Records meals eaten (0, 0.5, 1.0, 1.5, 2.0)."""
    try:
        res = db.log_mess_meal(
            user_id=req.user_id,
            date=req.date,
            meal_count=req.meal_count,
            note=req.note
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log mess meal: {str(e)}")


@app.get("/api/mess/{user_id}", response_model=MessSummaryResponse)
def get_mess_summary_endpoint(user_id: str, month: Optional[str] = Query(None)):
    """Returns monthly meal consumption, estimated food cost, advance deposit balance, and refund surplus."""
    try:
        res = db.get_mess_summary(user_id, month=month)
        return MessSummaryResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get mess summary: {str(e)}")


@app.put("/api/mess/rate")
def update_mess_rate_endpoint(req: MessMealRateUpdateRequest):
    """Updates estimated meal rate (e.g. ৳50/meal) for live food cost calculation."""
    try:
        success = db.update_estimated_meal_rate(req.user_id, req.estimated_meal_rate)
        if not success:
            raise HTTPException(status_code=404, detail="Student profile not found")
        return {"status": "success", "estimated_meal_rate": req.estimated_meal_rate}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update meal rate: {str(e)}")


@app.put("/api/mess/total-meals", response_model=MessSummaryResponse)
def update_mess_total_meals_endpoint(req: MessTotalMealsUpdateRequest):
    """Directly sets or updates the month's Total Meals (e.g. when starting mid-month)."""
    try:
        summary = db.update_mess_total_meals(req.user_id, req.total_meals, month=req.month)
        return MessSummaryResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update total meals: {str(e)}")


@app.put("/api/mess/advance")
def update_mess_advance_endpoint(req: MessAdvanceUpdateRequest):
    """Updates monthly mess meal advance deposit paid."""
    try:
        success = db.update_mess_advance(req.user_id, req.meal_advance_paid)
        if not success:
            raise HTTPException(status_code=404, detail="Student profile not found")
        return {"status": "success", "meal_advance_paid": req.meal_advance_paid}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update mess advance: {str(e)}")


@app.put("/api/mess/toggle")
def toggle_mess_meal_endpoint(req: MessToggleRequest):
    """Toggles the mess meal system ON or OFF (e.g. for rented flat or mess/hostel)."""
    try:
        success = db.toggle_mess_meal_system(req.user_id, req.enable_mess_meals)
        summary, metrics = pipeline_service.evaluate_live_student_risk(req.user_id, trigger_event="mess_toggle")
        return {
            "status": "success",
            "enable_mess_meals": req.enable_mess_meals,
            "dashboard": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle mess meal system: {str(e)}")


# --- 9. MONTHLY ARCHIVES & STATEMENTS ---
@app.get("/api/report/monthly/{user_id}", response_model=MonthlyReportResponse)
def get_monthly_financial_report(user_id: str, month: Optional[str] = Query(None, description="Month in YYYY-MM format")):
    """
    Generates comprehensive student monthly financial statement.
    Calculates total funds, ring-fenced fixed obligations (rent, mess meals, tuition),
    protected target savings, variable category spend, full ledger, and ML risk evaluation.
    """
    try:
        report = db.generate_monthly_report(user_id, month)
        return MonthlyReportResponse(**report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate monthly statement: {str(e)}")


@app.get("/api/archives/{user_id}", response_model=List[MonthlyArchiveItem])
def get_user_monthly_archives(user_id: str):
    archives = db.get_monthly_archives(user_id)
    return [MonthlyArchiveItem(**a) for a in archives]


@app.post("/api/archives/run-month-end")
def run_month_end_archive(user_id: str, month: str = Query(..., description="YYYY-MM")):
    """Archives the completed calendar month and records historical totals."""
    summary, metrics = pipeline_service.evaluate_live_student_risk(user_id)
    archive_id = db.archive_month(
        user_id=user_id,
        month=month,
        total_income=metrics["monthly_allowance"],
        total_spent=metrics["total_spent"],
        ending_balance=metrics["remaining_balance"],
        final_risk_score=summary.risk_score_pct,
        summary_data=metrics
    )
    return {
        "status": "success",
        "archive_id": archive_id,
        "message": f"Month {month} archived successfully."
    }


# --- 10. RETRAINING CHECK-IN & EXPORT ---
@app.post("/api/month-end-checkin", response_model=MonthEndCheckinResponse)
def submit_month_end_checkin(req: MonthEndCheckinRequest):
    try:
        summary, metrics = pipeline_service.evaluate_live_student_risk(req.user_id)
        survey_row = dict(metrics.get("survey_row", {}))
        survey_row["Do you often run out of money before the end of the month?"] = "Yes" if req.actual_ran_out_of_money else "No"

        checkin_id = db.record_month_end_checkin(
            user_id=req.user_id,
            month=req.month,
            actual_ran_out_of_money=req.actual_ran_out_of_money,
            final_risk_score_predicted=summary.risk_score_pct,
            final_spent_total=metrics["total_spent"],
            feedback_notes=req.feedback_notes,
            survey_row=survey_row
        )

        all_checkins = db.get_all_checkins_for_retraining()
        return MonthEndCheckinResponse(
            status="success",
            checkin_id=checkin_id,
            message="Month-end check-in recorded successfully for model retraining.",
            total_retraining_records=len(all_checkins)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Check-in error: {str(e)}")


@app.get("/api/month-end-checkin/export")
def export_retraining_dataset(format: str = Query("json")):
    rows = db.get_all_checkins_for_retraining()
    if format == "csv":
        df = pd.DataFrame(rows)
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=retraining_dataset.csv"}
        )
    return {"total_records": len(rows), "records": rows}


# --- 11. BACKWARD COMPATIBILITY ENDPOINTS ---
@app.post("/predict-risk", response_model=RiskPredictionResponse)
def predict_financial_risk(student: StudentInput):
    try:
        risk_score_pct, tier, tier_bn, warning_en, warning_bn, composite, drivers = (
            pipeline_service.predict_risk(student)
        )

        advice = generate_gemini_advice(
            risk_score=risk_score_pct,
            tier=tier,
            drivers=drivers,
            student_data=student,
            composite=composite
        )

        prediction_id = str(uuid.uuid4())

        return RiskPredictionResponse(
            risk_score_pct=risk_score_pct,
            risk_tier=tier,
            risk_tier_bn=tier_bn,
            summary_warning_en=warning_en,
            summary_warning_bn=warning_bn,
            composite_scores=composite,
            top_drivers=drivers,
            advice=advice,
            prediction_id=prediction_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/api/app-feedback")
def submit_app_feedback_endpoint(req: Dict[str, Any]):
    user_id = str(req.get("user_id") or "").strip()
    message = str(req.get("message") or "").strip()
    if not user_id or not message:
        raise HTTPException(status_code=400, detail="user_id and message are required")
    category = str(req.get("category") or "General")
    rating = int(req.get("rating") or 5)
    entry = db.submit_app_feedback(user_id=user_id, category=category, rating=rating, message=message)
    return {"status": "success", "feedback": entry}


@app.get("/api/announcements")
def get_public_announcements():
    """Returns active admin announcements & active streak offers for the mobile app."""
    items = db.admin_get_announcements()
    active = [a for a in items if a.get("is_active", True)]
    active_offers = db.get_streak_offers(include_inactive=False)
    for o in active_offers:
        active.append({
            "id": f"offer_notice_{o.get('id')}",
            "title": o.get("title") or "Streak Offer",
            "message": o.get("description") or f"Reach {o.get('min_streak', 30)}-day streak for {o.get('reward_days', 30)} days Pro!",
            "is_active": True,
            "created_at": o.get("created_at") or "",
        })
    return {"status": "success", "announcements": active}


@app.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(feedback: FeedbackRequest):
    try:
        inputs_dict = feedback.student_inputs.model_dump() if feedback.student_inputs else None
        record_id = feedback_store.record_feedback(
            prediction_id=feedback.prediction_id,
            actual_ran_out_of_money=feedback.actual_ran_out_of_money,
            feedback_notes=feedback.feedback_notes,
            student_inputs=inputs_dict
        )
        total = feedback_store.get_count()
        return FeedbackResponse(
            status="success",
            message=f"Feedback recorded successfully (Record ID: {record_id})",
            total_feedback_records=total
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback recording error: {str(e)}")


_PRIVACY_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pockit — Privacy Policy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #0F172A; margin: 0; padding: 32px 16px; line-height: 1.65; }
    .card { max-width: 760px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); }
    h1 { margin-top: 0; font-size: 26px; color: #0F172A; }
    h2 { font-size: 17px; margin-top: 24px; color: #1E293B; }
    .badge { display: inline-block; background: #FFF7ED; color: #EA580C; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 999px; margin-bottom: 10px; }
    p, li { color: #334155; font-size: 14.5px; }
    .muted { color: #64748B; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Pockit — Student Financial Intelligence</span>
    <h1>Privacy Policy</h1>
    <p class="muted">Effective Date: November 26, 2026</p>
    <p>Pockit ("we", "our", or "the App") respects your privacy and is committed to protecting your personal and financial data. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.</p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li><strong>Account Information:</strong> Name, email address, and optional profile photo when you register with email/password or sign in with Google.</li>
      <li><strong>Financial &amp; Budget Inputs:</strong> Monthly allowance, fixed rent, mess meal advances, daily meal counts, expenses, incomes, savings goals, and financial habit survey responses that you enter.</li>
      <li><strong>App Usage &amp; Feedback:</strong> Daily streak check-ins, optional in-app feedback, bug reports, and month-end check-ins used to improve our financial risk forecasting model.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>To calculate your Safe Daily Spending Limit, Mess Meal Refund balance, Dream Goal progress, and financial risk score.</li>
      <li>To sync your data securely across devices and provide Smart Coach insights.</li>
      <li>We <strong>never sell</strong> your personal data or share it with third-party advertisers.</li>
    </ul>

    <h2>3. Data Storage &amp; Security</h2>
    <p>All data is transmitted over encrypted HTTPS/TLS connections and stored securely using Supabase Cloud authentication and PostgreSQL databases. Optional 4-digit PIN lock hashes are stored securely and never exposed in plain text.</p>

    <h2>4. Account &amp; Data Deletion</h2>
    <p>You can permanently delete your account and all associated financial records at any time directly inside the app via <strong>Profile &rarr; Delete Account Permanently</strong>. You may also request deletion by emailing <a href="mailto:miftahurr503@gmail.com">miftahurr503@gmail.com</a>.</p>

    <h2>5. Contact Us</h2>
    <p>If you have questions about this Privacy Policy, contact us at <a href="mailto:miftahurr503@gmail.com">miftahurr503@gmail.com</a>.</p>
  </div>
</body>
</html>"""


@app.get("/privacy", response_class=HTMLResponse)
def privacy_policy_page():
    return HTMLResponse(content=_PRIVACY_HTML)


@app.get("/delete-account", response_class=HTMLResponse)
def delete_account_info_page():
    return HTMLResponse(content=_PRIVACY_HTML)


_admin_dist = Path(__file__).resolve().parent.parent / "admin-panel" / "dist"
if _admin_dist.exists():
    app.mount("/admin", StaticFiles(directory=str(_admin_dist), html=True), name="admin-panel")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False)
