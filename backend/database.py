"""
Database Layer for Student Financial Management & Risk Warning System.
Provides thread-safe SQLite operations with full support for:
- Users & Authentication (with 1-click Demo Account support)
- Baseline Student Profiles & Financial Habits
- Real-time Expense Tracking & Monthly Aggregations
- Historical Risk Snapshots
- Month-End Outcome Check-Ins for Retraining Dataset Generation
"""

import hashlib
import json
import math
import sqlite3
import uuid
from datetime import datetime, timedelta
import calendar
from typing import Any, Dict, List, Optional, Tuple
from config import SQLITE_DB_PATH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USE_SUPABASE

# Exact columns present in Supabase Cloud schema to prevent PGRST204 errors
SUPABASE_PROFILE_COLUMNS = {
    'user_id', 'gender', 'age', 'year_of_study', 'university_type', 'where_you_live',
    'total_monthly_money', 'main_source_of_money', 'do_you_earn_income',
    'monthly_rent_fixed', 'monthly_allowance_fixed', 'savings_goal_fixed',
    'target_savings', 'track_spending', 'mobile_banking_use',
    'borrowed_from_friends_baseline', 'aware_balance', 'aware_weekly_track',
    'aware_check_before_buy', 'impulse_spontaneous', 'impulse_discounts',
    'impulse_regret', 'awareness_score', 'impulse_score', 'is_pro',
    'subscription_expiry', 'pin_code_hash', 'avatar_url',
    'daily_coach_queries_used', 'daily_coach_queries_date'
}

SUPABASE_GOAL_COLUMNS = {
    'id', 'user_id', 'title', 'target_amount', 'current_saved',
    'monthly_commitment', 'is_paused', 'missed_months', 'category',
    'start_date', 'is_active'
}

SUPABASE_INCOME_COLUMNS = {
    'id', 'user_id', 'amount', 'source', 'payment_method', 'note', 'date'
}

SUPABASE_EXPENSE_COLUMNS = {
    'id', 'user_id', 'amount', 'category', 'payment_method', 'note', 'date'
}


