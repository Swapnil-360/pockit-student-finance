"""
Authenticated Admin Control Panel API Router for Pockit.
Provides:
- HMAC-SHA256 Admin Authentication
- Platform Overview Telemetry & KPIs
- Student Directory, Inspector & Direct Actions (Pro grant/revoke, PIN reset, streak adjustment, delete)
- Pro Subscription bKash/Nagad Payment Verification Queue
- Dynamic Streak-Based Offers & 30-Day Free Smart Coach Applications Queue
- Feedback & Month-End Retraining Triage + ML Model Metadata
- Streaming CSV & JSON Data Exports
- Global Campus Announcements
"""

import base64
import hashlib
import hmac
import io
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel

from config import MODEL_PATH, SUPABASE_SERVICE_ROLE_KEY
from database import db

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@pockit.app").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "pockit-admin-2026").strip()
ADMIN_SECRET = (os.getenv("ADMIN_SECRET", "") or SUPABASE_SERVICE_ROLE_KEY or "pockit-hmac-fallback-secret").encode("utf-8")
TOKEN_TTL_SECONDS = 86400  # 24 hours


def _sign_token(email: str) -> str:
    exp = int(time.time()) + TOKEN_TTL_SECONDS
    payload = base64.urlsafe_b64encode(json.dumps({"email": email, "exp": exp}).encode("utf-8")).decode("utf-8")
    sig = hmac.new(ADMIN_SECRET, payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def _verify_token(token: str) -> Dict[str, Any]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            raise ValueError("Invalid token format")
        payload_b64, sig = parts
        expected_sig = hmac.new(ADMIN_SECRET, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            raise ValueError("Invalid signature")
        data = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
        if int(data.get("exp", 0)) < int(time.time()):
            raise ValueError("Token expired")
        return data
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(e)}")


def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    return _verify_token(token)


# --- Request Schemas ---
class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminProActionRequest(BaseModel):
    is_pro: bool
    days: int = 30


class AdminStreakAdjustRequest(BaseModel):
    current_streak: int
    longest_streak: Optional[int] = None


class AdminPaymentActionRequest(BaseModel):
    status: str  # 'approved' | 'rejected' | 'pending'


class AdminFeedbackStatusRequest(BaseModel):
    status: str  # 'new' | 'reviewed' | 'resolved'
    admin_note: str = ""


class AdminOfferUpsertRequest(BaseModel):
    id: Optional[str] = None
    title: str
    title_bn: Optional[str] = None
    description: str = ""
    description_bn: Optional[str] = None
    min_streak: int = 30
    reward_days: int = 30
    max_claims: int = 100
    is_active: bool = True


class AdminOfferApplicationReviewRequest(BaseModel):
    action: str  # 'approve' | 'reject'
    admin_note: str = ""


class AdminAnnouncementRequest(BaseModel):
    title: str
    message: str
    is_active: bool = True


# --- Auth ---
@router.post("/login")
def admin_login(req: AdminLoginRequest):
    if req.email.strip().lower() != ADMIN_EMAIL or not hmac.compare_digest(req.password.strip(), ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Invalid admin email or password")
    token = _sign_token(ADMIN_EMAIL)
    return {
        "status": "success",
        "token": token,
        "admin": {"email": ADMIN_EMAIL, "role": "superadmin"},
        "expires_in": TOKEN_TTL_SECONDS,
    }


@router.get("/me")
def admin_me(admin=Depends(require_admin)):
    return {"email": admin.get("email"), "role": "superadmin"}


# --- Overview & Analytics ---
@router.get("/overview")
def admin_overview(admin=Depends(require_admin)):
    return db.admin_get_overview()


# --- Users Management & Actions ---
@router.get("/users")
def admin_list_users(
    search: str = Query(""),
    filter_tier: str = Query("all"),
    admin=Depends(require_admin),
):
    users = db.admin_list_all_users(search=search, filter_tier=filter_tier)
    return {"total": len(users), "users": users}


@router.get("/users/{user_id}")
def admin_user_detail(user_id: str, admin=Depends(require_admin)):
    detail = db.admin_get_user_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="User not found")
    return detail


@router.post("/users/{user_id}/pro")
def admin_set_user_pro(user_id: str, req: AdminProActionRequest, admin=Depends(require_admin)):
    return db.admin_set_pro_status(user_id, req.is_pro, req.days)


@router.post("/users/{user_id}/reset-pin")
def admin_reset_pin(user_id: str, admin=Depends(require_admin)):
    db.admin_reset_user_pin(user_id)
    return {"status": "success", "message": "User PIN reset"}


@router.post("/users/{user_id}/streak")
def admin_adjust_streak(user_id: str, req: AdminStreakAdjustRequest, admin=Depends(require_admin)):
    return db.admin_adjust_user_streak(user_id, req.current_streak, req.longest_streak)


@router.delete("/users/{user_id}")
def admin_delete_user(user_id: str, admin=Depends(require_admin)):
    db.delete_user(user_id)
    return {"status": "success", "message": "User permanently deleted"}


# --- Subscriptions & TrxID Queue ---
@router.get("/subscriptions")
def admin_list_subscriptions(admin=Depends(require_admin)):
    rows = db.admin_list_payments()
    return {"total": len(rows), "payments": rows}


@router.put("/subscriptions/{payment_id}")
def admin_update_subscription(payment_id: str, req: AdminPaymentActionRequest, admin=Depends(require_admin)):
    if req.status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid payment status")
    res = db.admin_update_payment_status(payment_id, req.status)
    if not res:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"status": "success", "payment": res}


