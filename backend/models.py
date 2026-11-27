"""
Pydantic Schemas for Student Financial Management & Risk Warning System.
Defines contracts for Authentication, Baseline Profiles, Daily Expenses,
Dashboard Metrics, TakaTrack Smart Coach, Purchase Simulation, and Retraining Check-Ins.
"""

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator


def normalize_dashes_str(v: str) -> str:
    if isinstance(v, str):
        return v.replace('-', '–').replace('—', '–').strip()
    return v


# --- 1. AUTHENTICATION SCHEMAS ---
class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="Student email address")
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    full_name: str = Field(..., min_length=2, description="Student full name")


class UserLoginRequest(BaseModel):
    email: str
    password: str


class UserData(BaseModel):
    id: str
    email: str
    full_name: str
    calling_name: Optional[str] = None
    is_demo: bool = False
    is_pro: bool = False
    has_pin: bool = False
    avatar_url: Optional[str] = None
    subscription_expiry: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    calling_name: Optional[str] = None
    avatar_url: Optional[str] = None
    university_type: Optional[str] = None
    year_of_study: Optional[str] = None
    where_you_live: Optional[str] = None
    enable_mess_meals: Optional[bool] = None
    monthly_allowance_fixed: Optional[float] = None
    monthly_rent_fixed: Optional[float] = None
    mess_meal_fixed: Optional[float] = None
    academic_fee_fixed: Optional[float] = None
    target_savings: Optional[float] = None
    savings_goal_fixed: Optional[float] = None


class BudgetBaselineUpdateRequest(BaseModel):
    monthly_allowance_fixed: Optional[float] = Field(None, ge=0, description="Total Monthly Funds Available in Tk")
    monthly_rent_fixed: Optional[float] = Field(None, ge=0, description="Fixed Mess/Room Rent in Tk")
    mess_meal_fixed: Optional[float] = Field(None, ge=0, description="Fixed Mess Meal Advance / Cooking Pool in Tk")
    academic_fee_fixed: Optional[float] = Field(None, ge=0, description="Monthly Academic / Semester Fee Reserve in Tk")
    target_savings: Optional[float] = Field(None, ge=0, description="Protected Monthly Target Savings in Tk")
    savings_goal_fixed: Optional[float] = Field(None, ge=0, description="Long-term dream goal target in Tk")
    enable_mess_meals: Optional[bool] = Field(None, description="Toggle whether mess meal tracking is enabled")


class AvatarUploadRequest(BaseModel):
    image_data: str # Can be base64 data URI, raw base64, or remote image URL


class AvatarUploadResponse(BaseModel):
    avatar_url: str
    status: str = "success"


class UpdateTargetSavingsRequest(BaseModel):
    target_savings: float = Field(..., ge=0, description="Monthly target savings in Tk")


class AuthResponse(BaseModel):
    status: str
    user: UserData
    has_profile: bool
    token: str


