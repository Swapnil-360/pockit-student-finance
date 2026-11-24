# Database Schema & REST API Reference
## TakaTrack AI — Student Money & Risk Coach
**Document Version:** `2.5.0`  
**Last Updated:** `2026-11-22`  
**Database Engines:** Supabase PostgreSQL (Production) / SQLite3 (Local Mirror & Offline Store)

---

## Part 1: Relational Database Schema (DDL)

### 1. `users` Table
Stores primary student user accounts, subscription tiers, PIN authentication hashes, and profile avatar metadata.

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0,
    is_pro INTEGER DEFAULT 0,
    subscription_expiry TEXT DEFAULT NULL,
    pin_code_hash TEXT DEFAULT NULL,
    avatar_url TEXT DEFAULT NULL,
    daily_coach_queries_used INTEGER DEFAULT 0,
    daily_coach_queries_date TEXT DEFAULT NULL,
    on_track_streak INTEGER DEFAULT 0,
    last_streak_date TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 2. `profiles` Table
Stores baseline demographic info, baseline financial allowances, fixed rent/mess costs, and Likert habit survey responses.

```sql
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
    monthly_rent_fixed REAL DEFAULT 0.0,
    monthly_allowance_fixed REAL DEFAULT 10000.0,
    savings_goal_fixed REAL DEFAULT 1000.0,
    target_savings REAL DEFAULT 0.0,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### 3. `savings_goals` Table ("Dream Goal Vault")
Tracks long-term student milestone purchases (monitors, laptops, courses), monthly commitments, and pause/sweep states.

```sql
CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_saved REAL NOT NULL DEFAULT 0.0,
    monthly_commitment REAL NOT NULL DEFAULT 500.0,
    planning_mode TEXT NOT NULL DEFAULT 'monthly_amount', -- 'monthly_amount' (Mode A) or 'target_timeline' (Mode B)
    target_months INTEGER DEFAULT 0,                     -- Target duration in months (Mode B)
    target_date TEXT,                                    -- Target deadline YYYY-MM or display date
    is_paused INTEGER NOT NULL DEFAULT 0,
    missed_months INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'Gadget',
    start_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id, is_active);
```

### 4. `expenses` Table
Real-time expense logs categorized under the Three-Bucket system.

```sql
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    note TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
```

### 5. `incomes` Table
Tracks multi-source fund inflows (family, private tuition, freelance, scholarships, gifts).

```sql
CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    source TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    note TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON incomes(user_id, date);
```

### 6. `risk_snapshots` Table
Historical audit trail of machine learning risk inferences, probabilities, top drivers, and trigger events.

```sql
CREATE TABLE IF NOT EXISTS risk_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    risk_score_pct REAL NOT NULL,
    risk_tier TEXT NOT NULL,
    risk_tier_bn TEXT NOT NULL,
    monthly_spent_total REAL NOT NULL,
    projected_savings REAL NOT NULL,
    daily_safe_to_spend REAL NOT NULL,
    top_drivers_json TEXT,
    trigger_event TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_risk_snapshots_user ON risk_snapshots(user_id, timestamp);