class Database:
    def __init__(self, db_path=SQLITE_DB_PATH):
        self.db_path = str(db_path)
        self.supabase = None
        if USE_SUPABASE and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            try:
                from supabase import create_client
                self.supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                print("⚡ [Supabase Cloud] Connected to PostgreSQL Database!")
            except Exception as e:
                print(f"Warning: Could not connect to Supabase: {e}")
                self.supabase = None

        self._init_tables()
        self._ensure_demo_user()

    def _to_uuid(self, uid: str) -> str:
        """Converts any local ID (or demo string) to a valid deterministic UUID for Supabase PostgreSQL."""
        if not uid or uid == 'demo_student_001':
            return '00000000-0000-0000-0000-000000000001'
        try:
            return str(uuid.UUID(uid))
        except ValueError:
            return str(uuid.uuid5(uuid.NAMESPACE_DNS, uid))

    def _get_user_settings_from_supabase(self, user_id: str) -> Dict[str, Any]:
        """Reads extended profile settings (mess_meal_fixed, academic_fee_fixed, etc.) from Supabase monthly_archives."""
        if not self.supabase:
            return {}
        try:
            sb_uid = self._to_uuid(user_id)
            settings_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"settings_{sb_uid}"))
            res = self.supabase.table('monthly_archives').select('summary_json').eq('id', settings_id).execute()
            if res.data and len(res.data) > 0:
                raw = res.data[0].get('summary_json')
                if isinstance(raw, dict):
                    return raw
                if isinstance(raw, str):
                    return json.loads(raw)
        except Exception as e:
            print(f"[Supabase sync notice] _get_user_settings: {e}")
        return {}

    def _save_user_settings_to_supabase(self, user_id: str, extra: Dict[str, Any]):
        """Persists extended profile settings into Supabase monthly_archives so they survive server restarts."""
        if not self.supabase or not extra:
            return
        try:
            sb_uid = self._to_uuid(user_id)
            settings_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"settings_{sb_uid}"))
            current = self._get_user_settings_from_supabase(user_id)
            current.update({k: v for k, v in extra.items() if v is not None})
            self.supabase.table('monthly_archives').upsert({
                'id': settings_id,
                'user_id': sb_uid,
                'month': '__user_settings__',
                'total_income': 0,
                'total_spent': 0,
                'ending_balance': 0,
                'final_risk_score': 0,
                'summary_json': json.dumps(current),
            }).execute()
        except Exception as e:
            print(f"[Supabase sync notice] _save_user_settings: {e}")

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 1. Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    is_demo INTEGER DEFAULT 0,
                    is_pro INTEGER DEFAULT 0,
                    subscription_expiry TEXT DEFAULT NULL,
                    pin_code_hash TEXT DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Ensure columns exist if table was previously created
            for col, col_type in [
                ("is_pro", "INTEGER DEFAULT 0"),
                ("subscription_expiry", "TEXT DEFAULT NULL"),
                ("pin_code_hash", "TEXT DEFAULT NULL"),
                ("avatar_url", "TEXT DEFAULT NULL"),
                ("calling_name", "TEXT DEFAULT NULL"),
                ("daily_coach_queries_used", "INTEGER DEFAULT 0"),
                ("daily_coach_queries_date", "TEXT DEFAULT NULL"),
                ("on_track_streak", "INTEGER DEFAULT 0"),
                ("last_streak_date", "TEXT DEFAULT NULL"),
            ]:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
                except Exception:
                    pass

            # 1B. Savings Goals Table ("Dream Goal Tracker")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS savings_goals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    target_amount REAL NOT NULL,
                    current_saved REAL NOT NULL DEFAULT 0.0,
                    monthly_commitment REAL NOT NULL DEFAULT 500.0,
                    is_paused INTEGER NOT NULL DEFAULT 0,
                    missed_months INTEGER NOT NULL DEFAULT 0,
                    category TEXT DEFAULT 'Gadget',
                    start_date TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # Ensure extended planning mode columns exist in savings_goals
            for col, col_type in [
                ("planning_mode", "TEXT DEFAULT 'monthly_amount'"),
                ("target_months", "INTEGER DEFAULT 0"),
                ("target_date", "TEXT DEFAULT NULL"),
            ]:
                try:
                    cursor.execute(f"ALTER TABLE savings_goals ADD COLUMN {col} {col_type}")
                except Exception:
                    pass

            # 2. Profiles Table (Baseline profile & habits)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS profiles (
                    user_id TEXT PRIMARY KEY,
                    gender TEXT NOT NULL,
                    age INTEGER NOT NULL,
                    year_of_study TEXT NOT NULL,
                    university_type TEXT NOT NULL,
                    where_you_live TEXT NOT NULL,
                    total_monthly_money TEXT NOT NULL,
                    main_source_of_money TEXT NOT NULL,
                    do_you_earn_income TEXT NOT NULL,
                    monthly_rent_fixed REAL DEFAULT 0,
                    mess_meal_fixed REAL DEFAULT 0,
                    academic_fee_fixed REAL DEFAULT 0,
                    transport_fixed REAL DEFAULT 0,
                    monthly_allowance_fixed REAL DEFAULT 10000,
                    savings_goal_fixed REAL DEFAULT 1000,
                    target_savings REAL DEFAULT 0,
                    track_spending INTEGER DEFAULT 3,
                    mobile_banking_use TEXT DEFAULT 'Weekly',
                    borrowed_from_friends_baseline TEXT DEFAULT 'Never',
                    aware_balance INTEGER DEFAULT 3,
                    aware_weekly_track INTEGER DEFAULT 3,
                    aware_check_before_buy INTEGER DEFAULT 3,
                    impulse_spontaneous INTEGER DEFAULT 3,
                    impulse_discounts INTEGER DEFAULT 3,
                    impulse_regret INTEGER DEFAULT 3,
                    awareness_score REAL DEFAULT 3.0,
                    impulse_score REAL DEFAULT 3.0,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # Ensure target_savings and extended budget columns exist in profiles if table already exists
            for col, col_type, def_val in [
                ("target_savings", "REAL", "0.0"),
                ("mess_meal_fixed", "REAL", "0.0"),
                ("academic_fee_fixed", "REAL", "0.0"),
                ("transport_fixed", "REAL", "0.0"),
            ]:
                try:
                    cursor.execute(f"ALTER TABLE profiles ADD COLUMN {col} {col_type} DEFAULT {def_val}")
                except Exception:
                    pass

            # 3. Expenses Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS expenses (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT NOT NULL,
                    payment_method TEXT NOT NULL DEFAULT 'Cash',
                    note TEXT,
                    date TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # 4. Risk Snapshots Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS risk_snapshots (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    risk_score_pct REAL NOT NULL,
                    risk_tier TEXT NOT NULL,
                    risk_tier_bn TEXT NOT NULL,
                    monthly_spent_total REAL NOT NULL,
                    projected_savings REAL NOT NULL,
                    daily_safe_to_spend REAL NOT NULL,
                    top_drivers_json TEXT,
                    trigger_event TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # 5. Month-End Check-Ins Table (Retraining feedback)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS month_end_checkins (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    month TEXT NOT NULL,
                    actual_ran_out_of_money INTEGER NOT NULL,
                    final_risk_score_predicted REAL,
                    final_spent_total REAL,
                    feedback_notes TEXT,
                    survey_row_json TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # 6. Incomes Table (Multi-source fund additions anytime)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS incomes (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    amount REAL NOT NULL,
                    source TEXT NOT NULL,
                    payment_method TEXT NOT NULL DEFAULT 'Cash',
                    note TEXT,
                    date TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # 7. Subscription Payments Table (Freemium + Pro AI Tk 50/Month)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS subscription_payments (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    payment_method TEXT NOT NULL,
                    trx_id TEXT NOT NULL,
                    amount REAL NOT NULL DEFAULT 50.0,
                    status TEXT NOT NULL DEFAULT 'approved',
                    approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # 8. Monthly Archives Table (Automatic 1st to 30th/31st history)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS monthly_archives (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    month TEXT NOT NULL,
                    total_income REAL NOT NULL,
                    total_spent REAL NOT NULL,
                    ending_balance REAL NOT NULL,
                    final_risk_score REAL NOT NULL,
                    summary_json TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # 9. Campus Peer Debts Table (দেনা-পাওনা)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS peer_debts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    person_name TEXT NOT NULL,
                    amount REAL NOT NULL,
                    note TEXT DEFAULT '',
                    due_date TEXT DEFAULT NULL,
                    is_settled INTEGER DEFAULT 0,
                    settled_at DATETIME DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            """)

            # 10. Personal Mess Meals Table (আমার মেস মিল)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mess_meals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    meal_count REAL NOT NULL DEFAULT 1.0,
                    note TEXT DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date) ON CONFLICT REPLACE
                )
            """)

            try:
                cursor.execute("ALTER TABLE profiles ADD COLUMN estimated_meal_rate REAL DEFAULT 50.0")
            except Exception:
                pass

            try:
                cursor.execute("ALTER TABLE profiles ADD COLUMN enable_mess_meals INTEGER DEFAULT NULL")
            except Exception:
                pass

            conn.commit()


    def _ensure_demo_user(self):
        """Creates a default demo user for instant testing without registration."""
        demo_id = "demo_student_001"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, avatar_url FROM users WHERE id = ?", (demo_id,))
            demo_row = cursor.fetchone()
            demo_avatar = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
            if not demo_row:
                cursor.execute("""
                    INSERT INTO users (id, email, password_hash, full_name, is_demo, avatar_url)
                    VALUES (?, ?, ?, ?, 1, ?)
                """, (demo_id, "demo@student.edu.bd", self._hash_password("demo1234"), "Tanvir Ahmed", demo_avatar))

                # Set demo baseline profile
                cursor.execute("""
                    INSERT INTO profiles (
                        user_id, gender, age, year_of_study, university_type, where_you_live,
                        total_monthly_money, main_source_of_money, do_you_earn_income,
                        monthly_rent_fixed, monthly_allowance_fixed, savings_goal_fixed, target_savings,
                        track_spending, mobile_banking_use, borrowed_from_friends_baseline,
                        aware_balance, aware_weekly_track, aware_check_before_buy,
                        impulse_spontaneous, impulse_discounts, impulse_regret,
                        awareness_score, impulse_score
                    ) VALUES (
                        ?, 'Male', 21, '2nd year', 'Public', 'Mess-hostel',
                        '5–10k', 'Family', 'No',
                        3500, 8000, 800, 500,
                        3, 'Daily', '1–2',
                        3, 3, 3,
                        3, 4, 3,
                        3.0, 3.33
                    )
                """, (demo_id,))

                # Add sample initial transactions for this month
                today_str = datetime.now().strftime("%Y-%m-%d")

                # Sample initial income (Family allowance Tk 8000)
                cursor.execute("""
                    INSERT INTO incomes (id, user_id, amount, source, payment_method, note, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), demo_id, 8000, "Family", "bKash", "Monthly family allowance", today_str))

                sample_expenses = [
                    (str(uuid.uuid4()), demo_id, 3500, "Rent", "bKash", "Mess rent advance", today_str),
                    (str(uuid.uuid4()), demo_id, 450, "Food", "Cash", "Campus canteen meal & snacks", today_str),
                    (str(uuid.uuid4()), demo_id, 80, "Transport", "Cash", "Rickshaw & bus fare", today_str),
                ]
                cursor.executemany("""
                    INSERT INTO expenses (id, user_id, amount, category, payment_method, note, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, sample_expenses)

                # Set demo user as Pro enabled for instant evaluation
                cursor.execute("""
                    UPDATE users SET is_pro = 1, subscription_expiry = '2099-12-31'
                    WHERE id = ?
                """, (demo_id,))

                conn.commit()

            # Ensure existing demo profile has target_savings set
            cursor.execute("""
                UPDATE profiles SET target_savings = 500.0
                WHERE user_id = ? AND (target_savings IS NULL OR target_savings = 0)
            """, (demo_id,))

            # Ensure demo student has a Goal Vault
            cursor.execute("SELECT id FROM savings_goals WHERE user_id = ? AND is_active = 1", (demo_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO savings_goals (
                        id, user_id, title, target_amount, current_saved,
                        monthly_commitment, is_paused, missed_months, category, start_date, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()), demo_id, 'LG UltraGear 27" Gaming Monitor',
                    32000.0, 4500.0, 1000.0, 0, 0, "Gadget", datetime.now().strftime("%Y-%m-%d"), 1
                ))

            # Set demo on-track streak to 5 days
            cursor.execute("""
                UPDATE users SET on_track_streak = 5, last_streak_date = ?
                WHERE id = ? AND (on_track_streak IS NULL OR on_track_streak = 0)
            """, (datetime.now().strftime("%Y-%m-%d"), demo_id))

            conn.commit()


    # --- USER AUTHENTICATION & SUPABASE CLOUD SYNC ---
    def _get_supabase_auth_user(self, email: str) -> Optional[Any]:
        """Looks up an active auth user in Supabase by email."""
        if not self.supabase:
            return None
        try:
            users = self.supabase.auth.admin.list_users()
            email_lower = email.lower().strip()
            for u in users:
                if u.email and u.email.lower().strip() == email_lower:
                    return u
        except Exception as e:
            print(f"[Supabase sync notice] _get_supabase_auth_user: {e}")
        return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieves user profile info by email, checking SQLite then Supabase."""
        email_clean = email.lower().strip()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, full_name, calling_name, is_demo, is_pro, subscription_expiry, pin_code_hash, avatar_url FROM users WHERE email = ?", (email_clean,))
            row = cursor.fetchone()
            if row:
                return dict(row)

        if self.supabase:
            sb_u = self._get_supabase_auth_user(email_clean)
            if sb_u:
                extra_s = self._get_user_settings_from_supabase(sb_u.id)
                full_name = extra_s.get('full_name') or sb_u.user_metadata.get('full_name') or sb_u.user_metadata.get('name') or email_clean.split('@')[0]
                avatar = sb_u.user_metadata.get('avatar_url') or sb_u.user_metadata.get('picture')
                calling_name = extra_s.get('calling_name') or sb_u.user_metadata.get('calling_name')
                if not calling_name and 'Swapnil' in full_name:
                    calling_name = 'Swapnil'
                fake_hash = self._hash_password(str(uuid.uuid4()))
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT OR REPLACE INTO users (id, email, password_hash, full_name, calling_name, avatar_url, is_demo, is_pro)
                        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
                    """, (sb_u.id, email_clean, fake_hash, full_name, calling_name, avatar))
                    conn.commit()
                # Restore profile and related data
                self.get_profile(sb_u.id)
                self.get_user_goals(sb_u.id)
                self.get_expenses(sb_u.id)
                self.get_incomes(sb_u.id)
                return {
                    "id": sb_u.id,
                    "email": email_clean,
                    "full_name": full_name,
                    "calling_name": calling_name,
                    "avatar_url": avatar,
                    "is_demo": 0,
                    "is_pro": 0,
                    "subscription_expiry": None,
                    "pin_code_hash": None
                }
        return None

    def create_user(self, email: str, password: str, full_name: str) -> Dict[str, Any]:
        email_clean = email.lower().strip()
        user_id = str(uuid.uuid4())
        hashed = self._hash_password(password)

        if self.supabase:
            try:
                sb_user = self.supabase.auth.admin.create_user({
                    'email': email_clean,
                    'password': password,
                    'email_confirm': True,
                    'user_metadata': {'full_name': full_name.strip()}
                })
                if sb_user and getattr(sb_user, 'user', None):
                    user_id = sb_user.user.id
            except Exception as e:
                print(f"[Supabase sync notice] Auth user creation: {e}")
                existing_u = self._get_supabase_auth_user(email_clean)
                if existing_u:
                    user_id = existing_u.id

        calling_val = None
        if 'Swapnil' in full_name:
            calling_val = 'Swapnil'

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = ?", (email_clean,))
            if cursor.fetchone():
                raise ValueError("An account with this email already exists.")
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, full_name, calling_name)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, email_clean, hashed, full_name.strip(), calling_val))
            conn.commit()

        return {"id": user_id, "email": email_clean, "full_name": full_name, "calling_name": calling_val}

    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        hashed = self._hash_password(password)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, email, full_name, calling_name, is_demo, is_pro, subscription_expiry, pin_code_hash, avatar_url FROM users
                WHERE email = ? AND password_hash = ?
            """, (email.lower().strip(), hashed))
            row = cursor.fetchone()
            if row:
                return dict(row)

        # Supabase Cloud fallback (e.g. if Render container was restarted)
        if self.supabase:
            try:
                auth_res = self.supabase.auth.sign_in_with_password({
                    'email': email.lower().strip(),
                    'password': password
                })
                if auth_res and getattr(auth_res, 'user', None):
                    u = auth_res.user
                    extra_s = self._get_user_settings_from_supabase(u.id)
                    full_name = extra_s.get('full_name') or u.user_metadata.get('full_name') or email.split('@')[0]
                    avatar = u.user_metadata.get('avatar_url')
                    calling_name = extra_s.get('calling_name') or u.user_metadata.get('calling_name')
                    if not calling_name and 'Swapnil' in full_name:
                        calling_name = 'Swapnil'
                    with self._get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT OR REPLACE INTO users (id, email, password_hash, full_name, calling_name, avatar_url, is_demo, is_pro)
                            VALUES (?, ?, ?, ?, ?, ?, 0, 0)
                        """, (u.id, email.lower().strip(), hashed, full_name, calling_name, avatar))
                        conn.commit()
                    self.get_profile(u.id)
                    self.get_user_goals(u.id)
                    self.get_expenses(u.id)
                    self.get_incomes(u.id)
                    return {
                        'id': u.id,
                        'email': email.lower().strip(),
                        'full_name': full_name,
                        'calling_name': calling_name,
                        'is_demo': 0,
                        'is_pro': 0,
                        'subscription_expiry': None,
                        'pin_code_hash': None,
                        'avatar_url': avatar
                    }
            except Exception as e_sb:
                print(f"[Supabase auth signin notice]: {e_sb}")

        return None

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, full_name, calling_name, is_demo, is_pro, subscription_expiry, pin_code_hash, avatar_url FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)

        if self.supabase:
            try:
                sb_uid = self._to_uuid(user_id)
                sb_res = self.supabase.auth.admin.get_user_by_id(sb_uid)
                if sb_res and getattr(sb_res, 'user', None):
                    u = sb_res.user
                    extra_s = self._get_user_settings_from_supabase(sb_uid)
                    full_name = extra_s.get('full_name') or u.user_metadata.get('full_name') or (u.email.split('@')[0] if u.email else 'User')
                    avatar = u.user_metadata.get('avatar_url') or u.user_metadata.get('picture')
                    calling_name = extra_s.get('calling_name') or u.user_metadata.get('calling_name')
                    if not calling_name and 'Swapnil' in full_name:
                        calling_name = 'Swapnil'
                    fake_hash = self._hash_password(str(uuid.uuid4()))
                    with self._get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT OR REPLACE INTO users (id, email, password_hash, full_name, calling_name, avatar_url, is_demo, is_pro)
                            VALUES (?, ?, ?, ?, ?, ?, 0, 0)
                        """, (sb_uid, u.email.lower().strip() if u.email else '', fake_hash, full_name, calling_name, avatar))
                        conn.commit()
                    return {
                        "id": sb_uid,
                        "email": u.email.lower().strip() if u.email else '',
                        "full_name": full_name,
                        "calling_name": calling_name,
                        "avatar_url": avatar,
                        "is_demo": 0,
                        "is_pro": 0,
                        "subscription_expiry": None,
                        "pin_code_hash": None
                    }
            except Exception as e:
                print(f"[Supabase sync notice] get_user fallback: {e}")

        return None

    def google_auth(self, email: str, full_name: str, avatar_url: Optional[str] = None) -> Dict[str, Any]:
        email_clean = email.lower().strip()

        # 1. Look up canonical Supabase Auth user ID
        user_id = None
        if self.supabase:
            sb_u = self._get_supabase_auth_user(email_clean)
            if sb_u:
                user_id = sb_u.id
            else:
                try:
                    new_u = self.supabase.auth.admin.create_user({
                        'email': email_clean,
                        'email_confirm': True,
                        'user_metadata': {'full_name': full_name.strip(), 'avatar_url': avatar_url}
                    })
                    if new_u and getattr(new_u, 'user', None):
                        user_id = new_u.user.id
                except Exception as e_cr:
                    print(f"[Supabase sync notice] create auth user: {e_cr}")

        if not user_id:
            user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, email_clean))

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, full_name, calling_name, is_demo, is_pro, subscription_expiry, pin_code_hash, avatar_url FROM users WHERE email = ?", (email_clean,))
            row = cursor.fetchone()

            if row:
                old_dict = dict(row)
                old_id = old_dict['id']
                # If old_id differs from canonical user_id, migrate SQLite tables
                if old_id != user_id:
                    cursor.execute("UPDATE OR REPLACE users SET id = ? WHERE id = ?", (user_id, old_id))
                    cursor.execute("UPDATE OR REPLACE profiles SET user_id = ? WHERE user_id = ?", (user_id, old_id))
                    cursor.execute("UPDATE expenses SET user_id = ? WHERE user_id = ?", (user_id, old_id))
                    cursor.execute("UPDATE savings_goals SET user_id = ? WHERE user_id = ?", (user_id, old_id))
                    cursor.execute("UPDATE incomes SET user_id = ? WHERE user_id = ?", (user_id, old_id))
                    cursor.execute("UPDATE risk_snapshots SET user_id = ? WHERE user_id = ?", (user_id, old_id))

                user_dict = old_dict
                user_dict['id'] = user_id
                update_fields = []
                params = []
                if avatar_url and avatar_url != user_dict.get('avatar_url'):
                    update_fields.append("avatar_url = ?")
                    params.append(avatar_url)
                    user_dict['avatar_url'] = avatar_url
                if full_name and full_name.strip() and full_name.strip() != user_dict.get('full_name'):
                    update_fields.append("full_name = ?")
                    params.append(full_name.strip())
                    user_dict['full_name'] = full_name.strip()
                if not user_dict.get('calling_name') and 'Swapnil' in full_name:
                    update_fields.append("calling_name = ?")
                    params.append('Swapnil')
                    user_dict['calling_name'] = 'Swapnil'

                if update_fields:
                    params.append(user_id)
                    cursor.execute(f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?", params)
                conn.commit()
            else:
                fake_hash = self._hash_password(str(uuid.uuid4()))
                extra_s = self._get_user_settings_from_supabase(user_id) if self.supabase else {}
                saved_calling = extra_s.get('calling_name')
                saved_full = extra_s.get('full_name') or full_name.strip()
                calling_val = saved_calling or ('Swapnil' if 'Swapnil' in saved_full else None)
                cursor.execute("""
                    INSERT INTO users (id, email, password_hash, full_name, calling_name, avatar_url, is_demo, is_pro)
                    VALUES (?, ?, ?, ?, ?, ?, 0, 0)
                """, (user_id, email_clean, fake_hash, saved_full, calling_val, avatar_url))
                conn.commit()
                user_dict = {
                    "id": user_id,
                    "email": email_clean,
                    "full_name": saved_full,
                    "calling_name": calling_val,
                    "avatar_url": avatar_url,
                    "is_demo": 0,
                    "is_pro": 0,
                    "subscription_expiry": None,
                    "pin_code_hash": None
                }

        # 2. Check and restore profile from Supabase if not in SQLite
        self.get_profile(user_id)
        # 3. Check and restore goals, expenses, incomes
        self.get_user_goals(user_id)
        self.get_expenses(user_id)
        self.get_incomes(user_id)

        # 4. Supabase Cloud metadata sync
        if self.supabase:
            try:
                self.supabase.auth.admin.update_user_by_id(user_id, {
                    'user_metadata': {
                        'full_name': user_dict.get('full_name'),
                        'calling_name': user_dict.get('calling_name'),
                        'avatar_url': user_dict.get('avatar_url')
                    }
                })
            except Exception as e_up:
                print(f"[Supabase sync notice] Auth metadata update: {e_up}")

        return user_dict

    def update_user_profile(
        self,
        user_id: str,
        full_name: Optional[str] = None,
        calling_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        university_type: Optional[str] = None,
        year_of_study: Optional[str] = None,
        where_you_live: Optional[str] = None,
        enable_mess_meals: Optional[bool] = None,
        monthly_allowance_fixed: Optional[float] = None,
        monthly_rent_fixed: Optional[float] = None,
        mess_meal_fixed: Optional[float] = None,
        academic_fee_fixed: Optional[float] = None,
        transport_fixed: Optional[float] = None,
        target_savings: Optional[float] = None,
        savings_goal_fixed: Optional[float] = None
    ) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            params = []
            if full_name is not None and full_name.strip():
                updates.append("full_name = ?")
                params.append(full_name.strip())
            if calling_name is not None:
                updates.append("calling_name = ?")
                params.append(calling_name.strip())
            if avatar_url is not None:
                updates.append("avatar_url = ?")
                params.append(avatar_url.strip())

            if updates:
                params.append(user_id)
                cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)

            prof_updates = []
            prof_params = []
            if university_type is not None:
                prof_updates.append("university_type = ?")
                prof_params.append(university_type)
            if year_of_study is not None:
                prof_updates.append("year_of_study = ?")
                prof_params.append(year_of_study)
            if where_you_live is not None:
                prof_updates.append("where_you_live = ?")
                prof_params.append(where_you_live)
            if monthly_allowance_fixed is not None:
                prof_updates.append("monthly_allowance_fixed = ?")
                prof_params.append(monthly_allowance_fixed)
                # Map to categorical bracket
                amt = float(monthly_allowance_fixed)
                if amt < 5000:
                    prof_updates.append("total_monthly_money = ?")
                    prof_params.append("<5k")
                elif amt <= 10000:
                    prof_updates.append("total_monthly_money = ?")
                    prof_params.append("5–10k")
                elif amt <= 15000:
                    prof_updates.append("total_monthly_money = ?")
                    prof_params.append("10–15k")
                elif amt <= 20000:
                    prof_updates.append("total_monthly_money = ?")
                    prof_params.append("15–20k")
                else:
                    prof_updates.append("total_monthly_money = ?")
                    prof_params.append(">20k")
            if monthly_rent_fixed is not None:
                prof_updates.append("monthly_rent_fixed = ?")
                prof_params.append(monthly_rent_fixed)
            if mess_meal_fixed is not None:
                prof_updates.append("mess_meal_fixed = ?")
                prof_params.append(mess_meal_fixed)
            if academic_fee_fixed is not None:
                prof_updates.append("academic_fee_fixed = ?")
                prof_params.append(academic_fee_fixed)
            if transport_fixed is not None:
                prof_updates.append("transport_fixed = ?")
                prof_params.append(transport_fixed)
            if target_savings is not None:
                prof_updates.append("target_savings = ?")
                prof_params.append(target_savings)
            if savings_goal_fixed is not None:
                prof_updates.append("savings_goal_fixed = ?")
                prof_params.append(savings_goal_fixed)
            if enable_mess_meals is not None:
                prof_updates.append("enable_mess_meals = ?")
                prof_params.append(1 if enable_mess_meals else 0)

            if prof_updates:
                prof_params.append(user_id)
                cursor.execute(f"UPDATE profiles SET {', '.join(prof_updates)}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?", prof_params)

            conn.commit()

        if self.supabase:
            try:
                sb_updates = {}
                if avatar_url is not None:
                    sb_updates['avatar_url'] = avatar_url
                if university_type is not None:
                    sb_updates['university_type'] = university_type
                if year_of_study is not None:
                    sb_updates['year_of_study'] = year_of_study
                if where_you_live is not None:
                    sb_updates['where_you_live'] = where_you_live
                if monthly_allowance_fixed is not None:
                    sb_updates['monthly_allowance_fixed'] = monthly_allowance_fixed
                    amt = float(monthly_allowance_fixed)
                    sb_updates['total_monthly_money'] = "<5k" if amt < 5000 else ("5–10k" if amt <= 10000 else ("10–15k" if amt <= 15000 else ("15–20k" if amt <= 20000 else ">20k")))
                if monthly_rent_fixed is not None:
                    sb_updates['monthly_rent_fixed'] = monthly_rent_fixed
                if mess_meal_fixed is not None:
                    sb_updates['mess_meal_fixed'] = mess_meal_fixed
                if academic_fee_fixed is not None:
                    sb_updates['academic_fee_fixed'] = academic_fee_fixed
                if transport_fixed is not None:
                    sb_updates['transport_fixed'] = transport_fixed
                if target_savings is not None:
                    sb_updates['target_savings'] = target_savings
                if savings_goal_fixed is not None:
                    sb_updates['savings_goal_fixed'] = savings_goal_fixed

                if sb_updates:
                    filtered_sb_updates = {k: v for k, v in sb_updates.items() if k in SUPABASE_PROFILE_COLUMNS}
                    if filtered_sb_updates:
                        self.supabase.table('profiles').update(filtered_sb_updates).eq('user_id', self._to_uuid(user_id)).execute()

                extra_settings = {}
                if mess_meal_fixed is not None:
                    extra_settings['mess_meal_fixed'] = float(mess_meal_fixed)
                if academic_fee_fixed is not None:
                    extra_settings['academic_fee_fixed'] = float(academic_fee_fixed)
                if transport_fixed is not None:
                    extra_settings['transport_fixed'] = float(transport_fixed)
                if enable_mess_meals is not None:
                    extra_settings['enable_mess_meals'] = bool(enable_mess_meals)
                if calling_name is not None:
                    extra_settings['calling_name'] = calling_name.strip()
                if full_name is not None:
                    extra_settings['full_name'] = full_name.strip()
                if extra_settings:
                    self._save_user_settings_to_supabase(user_id, extra_settings)

                auth_meta_updates: Dict[str, Any] = {}
                if full_name is not None:
                    auth_meta_updates['full_name'] = full_name.strip()
                if calling_name is not None:
                    auth_meta_updates['calling_name'] = calling_name.strip()
                if avatar_url is not None:
                    auth_meta_updates['avatar_url'] = avatar_url
                if auth_meta_updates:
                    try:
                        self.supabase.auth.admin.update_user_by_id(
                            self._to_uuid(user_id),
                            {"user_metadata": auth_meta_updates},
                        )
                    except Exception as e_meta:
                        print(f"[Supabase sync notice] update_user_profile auth meta: {e_meta}")
            except Exception as e:
                print(f"[Supabase sync notice] update_user_profile: {e}")

        user = self.get_user(user_id)
        profile = self.get_profile(user_id)
        return {"user": user, "profile": profile}

    def update_budget_baseline(
        self,
        user_id: str,
        monthly_allowance_fixed: Optional[float] = None,
        monthly_rent_fixed: Optional[float] = None,
        mess_meal_fixed: Optional[float] = None,
        academic_fee_fixed: Optional[float] = None,
        target_savings: Optional[float] = None,
        savings_goal_fixed: Optional[float] = None,
        enable_mess_meals: Optional[bool] = None
    ) -> Optional[Dict[str, Any]]:
        """Dedicated updater for the student's baseline money flow parameters."""
        res = self.update_user_profile(
            user_id=user_id,
            monthly_allowance_fixed=monthly_allowance_fixed,
            monthly_rent_fixed=monthly_rent_fixed,
            mess_meal_fixed=mess_meal_fixed,
            academic_fee_fixed=academic_fee_fixed,
            target_savings=target_savings,
            savings_goal_fixed=savings_goal_fixed,
            enable_mess_meals=enable_mess_meals
        )
        return res.get("profile")

    def upload_avatar_to_storage(self, user_id: str, image_data: str) -> str:
        """Uploads image data (base64 or remote URL) to Supabase Storage 'avatars' bucket and updates user profile."""
        avatar_url = image_data

        if self.supabase and image_data and (image_data.startswith("data:image") or len(image_data) > 200):
            try:
                import base64
                if "base64," in image_data:
                    raw_b64 = image_data.split("base64,")[1]
                else:
                    raw_b64 = image_data

                img_bytes = base64.b64decode(raw_b64)
                sb_uid = self._to_uuid(user_id)
                filename = f"{sb_uid}.jpg"

                self.supabase.storage.from_('avatars').upload(
                    path=filename,
                    file=img_bytes,
                    file_options={'content-type': 'image/jpeg', 'upsert': 'true'}
                )

                public_url = self.supabase.storage.from_('avatars').get_public_url(filename)
                avatar_url = f"{public_url}?t={int(datetime.now().timestamp())}"
            except Exception as e:
                print(f"[Supabase Storage upload warning]: {e}")

        # Update in local users table
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user_id))
            conn.commit()

        # Update in Supabase profiles table
        if self.supabase:
            try:
                self.supabase.table('profiles').update({'avatar_url': avatar_url}).eq('user_id', self._to_uuid(user_id)).execute()
            except Exception as e:
                print(f"[Supabase sync notice] upload_avatar_to_storage profile update: {e}")

        return avatar_url

    def update_target_savings(self, user_id: str, target_savings: float) -> bool:
        """Directly updates the protected target savings goal."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE profiles
                SET target_savings = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (max(0.0, target_savings), user_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_coach_query_status(self, user_id: str) -> Dict[str, Any]:
        """Returns the daily fair-use query limit status (10 queries/day, resetting at midnight)."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT daily_coach_queries_used, daily_coach_queries_date FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                return {"queries_used": 0, "queries_remaining": 10, "daily_limit": 10}

            used = row['daily_coach_queries_used'] or 0
            date_str = row['daily_coach_queries_date']
            if date_str != today_str:
                cursor.execute("""
                    UPDATE users
                    SET daily_coach_queries_used = 0, daily_coach_queries_date = ?
                    WHERE id = ?
                """, (today_str, user_id))
                conn.commit()
                return {"queries_used": 0, "queries_remaining": 10, "daily_limit": 10}

            remaining = max(0, 10 - used)
            return {"queries_used": used, "queries_remaining": remaining, "daily_limit": 10}

    def use_coach_query(self, user_id: str) -> Dict[str, Any]:
        """Consumes 1 daily coach query."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT daily_coach_queries_used, daily_coach_queries_date FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            used = 0
            if row:
                if row['daily_coach_queries_date'] == today_str:
                    used = row['daily_coach_queries_used'] or 0

            new_used = used + 1
            cursor.execute("""
                UPDATE users
                SET daily_coach_queries_used = ?, daily_coach_queries_date = ?
                WHERE id = ?
            """, (new_used, today_str, user_id))
            conn.commit()
            remaining = max(0, 10 - new_used)
            return {"queries_used": new_used, "queries_remaining": remaining, "daily_limit": 10}

    # --- PROFILE MANAGEMENT ---
    def save_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        # Merge with existing profile if present so partial updates do not overwrite untouched fields
        existing = self.get_profile(user_id) or {}
        profile_data = {**existing, **profile_data}

        # Compute composite scores
        aware_score = round(
            (profile_data.get('aware_balance', 3) +
             profile_data.get('aware_weekly_track', 3) +
             profile_data.get('aware_check_before_buy', 3)) / 3.0, 2
        )
        impulse_score = round(
            (profile_data.get('impulse_spontaneous', 3) +
             profile_data.get('impulse_discounts', 3) +
             profile_data.get('impulse_regret', 3)) / 3.0, 2
        )

        enable_mess_raw = profile_data.get('enable_mess_meals')
        if enable_mess_raw is not None:
            enable_mess_val = 1 if enable_mess_raw else 0
        else:
            enable_mess_val = 1 if profile_data.get('where_you_live') == 'Mess-hostel' else 0

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO profiles (
                    user_id, gender, age, year_of_study, university_type, where_you_live,
                    total_monthly_money, main_source_of_money, do_you_earn_income,
                    monthly_rent_fixed, mess_meal_fixed, academic_fee_fixed, transport_fixed,
                    monthly_allowance_fixed, savings_goal_fixed, target_savings,
                    track_spending, mobile_banking_use, borrowed_from_friends_baseline,
                    aware_balance, aware_weekly_track, aware_check_before_buy,
                    impulse_spontaneous, impulse_discounts, impulse_regret,
                    awareness_score, impulse_score, enable_mess_meals, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, CURRENT_TIMESTAMP
                )
                ON CONFLICT(user_id) DO UPDATE SET
                    gender=excluded.gender,
                    age=excluded.age,
                    year_of_study=excluded.year_of_study,
                    university_type=excluded.university_type,
                    where_you_live=excluded.where_you_live,
                    total_monthly_money=excluded.total_monthly_money,
                    main_source_of_money=excluded.main_source_of_money,
                    do_you_earn_income=excluded.do_you_earn_income,
                    monthly_rent_fixed=excluded.monthly_rent_fixed,
                    mess_meal_fixed=excluded.mess_meal_fixed,
                    academic_fee_fixed=excluded.academic_fee_fixed,
                    transport_fixed=excluded.transport_fixed,
                    monthly_allowance_fixed=excluded.monthly_allowance_fixed,
                    savings_goal_fixed=excluded.savings_goal_fixed,
                    target_savings=excluded.target_savings,
                    track_spending=excluded.track_spending,
                    mobile_banking_use=excluded.mobile_banking_use,
                    borrowed_from_friends_baseline=excluded.borrowed_from_friends_baseline,
                    aware_balance=excluded.aware_balance,
                    aware_weekly_track=excluded.aware_weekly_track,
                    aware_check_before_buy=excluded.aware_check_before_buy,
                    impulse_spontaneous=excluded.impulse_spontaneous,
                    impulse_discounts=excluded.impulse_discounts,
                    impulse_regret=excluded.impulse_regret,
                    awareness_score=excluded.awareness_score,
                    impulse_score=excluded.impulse_score,
                    enable_mess_meals=excluded.enable_mess_meals,
                    updated_at=CURRENT_TIMESTAMP
            """, (
                user_id,
                profile_data.get('gender', 'Male'),
                profile_data.get('age', 21),
                profile_data.get('year_of_study', '2nd year'),
                profile_data.get('university_type', 'Public'),
                profile_data.get('where_you_live', 'Mess-hostel'),
                profile_data.get('total_monthly_money', '5–10k'),
                profile_data.get('main_source_of_money', 'Family'),
                profile_data.get('do_you_earn_income', 'No'),
                profile_data.get('monthly_rent_fixed', 0),
                profile_data.get('mess_meal_fixed', 0),
                profile_data.get('academic_fee_fixed', 0),
                profile_data.get('transport_fixed', 0),
                profile_data.get('monthly_allowance_fixed', 10000),
                profile_data.get('savings_goal_fixed', 1000),
                profile_data.get('target_savings', 0.0),
                profile_data.get('track_spending', 3),
                profile_data.get('mobile_banking_use', 'Weekly'),
                profile_data.get('borrowed_from_friends_baseline', 'Never'),
                profile_data.get('aware_balance', 3),
                profile_data.get('aware_weekly_track', 3),
                profile_data.get('aware_check_before_buy', 3),
                profile_data.get('impulse_spontaneous', 3),
                profile_data.get('impulse_discounts', 3),
                profile_data.get('impulse_regret', 3),
                aware_score,
                impulse_score,
                enable_mess_val
            ))
            conn.commit()

        if self.supabase:
            try:
                full_sb_data = {
                    'user_id': self._to_uuid(user_id),
                    'gender': profile_data.get('gender', 'Male'),
                    'age': int(profile_data.get('age', 21)),
                    'year_of_study': profile_data.get('year_of_study', '2nd year'),
                    'university_type': profile_data.get('university_type', 'Public'),
                    'where_you_live': profile_data.get('where_you_live', 'Mess-hostel'),
                    'total_monthly_money': profile_data.get('total_monthly_money', '5–10k'),
                    'main_source_of_money': profile_data.get('main_source_of_money', 'Family'),
                    'do_you_earn_income': profile_data.get('do_you_earn_income', 'No'),
                    'monthly_rent_fixed': float(profile_data.get('monthly_rent_fixed', 0)),
                    'monthly_allowance_fixed': float(profile_data.get('monthly_allowance_fixed', 10000)),
                    'savings_goal_fixed': float(profile_data.get('savings_goal_fixed', 1000)),
                    'target_savings': float(profile_data.get('target_savings', 0)),
                    'track_spending': int(profile_data.get('track_spending', 3)),
                    'mobile_banking_use': profile_data.get('mobile_banking_use', 'Weekly'),
                    'borrowed_from_friends_baseline': profile_data.get('borrowed_from_friends_baseline', 'Never'),
                    'aware_balance': int(profile_data.get('aware_balance', 3)),
                    'aware_weekly_track': int(profile_data.get('aware_weekly_track', 3)),
                    'aware_check_before_buy': int(profile_data.get('aware_check_before_buy', 3)),
                    'impulse_spontaneous': int(profile_data.get('impulse_spontaneous', 3)),
                    'impulse_discounts': int(profile_data.get('impulse_discounts', 3)),
                    'impulse_regret': int(profile_data.get('impulse_regret', 3)),
                    'awareness_score': aware_score,
                    'impulse_score': impulse_score,
                }
                # Filter to only columns present in Supabase table to prevent schema cache errors
                sb_data = {k: v for k, v in full_sb_data.items() if k in SUPABASE_PROFILE_COLUMNS}
                self.supabase.table('profiles').upsert(sb_data).execute()
                self._save_user_settings_to_supabase(user_id, {
                    'mess_meal_fixed': float(profile_data.get('mess_meal_fixed', 0)),
                    'academic_fee_fixed': float(profile_data.get('academic_fee_fixed', 0)),
                    'transport_fixed': float(profile_data.get('transport_fixed', 0)),
                    'enable_mess_meals': bool(
                        profile_data['enable_mess_meals']
                        if profile_data.get('enable_mess_meals') is not None
                        else (
                            'mess' in str(profile_data.get('where_you_live') or '').lower()
                            or float(profile_data.get('mess_meal_fixed') or 0) > 0
                        )
                    ),
                })
            except Exception as e:
                print(f"[Supabase sync notice] save_profile: {e}")

        return self.get_profile(user_id)

    def _restore_profile_to_sqlite(self, user_id: str, p: Dict[str, Any]):
        """Restores a Supabase profile record directly into local SQLite."""
        try:
            aware_score = float(p.get('awareness_score') or 3.0)
            impulse_score = float(p.get('impulse_score') or 3.0)
            where_live = p.get('where_you_live', 'Mess-hostel')
            enable_mess = 1 if (
                p['enable_mess_meals']
                if p.get('enable_mess_meals') is not None
                else (
                    'mess' in str(where_live or '').lower()
                    or float(p.get('mess_meal_fixed') or 0) > 0
                )
            ) else 0

            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO profiles (
                        user_id, gender, age, year_of_study, university_type, where_you_live,
                        total_monthly_money, main_source_of_money, do_you_earn_income,
                        monthly_rent_fixed, mess_meal_fixed, academic_fee_fixed, transport_fixed,
                        monthly_allowance_fixed, savings_goal_fixed, target_savings,
                        track_spending, mobile_banking_use, borrowed_from_friends_baseline,
                        aware_balance, aware_weekly_track, aware_check_before_buy,
                        impulse_spontaneous, impulse_discounts, impulse_regret,
                        awareness_score, impulse_score, enable_mess_meals, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, CURRENT_TIMESTAMP
                    )
                """, (
                    user_id,
                    p.get('gender', 'Male'),
                    int(p.get('age', 21)),
                    p.get('year_of_study', '2nd year'),
                    p.get('university_type', 'Public'),
                    where_live,
                    p.get('total_monthly_money', '5–10k'),
                    p.get('main_source_of_money', 'Family'),
                    p.get('do_you_earn_income', 'No'),
                    float(p.get('monthly_rent_fixed') or 0),
                    float(p.get('mess_meal_fixed') or 0),
                    float(p.get('academic_fee_fixed') or 0),
                    float(p.get('transport_fixed') or 0),
                    float(p.get('monthly_allowance_fixed') or 10000),
                    float(p.get('savings_goal_fixed') or 1000),
                    float(p.get('target_savings') or 0),
                    int(p.get('track_spending') or 3),
                    p.get('mobile_banking_use', 'Weekly'),
                    p.get('borrowed_from_friends_baseline', 'Never'),
                    int(p.get('aware_balance') or 3),
                    int(p.get('aware_weekly_track') or 3),
                    int(p.get('aware_check_before_buy') or 3),
                    int(p.get('impulse_spontaneous') or 3),
                    int(p.get('impulse_discounts') or 3),
                    int(p.get('impulse_regret') or 3),
                    aware_score,
                    impulse_score,
                    enable_mess
                ))
                conn.commit()
        except Exception as e:
            print(f"[Supabase sync notice] _restore_profile_to_sqlite: {e}")

    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        # 1. Check local SQLite
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                res = dict(row)
                if res.get("enable_mess_meals") is None:
                    res["enable_mess_meals"] = (
                        "mess" in str(res.get("where_you_live") or "").lower()
                        or float(res.get("mess_meal_fixed") or 0) > 0
                    )
                else:
                    res["enable_mess_meals"] = bool(res["enable_mess_meals"])
                return res

        # 2. Check Supabase Cloud (Restores profile if backend restarted or container was recreated)
        if self.supabase:
            try:
                sb_uid = self._to_uuid(user_id)
                res = self.supabase.table('profiles').select('*').eq('user_id', sb_uid).execute()
                if res.data and len(res.data) > 0:
                    sb_prof = res.data[0]
                    extra_settings = self._get_user_settings_from_supabase(user_id)
                    if extra_settings:
                        for k in ('mess_meal_fixed', 'academic_fee_fixed', 'transport_fixed', 'enable_mess_meals', 'estimated_meal_rate'):
                            if k in extra_settings and extra_settings[k] is not None:
                                sb_prof[k] = extra_settings[k]
                    self._restore_profile_to_sqlite(user_id, sb_prof)
                    if sb_prof.get("enable_mess_meals") is None:
                        sb_prof["enable_mess_meals"] = (
                            "mess" in str(sb_prof.get("where_you_live") or "").lower()
                            or float(sb_prof.get("mess_meal_fixed") or 0) > 0
                        )
                    else:
                        sb_prof["enable_mess_meals"] = bool(sb_prof["enable_mess_meals"])
                    return sb_prof
            except Exception as e:
                print(f"[Supabase sync notice] get_profile fallback: {e}")

        return None

    # --- EXPENSES MANAGEMENT ---
    def add_expense(
        self,
        user_id: str,
        amount: float,
        category: str,
        payment_method: str = "Cash",
        note: Optional[str] = None,
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        expense_id = str(uuid.uuid4())
        date_str = date or datetime.now().strftime("%Y-%m-%d")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO expenses (id, user_id, amount, category, payment_method, note, date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (expense_id, user_id, amount, category, payment_method, note, date_str))
            conn.commit()

        if self.supabase:
            try:
                self.supabase.table('expenses').insert({
                    'id': self._to_uuid(expense_id),
                    'user_id': self._to_uuid(user_id),
                    'amount': float(amount),
                    'category': category,
                    'payment_method': payment_method,
                    'note': note,
                    'date': date_str,
                }).execute()
            except Exception as e:
                print(f"[Supabase sync notice] add_expense: {e}")

        return {
            "id": expense_id,
            "user_id": user_id,
            "amount": amount,
            "category": category,
            "payment_method": payment_method,
            "note": note,
            "date": date_str
        }

    def delete_expense(self, expense_id: str, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM expenses WHERE id = ? AND user_id = ?", (expense_id, user_id))
            conn.commit()
            deleted = cursor.rowcount > 0

        if self.supabase and deleted:
            try:
                self.supabase.table('expenses').delete().eq('id', self._to_uuid(expense_id)).execute()
            except Exception as e:
                print(f"[Supabase sync notice] delete_expense: {e}")

        return deleted

    def get_expenses(
        self,
        user_id: str,
        month: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        # 1. If SQLite has 0 expenses for this user and Supabase is active, restore from Supabase
        if self.supabase:
            try:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM expenses WHERE user_id = ?", (user_id,))
                    count = cursor.fetchone()[0]
                if count == 0:
                    sb_uid = self._to_uuid(user_id)
                    sb_res = self.supabase.table('expenses').select('*').eq('user_id', sb_uid).execute()
                    if sb_res.data:
                        with self._get_connection() as conn:
                            cursor = conn.cursor()
                            for exp in sb_res.data:
                                cursor.execute("""
                                    INSERT OR REPLACE INTO expenses (id, user_id, amount, category, payment_method, note, date, created_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                """, (
                                    exp.get('id', str(uuid.uuid4())),
                                    user_id,
                                    float(exp.get('amount') or 0),
                                    exp.get('category', 'Other'),
                                    exp.get('payment_method', 'Cash'),
                                    exp.get('note'),
                                    exp.get('date', datetime.now().strftime("%Y-%m-%d")),
                                    exp.get('created_at', datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                                ))
                            conn.commit()
            except Exception as e:
                print(f"[Supabase sync notice] get_expenses restore: {e}")

        month_prefix = month or datetime.now().strftime("%Y-%m")
        query = "SELECT * FROM expenses WHERE user_id = ? AND date LIKE ?"
        params: List[Any] = [user_id, f"{month_prefix}%"]

        if category and category.lower() != "all":
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY date DESC, created_at DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_monthly_aggregates(self, user_id: str, month: Optional[str] = None) -> Dict[str, Any]:
        """Calculates total spend and category breakdown for a given month."""
        month_prefix = month or datetime.now().strftime("%Y-%m")
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Category sums
            cursor.execute("""
                SELECT category, SUM(amount) as total, COUNT(*) as count
                FROM expenses
                WHERE user_id = ? AND date LIKE ?
                GROUP BY category
            """, (user_id, f"{month_prefix}%"))
            cat_rows = cursor.fetchall()
            categories = {row['category']: row['total'] for row in cat_rows}

            # Payment method breakdown
            cursor.execute("""
                SELECT payment_method, SUM(amount) as total, COUNT(*) as count
                FROM expenses
                WHERE user_id = ? AND date LIKE ?
                GROUP BY payment_method
            """, (user_id, f"{month_prefix}%"))
            pm_rows = cursor.fetchall()
            payment_methods = {row['payment_method']: row['total'] for row in pm_rows}
            mobile_tx_count = sum(row['count'] for row in pm_rows if row['payment_method'] in ['bKash', 'Nagad', 'Rocket'])

            # Total spent
            total_spent = sum(categories.values())

            # Daily trend for sparkline
            cursor.execute("""
                SELECT date, SUM(amount) as daily_total
                FROM expenses
                WHERE user_id = ? AND date LIKE ?
                GROUP BY date
                ORDER BY date ASC
            """, (user_id, f"{month_prefix}%"))
            daily_rows = cursor.fetchall()
            daily_trend = [{"date": r["date"], "amount": r["daily_total"]} for r in daily_rows]

            return {
                "month": month_prefix,
                "total_spent": total_spent,
                "categories": categories,
                "payment_methods": payment_methods,
                "mobile_transaction_count": mobile_tx_count,
                "daily_trend": daily_trend
            }

    # --- RISK SNAPSHOTS ---
    def record_risk_snapshot(
        self,
        user_id: str,
        risk_score_pct: float,
        risk_tier: str,
        risk_tier_bn: str,
        monthly_spent_total: float,
        projected_savings: float,
        daily_safe_to_spend: float,
        top_drivers: List[Dict[str, Any]],
        trigger_event: str
    ):
        snapshot_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO risk_snapshots (
                    id, user_id, risk_score_pct, risk_tier, risk_tier_bn,
                    monthly_spent_total, projected_savings, daily_safe_to_spend,
                    top_drivers_json, trigger_event
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                snapshot_id, user_id, risk_score_pct, risk_tier, risk_tier_bn,
                monthly_spent_total, projected_savings, daily_safe_to_spend,
                json.dumps(top_drivers), trigger_event
            ))
            conn.commit()

    def get_latest_risk_snapshot(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM risk_snapshots
                WHERE user_id = ?
                ORDER BY timestamp DESC LIMIT 1
            """, (user_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d['top_drivers'] = json.loads(d['top_drivers_json']) if d.get('top_drivers_json') else []
                return d
            return None

    # --- MONTH-END RETRAINING DATASET CHECK-IN ---
    def record_month_end_checkin(
        self,
        user_id: str,
        month: str,
        actual_ran_out_of_money: bool,
        final_risk_score_predicted: float,
        final_spent_total: float,
        feedback_notes: Optional[str],
        survey_row: Dict[str, Any]
    ) -> str:
        checkin_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO month_end_checkins (
                    id, user_id, month, actual_ran_out_of_money,
                    final_risk_score_predicted, final_spent_total,
                    feedback_notes, survey_row_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                checkin_id, user_id, month, int(actual_ran_out_of_money),
                final_risk_score_predicted, final_spent_total,
                feedback_notes, json.dumps(survey_row)
            ))
            conn.commit()

        if self.supabase:
            try:
                self.supabase.table('month_end_checkins').insert({
                    'id': self._to_uuid(checkin_id),
                    'user_id': self._to_uuid(user_id),
                    'month': month,
                    'actual_ran_out_of_money': bool(actual_ran_out_of_money),
                    'final_risk_score_predicted': float(final_risk_score_predicted),
                    'final_spent_total': float(final_spent_total),
                    'feedback_notes': feedback_notes,
                    'survey_row_json': json.dumps(survey_row),
                }).execute()
            except Exception as e:
                print(f"[Supabase sync notice] record_month_end_checkin: {e}")

        return checkin_id

    def get_all_checkins_for_retraining(self) -> List[Dict[str, Any]]:
        """Returns all collected check-in records formatted in the survey schema."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT survey_row_json FROM month_end_checkins")
            rows = cursor.fetchall()
            return [json.loads(r['survey_row_json']) for r in rows]

    # --- INCOMES MANAGEMENT (Multi-source fund additions) ---
    def add_income(
        self,
        user_id: str,
        amount: float,
        source: str,
        payment_method: str = "Cash",
        note: Optional[str] = None,
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        income_id = str(uuid.uuid4())
        date_str = date or datetime.now().strftime("%Y-%m-%d")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO incomes (id, user_id, amount, source, payment_method, note, date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (income_id, user_id, amount, source, payment_method, note, date_str))
            conn.commit()

        if self.supabase:
            try:
                self.supabase.table('incomes').insert({
                    'id': self._to_uuid(income_id),
                    'user_id': self._to_uuid(user_id),
                    'amount': float(amount),
                    'source': source,
                    'payment_method': payment_method,
                    'note': note,
                    'date': date_str,
                }).execute()
            except Exception as e:
                print(f"[Supabase sync notice] add_income: {e}")

        return {
            "id": income_id,
            "user_id": user_id,
            "amount": amount,
            "source": source,
            "payment_method": payment_method,
            "note": note,
            "date": date_str
        }

    def delete_income(self, income_id: str, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM incomes WHERE id = ? AND user_id = ?", (income_id, user_id))
            conn.commit()
            deleted = cursor.rowcount > 0

        if self.supabase and deleted:
            try:
                self.supabase.table('incomes').delete().eq('id', self._to_uuid(income_id)).execute()
            except Exception as e:
                print(f"[Supabase sync notice] delete_income: {e}")

        return deleted

    def get_incomes(
        self,
        user_id: str,
        month: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        # 1. If SQLite has 0 incomes for this user and Supabase is active, restore from Supabase
        if self.supabase:
            try:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM incomes WHERE user_id = ?", (user_id,))
                    count = cursor.fetchone()[0]
                if count == 0:
                    sb_uid = self._to_uuid(user_id)
                    sb_res = self.supabase.table('incomes').select('*').eq('user_id', sb_uid).execute()
                    if sb_res.data:
                        with self._get_connection() as conn:
                            cursor = conn.cursor()
                            for inc in sb_res.data:
                                cursor.execute("""
                                    INSERT OR REPLACE INTO incomes (id, user_id, amount, source, payment_method, note, date, created_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                """, (
                                    inc.get('id', str(uuid.uuid4())),
                                    user_id,
                                    float(inc.get('amount') or 0),
                                    inc.get('source', 'Family'),
                                    inc.get('payment_method', 'Cash'),
                                    inc.get('note'),
                                    inc.get('date', datetime.now().strftime("%Y-%m-%d")),
                                    inc.get('created_at', datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                                ))
                            conn.commit()
            except Exception as e:
                print(f"[Supabase sync notice] get_incomes restore: {e}")

        month_prefix = month or datetime.now().strftime("%Y-%m")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM incomes
                WHERE user_id = ? AND date LIKE ?
                ORDER BY date DESC, created_at DESC LIMIT ?
            """, (user_id, f"{month_prefix}%", limit))
            return [dict(row) for row in cursor.fetchall()]

    def get_monthly_income_total(self, user_id: str, month: Optional[str] = None) -> float:
        month_prefix = month or datetime.now().strftime("%Y-%m")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT SUM(amount) as total
                FROM incomes
                WHERE user_id = ? AND date LIKE ?
            """, (user_id, f"{month_prefix}%"))
            row = cursor.fetchone()
            return float(row['total']) if row and row['total'] is not None else 0.0

    # --- CALENDAR & DYNAMIC LEDGER (1st to 28th/30th/31st) ---
    def get_calendar_ledger(self, user_id: str, month: Optional[str] = None) -> Dict[str, Any]:
        """Merges incomes and expenses chronologically, grouped by day for the calendar view."""
        month_prefix = month or datetime.now().strftime("%Y-%m")
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Incomes
            cursor.execute("""
                SELECT id, user_id, amount, source as category_or_source, payment_method, note, date, 'income' as type
                FROM incomes
                WHERE user_id = ? AND date LIKE ?
            """, (user_id, f"{month_prefix}%"))
            inc_rows = [dict(r) for r in cursor.fetchall()]

            # Expenses
            cursor.execute("""
                SELECT id, user_id, amount, category as category_or_source, payment_method, note, date, 'expense' as type
                FROM expenses
                WHERE user_id = ? AND date LIKE ?
            """, (user_id, f"{month_prefix}%"))
            exp_rows = [dict(r) for r in cursor.fetchall()]

        all_tx = inc_rows + exp_rows
        # Sort newest first
        all_tx.sort(key=lambda x: (x['date'], x.get('created_at', '')), reverse=True)

        # Aggregate daily net cashflows
        daily_summary: Dict[str, Dict[str, float]] = {}
        total_inc = sum(r['amount'] for r in inc_rows)
        total_exp = sum(r['amount'] for r in exp_rows)

        for tx in all_tx:
            d = tx['date']
            if d not in daily_summary:
                daily_summary[d] = {"income": 0.0, "expense": 0.0, "net": 0.0, "tx_count": 0}
            if tx['type'] == 'income':
                daily_summary[d]['income'] += tx['amount']
                daily_summary[d]['net'] += tx['amount']
            else:
                daily_summary[d]['expense'] += tx['amount']
                daily_summary[d]['net'] -= tx['amount']
            daily_summary[d]['tx_count'] += 1

        calendar_days = [
            {"date": d, "income": v["income"], "expense": v["expense"], "net": round(v["net"], 1), "tx_count": v["tx_count"]}
            for d, v in sorted(daily_summary.items())
        ]

        return {
            "month": month_prefix,
            "total_income": total_inc,
            "total_expense": total_exp,
            "net_balance": round(total_inc - total_exp, 1),
            "calendar_days": calendar_days,
            "transactions": all_tx
        }

    # --- FREEMIUM + PRO AI SUBSCRIPTION (Tk 50/Month) ---
    def check_pro_status(self, user_id: str) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT is_pro, subscription_expiry FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                return {"is_pro": False, "tier": "free", "expiry": None}
            is_pro = bool(row['is_pro'])
            expiry = row['subscription_expiry']
            # Check expiry date if set
            if is_pro and expiry:
                try:
                    exp_dt = datetime.strptime(expiry[:10], "%Y-%m-%d")
                    if exp_dt < datetime.now():
                        is_pro = False
                except Exception:
                    pass
            return {"is_pro": is_pro, "tier": "pro" if is_pro else "free", "expiry": expiry}

    def toggle_demo_pro(self, user_id: str, enable: bool) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            new_status = 1 if enable else 0
            expiry = "2099-12-31" if enable else None
            cursor.execute("""
                UPDATE users SET is_pro = ?, subscription_expiry = ?
                WHERE id = ?
            """, (new_status, expiry, user_id))
            conn.commit()
            return True

    def submit_subscription_payment(
        self,
        user_id: str,
        payment_method: str,
        trx_id: str,
        amount: float = 50.0
    ) -> Dict[str, Any]:
        sub_id = str(uuid.uuid4())
        # Auto-approve for seamless student onboarding
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO subscription_payments (id, user_id, payment_method, trx_id, amount, status)
                VALUES (?, ?, ?, ?, ?, 'approved')
            """, (sub_id, user_id, payment_method, trx_id.strip(), amount))

            # Set Pro status for 30 days
            from datetime import timedelta
            expiry = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            cursor.execute("""
                UPDATE users SET is_pro = 1, subscription_expiry = ?
                WHERE id = ?
            """, (expiry, user_id))
            conn.commit()

        if self.supabase:
            try:
                sb_uid = self._to_uuid(user_id)
                self.supabase.table('subscription_payments').insert({
                    'id': self._to_uuid(sub_id),
                    'user_id': sb_uid,
                    'payment_method': payment_method,
                    'trx_id': trx_id.strip(),
                    'amount': float(amount),
                    'status': 'approved',
                    'approved_at': datetime.utcnow().isoformat(),
                }).execute()
                self.supabase.table('profiles').update({
                    'is_pro': True,
                    'subscription_expiry': expiry,
                }).eq('user_id', sb_uid).execute()
            except Exception as e:
                print(f"[Supabase sync notice] submit_subscription_payment: {e}")

        return {
            "payment_id": sub_id,
            "status": "approved",
            "message": "Subscription activated successfully! Enjoy Pro AI Coach.",
            "is_pro": True,
            "expiry": expiry
        }

    # --- SECURITY PIN & PASSWORD RESET ---
    def set_user_pin(self, user_id: str, pin: str) -> bool:
        hashed_pin = hashlib.sha256(pin.strip().encode('utf-8')).hexdigest()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET pin_code_hash = ? WHERE id = ?", (hashed_pin, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def verify_user_pin(self, user_id: str, pin: str) -> bool:
        hashed_pin = hashlib.sha256(pin.strip().encode('utf-8')).hexdigest()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT pin_code_hash FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row and row['pin_code_hash']:
                return row['pin_code_hash'] == hashed_pin
            return False

    def reset_user_password(self, email: str, new_password: str) -> bool:
        hashed = self._hash_password(new_password)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (hashed, email.lower().strip()))
            conn.commit()
            return cursor.rowcount > 0

    # --- MONTHLY ARCHIVES (1st to 28th/30th/31st) ---
    def archive_month(
        self,
        user_id: str,
        month: str,
        total_income: float,
        total_spent: float,
        ending_balance: float,
        final_risk_score: float,
        summary_data: Dict[str, Any]
    ) -> str:
        archive_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            summary_json_str = json.dumps(summary_data, default=lambda o: o.model_dump() if hasattr(o, 'model_dump') else str(o))
            cursor.execute("""
                INSERT INTO monthly_archives (
                    id, user_id, month, total_income, total_spent, ending_balance, final_risk_score, summary_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                archive_id, user_id, month, total_income, total_spent,
                ending_balance, final_risk_score, summary_json_str
            ))

            conn.commit()
            return archive_id

    def get_monthly_archives(self, user_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM monthly_archives
                WHERE user_id = ?
                ORDER BY month DESC
            """, (user_id,))
            rows = cursor.fetchall()
            archives = []
            for r in rows:
                item = dict(r)
                item['summary'] = json.loads(item['summary_json']) if item.get('summary_json') else {}
                archives.append(item)
            return archives

    # --- GOAL-BASED SAVINGS VAULT & TIMELINE ENGINE ---
    def _format_goal_data(self, row: sqlite3.Row) -> Dict[str, Any]:
        data = dict(row)
        target = float(data.get("target_amount", 0.0))
        saved = float(data.get("current_saved", 0.0))
        commitment = float(data.get("monthly_commitment", 500.0))
        missed = int(data.get("missed_months", 0))
        is_paused = bool(data.get("is_paused", 0))
        planning_mode = data.get("planning_mode") or "monthly_amount"
        target_months = int(data.get("target_months") or 0)
        target_date_raw = data.get("target_date")
        start_date = data.get("start_date") or datetime.now().strftime("%Y-%m-%d")

        progress_pct = round(min(100.0, (saved / target) * 100.0), 1) if target > 0 else 0.0
        remaining_amt = round(max(0.0, target - saved), 1)

        now = datetime.now()
        month_names_en = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        month_names_bn = ["", "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]

        try:
            start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
        except Exception:
            start_dt = now

        if planning_mode == 'target_timeline':
            total_planned_months = target_months if target_months > 0 else 6
            # Fixed deadline based on start_date + total_planned_months
            deadline_year = start_dt.year + (start_dt.month + total_planned_months - 1) // 12
            deadline_month = (start_dt.month + total_planned_months - 1) % 12 + 1
            target_completion_date = f"{month_names_en[deadline_month]} {deadline_year}"
            target_completion_date_bn = f"{month_names_bn[deadline_month]} {deadline_year}"

            # Elapsed calendar months
            elapsed = max(0, (now.year - start_dt.year) * 12 + (now.month - start_dt.month))
            remaining_months = max(1, total_planned_months - elapsed)
            months_left = remaining_months

            # Required monthly savings across active remaining months
            active_months = max(1, remaining_months - (1 if is_paused else 0))
            required_monthly = float(math.ceil(remaining_amt / active_months)) if remaining_amt > 0 else 0.0
            required_monthly_savings = required_monthly

            if not is_paused:
                commitment = required_monthly

            if is_paused:
                timeline_shift_note_en = f"Paused this month — deadline fixed. Required savings: ৳{int(required_monthly):,}/mo across {active_months} mo"
                timeline_shift_note_bn = f"এই মাসে বিরতি — নির্দিষ্ট সময় অপরিবর্তিত। বাকি {active_months} মাসে ৳{int(required_monthly):,}/মাস প্রয়োজন"
            elif saved > 0 and remaining_amt > 0:
                timeline_shift_note_en = f"Fixed deadline: ৳{int(required_monthly):,}/mo needed for remaining {remaining_months} month{'s' if remaining_months > 1 else ''}"
                timeline_shift_note_bn = f"নির্দিষ্ট সময়কাল: বাকি {remaining_months} মাসে ৳{int(required_monthly):,}/মাস প্রয়োজন"
            else:
                timeline_shift_note_en = f"Fixed deadline: {total_planned_months} months · ৳{int(required_monthly):,}/mo"
                timeline_shift_note_bn = f"নির্দিষ্ট সময়কাল: {total_planned_months} মাস · ৳{int(required_monthly):,}/মাস"
        else:
            # Mode A: By Monthly Budget
            months_left = math.ceil(remaining_amt / commitment) if commitment > 0 else 0
            total_months_shift = months_left + (1 if is_paused else 0)
            target_year = now.year + (now.month + total_months_shift - 1) // 12
            target_month = (now.month + total_months_shift - 1) % 12 + 1
            target_completion_date = f"{month_names_en[target_month]} {target_year}"
            target_completion_date_bn = f"{month_names_bn[target_month]} {target_year}"
            required_monthly_savings = commitment

            if missed > 0 or is_paused:
                total_missed = missed + (1 if is_paused else 0)
                timeline_shift_note_en = f"{total_missed} month{'s' if total_missed > 1 else ''} paused — target timeline shifted by +{total_missed} month{'s' if total_missed > 1 else ''}"
                timeline_shift_note_bn = f"{total_missed} মাস বিরতি নেওয়া হয়েছে — অর্জনের সময়কাল +{total_missed} মাস পিছিয়েছে"
            elif saved > 0:
                timeline_shift_note_en = f"Monthly budget on track · ~{months_left} month{'s' if months_left != 1 else ''} left"
                timeline_shift_note_bn = f"মাসিক বাজেট অনুযায়ী চলমান · আনুমানিক {months_left} মাস বাকি"
            else:
                timeline_shift_note_en = None
                timeline_shift_note_bn = None

        data["progress_pct"] = progress_pct
        data["remaining_amount"] = remaining_amt
        data["estimated_months_left"] = months_left
        data["target_completion_date"] = target_completion_date
        data["target_completion_date_bn"] = target_completion_date_bn
        data["timeline_shift_note_en"] = timeline_shift_note_en
        data["timeline_shift_note_bn"] = timeline_shift_note_bn
        data["planning_mode"] = planning_mode
        data["target_months"] = target_months
        data["target_date"] = target_date_raw or target_completion_date
        data["required_monthly_savings"] = required_monthly_savings
        data["monthly_commitment"] = commitment
        data["is_paused"] = is_paused
        data["is_active"] = bool(data.get("is_active", 1))
        return data

    def get_active_goal(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM savings_goals
                WHERE user_id = ? AND is_active = 1
                ORDER BY created_at DESC
                LIMIT 1
            """, (user_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._format_goal_data(row)

    def get_user_goals(self, user_id: str) -> List[Dict[str, Any]]:
        # 1. If SQLite has 0 goals for this user and Supabase is active, restore from Supabase
        if self.supabase:
            try:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM savings_goals WHERE user_id = ?", (user_id,))
                    count = cursor.fetchone()[0]
                if count == 0:
                    sb_uid = self._to_uuid(user_id)
                    sb_res = self.supabase.table('savings_goals').select('*').eq('user_id', sb_uid).execute()
                    if sb_res.data:
                        with self._get_connection() as conn:
                            cursor = conn.cursor()
                            for g in sb_res.data:
                                cursor.execute("""
                                    INSERT OR REPLACE INTO savings_goals (
                                        id, user_id, title, target_amount, current_saved,
                                        monthly_commitment, is_paused, missed_months, category, start_date, is_active,
                                        created_at, updated_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (
                                    g.get('id', str(uuid.uuid4())),
                                    user_id,
                                    g.get('title', 'Dream Goal'),
                                    float(g.get('target_amount') or 0),
                                    float(g.get('current_saved') or 0),
                                    float(g.get('monthly_commitment') or 500),
                                    1 if g.get('is_paused') else 0,
                                    int(g.get('missed_months') or 0),
                                    g.get('category', 'Gadget'),
                                    g.get('start_date', datetime.now().strftime("%Y-%m-%d")),
                                    1 if g.get('is_active') else 0,
                                    g.get('created_at', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                                    g.get('updated_at', datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                                ))
                            conn.commit()
            except Exception as e:
                print(f"[Supabase sync notice] get_user_goals restore: {e}")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM savings_goals
                WHERE user_id = ?
                ORDER BY created_at DESC
                """, (user_id,))
            rows = cursor.fetchall()
            return [self._format_goal_data(r) for r in rows]

    def get_savings_goals(self, user_id: str) -> List[Dict[str, Any]]:
        """Convenience alias for get_user_goals."""
        return self.get_user_goals(user_id)

    def create_savings_goal(
        self,
        user_id: str,
        title: str,
        target_amount: float,
        monthly_commitment: float,
        initial_saved: float = 0.0,
        category: str = 'Gadget',
        planning_mode: str = 'monthly_amount',
        target_months: int = 6,
        target_date: Optional[str] = None
    ) -> Dict[str, Any]:
        goal_id = str(uuid.uuid4())
        start_date = datetime.now().strftime("%Y-%m-%d")

        if planning_mode == 'target_timeline':
            t_months = max(1, target_months)
            effective_commitment = float(math.ceil(max(0.0, target_amount - initial_saved) / t_months))
            monthly_commitment = effective_commitment

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Deactivate previous active goals
            cursor.execute("UPDATE savings_goals SET is_active = 0 WHERE user_id = ?", (user_id,))
            cursor.execute("""
                INSERT INTO savings_goals (
                    id, user_id, title, target_amount, current_saved,
                    monthly_commitment, is_paused, missed_months, category, start_date, is_active,
                    planning_mode, target_months, target_date
                ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 1, ?, ?, ?)
            """, (
                goal_id, user_id, title.strip(), target_amount, initial_saved,
                monthly_commitment, category, start_date,
                planning_mode, target_months, target_date
            ))
            conn.commit()

        if self.supabase:
            try:
                full_goal = {
                    'id': self._to_uuid(goal_id),
                    'user_id': self._to_uuid(user_id),
                    'title': title.strip(),
                    'target_amount': float(target_amount),
                    'current_saved': float(initial_saved),
                    'monthly_commitment': float(monthly_commitment),
                    'is_paused': False,
                    'missed_months': 0,
                    'category': category,
                    'start_date': start_date,
                    'is_active': True,
                    'planning_mode': planning_mode,
                    'target_months': int(target_months),
                    'target_date': target_date,
                }
                sb_goal = {k: v for k, v in full_goal.items() if k in SUPABASE_GOAL_COLUMNS}
                self.supabase.table('savings_goals').insert(sb_goal).execute()
            except Exception as e:
                print(f"[Supabase sync notice] create_savings_goal: {e}")

        # Update user profile's target_savings to match commitment
        self.update_target_savings(user_id, monthly_commitment)
        return self.get_active_goal(user_id)

    def boost_savings_goal(self, goal_id: str, user_id: str, amount: float) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE savings_goals
                SET current_saved = current_saved + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            """, (amount, goal_id, user_id))
            conn.commit()

        goal = self.get_active_goal(user_id)
        if goal and goal.get("planning_mode") == "target_timeline" and not goal.get("is_paused"):
            new_required = goal.get("required_monthly_savings", goal.get("monthly_commitment"))
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE savings_goals
                    SET monthly_commitment = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND user_id = ?
                """, (new_required, goal_id, user_id))
                conn.commit()
            self.update_target_savings(user_id, new_required)
            goal["monthly_commitment"] = new_required

        if self.supabase and goal:
            try:
                self.supabase.table('savings_goals').update({
                    'current_saved': float(goal['current_saved']),
                    'monthly_commitment': float(goal.get('monthly_commitment', 500.0)),
                }).eq('id', self._to_uuid(goal_id)).execute()
            except Exception as e:
                print(f"[Supabase sync notice] boost_savings_goal: {e}")

        return goal

    def toggle_goal_pause(self, goal_id: str, user_id: str) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT is_paused, missed_months, planning_mode FROM savings_goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Goal not found")
            new_paused = 0 if row["is_paused"] else 1
            new_missed = row["missed_months"] + (1 if new_paused == 1 else 0)
            cursor.execute("""
                UPDATE savings_goals
                SET is_paused = ?, missed_months = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            """, (new_paused, new_missed, goal_id, user_id))
            conn.commit()

        goal = self.get_active_goal(user_id)
        if goal:
            if goal.get("planning_mode") == "target_timeline" and not goal["is_paused"]:
                new_required = goal.get("required_monthly_savings", goal.get("monthly_commitment"))
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE savings_goals
                        SET monthly_commitment = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND user_id = ?
                    """, (new_required, goal_id, user_id))
                    conn.commit()
                self.update_target_savings(user_id, new_required)
                goal["monthly_commitment"] = new_required
            else:
                new_target = 0.0 if goal["is_paused"] else goal["monthly_commitment"]
                self.update_target_savings(user_id, new_target)

        if self.supabase:
            try:
                self.supabase.table('savings_goals').update({
                    'is_paused': bool(new_paused),
                    'missed_months': int(new_missed),
                }).eq('id', self._to_uuid(goal_id)).execute()
            except Exception as e:
                print(f"[Supabase sync notice] toggle_goal_pause: {e}")

        return goal

    def sweep_leftover_to_goal(self, goal_id: str, user_id: str, amount: float) -> Dict[str, Any]:
        return self.boost_savings_goal(goal_id, user_id, amount)

    def delete_savings_goal(self, goal_id: str, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM savings_goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
            conn.commit()
            deleted = cursor.rowcount > 0

        if deleted:
            rem = self.get_active_goal(user_id)
            if rem and not rem.get("is_paused"):
                self.update_target_savings(user_id, rem.get("required_monthly_savings", rem.get("monthly_commitment", 0.0)))
            else:
                self.update_target_savings(user_id, 0.0)

        if self.supabase and deleted:
            try:
                self.supabase.table('savings_goals').delete().eq('id', self._to_uuid(goal_id)).execute()
            except Exception as e:
                print(f"[Supabase sync notice] delete_savings_goal: {e}")

        return deleted

    def _dhaka_now(self) -> datetime:
        """Returns current Bangladesh Standard Time (Asia/Dhaka, UTC+6) without external pytz dependencies."""
        return datetime.utcnow() + timedelta(hours=6)

    def _get_global_30_winners(self) -> List[Dict[str, Any]]:
        """Reads the persistent First-100 30-day streak winners list from Supabase or local SQLite."""
        if self.supabase:
            try:
                res = (
                    self.supabase.table('monthly_archives')
                    .select('summary_json')
                    .eq('month', '__global_streak_30_winners__')
                    .limit(1)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    raw = res.data[0].get('summary_json')
                    parsed = raw if isinstance(raw, dict) else (json.loads(raw) if isinstance(raw, str) else {})
                    winners = parsed.get('winners', [])
                    if isinstance(winners, list):
                        return winners
            except Exception as e:
                print(f"[Supabase sync notice] _get_global_30_winners: {e}")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT summary_json FROM monthly_archives WHERE month = '__global_streak_30_winners__' LIMIT 1")
            row = cursor.fetchone()
            if row and row["summary_json"]:
                try:
                    parsed = json.loads(row["summary_json"])
                    winners = parsed.get("winners", [])
                    if isinstance(winners, list):
                        return winners
                except Exception:
                    pass
        return []

    def _save_global_30_winners(self, owner_user_id: str, winners: List[Dict[str, Any]]):
        """Persists the First-100 30-day streak winners registry to SQLite and Supabase."""
        global_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "__global_streak_30_winners__"))
        payload_json = json.dumps({"winners": winners[:100]})

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO monthly_archives (
                    id, user_id, month, total_income, total_spent, ending_balance, final_risk_score, summary_json
                ) VALUES (?, ?, '__global_streak_30_winners__', 0, 0, 0, 0, ?)
            """, (global_id, owner_user_id, payload_json))
            conn.commit()

        if self.supabase:
            try:
                sb_uid = self._to_uuid(owner_user_id)
                self.supabase.table('monthly_archives').upsert({
                    'id': global_id,
                    'user_id': sb_uid,
                    'month': '__global_streak_30_winners__',
                    'total_income': 0,
                    'total_spent': 0,
                    'ending_balance': 0,
                    'final_risk_score': 0,
                    'summary_json': payload_json,
                }).execute()
            except Exception as e:
                print(f"[Supabase sync notice] _save_global_30_winners: {e}")

    def get_streak_summary(self, user_id: str, check_in_today: bool = True) -> Dict[str, Any]:
        """
        Continuous cross-week streak engine:
        - Resets strictly if yesterday was missed (unless already checked in today).
        - Tracks longest_streak, 7-day current week breakdown (Sun-Sat), and 80% monthly consistency.
        - Awards First 100 users who reach >= 30 continuous streak days via Supabase global registry.
        """
        now_dt = self._dhaka_now()
        today_str = now_dt.strftime("%Y-%m-%d")
        yesterday_str = (now_dt - timedelta(days=1)).strftime("%Y-%m-%d")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT on_track_streak, last_streak_date, is_pro, subscription_expiry FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()

        sqlite_streak = int((row["on_track_streak"] or 0) if row else 0)
        sqlite_last = row["last_streak_date"] if row else None

        # Restore from Supabase settings if available so restarts never wipe streak
        extra = self._get_user_settings_from_supabase(user_id) if self.supabase else {}
        sb_streak = int(extra.get("streak_current") or 0)
        sb_longest = int(extra.get("streak_longest") or 0)
        sb_last = extra.get("streak_last_date")
        active_dates: List[str] = extra.get("streak_active_dates") if isinstance(extra.get("streak_active_dates"), list) else []

        # Pick most recent source between SQLite and Supabase
        if sb_last and (not sqlite_last or sb_last >= sqlite_last):
            current_streak = sb_streak
            last_date = sb_last
        else:
            current_streak = sqlite_streak
            last_date = sqlite_last

        longest_streak = max(sb_longest, current_streak)

        if last_date and last_date not in active_dates:
            active_dates.append(last_date)

        changed = False
        if check_in_today:
            if last_date == today_str:
                current_streak = max(1, current_streak)
            elif last_date == yesterday_str:
                current_streak = max(1, current_streak + 1)
                last_date = today_str
                changed = True
            else:
                # Strict reset when >= 1 day was missed (or first day)
                current_streak = 1
                last_date = today_str
                changed = True

            if today_str not in active_dates:
                active_dates.append(today_str)
                changed = True
        else:
            # Read-only check: if user missed yesterday and hasn't checked in today, streak is broken (0)
            if last_date not in (today_str, yesterday_str):
                if current_streak != 0:
                    current_streak = 0
                    changed = True

        longest_streak = max(longest_streak, current_streak)
        active_dates = sorted(set(d for d in active_dates if isinstance(d, str) and len(d) == 10))[-70:]

        # Monthly 80% consistency target
        month_prefix = now_dt.strftime("%Y-%m")
        days_in_month = calendar.monthrange(now_dt.year, now_dt.month)[1]
        monthly_completed_days = len([d for d in active_dates if d.startswith(month_prefix)])
        monthly_target_days = int(math.ceil(days_in_month * 0.80))
        monthly_pct = round(min(100.0, (monthly_completed_days / max(1, days_in_month)) * 100.0), 1)
        monthly_80_unlocked = monthly_completed_days >= monthly_target_days

        # Current week 7-day strip (Sun -> Sat)
        days_since_sunday = (now_dt.weekday() + 1) % 7
        week_start = now_dt - timedelta(days=days_since_sunday)
        day_labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        week_days = []
        for i in range(7):
            d_dt = week_start + timedelta(days=i)
            d_str = d_dt.strftime("%Y-%m-%d")
            if d_str in active_dates:
                status = "completed"
            elif d_str == today_str:
                status = "today"
            elif d_str < today_str:
                status = "missed"
            else:
                status = "upcoming"
            week_days.append({
                "day_label": day_labels[i],
                "date": d_str,
                "status": status,
            })

        # First 100 users 30-day streak challenge check
        winners = self._get_global_30_winners()
        sb_uid = self._to_uuid(user_id)
        user_rank: Optional[int] = None
        for w in winners:
            if w.get("user_id") in (user_id, sb_uid):
                user_rank = int(w.get("rank"))
                break

        is_eligible_user = user_id not in ("demo_student_001", "guest_local_001")
        if is_eligible_user and current_streak >= 30 and user_rank is None and len(winners) < 100:
            user_rank = len(winners) + 1
            winners.append({
                "rank": user_rank,
                "user_id": sb_uid,
                "achieved_at": today_str,
                "streak": current_streak,
            })
            self._save_global_30_winners(user_id, winners)
            # Grant 30-day Pro reward automatically
            expiry_str = (now_dt + timedelta(days=30)).strftime("%Y-%m-%d")
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE users SET is_pro = 1, subscription_expiry = ? WHERE id = ?",
                    (expiry_str, user_id),
                )
                conn.commit()
            if self.supabase:
                try:
                    self.supabase.table('profiles').update({
                        'is_pro': True,
                        'subscription_expiry': expiry_str,
                    }).eq('user_id', sb_uid).execute()
                except Exception as e:
                    print(f"[Supabase sync notice] streak 30 pro unlock: {e}")

        reward_spots_total = 100
        reward_spots_claimed = min(100, len(winners))
        reward_spots_remaining = max(0, 100 - reward_spots_claimed)
        reward_unlocked = user_rank is not None

        if changed or sb_streak != current_streak or sb_longest != longest_streak:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE users SET on_track_streak = ?, last_streak_date = ? WHERE id = ?",
                    (current_streak, last_date, user_id),
                )
                conn.commit()
            if self.supabase and is_eligible_user:
                self._save_user_settings_to_supabase(user_id, {
                    "streak_current": current_streak,
                    "streak_longest": longest_streak,
                    "streak_last_date": last_date,
                    "streak_active_dates": active_dates,
                    "streak_30_rank": user_rank,
                })

        return {
            "user_id": user_id,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_streak_date": last_date,
            "checked_in_today": last_date == today_str,
            "week_days": week_days,
            "monthly_completed_days": monthly_completed_days,
            "monthly_total_days": days_in_month,
            "monthly_target_days": monthly_target_days,
            "monthly_pct": monthly_pct,
            "monthly_80_unlocked": monthly_80_unlocked,
            "reward_spots_total": reward_spots_total,
            "reward_spots_claimed": reward_spots_claimed,
            "reward_spots_remaining": reward_spots_remaining,
            "user_30_day_rank": user_rank,
            "reward_unlocked": reward_unlocked,
        }

    def get_and_update_streak(self, user_id: str) -> int:
        summary = self.get_streak_summary(user_id, check_in_today=True)
        return int(summary.get("current_streak", 0))

    # --- USER DELETION & ACCOUNT REMOVAL ---
    def delete_user(self, user_id: str) -> bool:
        """
        Permanently purges a user and all associated records from SQLite
        and Supabase cloud tables.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for tbl, col in [
                ("expenses", "user_id"),
                ("incomes", "user_id"),
                ("savings_goals", "user_id"),
                ("mess_meals", "user_id"),
                ("risk_snapshots", "user_id"),
                ("month_end_checkins", "user_id"),
                ("monthly_archives", "user_id"),
                ("subscription_payments", "user_id"),
                ("streak_offer_applications", "user_id"),
                ("feedback_items", "user_id"),
                ("profiles", "user_id"),
                ("users", "id"),
            ]:
                try:
                    cursor.execute(f"DELETE FROM {tbl} WHERE {col} = ?", (user_id,))
                except Exception:
                    pass
            conn.commit()

        if self.supabase:
            try:
                user_uuid = self._to_uuid(user_id)
                for tbl in ['expenses', 'incomes', 'savings_goals', 'monthly_archives', 'profiles', 'users']:
                    try:
                        self.supabase.table(tbl).delete().eq('user_id' if tbl != 'users' else 'id', user_uuid).execute()
                    except Exception:
                        pass
                try:
                    self.supabase.auth.admin.delete_user(user_uuid)
                except Exception as e:
                    print(f"[Supabase sync notice] auth.admin.delete_user: {e}")
            except Exception as e:
                print(f"[Supabase sync notice] delete_user error: {e}")

        return True

    # --- MONTHLY FINANCIAL STATEMENT GENERATOR ---
    def generate_monthly_report(self, user_id: str, month: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates an executive, professional student monthly statement.
        Summarizes funds, ring-fenced fixed obligations, target savings,
        variable category spending, ledger transactions, and ML risk evaluation.
        """
        import calendar

        now = datetime.now()
        if not month:
            month = now.strftime("%Y-%m")

        try:
            year_val, month_val = map(int, month.split('-'))
            _, last_day = calendar.monthrange(year_val, month_val)
        except Exception:
            year_val, month_val = now.year, now.month
            _, last_day = calendar.monthrange(year_val, month_val)
            month = f"{year_val:04d}-{month_val:02d}"

        month_names = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        month_label = f"{month_names[month_val]} {year_val}"
        period_start = f"{month}-01"
        period_end = f"{month}-{last_day:02d}"

        # Month-end eligibility (last 7 days of current month, or any past month)
        is_current_month = (month == now.strftime("%Y-%m"))
        is_month_end_eligible = (not is_current_month) or (now.day >= 24)

        user = self.get_user(user_id) or {}
        profile = self.get_profile(user_id) or {}

        monthly_allowance_fixed = float(profile.get("monthly_allowance_fixed", 0.0) or 0.0)
        rent_mess_fixed = float(profile.get("monthly_rent_fixed", 0.0) or 0.0)
        mess_meal_fixed = float(profile.get("mess_meal_fixed", 0.0) or 0.0)
        academic_fee_fixed = float(profile.get("academic_fee_fixed", 0.0) or 0.0)
        target_savings = float(profile.get("target_savings", 0.0) or 0.0)

        total_fixed_obligations = round(rent_mess_fixed + mess_meal_fixed + academic_fee_fixed, 2)

        # Incomes query
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM incomes
                WHERE user_id = ? AND date LIKE ?
                ORDER BY date DESC, created_at DESC
            """, (user_id, f"{month}%"))
            income_rows = [dict(r) for r in cursor.fetchall()]

            # Expenses query
            cursor.execute("""
                SELECT * FROM expenses
                WHERE user_id = ? AND date LIKE ?
                ORDER BY date DESC, created_at DESC
            """, (user_id, f"{month}%"))
            expense_rows = [dict(r) for r in cursor.fetchall()]

            # Latest risk snapshot for this user
            cursor.execute("""
                SELECT risk_score_pct, risk_tier FROM risk_snapshots
                WHERE user_id = ?
                ORDER BY timestamp DESC LIMIT 1
            """, (user_id,))
            risk_row = cursor.fetchone()

        total_inflows_logged = round(sum(float(r.get("amount", 0.0)) for r in income_rows), 2)
        total_funds_available = round(max(total_inflows_logged, monthly_allowance_fixed), 2)
        if total_funds_available == 0:
            total_funds_available = total_inflows_logged

        variable_expenses_total = round(sum(float(r.get("amount", 0.0)) for r in expense_rows), 2)
        total_outflow = round(total_fixed_obligations + variable_expenses_total, 2)
        net_savings_surplus = round(total_funds_available - total_outflow, 2)

        savings_rate_pct = 0.0
        if total_funds_available > 0:
            savings_rate_pct = round(max(0.0, (net_savings_surplus / total_funds_available) * 100.0), 1)

        # Category Breakdown
        cat_map = {}
        for r in expense_rows:
            cat = r.get("category", "Other") or "Other"
            amt = float(r.get("amount", 0.0))
            if cat not in cat_map:
                cat_map[cat] = {"amount": 0.0, "count": 0}
            cat_map[cat]["amount"] += amt
            cat_map[cat]["count"] += 1

        categories_breakdown = []
        for cat, data in sorted(cat_map.items(), key=lambda x: x[1]["amount"], reverse=True):
            pct = round((data["amount"] / variable_expenses_total * 100.0), 1) if variable_expenses_total > 0 else 0.0
            categories_breakdown.append({
                "category": cat,
                "amount": round(data["amount"], 2),
                "percentage": pct,
                "count": data["count"]
            })

        # Payment Method Breakdown
        pm_map = {}
        for r in expense_rows:
            pm = r.get("payment_method", "Cash") or "Cash"
            amt = float(r.get("amount", 0.0))
            if pm not in pm_map:
                pm_map[pm] = {"amount": 0.0, "count": 0}
            pm_map[pm]["amount"] += amt
            pm_map[pm]["count"] += 1

        payment_methods_breakdown = []
        for pm, data in sorted(pm_map.items(), key=lambda x: x[1]["amount"], reverse=True):
            pct = round((data["amount"] / variable_expenses_total * 100.0), 1) if variable_expenses_total > 0 else 0.0
            payment_methods_breakdown.append({
                "payment_method": pm,
                "amount": round(data["amount"], 2),
                "percentage": pct,
                "count": data["count"]
            })

        # Chronological itemized transaction ledger
        combined_tx = []
        for inc in income_rows:
            combined_tx.append({
                "id": inc.get("id"),
                "type": "income",
                "category": inc.get("source", "Income"),
                "amount": float(inc.get("amount", 0.0)),
                "date": inc.get("date"),
                "payment_method": inc.get("payment_method", "Cash"),
                "note": inc.get("note")
            })
        for exp in expense_rows:
            combined_tx.append({
                "id": exp.get("id"),
                "type": "expense",
                "category": exp.get("category", "Expense"),
                "amount": float(exp.get("amount", 0.0)),
                "date": exp.get("date"),
                "payment_method": exp.get("payment_method", "Cash"),
                "note": exp.get("note")
            })
        combined_tx.sort(key=lambda x: x["date"], reverse=True)

        # Risk and discipline score
        risk_tier = risk_row["risk_tier"] if risk_row else "LOW RISK"
        risk_score_pct = float(risk_row["risk_score_pct"]) if risk_row else 20.0
        streak = int(user.get("on_track_streak", 0) or 0)
        discipline_score = round(max(10.0, min(100.0, 100.0 - (risk_score_pct * 0.7) + (min(streak, 10) * 3))), 1)

        # Executive summary text
        if net_savings_surplus >= target_savings and net_savings_surplus > 0:
            summary_en = f"Outstanding financial discipline! You maintained your fixed obligations and preserved ৳{net_savings_surplus:,.0f} net surplus, exceeding your ৳{target_savings:,.0f} protected savings target."
            summary_bn = f"চমৎকার আর্থিক শৃঙ্খলা! আপনি সমস্ত নির্দিষ্ট খরচ সম্পন্ন করে ৳{net_savings_surplus:,.0f} উদ্বৃত্ত রক্ষা করেছেন, যা আপনার লক্ষ্যমাত্রার ৳{target_savings:,.0f} এর চেয়ে বেশি।"
        elif net_savings_surplus >= 0:
            summary_en = f"Solid budget control. You stayed within your total student funds with a modest reserve of ৳{net_savings_surplus:,.0f} left."
            summary_bn = f"বাজেট নিয়ন্ত্রণে ছিল। আপনি মোট বাজেটের মধ্যেই ছিলেন এবং ৳{net_savings_surplus:,.0f} অবশিষ্ট রেখেছেন।"
        else:
            deficit = abs(net_savings_surplus)
            summary_en = f"Budget overage alert. Total outflow exceeded available funds by ৳{deficit:,.0f}. Keep discretionary expenses like dining out and snacks strictly capped."
            summary_bn = f"বাজেট ঘাটতি সতর্কতা। মোট খরচ বাজেটের চেয়ে ৳{deficit:,.0f} বেশি হয়েছে। ক্যাফে ও অনাকাঙ্ক্ষিত খরচ নিয়ন্ত্রণে রাখুন।"

        statement_id = f"PKT-{month.replace('-', '')}-{user_id[-6:].upper() if len(user_id) >= 6 else '0001'}"

        return {
            "status": "success",
            "statement_id": statement_id,
            "month": month,
            "month_label": month_label,
            "period_start": period_start,
            "period_end": period_end,
            "is_month_end_eligible": is_month_end_eligible,
            "generated_at": now.strftime("%d %b %Y, %I:%M %p"),
            "student_name": user.get("full_name") or "Student",
            "university_type": profile.get("university_type"),
            "year_of_study": profile.get("year_of_study"),
            "living_arrangement": profile.get("where_you_live"),
            "total_funds_available": total_funds_available,
            "total_inflows_logged": total_inflows_logged,
            "rent_mess_fixed": rent_mess_fixed,
            "mess_meal_fixed": mess_meal_fixed,
            "academic_fee_fixed": academic_fee_fixed,
            "total_fixed_obligations": total_fixed_obligations,
            "variable_expenses_total": variable_expenses_total,
            "total_outflow": total_outflow,
            "protected_savings_target": target_savings,
            "net_savings_surplus": net_savings_surplus,
            "savings_rate_pct": savings_rate_pct,
            "spending_discipline_score": discipline_score,
            "risk_tier": risk_tier,
            "streak_days": streak,
            "executive_summary_en": summary_en,
            "executive_summary_bn": summary_bn,
            "categories_breakdown": categories_breakdown,
            "payment_methods_breakdown": payment_methods_breakdown,
            "transactions": combined_tx
        }

    # --- 10. CAMPUS PEER DEBT & LENDING METHODS (দেনা-পাওনা) ---
    def add_peer_debt(
        self,
        user_id: str,
        debt_type: str,  # 'owed_to_me' or 'i_owe'
        person_name: str,
        amount: float,
        note: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> Dict[str, Any]:
        debt_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO peer_debts (id, user_id, type, person_name, amount, note, due_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (debt_id, user_id, debt_type, person_name.strip(), float(amount), (note or "").strip(), due_date))
            conn.commit()

        return {
            "id": debt_id,
            "user_id": user_id,
            "type": debt_type,
            "person_name": person_name.strip(),
            "amount": float(amount),
            "note": note,
            "due_date": due_date,
            "is_settled": False,
            "settled_at": None,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def get_peer_debts(self, user_id: str, status: str = "all") -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT id, user_id, type, person_name, amount, note, due_date, is_settled, settled_at, created_at FROM peer_debts WHERE user_id = ?"
            params = [user_id]
            if status == "active":
                query += " AND is_settled = 0"
            elif status == "settled":
                query += " AND is_settled = 1"
            query += " ORDER BY is_settled ASC, created_at DESC"

            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()

        debts = []
        total_owed_to_me = 0.0
        total_i_owe = 0.0

        for r in rows:
            is_settled = bool(r[7])
            amt = float(r[4])
            dtype = r[2]

            if not is_settled:
                if dtype == "owed_to_me":
                    total_owed_to_me += amt
                elif dtype == "i_owe":
                    total_i_owe += amt

            debts.append({
                "id": r[0],
                "user_id": r[1],
                "type": dtype,
                "person_name": r[3],
                "amount": amt,
                "note": r[5],
                "due_date": r[6],
                "is_settled": is_settled,
                "settled_at": r[8],
                "created_at": str(r[9])
            })

        return {
            "debts": debts,
            "total_owed_to_me": round(total_owed_to_me, 1),
            "total_i_owe": round(total_i_owe, 1),
            "net_peer_balance": round(total_owed_to_me - total_i_owe, 1)
        }

    def settle_peer_debt(self, debt_id: str, user_id: str, create_transaction: bool = True) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, type, person_name, amount, note FROM peer_debts WHERE id = ? AND user_id = ?", (debt_id, user_id))
            row = cursor.fetchone()
            if not row:
                return None

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("UPDATE peer_debts SET is_settled = 1, settled_at = ? WHERE id = ?", (now_str, debt_id))
            conn.commit()

        debt_type, person_name, amount, note = row[1], row[2], float(row[3]), row[4]

        # Optional: Auto-create cashflow transaction to replenish or update student budget
        if create_transaction:
            today_str = datetime.now().strftime("%Y-%m-%d")
            if debt_type == "owed_to_me":
                # Friend repaid us -> logs income to replenish safe daily limit!
                self.add_income(
                    user_id=user_id,
                    amount=amount,
                    source="Gift",
                    payment_method="Cash",
                    note=f"Peer repayment from {person_name} ({note or 'Settled'})",
                    date=today_str
                )
            elif debt_type == "i_owe":
                # We repaid friend -> logs expense
                self.add_expense(
                    user_id=user_id,
                    amount=amount,
                    category="Borrowing",
                    payment_method="Cash",
                    note=f"Repaid loan to {person_name} ({note or 'Settled'})",
                    date=today_str
                )

        return {"status": "success", "debt_id": debt_id, "is_settled": True, "settled_at": now_str}

    def delete_peer_debt(self, debt_id: str, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM peer_debts WHERE id = ? AND user_id = ?", (debt_id, user_id))
            conn.commit()
            return cursor.rowcount > 0

    # --- 11. PERSONAL MESS MEAL & DEPOSIT METHODS (আমার মেস মিল) ---
    def _sync_mess_meals_to_supabase(self, user_id: str):
        """Persists all user mess_meals entries into Supabase __user_settings__ so cold starts never lose meals."""
        if not self.supabase:
            return
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT date, meal_count FROM mess_meals WHERE user_id = ?", (user_id,))
                rows = cursor.fetchall()
            meals_map = {r[0]: float(r[1]) for r in rows}
            self._save_user_settings_to_supabase(user_id, {"mess_meals_map": meals_map})
        except Exception as e:
            print(f"[Supabase sync notice] _sync_mess_meals: {e}")

    def _restore_mess_meals_from_supabase(self, user_id: str):
        """Restores mess_meals from Supabase __user_settings__ into local SQLite when SQLite is empty."""
        if not self.supabase:
            return
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM mess_meals WHERE user_id = ?", (user_id,))
                count = cursor.fetchone()[0]
            if count == 0:
                extra = self._get_user_settings_from_supabase(user_id)
                meals_map = extra.get("mess_meals_map")
                if isinstance(meals_map, dict) and meals_map:
                    with self._get_connection() as conn:
                        cursor = conn.cursor()
                        for d_key, m_cnt in meals_map.items():
                            cursor.execute("""
                                INSERT OR REPLACE INTO mess_meals (id, user_id, date, meal_count, note)
                                VALUES (?, ?, ?, ?, ?)
                            """, (str(uuid.uuid4()), user_id, str(d_key), float(m_cnt), "Restored from cloud"))
                        conn.commit()
        except Exception as e:
            print(f"[Supabase sync notice] _restore_mess_meals: {e}")

    def log_mess_meal(self, user_id: str, date: str, meal_count: float, note: Optional[str] = None) -> Dict[str, Any]:
        meal_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO mess_meals (id, user_id, date, meal_count, note)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    meal_count = excluded.meal_count,
                    note = excluded.note
            """, (meal_id, user_id, date, float(meal_count), (note or "").strip()))
            conn.commit()
        self._sync_mess_meals_to_supabase(user_id)

        return {"status": "success", "user_id": user_id, "date": date, "meal_count": float(meal_count)}

    def get_mess_summary(self, user_id: str, month: Optional[str] = None) -> Dict[str, Any]:
        now = self._dhaka_now()
        month_str = month or now.strftime("%Y-%m")
        profile = self.get_profile(user_id) or {}
        self._restore_mess_meals_from_supabase(user_id)

        meal_advance_paid = float(profile.get("mess_meal_fixed", 0.0))
        estimated_meal_rate = float(profile.get("estimated_meal_rate") or 50.0)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT date, meal_count, note
                FROM mess_meals
                WHERE user_id = ? AND date LIKE ?
                ORDER BY date ASC
            """, (user_id, f"{month_str}%"))
            rows = cursor.fetchall()

        meals_by_date = {}
        total_meals = 0.0
        for r in rows:
            date_key = r[0]
            count = float(r[1])
            meals_by_date[date_key] = count
            total_meals += count

        consumed_cost = round(total_meals * estimated_meal_rate, 1)
        balance = round(meal_advance_paid - consumed_cost, 1)
        balance_status = "surplus" if balance >= 0 else "deficit"

        return {
            "status": "success",
            "month": month_str,
            "total_meals": total_meals,
            "estimated_meal_rate": estimated_meal_rate,
            "meal_advance_paid": meal_advance_paid,
            "consumed_food_cost": consumed_cost,
            "balance_status": balance_status,
            "balance_amount": abs(balance),
            "days_logged": len([k for k in meals_by_date.keys() if not k.endswith("-00")]),
            "meals_by_date": meals_by_date,
            "enable_mess_meals": profile.get("enable_mess_meals", True)
        }

    def toggle_mess_meal_system(self, user_id: str, enable: bool) -> bool:
        self.get_profile(user_id)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE profiles SET enable_mess_meals = ? WHERE user_id = ?", (1 if enable else 0, user_id))
            conn.commit()
            updated = cursor.rowcount > 0
        self._save_user_settings_to_supabase(user_id, {'enable_mess_meals': bool(enable)})
        return updated

    def update_estimated_meal_rate(self, user_id: str, rate: float) -> bool:
        self.get_profile(user_id)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE profiles SET estimated_meal_rate = ? WHERE user_id = ?", (float(rate), user_id))
            conn.commit()
            updated = cursor.rowcount > 0
        self._save_user_settings_to_supabase(user_id, {'estimated_meal_rate': float(rate)})
        return updated

    def update_mess_total_meals(self, user_id: str, target_total_meals: float, month: Optional[str] = None) -> Dict[str, Any]:
        now = self._dhaka_now()
        month_str = month or now.strftime("%Y-%m")
        target_total = max(0.0, float(target_total_meals))
        self._restore_mess_meals_from_supabase(user_id)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT date, meal_count
                FROM mess_meals
                WHERE user_id = ? AND date LIKE ? AND date NOT LIKE ?
            """, (user_id, f"{month_str}%", f"{month_str}-00"))
            rows = cursor.fetchall()
            daily_logged_sum = sum(float(r[1]) for r in rows)

            offset_key = f"{month_str}-00"
            meal_id = str(uuid.uuid4())

            if target_total >= daily_logged_sum:
                offset = round(target_total - daily_logged_sum, 2)
            else:
                cursor.execute("""
                    DELETE FROM mess_meals
                    WHERE user_id = ? AND date LIKE ? AND date NOT LIKE ?
                """, (user_id, f"{month_str}%", f"{month_str}-00"))
                offset = target_total

            cursor.execute("""
                INSERT INTO mess_meals (id, user_id, date, meal_count, note)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    meal_count = excluded.meal_count,
                    note = excluded.note
            """, (meal_id, user_id, offset_key, offset, "Past meals adjustment / পূর্ববর্তী মিল হিসাব"))
            conn.commit()
        self._sync_mess_meals_to_supabase(user_id)

        return self.get_mess_summary(user_id, month=month_str)

    def update_mess_advance(self, user_id: str, meal_advance_paid: float) -> bool:
        self.get_profile(user_id)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE profiles SET mess_meal_fixed = ? WHERE user_id = ?", (float(meal_advance_paid), user_id))
            conn.commit()
            updated = cursor.rowcount > 0
        self._save_user_settings_to_supabase(user_id, {'mess_meal_fixed': float(meal_advance_paid)})
        return updated

    # --- STREAK LEADERBOARD, DYNAMIC OFFERS & ADMIN OPERATIONS ---
    def _get_global_doc(self, month_key: str) -> Dict[str, Any]:
        """Reads a global JSON document from Supabase monthly_archives with SQLite fallback."""
        if self.supabase:
            try:
                res = (
                    self.supabase.table('monthly_archives')
                    .select('summary_json')
                    .eq('month', month_key)
                    .limit(1)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    raw = res.data[0].get('summary_json')
                    if isinstance(raw, dict):
                        return raw
                    if isinstance(raw, str):
                        return json.loads(raw)
            except Exception as e:
                print(f"[Supabase sync notice] _get_global_doc({month_key}): {e}")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT summary_json FROM monthly_archives WHERE month = ? LIMIT 1", (month_key,))
            row = cursor.fetchone()
            if row and row["summary_json"]:
                try:
                    return json.loads(row["summary_json"])
                except Exception:
                    pass
        return {}

    def _save_global_doc(self, month_key: str, data: Dict[str, Any], owner_user_id: Optional[str] = None):
        """Persists a global JSON document to SQLite & Supabase monthly_archives."""
        doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, month_key))
        payload_json = json.dumps(data)
        local_uid = owner_user_id or "demo_student_001"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO monthly_archives (
                    id, user_id, month, total_income, total_spent, ending_balance, final_risk_score, summary_json
                ) VALUES (?, ?, ?, 0, 0, 0, 0, ?)
            """, (doc_id, local_uid, month_key, payload_json))
            conn.commit()

        if self.supabase:
            try:
                sb_uid = self._to_uuid(owner_user_id) if owner_user_id else None
                if not sb_uid or sb_uid == '00000000-0000-0000-0000-000000000001':
                    # Pick any valid auth user UUID if owner wasn't provided
                    try:
                        auth_list = self.supabase.auth.admin.list_users(page=1, per_page=1)
                        if auth_list and len(auth_list) > 0:
                            sb_uid = auth_list[0].id
                    except Exception:
                        pass
                if sb_uid:
                    self.supabase.table('monthly_archives').upsert({
                        'id': doc_id,
                        'user_id': sb_uid,
                        'month': month_key,
                        'total_income': 0,
                        'total_spent': 0,
                        'ending_balance': 0,
                        'final_risk_score': 0,
                        'summary_json': payload_json,
                    }).execute()
            except Exception as e:
                print(f"[Supabase sync notice] _save_global_doc({month_key}): {e}")

    def get_streak_offers(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        doc = self._get_global_doc("__global_streak_offers__")
        offers = doc.get("offers")
        if not isinstance(offers, list) or len(offers) == 0:
            offers = [{
                "id": "offer_30d_smart_coach",
                "title": "30 Days Free Smart Coach",
                "title_bn": "৩০ দিনের ফ্রি স্মার্ট কোচ অফার",
                "description": "Complete a continuous 30-day streak to apply for 30 days of free Pockit Smart Coach Pro (First 100 eligible students).",
                "description_bn": "একটানা ৩০ দিন স্ট্রিক পূর্ণ করে প্রথম ১০০ জনের মধ্যে ৩০ দিনের ফ্রি স্মার্ট কোচ প্রো অফারের জন্য আবেদন করুন।",
                "min_streak": 30,
                "reward_days": 30,
                "max_claims": 100,
                "is_active": True,
                "created_at": "2026-11-25",
            }]
        if include_inactive:
            return offers
        return [o for o in offers if o.get("is_active", True)]

    def upsert_streak_offer(self, offer: Dict[str, Any], owner_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        offers = self.get_streak_offers(include_inactive=True)
        oid = offer.get("id") or f"offer_{str(uuid.uuid4())[:8]}"
        new_item = {
            "id": oid,
            "title": str(offer.get("title", "Streak Reward")).strip(),
            "title_bn": str(offer.get("title_bn") or offer.get("title", "স্ট্রিক অফার")).strip(),
            "description": str(offer.get("description", "")).strip(),
            "description_bn": str(offer.get("description_bn") or offer.get("description", "")).strip(),
            "min_streak": int(offer.get("min_streak") or 30),
            "reward_days": int(offer.get("reward_days") or 30),
            "max_claims": int(offer.get("max_claims") or 100),
            "is_active": bool(offer.get("is_active", True)),
            "created_at": offer.get("created_at") or self._dhaka_now().strftime("%Y-%m-%d"),
        }
        replaced = False
        for i, existing in enumerate(offers):
            if existing.get("id") == oid:
                offers[i] = new_item
                replaced = True
                break
        if not replaced:
            offers.insert(0, new_item)
        self._save_global_doc("__global_streak_offers__", {"offers": offers}, owner_user_id)
        return offers

    def delete_streak_offer(self, offer_id: str) -> bool:
        offers = self.get_streak_offers(include_inactive=True)
        filtered = [o for o in offers if o.get("id") != offer_id]
        if len(filtered) == len(offers):
            return False
        self._save_global_doc("__global_streak_offers__", {"offers": filtered})
        return True

    def admin_list_offer_applications(self) -> List[Dict[str, Any]]:
        doc = self._get_global_doc("__global_streak_applications__")
        apps = doc.get("applications", [])
        return apps if isinstance(apps, list) else []

    def get_user_offer_applications(self, user_id: str) -> List[Dict[str, Any]]:
        sb_uid = self._to_uuid(user_id)
        return [a for a in self.admin_list_offer_applications() if a.get("user_id") in (user_id, sb_uid)]

    def apply_for_streak_offer(self, user_id: str, offer_id: str) -> Dict[str, Any]:
        offers = self.get_streak_offers(include_inactive=False)
        offer = next((o for o in offers if o.get("id") == offer_id), None)
        if not offer:
            raise ValueError("Offer not found or inactive.")

        streak_info = self.get_streak_summary(user_id, check_in_today=False)
        eligible_streak = max(int(streak_info.get("current_streak") or 0), int(streak_info.get("longest_streak") or 0))
        min_req = int(offer.get("min_streak") or 30)
        if eligible_streak < min_req:
            raise ValueError(f"You need at least {min_req} streak days to apply (current: {eligible_streak}).")

        apps = self.admin_list_offer_applications()
        sb_uid = self._to_uuid(user_id)
        for existing in apps:
            if existing.get("user_id") in (user_id, sb_uid) and existing.get("offer_id") == offer_id:
                if existing.get("status") in ("pending", "approved"):
                    return existing

        approved_count = sum(1 for a in apps if a.get("offer_id") == offer_id and a.get("status") == "approved")
        if approved_count >= int(offer.get("max_claims") or 100):
            raise ValueError("All spots for this offer have been claimed.")

        user = self.get_user(user_id) or {}
        new_app = {
            "id": str(uuid.uuid4()),
            "user_id": sb_uid,
            "raw_user_id": user_id,
            "user_name": user.get("calling_name") or user.get("full_name") or "Student",
            "user_email": user.get("email") or "",
            "offer_id": offer_id,
            "offer_title": offer.get("title"),
            "reward_days": int(offer.get("reward_days") or 30),
            "streak_at_apply": eligible_streak,
            "status": "pending",
            "admin_note": "",
            "applied_at": self._dhaka_now().strftime("%Y-%m-%d %H:%M:%S"),
            "reviewed_at": None,
        }
        apps.insert(0, new_app)
        self._save_global_doc("__global_streak_applications__", {"applications": apps}, user_id)
        return new_app

    def admin_review_offer_application(self, app_id: str, action: str, admin_note: str = "") -> Optional[Dict[str, Any]]:
        apps = self.admin_list_offer_applications()
        target = None
        for a in apps:
            if a.get("id") == app_id:
                target = a
                break
        if not target:
            return None

        target["status"] = "approved" if action == "approve" else "rejected"
        target["admin_note"] = admin_note
        target["reviewed_at"] = self._dhaka_now().strftime("%Y-%m-%d %H:%M:%S")
        self._save_global_doc("__global_streak_applications__", {"applications": apps}, target.get("user_id"))

        if action == "approve":
            reward_days = int(target.get("reward_days") or 30)
            self.admin_set_pro_status(target["user_id"], True, days=reward_days)
        return target

    def get_streak_leaderboard(self, user_id: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
        """Returns Top 10 continuous streak leaderboard + requesting user's rank & streak."""
        users = self.admin_list_all_users()
        ranked_pool = []
        for u in users:
            uid = u.get("id")
            if uid in ("demo_student_001", "guest_local_001"):
                continue
            cs = int(u.get("current_streak") or 0)
            ls = int(u.get("longest_streak") or cs)
            if cs > 0 or ls > 0:
                ranked_pool.append({
                    "user_id": uid,
                    "email": u.get("email", ""),
                    "full_name": u.get("full_name", "Student"),
                    "display_name": u.get("calling_name") or (u.get("full_name") or "Student").split()[0],
                    "current_streak": cs,
                    "longest_streak": ls,
                    "is_pro": bool(u.get("is_pro")),
                })
        ranked_pool.sort(key=lambda x: (x["current_streak"], x["longest_streak"]), reverse=True)
        for idx, item in enumerate(ranked_pool, 1):
            item["rank"] = idx

        my_rank = None
        my_streak = 0
        sb_uid = self._to_uuid(user_id) if user_id else None
        for item in ranked_pool:
            if item["user_id"] in (user_id, sb_uid):
                my_rank = item["rank"]
                my_streak = item["current_streak"]
                break

        return {
            "top_10": ranked_pool[:limit],
            "total_participants": len(ranked_pool),
            "my_rank": my_rank,
            "my_streak": my_streak,
        }

    def admin_list_all_users(self, search: str = "", filter_tier: str = "all") -> List[Dict[str, Any]]:
        """Merges Supabase Auth, profiles, __user_settings__, and SQLite users for the Admin Panel."""
        users_map: Dict[str, Dict[str, Any]] = {}

        # 1. Local SQLite users
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            for r in cursor.fetchall():
                d = dict(r)
                if d["id"] in ("demo_student_001", "guest_local_001") or bool(d.get("is_demo")):
                    continue
                users_map[d["id"]] = {
                    "id": d["id"],
                    "email": d.get("email", ""),
                    "full_name": d.get("full_name", "Student"),
                    "calling_name": d.get("calling_name"),
                    "is_demo": bool(d.get("is_demo")),
                    "is_pro": bool(d.get("is_pro")),
                    "subscription_expiry": d.get("subscription_expiry"),
                    "has_pin": bool(d.get("pin_code_hash")),
                    "avatar_url": d.get("avatar_url"),
                    "current_streak": int(d.get("on_track_streak") or 0),
                    "longest_streak": int(d.get("on_track_streak") or 0),
                    "last_streak_date": d.get("last_streak_date"),
                    "created_at": d.get("created_at"),
                }

        # 2. Supabase Auth + Profiles + Settings
        if self.supabase:
            try:
                sb_users = self.supabase.auth.admin.list_users(page=1, per_page=500)
                profs_res = self.supabase.table("profiles").select("*").execute()
                profs_by_uid = {p["user_id"]: p for p in (profs_res.data or [])}

                settings_res = self.supabase.table("monthly_archives").select("user_id, summary_json").eq("month", "__user_settings__").execute()
                settings_by_uid: Dict[str, Dict[str, Any]] = {}
                for srow in (settings_res.data or []):
                    raw = srow.get("summary_json")
                    try:
                        settings_by_uid[srow["user_id"]] = raw if isinstance(raw, dict) else json.loads(raw)
                    except Exception:
                        pass

                for su in (sb_users or []):
                    uid = su.id
                    email_norm = (su.email or "").strip().lower()
                    meta = su.user_metadata or {}
                    prof = profs_by_uid.get(uid, {})
                    ext = settings_by_uid.get(uid, {})
                    existing = users_map.get(uid, {})
                    if not existing and email_norm:
                        # Merge & remove any duplicate SQLite-only entry sharing the same email
                        dup_keys = [
                            k for k, v in users_map.items()
                            if k != uid and (v.get("email") or "").strip().lower() == email_norm
                        ]
                        for dk in dup_keys:
                            dup = users_map.pop(dk)
                            if not existing:
                                existing = dup
                            else:
                                existing["is_pro"] = existing.get("is_pro") or dup.get("is_pro")
                                existing["current_streak"] = max(existing.get("current_streak") or 0, dup.get("current_streak") or 0)
                                existing["longest_streak"] = max(existing.get("longest_streak") or 0, dup.get("longest_streak") or 0)
                    users_map[uid] = {
                        "id": uid,
                        "email": su.email or existing.get("email", ""),
                        "full_name": meta.get("full_name") or existing.get("full_name") or (su.email.split("@")[0] if su.email else "Student"),
                        "calling_name": ext.get("calling_name") or meta.get("calling_name") or existing.get("calling_name"),
                        "is_demo": False,
                        "is_pro": bool(prof.get("is_pro") or existing.get("is_pro")),
                        "subscription_expiry": prof.get("subscription_expiry") or existing.get("subscription_expiry"),
                        "has_pin": bool(prof.get("pin_code_hash") or existing.get("has_pin")),
                        "avatar_url": prof.get("avatar_url") or meta.get("avatar_url") or meta.get("picture") or existing.get("avatar_url"),
                        "current_streak": max(
                            int(ext.get("streak_current") if ext.get("streak_current") is not None else 0),
                            int(existing.get("current_streak") or 0),
                        ),
                        "longest_streak": max(
                            int(ext.get("streak_longest") if ext.get("streak_longest") is not None else 0),
                            int(existing.get("longest_streak") or 0),
                        ),
                        "last_streak_date": ext.get("streak_last_date") or existing.get("last_streak_date"),
                        "created_at": str(getattr(su, "created_at", "") or existing.get("created_at") or ""),
                        "monthly_allowance": float(prof.get("monthly_allowance_fixed") or existing.get("monthly_allowance") or 0),
                        "monthly_rent": float(prof.get("monthly_rent_fixed") or existing.get("monthly_rent") or 0),
                        "mess_meal": float(ext.get("mess_meal_fixed") or existing.get("mess_meal") or 0),
                        "target_savings": float(prof.get("target_savings") or existing.get("target_savings") or 0),
                        "university_type": prof.get("university_type") or existing.get("university_type"),
                        "where_you_live": prof.get("where_you_live") or existing.get("where_you_live"),
                    }
            except Exception as e:
                print(f"[Supabase sync notice] admin_list_all_users: {e}")

        result = list(users_map.values())
        q = search.strip().lower()
        if q:
            result = [u for u in result if q in (u.get("email") or "").lower() or q in (u.get("full_name") or "").lower() or q in (u.get("calling_name") or "").lower()]
        if filter_tier == "pro":
            result = [u for u in result if u.get("is_pro")]
        elif filter_tier == "free":
            result = [u for u in result if not u.get("is_pro")]
        elif filter_tier == "streak30":
            result = [u for u in result if (u.get("current_streak") or 0) >= 30]

        result.sort(key=lambda x: (x.get("created_at") or ""), reverse=True)
        return result

    def admin_build_research_dataset(self) -> List[Dict[str, Any]]:
        """
        Builds a clean, ML/academic research-ready dataset combining every student's
        onboarding/profile inputs, monthly income & category spending, time-of-day
        spending patterns, and month-end money depletion ('running out of money') flags.
        """
        users = self.admin_list_all_users()
        month_str = self._dhaka_now().strftime("%Y-%m")
        dataset: List[Dict[str, Any]] = []

        for u in users:
            uid = u["id"]
            prof = self.get_profile(uid) or {}
            expenses = self.get_expenses(uid, limit=1000)
            incomes = self.get_incomes(uid)

            total_income_added = sum(float(i.get("amount") or 0) for i in incomes)
            baseline_allowance = float(prof.get("monthly_allowance_fixed") or u.get("monthly_allowance") or 0)
            total_funds = baseline_allowance + sum(
                float(i.get("amount") or 0) for i in incomes if i.get("source") != "Family"
            )

            rent_fixed = float(prof.get("monthly_rent_fixed") or u.get("monthly_rent") or 0)
            mess_fixed = float(prof.get("mess_meal_fixed") or u.get("mess_meal") or 0)
            acad_fixed = float(prof.get("academic_fee_fixed") or 0)
            trans_fixed = float(prof.get("transport_fixed") or 0)
            enable_mess = bool(prof.get("enable_mess_meals", True))
            fixed_obligations = rent_fixed + (mess_fixed if enable_mess else 0.0) + acad_fixed + trans_fixed

            cat_totals: Dict[str, float] = {}
            morning_tx = afternoon_tx = evening_tx = late_night_tx = 0
            weekend_tx = weekday_tx = 0
            total_spent = 0.0

            for e in expenses:
                amt = float(e.get("amount") or 0)
                total_spent += amt
                cat = str(e.get("category") or "Other")
                cat_totals[cat] = cat_totals.get(cat, 0.0) + amt

                ts_raw = str(e.get("created_at") or e.get("date") or "")
                dt_obj = None
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
                    try:
                        dt_obj = datetime.strptime(ts_raw[:19], fmt)
                        break
                    except Exception:
                        pass
                if dt_obj:
                    if dt_obj.weekday() in (4, 5):  # Fri/Sat BD weekend
                        weekend_tx += 1
                    else:
                        weekday_tx += 1
                    hr = dt_obj.hour
                    if 6 <= hr < 12:
                        morning_tx += 1
                    elif 12 <= hr < 18:
                        afternoon_tx += 1
                    elif 18 <= hr <= 23:
                        evening_tx += 1
                    else:
                        late_night_tx += 1

            remaining_balance = total_funds - fixed_obligations - total_spent
            top_cat = max(cat_totals.items(), key=lambda kv: kv[1])[0] if cat_totals else "None"

            dataset.append({
                "user_id": uid,
                "email": u.get("email", ""),
                "full_name": u.get("full_name", ""),
                "month": month_str,
                "gender": prof.get("gender"),
                "age": prof.get("age"),
                "university_type": prof.get("university_type"),
                "year_of_study": prof.get("year_of_study"),
                "where_you_live": prof.get("where_you_live"),
                "main_source_of_money": prof.get("main_source_of_money"),
                "do_you_earn_income": prof.get("do_you_earn_income"),
                "monthly_allowance_fixed": baseline_allowance,
                "monthly_rent_fixed": rent_fixed,
                "mess_meal_fixed": mess_fixed,
                "enable_mess_meals": enable_mess,
                "estimated_meal_rate": prof.get("estimated_meal_rate", 50.0),
                "academic_fee_fixed": acad_fixed,
                "transport_fixed": trans_fixed,
                "target_savings": float(prof.get("target_savings") or 0),
                "awareness_score": prof.get("awareness_score"),
                "impulse_score": prof.get("impulse_score"),
                "track_spending": prof.get("track_spending"),
                "mobile_banking_use": prof.get("mobile_banking_use"),
                "borrowed_from_friends_baseline": prof.get("borrowed_from_friends_baseline"),
                "total_income_added": round(total_income_added, 2),
                "total_monthly_funds": round(total_funds, 2),
                "fixed_obligations": round(fixed_obligations, 2),
                "total_variable_spent": round(total_spent, 2),
                "remaining_balance": round(remaining_balance, 2),
                "ran_out_of_money": remaining_balance <= 0,
                "deficit_amount": round(max(0.0, -remaining_balance), 2),
                "top_spending_category": top_cat,
                "food_spent": round(cat_totals.get("Food", 0.0), 2),
                "transport_spent": round(cat_totals.get("Transport", 0.0), 2),
                "shopping_spent": round(cat_totals.get("Shopping", 0.0), 2),
                "entertainment_spent": round(cat_totals.get("Entertainment", 0.0), 2),
                "education_spent": round(cat_totals.get("Education", 0.0), 2),
                "other_spent": round(cat_totals.get("Other", 0.0), 2),
                "expense_count": len(expenses),
                "income_count": len(incomes),
                "morning_tx_count": morning_tx,
                "afternoon_tx_count": afternoon_tx,
                "evening_tx_count": evening_tx,
                "late_night_tx_count": late_night_tx,
                "weekday_tx_count": weekday_tx,
                "weekend_tx_count": weekend_tx,
                "current_streak": u.get("current_streak", 0),
                "longest_streak": u.get("longest_streak", 0),
                "is_pro": u.get("is_pro", False),
            })

        return dataset

    def admin_get_user_detail(self, user_id: str) -> Optional[Dict[str, Any]]:
        users = self.admin_list_all_users()
        sb_uid = self._to_uuid(user_id)
        user_obj = next((u for u in users if u.get("id") in (user_id, sb_uid)), None)
        if not user_obj:
            return None
        profile = self.get_profile(user_obj["id"])
        expenses = self.get_expenses(user_obj["id"], limit=20)
        incomes = self.get_incomes(user_obj["id"])
        goals = self.get_user_goals(user_obj["id"])
        streak = self.get_streak_summary(user_obj["id"], check_in_today=False)
        return {
            "user": user_obj,
            "profile": profile,
            "expenses": expenses,
            "incomes": incomes,
            "goals": goals,
            "streak": streak,
        }

    def admin_set_pro_status(self, user_id: str, is_pro: bool, days: int = 30) -> Dict[str, Any]:
        expiry = (self._dhaka_now() + timedelta(days=days)).strftime("%Y-%m-%d") if is_pro else None
        sb_uid = self._to_uuid(user_id)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET is_pro = ?, subscription_expiry = ? WHERE id IN (?, ?)",
                (1 if is_pro else 0, expiry, user_id, sb_uid),
            )
            conn.commit()
        if self.supabase:
            try:
                self.supabase.table("profiles").update({
                    "is_pro": bool(is_pro),
                    "subscription_expiry": expiry,
                }).eq("user_id", sb_uid).execute()
            except Exception as e:
                print(f"[Supabase sync notice] admin_set_pro_status: {e}")
        return {"user_id": user_id, "is_pro": is_pro, "subscription_expiry": expiry}

    def admin_reset_user_pin(self, user_id: str) -> bool:
        sb_uid = self._to_uuid(user_id)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET pin_code_hash = NULL WHERE id IN (?, ?)", (user_id, sb_uid))
            conn.commit()
        if self.supabase:
            try:
                self.supabase.table("profiles").update({"pin_code_hash": None}).eq("user_id", sb_uid).execute()
            except Exception as e:
                print(f"[Supabase sync notice] admin_reset_user_pin: {e}")
        return True

    def admin_adjust_user_streak(self, user_id: str, current_streak: int, longest_streak: Optional[int] = None) -> Dict[str, Any]:
        sb_uid = self._to_uuid(user_id)
        today_str = self._dhaka_now().strftime("%Y-%m-%d")
        long_val = max(current_streak, longest_streak if longest_streak is not None else current_streak)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET on_track_streak = ?, last_streak_date = ? WHERE id IN (?, ?)",
                (current_streak, today_str, user_id, sb_uid),
            )
            conn.commit()
        if self.supabase:
            self._save_user_settings_to_supabase(user_id, {
                "streak_current": int(current_streak),
                "streak_longest": int(long_val),
                "streak_last_date": today_str,
            })
        return {"user_id": user_id, "current_streak": current_streak, "longest_streak": long_val}

    def admin_list_payments(self) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        if self.supabase:
            try:
                res = self.supabase.table("subscription_payments").select("*").order("created_at", desc=True).limit(200).execute()
                if res.data:
                    rows = res.data
            except Exception as e:
                print(f"[Supabase sync notice] admin_list_payments: {e}")
        if not rows:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM subscription_payments ORDER BY created_at DESC LIMIT 200")
                rows = [dict(r) for r in cursor.fetchall()]
        return rows

    def admin_update_payment_status(self, payment_id: str, status: str) -> Optional[Dict[str, Any]]:
        target = None
        if self.supabase:
            try:
                res = self.supabase.table("subscription_payments").update({
                    "status": status,
                    "approved_at": self._dhaka_now().isoformat() if status == "approved" else None,
                }).eq("id", payment_id).execute()
                if res.data:
                    target = res.data[0]
            except Exception as e:
                print(f"[Supabase sync notice] admin_update_payment_status: {e}")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE subscription_payments SET status = ? WHERE id = ?", (status, payment_id))
            conn.commit()
            if not target:
                cursor.execute("SELECT * FROM subscription_payments WHERE id = ?", (payment_id,))
                row = cursor.fetchone()
                if row:
                    target = dict(row)
        if target and target.get("user_id"):
            self.admin_set_pro_status(target["user_id"], status == "approved", days=30)
        return target

    def admin_list_feedback(self) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        triage_doc = self._get_global_doc("__admin_feedback_triage__")
        triage_map = triage_doc.get("statuses", {}) if isinstance(triage_doc, dict) else {}

        if self.supabase:
            try:
                res = self.supabase.table("month_end_checkins").select("*").order("created_at", desc=True).limit(200).execute()
                for r in (res.data or []):
                    fid = r.get("id")
                    t_info = triage_map.get(fid, {})
                    items.append({
                        "id": fid,
                        "source": "month_end_checkin",
                        "user_id": r.get("user_id"),
                        "month": r.get("month"),
                        "actual_ran_out_of_money": bool(r.get("actual_ran_out_of_money")),
                        "predicted_risk_pct": r.get("final_risk_score_predicted"),
                        "spent_total": r.get("final_spent_total"),
                        "notes": r.get("feedback_notes") or "",
                        "status": t_info.get("status", "new"),
                        "admin_note": t_info.get("admin_note", ""),
                        "created_at": r.get("created_at"),
                    })
            except Exception as e:
                print(f"[Supabase sync notice] admin_list_feedback: {e}")

        if not items:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM month_end_checkins ORDER BY created_at DESC LIMIT 200")
                for r in cursor.fetchall():
                    d = dict(r)
                    fid = d["id"]
                    t_info = triage_map.get(fid, {})
                    items.append({
                        "id": fid,
                        "source": "month_end_checkin",
                        "user_id": d.get("user_id"),
                        "month": d.get("month"),
                        "actual_ran_out_of_money": bool(d.get("actual_ran_out_of_money")),
                        "predicted_risk_pct": d.get("final_risk_score_predicted"),
                        "spent_total": d.get("final_spent_total"),
                        "notes": d.get("feedback_notes") or "",
                        "status": t_info.get("status", "new"),
                        "admin_note": t_info.get("admin_note", ""),
                        "created_at": d.get("created_at"),
                    })
        return items

    def admin_update_feedback_status(self, item_id: str, status: str, admin_note: str = "") -> Dict[str, Any]:
        triage_doc = self._get_global_doc("__admin_feedback_triage__")
        statuses = triage_doc.get("statuses", {}) if isinstance(triage_doc, dict) else {}
        statuses[item_id] = {
            "status": status,
            "admin_note": admin_note,
            "updated_at": self._dhaka_now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        self._save_global_doc("__admin_feedback_triage__", {"statuses": statuses})
        return {"id": item_id, **statuses[item_id]}

    def admin_get_announcements(self) -> List[Dict[str, Any]]:
        doc = self._get_global_doc("__global_announcements__")
        items = doc.get("announcements", [])
        return items if isinstance(items, list) else []

    def admin_save_announcement(self, title: str, message: str, is_active: bool = True) -> List[Dict[str, Any]]:
        items = self.admin_get_announcements()
        items.insert(0, {
            "id": str(uuid.uuid4())[:8],
            "title": title.strip(),
            "message": message.strip(),
            "is_active": bool(is_active),
            "created_at": self._dhaka_now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        self._save_global_doc("__global_announcements__", {"announcements": items[:20]})
        return items[:20]

    def admin_get_overview(self) -> Dict[str, Any]:
        users = self.admin_list_all_users()
        real_users = [u for u in users if u.get("id") not in ("demo_student_001", "guest_local_001")]
        pro_count = sum(1 for u in real_users if u.get("is_pro"))
        today_str = self._dhaka_now().strftime("%Y-%m-%d")
        active_today = sum(1 for u in real_users if u.get("last_streak_date") == today_str)
        streak_30_plus = sum(1 for u in real_users if (u.get("current_streak") or 0) >= 30)

        payments = self.admin_list_payments()
        pending_payments = sum(1 for p in payments if p.get("status") == "pending")
        total_revenue = sum(float(p.get("amount") or 0) for p in payments if p.get("status") == "approved")

        apps = self.admin_list_offer_applications()
        pending_offer_apps = sum(1 for a in apps if a.get("status") == "pending")
        feedback_items = self.admin_list_feedback()
        winners = self._get_global_30_winners()

        # Category breakdown & total volume from Supabase expenses
        category_totals: Dict[str, float] = {}
        total_expense_vol = 0.0
        exp_count = 0
        if self.supabase:
            try:
                exp_res = self.supabase.table("expenses").select("amount, category").limit(1000).execute()
                for e in (exp_res.data or []):
                    amt = float(e.get("amount") or 0)
                    cat = e.get("category") or "Other"
                    category_totals[cat] = round(category_totals.get(cat, 0.0) + amt, 2)
                    total_expense_vol += amt
                    exp_count += 1
            except Exception as e:
                print(f"[Supabase sync notice] admin_get_overview expenses: {e}")

        return {
            "total_users": len(real_users),
            "pro_users": pro_count,
            "free_users": max(0, len(real_users) - pro_count),
            "active_today": active_today,
            "streak_30_plus_users": streak_30_plus,
            "first_100_claimed": len(winners),
            "first_100_remaining": max(0, 100 - len(winners)),
            "pending_payments": pending_payments,
            "pending_offer_applications": pending_offer_apps,
            "total_revenue_bdt": round(total_revenue, 2),
            "total_expense_volume_bdt": round(total_expense_vol, 2),
            "total_transactions": exp_count,
            "total_feedback_records": len(feedback_items),
            "category_breakdown": [{"category": k, "amount": v} for k, v in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)],
        }



db = Database()