# --- 2. BASELINE PROFILE SCHEMAS ---
class BaselineProfileRequest(BaseModel):
    user_id: str
    gender: Literal['Female', 'Male'] = 'Male'
    age: int = Field(21, ge=16, le=40)
    year_of_study: Literal['1st year', '2nd year', '3rd year', '4th year', 'Masters'] = '2nd year'
    university_type: Literal['National University college', 'Private', 'Public'] = 'Public'
    where_you_live: Literal['Hall', 'Mess-hostel', 'Rented flat', 'With family'] = 'With family'
    total_monthly_money: str = Field(
        '5–10k', description="'<5k', '5–10k', '10–15k', '15–20k', '>20k'"
    )
    main_source_of_money: Literal['Family', 'Loan', 'Mixed', 'Tuition-job'] = 'Family'
    do_you_earn_income: Literal['No', 'Yes'] = 'No'

    monthly_rent_fixed: float = Field(0.0, ge=0)
    mess_meal_fixed: float = Field(0.0, ge=0)
    academic_fee_fixed: float = Field(0.0, ge=0)
    transport_fixed: float = Field(0.0, ge=0)
    monthly_allowance_fixed: float = Field(10000.0, ge=0)
    savings_goal_fixed: float = Field(1000.0, ge=0)
    target_savings: float = Field(0.0, ge=0)
    enable_mess_meals: Optional[bool] = None
    is_skipped: Optional[bool] = False

    track_spending: int = Field(3, ge=1, le=5)
    mobile_banking_use: Literal['Rarely', 'Weekly', 'Daily'] = 'Weekly'
    borrowed_from_friends_baseline: Literal['Never', '1–2', '3+'] = 'Never'

    aware_balance: int = Field(3, ge=1, le=5)
    aware_weekly_track: int = Field(3, ge=1, le=5)
    aware_check_before_buy: int = Field(3, ge=1, le=5)
    impulse_spontaneous: int = Field(3, ge=1, le=5)
    impulse_discounts: int = Field(3, ge=1, le=5)
    impulse_regret: int = Field(3, ge=1, le=5)

    @field_validator('total_monthly_money', mode='before')
    @classmethod
    def clean_dashes(cls, v):
        return normalize_dashes_str(v)


class ProfileResponse(BaseModel):
    user_id: str
    gender: str
    age: int
    year_of_study: str
    university_type: str
    where_you_live: str
    total_monthly_money: str
    main_source_of_money: str
    do_you_earn_income: str
    monthly_rent_fixed: float = 0.0
    mess_meal_fixed: float = 0.0
    academic_fee_fixed: float = 0.0
    transport_fixed: float = 0.0
    monthly_allowance_fixed: float = 0.0
    savings_goal_fixed: float = 0.0
    target_savings: float = 0.0
    track_spending: int = 3
    mobile_banking_use: str = 'Weekly'
    borrowed_from_friends_baseline: str = 'Never'
    awareness_score: float = 3.0
    impulse_score: float = 3.0
    enable_mess_meals: Optional[bool] = None


# --- 3. EXPENSE SCHEMAS ---
# Comprehensive student expense categories
ExpenseCategoryLiteral = Literal[
    'Food',
    'Transport',
    'Rent',
    'Mess Meal Advance',
    'Entertainment',
    'Academic',
    'Bills',
    'Borrowing',
    'Personal Care',
    'Health',
    'Snacks',
    'Other'
]


class ExpenseCreateRequest(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0, description="Expense amount in Bangladeshi Taka (Tk)")
    category: ExpenseCategoryLiteral
    payment_method: Literal['Cash', 'bKash', 'Nagad', 'Rocket'] = 'Cash'
    note: Optional[str] = None
    date: Optional[str] = None  # YYYY-MM-DD


class ExpenseItem(BaseModel):
    id: str
    user_id: str
    amount: float
    category: str
    payment_method: str
    note: Optional[str]
    date: str


# --- 3B. MULTI-SOURCE INCOMES SCHEMAS ---
class IncomeCreateRequest(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0, description="Income amount in Tk")
    source: Literal['Family', 'Tuition-job', 'Freelancing', 'Scholarship', 'Gift/Other']
    payment_method: Literal['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank'] = 'Cash'
    note: Optional[str] = None
    date: Optional[str] = None  # YYYY-MM-DD


class IncomeItem(BaseModel):
    id: str
    user_id: str
    amount: float
    source: str
    payment_method: str
    note: Optional[str]
    date: str


# --- 4. RISK & DASHBOARD SCHEMAS ---
class RiskDriver(BaseModel):
    feature: str
    feature_bn: str
    severity: Literal['critical', 'warning', 'positive']
    description_en: str
    description_bn: str


class RiskScoreSummary(BaseModel):
    risk_score_pct: float
    risk_tier: Literal['LOW RISK', 'MODERATE RISK', 'HIGH RISK']
    risk_tier_bn: Literal['কম ঝুঁকি', 'মাঝারি ঝুঁকি', 'উচ্চ ঝুঁকি']
    summary_warning_en: str
    summary_warning_bn: str
    top_drivers: List[RiskDriver]