```

### 7. `subscription_payments` Table
Records bKash / Nagad verification transaction IDs for the Tk 50/month Smart Coach tier.

```sql
CREATE TABLE IF NOT EXISTS subscription_payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    trx_id TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 50.0,
    status TEXT NOT NULL DEFAULT 'approved',
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_trx ON subscription_payments(trx_id);
```

### 8. `monthly_archives` Table
Stores immutable snapshots of past months for retrospective financial analytics.

```sql
CREATE TABLE IF NOT EXISTS monthly_archives (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    month TEXT NOT NULL,
    total_income REAL NOT NULL,
    total_spent REAL NOT NULL,
    fixed_rent_spent REAL NOT NULL,
    target_savings_committed REAL NOT NULL,
    actual_savings_left REAL NOT NULL,
    average_daily_spend REAL NOT NULL,
    final_risk_score REAL NOT NULL,
    category_totals_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_archives_user ON monthly_archives(user_id, month);
```

### 9. `month_end_checkins` Table
Stores ground-truth outcomes (whether the student actually ran out of money) for continuous ML model retraining.

```sql
CREATE TABLE IF NOT EXISTS month_end_checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    month TEXT NOT NULL,
    actual_ran_out_of_money INTEGER NOT NULL,
    final_risk_score_predicted REAL,
    final_spent_total REAL,
    feedback_notes TEXT,
    survey_row_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### 10. `storage.buckets` ('avatars' Bucket)
Stores persistent user avatar photos in Supabase Cloud Storage with public CDN URLs.

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;
```

---

## Part 2: Supabase Row-Level Security (RLS) Policies

To protect student financial privacy in production, RLS must be activated on all tables:

```sql
-- Enable Row Level Security on all user-owned tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE month_end_checkins ENABLE ROW LEVEL SECURITY;

-- 1. Users Policy
CREATE POLICY "Users can only read and update their own record"
ON users FOR ALL
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- 2. Profiles Policy
CREATE POLICY "Users can manage their own profile"
ON profiles FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 3. Savings Goals Policy
CREATE POLICY "Users can manage their own savings goals"
ON savings_goals FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 4. Expenses Policy
CREATE POLICY "Users can manage their own expenses"
ON expenses FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 5. Incomes Policy
CREATE POLICY "Users can manage their own income inflows"
ON incomes FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 6. Risk Snapshots Policy
CREATE POLICY "Users can view their own risk snapshots"
ON risk_snapshots FOR SELECT
USING (auth.uid()::text = user_id);

-- 7. Monthly Archives Policy
CREATE POLICY "Users can view their own monthly archives"
ON monthly_archives FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
```

---

## Part 3: Complete REST API Specification

### 1. Authentication & Security Endpoints

#### `POST /api/auth/register`
Creates a new student account.
- **Request Body:**
  ```json
  {
    "email": "student@du.ac.bd",
    "password": "SecurePassword123",
    "full_name": "Tanvir Hossain"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "usr_99f381ad",
      "email": "student@du.ac.bd",
      "full_name": "Tanvir Hossain",
      "is_demo": false,
      "is_pro": false,
      "avatar_url": null,
      "on_track_streak": 0
    },
    "has_profile": false,
    "has_pin": false
  }
  ```

#### `POST /api/auth/login`
Authenticates existing student credentials.
- **Request Body:** `{"email": "student@du.ac.bd", "password": "SecurePassword123"}`
- **Response (200 OK):** `AuthResponse` object.

#### `POST /api/auth/google`
Authenticates or registers via Google account with real-time profile picture and name synchronization.
- **Deterministic ID:** Generates a consistent `uuid.uuid5(uuid.NAMESPACE_DNS, email)` UUID used across SQLite and Supabase PostgreSQL.
- **Supabase Cloud Sync:** Automatically provisions the user in Supabase `auth.users` via `supabase.auth.admin.create_user` (or updates user metadata via `update_user_by_id`), and upserts their record in `public.profiles`.
- **Clean-Slate Routing:** New accounts return `has_profile: false`, launching the 4-step Onboarding Wizard so students configure their own authentic monthly allowance, rent/mess obligations, and target savings without dummy fixtures.
- **Universal Mobile Deep Linking & URL Configuration:** Uses dynamic `Linking.createURL('auth/callback')` (`exp://<LAN_IP>:8081/--/auth/callback` in Expo Go; `pockit://auth/callback` in standalone APKs) to handle Google OAuth flows seamlessly on physical Android and iOS devices. Requires `exp://**` and `pockit://**` in Supabase Dashboard Redirect URLs.
- **Request Body:**
  ```json
  {
    "email": "student@gmail.com",
    "full_name": "Md. Miftahur Rahman",
    "avatar_url": "https://lh3.googleusercontent.com/..."
  }
  ```
- **Response (200 OK):** `AuthResponse` object with `has_profile` flag (`false` for new users triggering onboarding, `true` for existing users) and user details including `avatar_url`.

#### Client-Side Offline Guest Mode Architecture (`GUEST_USER_ID = 'guest_local_user'`)
For students who choose "Continue as Guest" / "গেস্ট হিসেবে ব্যবহার করুন":
- **Zero Server Dependency:** Operates fully offline; transactions, profile survey, and savings goals are stored directly in device cache memory via `AsyncStorage` (`@takatrack_guest_profile`, `@takatrack_guest_expenses`, `@takatrack_guest_incomes`, `@takatrack_guest_goals`, `@takatrack_guest_dashboard`).
- **Authentic Fresh Slate:** Guests start with clean 0-state financial metrics (no mock student profiles or fake dummy numbers).
- **Client Pacing Engine:** `calculateGuestDashboard()` dynamically calculates Three-Bucket ring-fencing, remaining balance, and safe daily spending limit directly on the device.

#### `POST /api/auth/pin/set` & `POST /api/auth/pin/verify`
Sets or verifies the 4-digit security PIN lock.
- **Request Body:** `{"user_id": "usr_123", "pin_code": "1234"}`
- **Response (200 OK):** `{"success": true, "message": "PIN verified successfully"}`

