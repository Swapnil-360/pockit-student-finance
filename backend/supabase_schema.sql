-- Supabase Schema for TakaTrack AI — Student Money & Risk Coach
-- (Run this in your Supabase SQL Editor if connecting a cloud PostgreSQL database)

-- 1. Users Profile Extension (mirrors Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    year_of_study TEXT NOT NULL,
    university_type TEXT NOT NULL,
    where_you_live TEXT NOT NULL,
    total_monthly_money TEXT NOT NULL,
    main_source_of_money TEXT NOT NULL,
    do_you_earn_income TEXT NOT NULL,
    monthly_rent_fixed NUMERIC DEFAULT 0,
    monthly_allowance_fixed NUMERIC DEFAULT 10000,
    savings_goal_fixed NUMERIC DEFAULT 1000,
    target_savings NUMERIC DEFAULT 0.0,
    track_spending INTEGER DEFAULT 3,
    mobile_banking_use TEXT DEFAULT 'Weekly',
    borrowed_from_friends_baseline TEXT DEFAULT 'Never',
    aware_balance INTEGER DEFAULT 3,
    aware_weekly_track INTEGER DEFAULT 3,
    aware_check_before_buy INTEGER DEFAULT 3,
    impulse_spontaneous INTEGER DEFAULT 3,
    impulse_discounts INTEGER DEFAULT 3,
    impulse_regret INTEGER DEFAULT 3,
    awareness_score NUMERIC DEFAULT 3.0,
    impulse_score NUMERIC DEFAULT 3.0,
    is_pro BOOLEAN DEFAULT FALSE,
    subscription_expiry TIMESTAMPTZ DEFAULT NULL,
    pin_code_hash TEXT DEFAULT NULL,
    avatar_url TEXT DEFAULT NULL,
    daily_coach_queries_used INTEGER DEFAULT 0,
    daily_coach_queries_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Multi-Source Incomes Table (Funds added anytime)
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    source TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    note TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Expenses Table (Includes Fixed Obligations: Rent, Mess Meal Advance + Variable: Food, Transport, etc.)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL, -- 'Food', 'Transport', 'Rent', 'Mess Meal Advance', 'Entertainment', 'Academic', 'Bills', 'Borrowing', 'Other'
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    note TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Subscription Payments Table (Freemium + Pro AI Tk 50/Month)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL,
    trx_id TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 50.0,
    status TEXT NOT NULL DEFAULT 'approved',
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Monthly Calendar Archives (1st to 28th/30th/31st history)
CREATE TABLE IF NOT EXISTS public.monthly_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    total_income NUMERIC NOT NULL,
    total_spent NUMERIC NOT NULL,
    ending_balance NUMERIC NOT NULL,
    final_risk_score NUMERIC NOT NULL,
    summary_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Risk Snapshots History Table
CREATE TABLE IF NOT EXISTS public.risk_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    risk_score_pct NUMERIC NOT NULL,
    risk_tier TEXT NOT NULL,
    risk_tier_bn TEXT NOT NULL,
    monthly_spent_total NUMERIC NOT NULL,
    projected_savings NUMERIC NOT NULL,
    daily_safe_to_spend NUMERIC NOT NULL,
    top_drivers_json JSONB,
    trigger_event TEXT
);

-- 7. Month-End Check-In & Retraining Dataset Table
CREATE TABLE IF NOT EXISTS public.month_end_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    actual_ran_out_of_money BOOLEAN NOT NULL,
    final_risk_score_predicted NUMERIC,
    final_spent_total NUMERIC,
    feedback_notes TEXT,
    survey_row_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Goal-Based Savings Vault ("Dream Goal Tracker")
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_saved NUMERIC NOT NULL DEFAULT 0.0,
    monthly_commitment NUMERIC NOT NULL DEFAULT 500.0,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    missed_months INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'Gadget',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.month_end_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit own profile" ON public.profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own incomes" ON public.incomes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own subscriptions" ON public.subscription_payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own monthly archives" ON public.monthly_archives FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own risk snapshots" ON public.risk_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own checkins" ON public.month_end_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own savings goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

-- 9. Storage Bucket for User Profile Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for Avatars
CREATE POLICY "Public Avatar Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');