class StreakDayItem(BaseModel):
    day_label: str
    date: str
    status: Literal['completed', 'missed', 'today', 'upcoming']


class StreakSummary(BaseModel):
    user_id: str
    current_streak: int = 0
    longest_streak: int = 0
    last_streak_date: Optional[str] = None
    checked_in_today: bool = False
    week_days: List[StreakDayItem] = []
    monthly_completed_days: int = 0
    monthly_total_days: int = 30
    monthly_target_days: int = 24
    monthly_pct: float = 0.0
    monthly_80_unlocked: bool = False
    reward_spots_total: int = 100
    reward_spots_claimed: int = 0
    reward_spots_remaining: int = 100
    user_30_day_rank: Optional[int] = None
    reward_unlocked: bool = False


class DashboardResponse(BaseModel):
    user_id: str
    month: str
    monthly_allowance: float
    total_income_added: float = 0.0
    total_spent: float
    remaining_balance: float
    days_remaining: int
    daily_safe_to_spend: float
    projected_month_end_savings: float
    burn_rate_status: Literal['healthy', 'caution', 'critical']
    category_breakdown: Dict[str, float]
    daily_trend: List[Dict[str, Any]]
    recent_expenses: List[ExpenseItem]
    current_risk: RiskScoreSummary
    is_pro: bool = False
    pro_tier: str = 'free'

    # Three-Bucket Financial Architecture fields
    target_savings: float = 0.0
    fixed_obligations_spent: float = 0.0
    fixed_rent: float = 0.0
    mess_meal_fixed: float = 0.0
    academic_fee_fixed: float = 0.0
    variable_spent: float = 0.0
    spendable_variable_pool: float = 0.0
    dipping_into_savings: bool = False
    savings_warning_en: Optional[str] = None
    savings_warning_bn: Optional[str] = None
    recalibration_note_en: Optional[str] = None
    recalibration_note_bn: Optional[str] = None
    coach_queries_used: int = 0
    coach_queries_remaining: int = 10
    coach_daily_limit: int = 10
    active_goal: Optional[Dict[str, Any]] = None
    on_track_streak: int = 0
    streak_summary: Optional[StreakSummary] = None
    enable_mess_meals: Optional[bool] = None


# --- 5. TAKATRACK SMART COACH SCHEMAS ---
class AiCoachRequest(BaseModel):
    user_id: str


class AiCoachResponse(BaseModel):
    daily_budget_advice_en: str
    daily_budget_advice_bn: str
    category_cut_advice_en: str
    category_cut_advice_bn: str
    campus_tips_en: List[str]
    campus_tips_bn: List[str]
    urgency_level: Literal['normal', 'caution', 'alert']
    is_pro: bool = True
    requires_upgrade: bool = False
    queries_used: int = 0
    queries_remaining: int = 10
    daily_limit: int = 10
    target_savings: float = 0.0
    fixed_obligations: float = 0.0
    spendable_variable_pool: float = 0.0
    savings_intact: bool = True


class AskCoachRequest(BaseModel):
    user_id: str
    question: str = Field(..., min_length=2, description="Student budget/spending question")


class AskCoachResponse(BaseModel):
    answer_en: str
    answer_bn: str
    queries_used: int
    queries_remaining: int
    daily_limit: int = 10
    is_pro: bool = True


# --- 6. "SHOULD I BUY THIS?" SIMULATION SCHEMAS ---
class PurchaseSimulationRequest(BaseModel):
    user_id: str
    item_title: str = Field(..., min_length=2, description="What are you planning to buy?")
    amount: float = Field(..., gt=0, description="Cost in Tk")
    category: ExpenseCategoryLiteral = 'Other'