# --- Streak Leaderboard, Dynamic Offers & 30-Day Applications ---
@router.get("/streak-leaderboard")
def admin_streak_leaderboard(admin=Depends(require_admin)):
    lb = db.get_streak_leaderboard(limit=50)
    winners = db._get_global_30_winners()
    return {**lb, "first_100_winners": winners, "first_100_remaining": max(0, 100 - len(winners))}


@router.get("/offers")
def admin_list_offers(admin=Depends(require_admin)):
    return {"offers": db.get_streak_offers(include_inactive=True)}


@router.post("/offers")
def admin_upsert_offer(req: AdminOfferUpsertRequest, admin=Depends(require_admin)):
    offers = db.upsert_streak_offer(req.model_dump())
    return {"status": "success", "offers": offers}


@router.delete("/offers/{offer_id}")
def admin_delete_offer(offer_id: str, admin=Depends(require_admin)):
    ok = db.delete_streak_offer(offer_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"status": "success"}


@router.get("/offer-applications")
def admin_list_offer_apps(admin=Depends(require_admin)):
    apps = db.admin_list_offer_applications()
    return {"total": len(apps), "applications": apps}


@router.put("/offer-applications/{app_id}")
def admin_review_offer_app(app_id: str, req: AdminOfferApplicationReviewRequest, admin=Depends(require_admin)):
    if req.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    updated = db.admin_review_offer_application(app_id, req.action, req.admin_note)
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"status": "success", "application": updated}


# --- Feedback & ML Model Info ---
@router.get("/feedback")
def admin_list_feedback(admin=Depends(require_admin)):
    items = db.admin_list_feedback()
    return {"total": len(items), "items": items}


@router.put("/feedback/{item_id}/status")
def admin_triage_feedback(item_id: str, req: AdminFeedbackStatusRequest, admin=Depends(require_admin)):
    if req.status not in ("new", "reviewed", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid feedback status")
    return db.admin_update_feedback_status(item_id, req.status, req.admin_note)


@router.get("/model-info")
def admin_model_info(admin=Depends(require_admin)):
    p = Path(MODEL_PATH)
    checkins = db.get_all_checkins_for_retraining()
    info = {
        "model_exists": p.exists(),
        "model_path": p.name,
        "model_size_kb": round(p.stat().st_size / 1024, 1) if p.exists() else 0,
        "last_modified": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(p.stat().st_mtime)) if p.exists() else None,
        "retraining_records_count": len(checkins),
    }
    return info


# --- Announcements ---
@router.get("/announcements")
def admin_get_announcements(admin=Depends(require_admin)):
    return {"announcements": db.admin_get_announcements()}


@router.post("/announcements")
def admin_create_announcement(req: AdminAnnouncementRequest, admin=Depends(require_admin)):
    items = db.admin_save_announcement(req.title, req.message, req.is_active)
    return {"status": "success", "announcements": items}


# --- Streaming CSV / JSON Exports ---
def _export_response(rows: List[Dict[str, Any]], filename_base: str, fmt: str):
    if fmt.lower() == "csv":
        df = pd.DataFrame(rows) if rows else pd.DataFrame([{"empty": "no_records"}])
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            content=stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.csv"},
        )
    return {"total_records": len(rows), "records": rows}


@router.get("/export/users")
def admin_export_users(format: str = Query("csv"), admin=Depends(require_admin)):
    users = db.admin_build_research_dataset()
    return _export_response(users, "pockit_users", format)


@router.get("/export/research-dataset")
def admin_export_research_dataset(format: str = Query("csv"), admin=Depends(require_admin)):
    rows = db.admin_build_research_dataset()
    return _export_response(rows, "pockit_student_research_dataset", format)


@router.get("/export/transactions")
def admin_export_transactions(format: str = Query("csv"), admin=Depends(require_admin)):
    rows: List[Dict[str, Any]] = []
    if db.supabase:
        try:
            res = db.supabase.table("expenses").select("*").order("date", desc=True).limit(2000).execute()
            rows = res.data or []
        except Exception:
            pass
    if not rows:
        with db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM expenses ORDER BY date DESC LIMIT 2000")
            rows = [dict(r) for r in cursor.fetchall()]
    for r in rows:
        ts_raw = str(r.get("created_at") or r.get("date") or "")
        hr = None
        if len(ts_raw) >= 13 and ":" in ts_raw[10:16]:
            try:
                hr = int(ts_raw[11:13])
            except Exception:
                hr = None
        r["hour_of_day"] = hr
        r["time_bucket"] = (
            "morning" if hr is not None and 6 <= hr < 12 else
            "afternoon" if hr is not None and 12 <= hr < 18 else
            "evening" if hr is not None and 18 <= hr <= 23 else
            "late_night" if hr is not None else "unknown"
        )
    return _export_response(rows, "pockit_transactions", format)


@router.get("/export/retraining")
def admin_export_retraining(format: str = Query("csv"), admin=Depends(require_admin)):
    rows = db.get_all_checkins_for_retraining()
    return _export_response(rows, "pockit_retraining_dataset", format)


@router.get("/export/feedback")
def admin_export_feedback(format: str = Query("csv"), admin=Depends(require_admin)):
    rows = db.admin_list_feedback()
    return _export_response(rows, "pockit_feedback_dataset", format)


@router.get("/export/streak-winners")
def admin_export_streak_winners(format: str = Query("csv"), admin=Depends(require_admin)):
    winners = db._get_global_30_winners()
    return _export_response(winners, "pockit_streak_winners", format)