#### `POST /api/user/{user_id}/avatar`
Uploads avatar image (base64 or remote URL) to Supabase Storage `avatars` bucket and updates the user profile with the persistent CDN URL.
- **Request Body:**
  ```json
  {
    "image_data": "data:image/jpeg;base64,..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "avatar_url": "https://gwxuxomnpvztfkcxdiym.supabase.co/storage/v1/object/public/avatars/00000000-0000-0000-0000-000000000001.jpg?t=1795351106",
    "status": "success"
  }
  ```

---

### 2. Dashboard & Financial Engine Endpoints

#### `GET /api/dashboard/{user_id}`
Returns the comprehensive real-time financial state, Three-Bucket numbers, ML risk score, streak, and dream goal.
- **Response (200 OK):**
  ```json
  {
    "user_id": "usr_123",
    "month_str": "2026-11",
    "days_in_month": 30,
    "current_day": 22,
    "days_remaining": 9,
    "total_monthly_money": 10000.0,
    "total_spent": 4530.0,
    "remaining_balance": 5470.0,
    "daily_safe_spending_limit": 496.7,
    "burn_status": "healthy",
    "recalibration_note_en": "Recalibrated to ৳496.7/day across remaining 9 days.",
    "recalibration_note_bn": "বাকি ৯ দিনের জন্য দৈনিক নিরাপদ সীমা ৳৪৯৬.৭ এ সমন্বয় করা হয়েছে।",
    "three_buckets": {
      "rent_and_mess_paid": 3500.0,
      "protected_target_savings": 1000.0,
      "variable_pocket_spent": 1030.0,
      "variable_pocket_left": 4470.0,
      "fixed_obligations_baseline": 3500.0
    },
    "risk_score": {
      "risk_score_pct": 28.4,
      "risk_tier": "LOW RISK",
      "risk_tier_bn": "কম ঝুঁকি",
      "top_drivers": []
    },
    "active_goal": {
      "id": "goal_1",
      "title": "LG UltraGear 27\" Gaming Monitor",
      "target_amount": 32000.0,
      "current_saved": 7900.0,
      "monthly_commitment": 1000.0,
      "progress_pct": 25.0,
      "is_paused": false
    },
    "on_track_streak": 5,
    "is_pro": false
  }
  ```

---

### 3. Ledger & Transaction Endpoints

#### `POST /api/expenses`
Logs an expense and triggers instant re-evaluation of the 24-feature ML risk model.
- **Request Body:**
  ```json
  {
    "user_id": "usr_123",
    "amount": 120.0,
    "category": "Food",
    "payment_method": "bKash",
    "note": "Lunch at canteen",
    "date": "2026-11-22"
  }
  ```

#### `POST /api/incomes`
Logs an income inflow (e.g. tuition payout) and expands the month's spendable variable pool.
- **Request Body:**
  ```json
  {
    "user_id": "usr_123",
    "amount": 3000.0,
    "source": "Tuition",
    "payment_method": "bKash",
    "note": "Class 10 Physics tuition fee",
    "date": "2026-11-22"
  }
  ```

---

### 4. Dream Goal Vault Endpoints

#### `POST /api/goals`
Creates a target savings goal.
- **Request Body:**
  ```json
  {
    "user_id": "usr_123",
    "title": "Mechanical Keyboard",
    "target_amount": 4500.0,
    "monthly_commitment": 500.0,
    "initial_saved": 500.0,
    "category": "Gadget"
  }
  ```

#### `POST /api/goals/{goal_id}/boost`
Adds an ad-hoc cash boost directly into the dream goal.
- **Request Body:** `{"user_id": "usr_123", "amount": 500.0}`

#### `POST /api/goals/{goal_id}/sweep`
Sweeps unspent month-end variable funds into the goal vault.
- **Request Body:** `{"user_id": "usr_123", "amount": 350.0}`

#### `POST /api/goals/{goal_id}/toggle-pause`
Pauses monthly commitment deduction for the current month and recalibrates the timeline.
- **Request Body:** `{"user_id": "usr_123"}`

---

### 5. AI Coach & Simulator Endpoints

#### `POST /api/coach/simulate-purchase`
Simulates a potential purchase against the student's live Three-Bucket balance.
- **Request Body:**
  ```json
  {
    "user_id": "usr_123",
    "item_name": "Sneakers",
    "price": 1800.0,
    "category": "Entertainment",
    "language": "en"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "current_daily_limit": 496.7,
    "new_daily_limit": 296.7,
    "limit_drop_amount": 200.0,
    "current_risk_pct": 28.4,
    "new_risk_pct": 52.1,
    "risk_increased": true,
    "advice_text": "Buying these sneakers will drop your daily safe limit from ৳496.7 to ৳296.7/day and increase your month-end shortage risk to 52.1% (Moderate). If possible, wait 10 days until next month's allowance."
  }
  ```