class PurchaseSimulationResponse(BaseModel):
    item_title: str
    amount: float
    category: str
    current_risk_pct: float
    simulated_risk_pct: float
    risk_pct_change: float
    current_daily_safe: float
    simulated_daily_safe: float
    daily_safe_change: float
    current_tier: str
    simulated_tier: str
    verdict: Literal['PROCEED', 'WARN', 'AVOID']
    verdict_bn: str
    ai_reasoning_en: str
    ai_reasoning_bn: str
    alternative_suggestion_en: str
    alternative_suggestion_bn: str
    savings_goal_impact: str = ""
    savings_goal_impact_bn: str = ""
    new_spendable_pool: float = 0.0
    goal_delay_en: Optional[str] = None
    goal_delay_bn: Optional[str] = None


# --- 8. GOAL-BASED SAVINGS VAULT (DREAM GOAL TRACKER) ---
class SavingsGoalModel(BaseModel):
    id: str
    user_id: str
    title: str
    target_amount: float
    current_saved: float = 0.0
    monthly_commitment: float = 500.0
    is_paused: bool = False
    missed_months: int = 0
    category: str = 'Gadget'
    start_date: str
    is_active: bool = True
    progress_pct: float = 0.0
    remaining_amount: float = 0.0
    estimated_months_left: int = 0
    target_completion_date: str = ""
    target_completion_date_bn: str = ""
    timeline_shift_note_en: Optional[str] = None
    timeline_shift_note_bn: Optional[str] = None
    planning_mode: str = 'monthly_amount'  # 'monthly_amount' | 'target_timeline'
    target_months: int = 0
    target_date: Optional[str] = None
    required_monthly_savings: float = 0.0


class CreateGoalRequest(BaseModel):
    user_id: str
    title: str = Field(..., min_length=2, description="Goal name & model")
    target_amount: float = Field(..., gt=0, description="Target price in Tk")
    monthly_commitment: float = Field(500.0, gt=0, description="Monthly commitment in Tk")
    initial_saved: float = Field(0.0, ge=0, description="Initial saved amount in Tk")
    category: str = 'Gadget'
    planning_mode: Literal['monthly_amount', 'target_timeline'] = 'monthly_amount'
    target_months: Optional[int] = Field(6, ge=1, le=60, description="Target duration in months for Mode B")
    target_date: Optional[str] = None


class BoostGoalRequest(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0, description="Extra boost amount in Tk")


class SweepLeftoverRequest(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0, description="Leftover variable funds to sweep into goal")


class ToggleGoalPauseRequest(BaseModel):
    user_id: str


# --- 7. MONTH-END RETRAINING CHECK-IN SCHEMAS ---
class MonthEndCheckinRequest(BaseModel):
    user_id: str
    month: str  # YYYY-MM
    actual_ran_out_of_money: bool
    feedback_notes: Optional[str] = None


class MonthEndCheckinResponse(BaseModel):
    status: str
    checkin_id: str
    message: str
    total_retraining_records: int


# --- 7B. CALENDAR & DYNAMIC LEDGER SCHEMAS ---
class CalendarLedgerDay(BaseModel):
    date: str
    income: float
    expense: float
    net: float
    tx_count: int


class LedgerTransactionItem(BaseModel):
    id: str
    user_id: str
    amount: float
    category_or_source: str
    payment_method: str
    note: Optional[str] = None
    date: str
    type: Literal['income', 'expense']


class CalendarLedgerResponse(BaseModel):
    month: str
    total_income: float
    total_expense: float
    net_balance: float
    calendar_days: List[CalendarLedgerDay]
    transactions: List[LedgerTransactionItem]


# --- 7C. FREEMIUM + PRO AI SUBSCRIPTION (Tk 50/Month) ---
class SubscriptionTrxRequest(BaseModel):
    user_id: str
    payment_method: Literal['bKash', 'Nagad', 'Rocket']
    trx_id: str = Field(..., min_length=4, description="bKash/Nagad Transaction ID")
    amount: float = Field(50.0, description="Subscription amount in Tk")


class DemoProToggleRequest(BaseModel):
    user_id: str
    enable: bool = True
    enable_pro: Optional[bool] = None

    def get_is_enabled(self) -> bool:
        if self.enable_pro is not None:
            return self.enable_pro
        return self.enable


class SubscriptionStatusResponse(BaseModel):
    user_id: str
    is_pro: bool
    tier: str
    subscription_expiry: Optional[str] = None
    expiry: Optional[str] = None
    price_bdt: int = 50


# --- 7D. PIN & FORGOT PASSWORD SCHEMAS ---
class SetPinRequest(BaseModel):
    user_id: str
    pin: str = Field(..., min_length=4, max_length=4, description="4-digit PIN")


class VerifyPinRequest(BaseModel):
    user_id: str
    pin: str = Field(..., min_length=4, max_length=4, description="4-digit PIN")


class ForgotPasswordRequest(BaseModel):
    email: str
    new_password: str = Field(..., min_length=6)


class MonthlyArchiveItem(BaseModel):
    id: str
    user_id: str
    month: str
    total_income: float
    total_spent: float
    ending_balance: float
    final_risk_score: float
    summary: Dict[str, Any]
    created_at: str


# --- 8. LEGACY COMPATIBILITY SCHEMAS ---
class StudentInput(BaseModel):
    gender: Literal['Female', 'Male']
    age: int = Field(..., ge=16, le=40)
    year_of_study: Literal['1st year', '2nd year', '3rd year', '4th year', 'Masters']
    university_type: Literal['National University college', 'Private', 'Public']
    where_you_live: Literal['Hall', 'Mess-hostel', 'Rented flat', 'With family']
    total_monthly_money: str
    main_source_of_money: Literal['Family', 'Loan', 'Mixed', 'Tuition-job']
    do_you_earn_income: Literal['No', 'Yes']
    monthly_rent: Literal['0', '<3k', '3–6k', '6–9k', '>9k']
    monthly_food: Literal['<3k', '3–5k', '5–7k', '>7k']
    monthly_transport: Literal['<1k', '1–2k', '2–3k', '>3k']
    monthly_entertainment: Literal['<1k', '1–2k', '>2k']
    track_spending: int = Field(..., ge=1, le=5)
    money_saved_per_month: Literal['0', '<500', '500–1k', '>1k']
    mobile_banking_use: Literal['Rarely', 'Weekly', 'Daily']
    borrowed_from_friends: Literal['Never', '1–2', '3+']
    aware_balance: int = Field(..., ge=1, le=5)
    aware_weekly_track: int = Field(..., ge=1, le=5)
    aware_check_before_buy: int = Field(..., ge=1, le=5)
    impulse_spontaneous: int = Field(..., ge=1, le=5)
    impulse_discounts: int = Field(..., ge=1, le=5)
    impulse_regret: int = Field(..., ge=1, le=5)

    @field_validator(
        'total_monthly_money',
        'monthly_rent',
        'monthly_food',
        'monthly_transport',
        'monthly_entertainment',
        'money_saved_per_month',
        'borrowed_from_friends',
        mode='before'
    )
    @classmethod
    def clean_dashes(cls, v):
        return normalize_dashes_str(v)


class CompositeScores(BaseModel):
    awareness_score: float
    impulse_score: float


class AdviceBlock(BaseModel):
    english: List[str]
    bengali: List[str]


class RiskPredictionResponse(BaseModel):
    financial_risk_score_pct: float
    risk_tier: Literal['LOW RISK', 'MODERATE RISK', 'HIGH RISK']
    risk_tier_bn: Literal['কম ঝুঁকি', 'মাঝারি ঝুঁকি', 'উচ্চ ঝুঁকি']
    summary_warning_en: str
    summary_warning_bn: str
    composite_scores: CompositeScores
    top_risk_drivers: List[RiskDriver]
    actionable_advice: AdviceBlock


class FeedbackRequest(BaseModel):
    session_id: Optional[str] = None
    student_data: StudentInput
    predicted_risk_score: float
    predicted_risk_tier: str
    actual_ran_out_of_money: bool
    notes: Optional[str] = None


class FeedbackResponse(BaseModel):
    status: str
    feedback_id: str
    message: str
    total_feedback_count: int


# --- 9. MONTHLY FINANCIAL STATEMENT / REPORT SCHEMAS ---
class MonthlyReportCategoryItem(BaseModel):
    category: str
    amount: float
    percentage: float
    count: int


class MonthlyReportPaymentItem(BaseModel):
    payment_method: str
    amount: float
    percentage: float
    count: int


class MonthlyReportTransactionItem(BaseModel):
    id: str
    type: str  # 'income' | 'expense'
    category: str
    amount: float
    date: str
    payment_method: str
    note: Optional[str] = None


class MonthlyReportResponse(BaseModel):
    status: str = "success"
    statement_id: str
    month: str  # '2026-11'
    month_label: str  # 'November 2026'
    period_start: str
    period_end: str
    is_month_end_eligible: bool
    generated_at: str
    student_name: str
    university_type: Optional[str] = None
    year_of_study: Optional[str] = None
    living_arrangement: Optional[str] = None
    total_funds_available: float
    total_inflows_logged: float
    rent_mess_fixed: float
    mess_meal_fixed: float
    academic_fee_fixed: float
    total_fixed_obligations: float
    variable_expenses_total: float
    total_outflow: float
    protected_savings_target: float
    net_savings_surplus: float
    savings_rate_pct: float
    spending_discipline_score: float
    risk_tier: str
    streak_days: int
    executive_summary_en: str
    executive_summary_bn: str
    categories_breakdown: List[MonthlyReportCategoryItem]
    payment_methods_breakdown: List[MonthlyReportPaymentItem]
    transactions: List[MonthlyReportTransactionItem]


# --- 10. CAMPUS PEER DEBT & LENDING SCHEMAS (দেনা-পাওনা) ---
class PeerDebtCreateRequest(BaseModel):
    user_id: str
    type: Literal['owed_to_me', 'i_owe']  # 'owed_to_me' (আমি পাবো) | 'i_owe' (আমি দেবো)
    person_name: str
    amount: float = Field(..., gt=0)
    note: Optional[str] = None
    due_date: Optional[str] = None  # YYYY-MM-DD


class PeerDebtItem(BaseModel):
    id: str
    user_id: str
    type: str  # 'owed_to_me' | 'i_owe'
    person_name: str
    amount: float
    note: Optional[str] = None
    due_date: Optional[str] = None
    is_settled: bool = False
    settled_at: Optional[str] = None
    created_at: str


class PeerDebtSummaryResponse(BaseModel):
    status: str = "success"
    debts: List[PeerDebtItem]
    total_owed_to_me: float
    total_i_owe: float
    net_peer_balance: float


# --- 11. PERSONAL MESS MEAL & DEPOSIT SCHEMAS (আমার মেস মিল ও হিসাব) ---
class MessMealLogRequest(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD
    meal_count: float = Field(..., ge=0, le=5.0)  # 0, 0.5, 1.0, 1.5, 2.0, etc.
    note: Optional[str] = None


class MessMealRateUpdateRequest(BaseModel):
    user_id: str
    estimated_meal_rate: float = Field(..., gt=0)


class MessTotalMealsUpdateRequest(BaseModel):
    user_id: str
    total_meals: float = Field(..., ge=0, description="Total meals eaten in month")
    month: Optional[str] = Field(None, description="YYYY-MM (defaults to current month)")


class MessAdvanceUpdateRequest(BaseModel):
    user_id: str
    meal_advance_paid: float = Field(..., ge=0, description="Advance deposit paid for mess")


class MessToggleRequest(BaseModel):
    user_id: str
    enable_mess_meals: bool


class MessSummaryResponse(BaseModel):
    status: str = "success"
    month: str
    total_meals: float
    estimated_meal_rate: float
    meal_advance_paid: float
    consumed_food_cost: float
    balance_status: str  # 'surplus' (উদ্বৃত্ত) | 'deficit' (ঘাটতি)
    balance_amount: float
    days_logged: int
    meals_by_date: Dict[str, float]
    enable_mess_meals: bool = True
    daily_meal_count: float = 1.0


