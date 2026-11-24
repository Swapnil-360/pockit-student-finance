import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { saveAuthToken, clearAuthToken } from './security';

const getInitialBaseUrl = (): string => {
  // 1. Explicit public env variable configured during EAS build or in .env
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Extra configuration from app.json / app.config.js
  const extraApiUrl = (Constants.expoConfig?.extra as any)?.apiUrl;
  if (extraApiUrl) {
    return extraApiUrl.replace(/\/+$/, '');
  }

  // 3. Web environment (browser address bar hostname)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const isLocalWeb =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      /^192\.168\./.test(window.location.hostname) ||
      /^10\./.test(window.location.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(window.location.hostname);
    if (isLocalWeb) {
      return `http://${window.location.hostname}:8000`;
    }
    return window.location.origin;
  }

  // 4. Expo Go / Local Development client via debugger host
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`;
    }
  }

  // 5. Standalone Android APK default production cloud endpoint
  return 'https://pockit-backend.onrender.com';
};

export let API_BASE_URL = getInitialBaseUrl();

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url;
};

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: '@student_finance_token',
  USER: '@student_finance_user',
  DASHBOARD_CACHE: '@student_finance_dash_cache',
  LANGUAGE: '@student_finance_language'
};

export const GUEST_USER_ID = 'guest_local_user';
export const GUEST_STORAGE_KEYS = {
  PROFILE: '@takatrack_guest_profile',
  EXPENSES: '@takatrack_guest_expenses',
  INCOMES: '@takatrack_guest_incomes',
  GOALS: '@takatrack_guest_goals',
  DASHBOARD: '@takatrack_guest_dashboard',
};

// --- DATA CONTRACTS ---
export interface UserData {
  id: string;
  email: string;
  full_name: string;
  calling_name?: string;
  is_demo: boolean;
  is_guest?: boolean;
  is_pro?: boolean;
  has_pin?: boolean;
  avatar_url?: string | null;
  subscription_expiry?: string;
}

export interface AuthResponse {
  status: string;
  user: UserData;
  has_profile: boolean;
  token: string;
}

export interface BaselineProfileData {
  user_id: string;
  gender: string;
  age: number;
  year_of_study: string;
  university_type: string;
  where_you_live: string;
  total_monthly_money: string;
  main_source_of_money: string;
  do_you_earn_income: string;
  monthly_rent_fixed: number;
  mess_meal_fixed?: number;
  enable_mess_meals?: boolean;
  academic_fee_fixed?: number;
  transport_fixed?: number;
  monthly_allowance_fixed: number;
  savings_goal_fixed: number;
  target_savings?: number;
  is_skipped?: boolean;
  track_spending: number;
  mobile_banking_use: string;
  borrowed_from_friends_baseline: string;
  aware_balance: number;
  aware_weekly_track: number;
  aware_check_before_buy: number;
  impulse_spontaneous: number;
  impulse_discounts: number;
  impulse_regret: number;
}

export interface ExpenseItem {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  payment_method: string;
  note?: string;
  date: string;
}

export interface IncomeItem {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  payment_method: string;
  note?: string;
  date: string;
}

export interface CalendarLedgerDay {
  date: string;
  income: number;
  expense: number;
  net: number;
  tx_count: number;
}

export interface LedgerTransactionItem {
  id: string;
  user_id: string;
  amount: number;
  category_or_source: string;
  payment_method: string;
  note?: string;
  date: string;
  type: 'income' | 'expense';
}

export interface CalendarLedgerResponse {
  month: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  calendar_days: CalendarLedgerDay[];
  transactions: LedgerTransactionItem[];
}

export interface RiskDriver {
  feature: string;
  feature_bn: string;
  severity: 'critical' | 'warning' | 'positive';
  description_en: string;
  description_bn: string;
}

export interface RiskScoreSummary {
  risk_score_pct: number;
  risk_tier: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK';
  risk_tier_bn: 'কম ঝুঁকি' | 'মাঝারি ঝুঁকি' | 'উচ্চ ঝুঁকি';
  summary_warning_en: string;
  summary_warning_bn: string;
  top_drivers: RiskDriver[];
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_saved: number;
  monthly_commitment: number;
  is_paused: boolean;
  missed_months: number;
  category: string;
  start_date: string;
  is_active: boolean;
  progress_pct: number;
  remaining_amount: number;
  estimated_months_left: number;
  target_completion_date: string;
  target_completion_date_bn: string;
  timeline_shift_note_en?: string;
  timeline_shift_note_bn?: string;
  planning_mode?: 'monthly_amount' | 'target_timeline';
  target_months?: number;
  target_date?: string;
  required_monthly_savings?: number;
}

export interface DashboardData {
  user_id: string;
  month: string;
  monthly_allowance: number;
  total_income_added: number;
  total_spent: number;
  remaining_balance: number;
  days_remaining: number;
  daily_safe_to_spend: number;
  projected_month_end_savings: number;
  burn_rate_status: 'healthy' | 'caution' | 'critical';
  category_breakdown: Record<string, number>;
  daily_trend: Array<{ date: string; amount: number }>;
  recent_expenses: ExpenseItem[];
  current_risk: RiskScoreSummary;
  is_pro?: boolean;
  pro_tier?: string;

  // Three-Bucket Financial Architecture fields
  target_savings: number;
  fixed_obligations_spent: number;
  fixed_rent?: number;
  mess_meal_fixed?: number;
  academic_fee_fixed?: number;
  variable_spent: number;
  spendable_variable_pool: number;
  dipping_into_savings: boolean;
  savings_warning_en?: string;
  savings_warning_bn?: string;
  recalibration_note_en?: string;
  recalibration_note_bn?: string;
  coach_queries_used?: number;
  coach_queries_remaining?: number;
  coach_daily_limit?: number;

  // Dream Goal Vault & Streak
  active_goal?: SavingsGoal;
  on_track_streak?: number;
  enable_mess_meals?: boolean;
}

export interface AiCoachData {
  daily_budget_advice_en: string;
  daily_budget_advice_bn: string;
  category_cut_advice_en: string;
  category_cut_advice_bn: string;
  campus_tips_en: string[];
  campus_tips_bn: string[];
  urgency_level: 'normal' | 'caution' | 'alert';
  is_pro?: boolean;
  requires_upgrade?: boolean;
  queries_used?: number;
  queries_remaining?: number;
  daily_limit?: number;
  target_savings?: number;
  fixed_obligations?: number;
  spendable_variable_pool?: number;
  savings_intact?: boolean;
}

export interface AskCoachResponse {
  answer_en: string;
  answer_bn: string;
  queries_used: number;
  queries_remaining: number;
  daily_limit: number;
  is_pro: boolean;
}

export interface PurchaseSimulationResult {
  item_title: string;
  amount: number;
  category: string;
  current_risk_pct: number;
  simulated_risk_pct: number;
  risk_pct_change: number;
  current_daily_safe: number;
  simulated_daily_safe: number;
  daily_safe_change: number;
  current_tier: string;
  simulated_tier: string;
  verdict: 'PROCEED' | 'WARN' | 'AVOID';
  verdict_bn: string;
  ai_reasoning_en: string;
  ai_reasoning_bn: string;
  alternative_suggestion_en: string;
  alternative_suggestion_bn: string;
  savings_goal_impact?: string;
  savings_goal_impact_bn?: string;
  new_spendable_pool?: number;
}

export interface MonthlyArchiveItem {
  id: string;
  user_id: string;
  month: string;
  total_income: number;
  total_spent: number;
  ending_balance: number;
  final_risk_score: number;
  summary: any;
  created_at: string;
}

// Pristine empty dashboard generator for authentic new student accounts
export function createEmptyDashboard(
  userId: string,
  allowance = 0,
  targetSavings = 0,
  rent = 0
): DashboardData {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
  const variablePool = Math.max(0, allowance - rent - targetSavings);
  const dailySafe = Number((variablePool / daysRemaining).toFixed(1));

  return {
    user_id: userId,
    month,
    monthly_allowance: allowance,
    total_income_added: 0,
    total_spent: 0,
    remaining_balance: allowance,
    days_remaining: daysRemaining,
    daily_safe_to_spend: dailySafe,
    projected_month_end_savings: targetSavings,
    burn_rate_status: 'healthy',
    category_breakdown: {},
    daily_trend: [],
    recent_expenses: [],
    current_risk: {
      risk_score_pct: 10.0,
      risk_tier: 'LOW RISK',
      risk_tier_bn: 'কম ঝুঁকি',
      summary_warning_en: 'Finances look healthy. Log your campus expenses to maintain accurate forecasts.',
      summary_warning_bn: 'আপনার আর্থিক অবস্থা স্বাভাবিক। নিয়মিত খরচ লিখে হিসাব নিয়ন্ত্রণে রাখুন।',
      top_drivers: []
    },
    is_pro: false,
    pro_tier: 'free',
    target_savings: targetSavings,
    fixed_obligations_spent: 0,
    variable_spent: 0,
    spendable_variable_pool: variablePool,
    dipping_into_savings: false,
    savings_warning_en: undefined,
    savings_warning_bn: undefined,
    recalibration_note_en: `Starting budget: ৳${dailySafe}/day across ${daysRemaining} days.`,
    recalibration_note_bn: `শুরুর বাজেট: বাকি ${daysRemaining} দিনে দৈনিক ৳${dailySafe} খরচ করতে পারবেন।`,
    coach_queries_used: 0,
    coach_queries_remaining: 10,
    coach_daily_limit: 10,
    active_goal: undefined,
    on_track_streak: 1
  };
}

// Fallback demo mock dashboard
export const FALLBACK_DEMO_DASHBOARD: DashboardData = {
  user_id: 'demo_student_001',
  month: new Date().toISOString().substring(0, 7),
  monthly_allowance: 8000,
  total_income_added: 8000,
  total_spent: 4030,
  remaining_balance: 3970,
  days_remaining: 14,
  daily_safe_to_spend: 247.9,
  projected_month_end_savings: 750,
  burn_rate_status: 'healthy',
  category_breakdown: {
    Rent: 3500,
    Food: 450,
    Transport: 80
  },
  daily_trend: [
    { date: new Date().toISOString().substring(0, 10), amount: 4030 }
  ],
  recent_expenses: [
    { id: '1', user_id: 'demo_student_001', amount: 3500, category: 'Rent', payment_method: 'bKash', note: 'Mess rent advance', date: new Date().toISOString().substring(0, 10) },
    { id: '2', user_id: 'demo_student_001', amount: 450, category: 'Food', payment_method: 'Cash', note: 'Campus canteen meal', date: new Date().toISOString().substring(0, 10) },
    { id: '3', user_id: 'demo_student_001', amount: 80, category: 'Transport', payment_method: 'Cash', note: 'Rickshaw fare', date: new Date().toISOString().substring(0, 10) }
  ],
  current_risk: {
    risk_score_pct: 34.2,
    risk_tier: 'LOW RISK',
    risk_tier_bn: 'কম ঝুঁকি',
    summary_warning_en: 'Spending is disciplined. Keep tracking daily expenses.',
    summary_warning_bn: 'আপনার খরচের গতি দারুণ সুশৃঙ্খল। নিয়মিত হিসাব রাখুন।',
    top_drivers: [
      {
        feature: 'Monthly Savings',
        feature_bn: 'মাসিক সঞ্চয়',
        severity: 'positive',
        description_en: 'Target savings of ৳500 is protected and intact.',
        description_bn: 'আপনার ৳৫০০ মাসিক সঞ্চয় লক্ষ্য সম্পূর্ণ সুরক্ষিত রয়েছে।'
      }
    ]
  },
  is_pro: true,
  pro_tier: 'pro',
  target_savings: 500,
  fixed_obligations_spent: 3500,
  variable_spent: 530,
  spendable_variable_pool: 3470,
  dipping_into_savings: false,
  recalibration_note_en: 'Rent & mess advance (৳3,500) and target savings (৳500) ring-fenced. You have ৳3,470 left for daily spending across 14 days (৳247.9/day).',
  recalibration_note_bn: 'মেস ভাড়া (৳৩,৫০০) ও মাসিক সঞ্চয় লক্ষ্য (৳৫০০) সুরক্ষিত রাখা হয়েছে। বাকি ১৪ দিনের জন্য দৈনিক খরচযোগ্য ৳৩,৪৭০ (৳২৪৭.৯/দিন)।',
  coach_queries_used: 2,
  coach_queries_remaining: 8,
  coach_daily_limit: 10,
  on_track_streak: 5,
  active_goal: {
    id: 'demo_goal_001',
    user_id: 'demo_student_001',
    title: 'LG UltraGear 27" Gaming Monitor',
    target_amount: 32000,
    current_saved: 4500,
    monthly_commitment: 1000,
    is_paused: false,
    missed_months: 0,
    category: 'Gadget',
    start_date: new Date().toISOString().substring(0, 10),
    is_active: true,
    progress_pct: 14.1,
    remaining_amount: 27500,
    estimated_months_left: 28,
    target_completion_date: 'March 2029',
    target_completion_date_bn: 'মার্চ 2029'
  }
};

// --- AUTH SERVICES ---
export async function authLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(err.detail || `Login error ${res.status}`);
  }

  const data: AuthResponse = await res.json();
  await saveAuthToken(data.token);
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
  if (data.has_profile) {
    await AsyncStorage.setItem(`@student_has_onboarded_${data.user.id}`, 'true');
  }
  return data;
}

export async function authRegister(email: string, password: string, fullName: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || `Register error ${res.status}`);
  }

  const data: AuthResponse = await res.json();
  await saveAuthToken(data.token);
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
  if (data.has_profile) {
    await AsyncStorage.setItem(`@student_has_onboarded_${data.user.id}`, 'true');
  }
  return data;
}

export async function authDemo(): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data: AuthResponse = await res.json();
      await saveAuthToken(data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      if (data.has_profile) {
        await AsyncStorage.setItem(`@student_has_onboarded_${data.user.id}`, 'true');
      }
      return data;
    }
  } catch (e) {
    // Backend offline fallback for demo mode
  }

  const demoUser: UserData = {
    id: 'demo_student_001',
    email: 'demo@student.edu.bd',
    full_name: 'Md. Miftahur Rahman Swapnil',
    calling_name: 'Swapnil',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    is_demo: true,
    is_pro: true,
    has_pin: false
  };
  const demoAuth: AuthResponse = {
    status: 'success',
    user: demoUser,
    has_profile: true,
    token: 'token_demo_student_001'
  };
  await saveAuthToken(demoAuth.token);
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
  return demoAuth;
}

export async function authGuest(language: 'en' | 'bn' = 'en'): Promise<AuthResponse> {
  const existingUserJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  let guestUser: UserData;
  if (existingUserJson) {
    try {
      const parsed = JSON.parse(existingUserJson);
      if (parsed.id === GUEST_USER_ID) {
        guestUser = parsed;
      } else {
        guestUser = {
          id: GUEST_USER_ID,
          email: 'guest@device.local',
          full_name: language === 'bn' ? 'গেস্ট শিক্ষার্থী' : 'Guest Student',
          is_demo: false,
          is_guest: true,
          is_pro: false,
          has_pin: false,
          avatar_url: null,
        };
      }
    } catch {
      guestUser = {
        id: GUEST_USER_ID,
        email: 'guest@device.local',
        full_name: language === 'bn' ? 'গেস্ট শিক্ষার্থী' : 'Guest Student',
        is_demo: false,
        is_guest: true,
        is_pro: false,
        has_pin: false,
        avatar_url: null,
      };
    }
  } else {
    guestUser = {
      id: GUEST_USER_ID,
      email: 'guest@device.local',
      full_name: language === 'bn' ? 'গেস্ট শিক্ষার্থী' : 'Guest Student',
      is_demo: false,
      is_guest: true,
      is_pro: false,
      has_pin: false,
      avatar_url: null,
    };
  }

  // Check if guest has configured a baseline profile in local cache
  const cachedProfile = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.PROFILE);
  const hasProfile = Boolean(cachedProfile);

  const guestAuth: AuthResponse = {
    status: 'success',
    user: guestUser,
    has_profile: hasProfile,
    token: 'token_guest_local',
  };

  await saveAuthToken(guestAuth.token);
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(guestUser));
  return guestAuth;
}

export async function calculateGuestDashboard(): Promise<DashboardData> {
  const profileJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.PROFILE);
  const profile: BaselineProfileData | null = profileJson ? JSON.parse(profileJson) : null;

  const expensesJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.EXPENSES);
  const expenses: ExpenseItem[] = expensesJson ? JSON.parse(expensesJson) : [];

  const incomesJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.INCOMES);
  const incomes: IncomeItem[] = incomesJson ? JSON.parse(incomesJson) : [];

  const goalsJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.GOALS);
  const goals: SavingsGoal[] = goalsJson ? JSON.parse(goalsJson) : [];

  const now = new Date();
  const year = now.getFullYear();
  const monthStr = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);

  const monthExpenses = expenses.filter((e) => !e.date || e.date.startsWith(monthStr));
  const monthIncomes = incomes.filter((i) => !i.date || i.date.startsWith(monthStr));

  const totalIncomeAdded = monthIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const baselineAllowance = profile?.monthly_allowance_fixed || 0;
  const monthlyAllowance = totalIncomeAdded > 0 ? totalIncomeAdded : baselineAllowance;

  let rentPaid = 0;
  let messPaid = 0;
  let totalSpent = 0;
  const categoryBreakdown: Record<string, number> = {};

  monthExpenses.forEach((exp) => {
    const amt = Number(exp.amount) || 0;
    totalSpent += amt;
    categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + amt;
    if (exp.category === 'Rent') rentPaid += amt;
    if (exp.category === 'Mess Meal Advance') messPaid += amt;
  });

  const fixedObligationsSpent = rentPaid + messPaid;
  const fixedRentBaseline = profile?.monthly_rent_fixed || 0;
  const fixedObligations = fixedObligationsSpent > 0 ? fixedObligationsSpent : fixedRentBaseline;

  const targetSavings = profile?.savings_goal_fixed || 0;
  const variableSpent = Math.max(0, totalSpent - fixedObligationsSpent);

  const spendableVariablePool = Math.max(
    0,
    Math.round(monthlyAllowance - fixedObligations - targetSavings - variableSpent)
  );
  const remainingBalance = Math.round(monthlyAllowance - totalSpent);
  const dailySafe = daysRemaining > 0 ? Number((spendableVariablePool / daysRemaining).toFixed(1)) : 0;

  const activeGoal = goals.length > 0 ? goals[0] : null;

  let burnStatus: 'healthy' | 'caution' | 'critical' = 'healthy';
  let riskScore = 12.0;
  let riskTier: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' = 'LOW RISK';
  let riskTierBn: 'কম ঝুঁকি' | 'মাঝারি ঝুঁকি' | 'উচ্চ ঝুঁকি' = 'কম ঝুঁকি';
  let warningEn = 'Finances look healthy. Keep logging your daily campus expenses.';
  let warningBn = 'আপনার খরচের গতি স্বাভাবিক। হিসাব নিয়ন্ত্রণে রাখতে প্রতিদিনের খরচ লিখুন।';

  if (spendableVariablePool <= 0 || remainingBalance <= 0) {
    burnStatus = 'critical';
    riskScore = 88.0;
    riskTier = 'HIGH RISK';
    riskTierBn = 'উচ্চ ঝুঁকি';
    warningEn = 'Spending pool exhausted. Limit any further discretionary spending.';
    warningBn = 'ব্যয়যোগ্য বাজেট শেষ। অনাকাঙ্ক্ষিত খরচ পুরোপুরি বন্ধ রাখুন।';
  } else if (dailySafe < 120) {
    burnStatus = 'caution';
    riskScore = 55.0;
    riskTier = 'MODERATE RISK';
    riskTierBn = 'মাঝারি ঝুঁকি';
    warningEn = `Tight daily limit (৳${dailySafe}/day). Reduce discretionary expenses.`;
    warningBn = `দৈনিক বাজেট সীমিত (৳${dailySafe}/দিন)। অপ্রয়োজনীয় খরচ কমান।`;
  }

  const dashData: DashboardData = {
    user_id: GUEST_USER_ID,
    month: monthStr,
    monthly_allowance: monthlyAllowance,
    total_income_added: totalIncomeAdded,
    total_spent: totalSpent,
    remaining_balance: remainingBalance,
    days_remaining: daysRemaining,
    daily_safe_to_spend: dailySafe,
    projected_month_end_savings: Math.max(0, remainingBalance),
    burn_rate_status: burnStatus,
    category_breakdown: categoryBreakdown,
    daily_trend: [],
    recent_expenses: monthExpenses.slice(0, 8),
    current_risk: {
      risk_score_pct: riskScore,
      risk_tier: riskTier,
      risk_tier_bn: riskTierBn,
      summary_warning_en: warningEn,
      summary_warning_bn: warningBn,
      top_drivers: [],
    },
    is_pro: false,
    pro_tier: 'free',
    target_savings: targetSavings,
    fixed_obligations_spent: fixedObligationsSpent,
    variable_spent: variableSpent,
    spendable_variable_pool: spendableVariablePool,
    dipping_into_savings: remainingBalance < targetSavings,
    savings_warning_en:
      remainingBalance < targetSavings && targetSavings > 0
        ? `Projected to dip into your ৳${targetSavings} target savings!`
        : undefined,
    savings_warning_bn:
      remainingBalance < targetSavings && targetSavings > 0
        ? `আপনার ৳${targetSavings} লক্ষ্যমাত্রার সঞ্চয়ে টান পড়তে পারে!`
        : undefined,
    recalibration_note_en:
      dailySafe > 0
        ? `Recalibrated to ৳${dailySafe}/day across remaining ${daysRemaining} days.`
        : 'Variable pool exhausted.',
    recalibration_note_bn:
      dailySafe > 0
        ? `বাকি ${daysRemaining} দিনে দৈনিক নিরাপদ সীমা ৳${dailySafe} এ নির্ধারিত।`
        : 'ব্যয়যোগ্য বাজেট শেষ।',
    coach_queries_used: 0,
    coach_queries_remaining: 10,
    coach_daily_limit: 10,
    active_goal: activeGoal || undefined,
    on_track_streak: 1,
  };

  await AsyncStorage.setItem(GUEST_STORAGE_KEYS.DASHBOARD, JSON.stringify(dashData));
  return dashData;
}

export async function authGoogle(
  email: string,
  fullName: string,
  avatarUrl?: string
): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        full_name: fullName,
        avatar_url: avatarUrl
      })
    });
    if (res.ok) {
      const data: AuthResponse = await res.json();
      await saveAuthToken(data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      if (data.has_profile) {
        await AsyncStorage.setItem(`@student_has_onboarded_${data.user.id}`, 'true');
      }
      return data;
    }
  } catch (e) {
    console.warn("API offline fallback for Google auth:", e);
  }

  // Fallback demo user with Google credentials
  const mockUser: UserData = {
    id: `google_${Date.now()}`,
    email,
    full_name: fullName,
    avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    is_demo: false,
    is_pro: true,
  };
  const mockResponse: AuthResponse = {
    status: 'success',
    user: mockUser,
    has_profile: true,
    token: `token_${mockUser.id}`
  };
  await saveAuthToken(mockResponse.token);
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
  return mockResponse;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    fullName?: string;
    callingName?: string;
    avatarUrl?: string;
    universityType?: string;
    yearOfStudy?: string;
    whereYouLive?: string;
    enableMessMeals?: boolean;
    monthlyAllowanceFixed?: number;
    monthlyRentFixed?: number;
    messMealFixed?: number;
    academicFeeFixed?: number;
    targetSavings?: number;
    savingsGoalFixed?: number;
  }
): Promise<{ user: UserData; profile: any }> {
  const payload: any = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.callingName !== undefined) payload.calling_name = updates.callingName;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.universityType !== undefined) payload.university_type = updates.universityType;
  if (updates.yearOfStudy !== undefined) payload.year_of_study = updates.yearOfStudy;
  if (updates.whereYouLive !== undefined) payload.where_you_live = updates.whereYouLive;
  if (updates.enableMessMeals !== undefined) payload.enable_mess_meals = updates.enableMessMeals;
  if (updates.monthlyAllowanceFixed !== undefined) payload.monthly_allowance_fixed = updates.monthlyAllowanceFixed;
  if (updates.monthlyRentFixed !== undefined) payload.monthly_rent_fixed = updates.monthlyRentFixed;
  if (updates.messMealFixed !== undefined) payload.mess_meal_fixed = updates.messMealFixed;
  if (updates.academicFeeFixed !== undefined) payload.academic_fee_fixed = updates.academicFeeFixed;
  if (updates.targetSavings !== undefined) payload.target_savings = updates.targetSavings;
  if (updates.savingsGoalFixed !== undefined) payload.savings_goal_fixed = updates.savingsGoalFixed;

  try {
    const res = await fetch(`${API_BASE_URL}/api/user/${userId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      }
      return data;
    }
  } catch (e) {
    console.warn("API offline fallback for profile update:", e);
  }

  // Fallback local persistence
  const cachedUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  let cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : {};
  if (updates.fullName) cachedUser.full_name = updates.fullName;
  if (updates.callingName !== undefined) cachedUser.calling_name = updates.callingName;
  if (updates.avatarUrl) cachedUser.avatar_url = updates.avatarUrl;
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(cachedUser));
  return { user: cachedUser, profile: null };
}

export async function updateBudgetBaseline(
  userId: string,
  baseline: {
    monthlyAllowanceFixed?: number;
    monthlyRentFixed?: number;
    messMealFixed?: number;
    academicFeeFixed?: number;
    targetSavings?: number;
    savingsGoalFixed?: number;
    enableMessMeals?: boolean;
  }
): Promise<any> {
  const payload: any = {};
  if (baseline.monthlyAllowanceFixed !== undefined) payload.monthly_allowance_fixed = baseline.monthlyAllowanceFixed;
  if (baseline.monthlyRentFixed !== undefined) payload.monthly_rent_fixed = baseline.monthlyRentFixed;
  if (baseline.messMealFixed !== undefined) payload.mess_meal_fixed = baseline.messMealFixed;
  if (baseline.academicFeeFixed !== undefined) payload.academic_fee_fixed = baseline.academicFeeFixed;
  if (baseline.targetSavings !== undefined) payload.target_savings = baseline.targetSavings;
  if (baseline.savingsGoalFixed !== undefined) payload.savings_goal_fixed = baseline.savingsGoalFixed;
  if (baseline.enableMessMeals !== undefined) payload.enable_mess_meals = baseline.enableMessMeals;

  try {
    const res = await fetch(`${API_BASE_URL}/api/user/${userId}/budget-baseline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("API offline fallback for budget baseline update:", e);
  }
  return null;
}

export async function skipOnboarding(userId: string): Promise<any> {
  const defaultProfile: BaselineProfileData = {
    user_id: userId,
    gender: 'Male',
    age: 21,
    year_of_study: '2nd year',
    university_type: 'Public',
    where_you_live: 'With family',
    total_monthly_money: '<5k',
    main_source_of_money: 'Family',
    do_you_earn_income: 'No',
    monthly_rent_fixed: 0,
    mess_meal_fixed: 0,
    academic_fee_fixed: 0,
    transport_fixed: 0,
    monthly_allowance_fixed: 0,
    savings_goal_fixed: 0,
    target_savings: 0,
    is_skipped: true,
    track_spending: 3,
    mobile_banking_use: 'Weekly',
    borrowed_from_friends_baseline: 'Never',
    aware_balance: 3,
    aware_weekly_track: 3,
    aware_check_before_buy: 3,
    impulse_spontaneous: 3,
    impulse_discounts: 3,
    impulse_regret: 3,
  };
  return await saveBaselineProfile(defaultProfile);
}

export async function uploadUserAvatar(
  userId: string,
  imageData: string
): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/${userId}/avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_data: imageData }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.avatar_url) {
        // Update local cached user avatar
        const cachedUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          cachedUser.avatar_url = data.avatar_url;
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(cachedUser));
        }
        return data.avatar_url;
      }
    }
  } catch (e) {
    console.warn("Cloud avatar upload warning, using local fallback:", e);
  }
  return imageData;
}

export async function getStoredUser(): Promise<UserData | null> {
  try {
    const str = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    const { supabase } = await import('./supabaseClient');
    await supabase.auth.signOut();
  } catch {}
  await clearAuthToken();
  await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.DASHBOARD_CACHE]);
}

export async function forgotPasswordApi(email: string, newPassword: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, new_password: newPassword })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Password reset failed' }));
    throw new Error(err.detail || 'Password reset error');
  }
  return await res.json();
}

// PIN Security
export async function setUserPinApi(userId: string, pin: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/auth/set-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, pin })
  });
  if (!res.ok) throw new Error('Failed to set PIN');
  return await res.json();
}

export async function verifyUserPinApi(userId: string, pin: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, pin })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- ONBOARDING & PROFILE ---
export async function saveBaselineProfile(profile: BaselineProfileData): Promise<any> {
  if (profile.user_id === GUEST_USER_ID) {
    await AsyncStorage.setItem(GUEST_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    await calculateGuestDashboard();
    return profile;
  }
  const res = await fetch(`${API_BASE_URL}/api/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save profile' }));
    throw new Error(err.detail || 'Profile save failed');
  }

  const savedData = await res.json();
  if (profile.user_id) {
    await AsyncStorage.setItem(`@student_has_onboarded_${profile.user_id}`, 'true');
    await AsyncStorage.setItem(`@student_profile_${profile.user_id}`, JSON.stringify(savedData));
  }
  return savedData;
}

export async function getStudentProfile(userId: string): Promise<any> {
  if (userId === GUEST_USER_ID) {
    const data = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  }
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/profile/${userId}`, {}, 8000);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        await AsyncStorage.setItem(`@student_has_onboarded_${userId}`, 'true');
        await AsyncStorage.setItem(`@student_profile_${userId}`, JSON.stringify(data));
      }
      return data;
    }
  } catch (e) {
    // Offline / Render cold start fallback
  }
  const cached = await AsyncStorage.getItem(`@student_profile_${userId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return null;
}

// --- DASHBOARD ---
export async function fetchDashboard(userId: string): Promise<DashboardData> {
  if (userId === GUEST_USER_ID) {
    return await calculateGuestDashboard();
  }
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/dashboard/${userId}`, {}, 8000);
    if (res.ok) {
      const data: DashboardData = await res.json();
      await AsyncStorage.setItem(STORAGE_KEYS.DASHBOARD_CACHE, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_CACHE);
    if (cached) return JSON.parse(cached);
  }
  return createEmptyDashboard(userId);
}

// --- INCOMES (Multi-source fund additions) ---
export async function addIncome(payload: {
  user_id: string;
  amount: number;
  source: string;
  payment_method: string;
  note?: string;
  date?: string;
}): Promise<any> {
  if (payload.user_id === GUEST_USER_ID) {
    const existingJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.INCOMES);
    const existing: IncomeItem[] = existingJson ? JSON.parse(existingJson) : [];
    const newItem: IncomeItem = {
      id: 'inc_' + Date.now(),
      user_id: GUEST_USER_ID,
      amount: payload.amount,
      source: payload.source,
      payment_method: payload.payment_method,
      note: payload.note,
      date: payload.date || new Date().toISOString().substring(0, 10),
    };
    existing.unshift(newItem);
    await AsyncStorage.setItem(GUEST_STORAGE_KEYS.INCOMES, JSON.stringify(existing));
    const updatedDash = await calculateGuestDashboard();
    return {
      status: 'success',
      income: newItem,
      updated_risk: updatedDash.current_risk,
      daily_safe_to_spend: updatedDash.daily_safe_to_spend,
      remaining_balance: updatedDash.remaining_balance,
      recalibration_note_en: updatedDash.recalibration_note_en,
      recalibration_note_bn: updatedDash.recalibration_note_bn,
    };
  }
  const res = await fetch(`${API_BASE_URL}/api/incomes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add funds' }));
    throw new Error(err.detail || 'Income creation error');
  }
  return await res.json();
}

export async function fetchIncomes(userId: string, month?: string): Promise<IncomeItem[]> {
  if (userId === GUEST_USER_ID) {
    const existingJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.INCOMES);
    const existing: IncomeItem[] = existingJson ? JSON.parse(existingJson) : [];
    if (month) return existing.filter((i) => !i.date || i.date.startsWith(month));
    return existing;
  }
  try {
    let url = `${API_BASE_URL}/api/incomes/${userId}?limit=100`;
    if (month) url += `&month=${encodeURIComponent(month)}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}

export async function deleteIncome(incomeId: string, userId: string): Promise<any> {
  if (userId === GUEST_USER_ID) {
    const existingJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.INCOMES);
    const existing: IncomeItem[] = existingJson ? JSON.parse(existingJson) : [];
    const filtered = existing.filter((i) => i.id !== incomeId);
    await AsyncStorage.setItem(GUEST_STORAGE_KEYS.INCOMES, JSON.stringify(filtered));
    await calculateGuestDashboard();
    return { status: 'success' };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/incomes/${incomeId}?user_id=${userId}`, {
      method: 'DELETE'
    });
    if (res.ok) return await res.json();
  } catch (e: any) {
    console.warn('deleteIncome backend error, checking local guest storage:', e);
  }
  // Check guest storage fallback
  const existingJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.INCOMES);
  if (existingJson) {
    const existing: IncomeItem[] = JSON.parse(existingJson);
    const filtered = existing.filter((i) => i.id !== incomeId);
    if (filtered.length !== existing.length) {
      await AsyncStorage.setItem(GUEST_STORAGE_KEYS.INCOMES, JSON.stringify(filtered));
      await calculateGuestDashboard();
      return { status: 'success' };
    }
  }
  return { status: 'success' };
}

// --- EXPENSES ---
export async function addExpense(payload: {
  user_id: string;
  amount: number;
  category: string;
  payment_method: string;
  note?: string;
  date?: string;
}): Promise<any> {
  if (payload.user_id === GUEST_USER_ID) {
    const existingJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.EXPENSES);
    const existing: ExpenseItem[] = existingJson ? JSON.parse(existingJson) : [];
    const newItem: ExpenseItem = {
      id: 'exp_' + Date.now(),
      user_id: GUEST_USER_ID,
      amount: payload.amount,
      category: payload.category,
      payment_method: payload.payment_method,
      note: payload.note,
      date: payload.date || new Date().toISOString().substring(0, 10),
    };
    existing.unshift(newItem);
    await AsyncStorage.setItem(GUEST_STORAGE_KEYS.EXPENSES, JSON.stringify(existing));
    const updatedDash = await calculateGuestDashboard();
    return {
      status: 'success',
      expense: newItem,
      updated_risk: updatedDash.current_risk,
      daily_safe_to_spend: updatedDash.daily_safe_to_spend,
      remaining_balance: updatedDash.remaining_balance,
      recalibration_note_en: updatedDash.recalibration_note_en,
      recalibration_note_bn: updatedDash.recalibration_note_bn,
    };
  }
  const res = await fetch(`${API_BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record expense' }));
    throw new Error(err.detail || 'Expense creation error');
  }

  return await res.json();
}

export async function fetchExpenses(
  userId: string,
  category?: string,
  month?: string
): Promise<ExpenseItem[]> {
  if (userId === GUEST_USER_ID) {
    const existingJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.EXPENSES);
    let existing: ExpenseItem[] = existingJson ? JSON.parse(existingJson) : [];
    if (category && category !== 'All') existing = existing.filter((e) => e.category === category);
    if (month) existing = existing.filter((e) => !e.date || e.date.startsWith(month));
    return existing;
  }
  try {
    let url = `${API_BASE_URL}/api/expenses/${userId}?limit=100`;
    if (category && category !== 'All') url += `&category=${encodeURIComponent(category)}`;
    if (month) url += `&month=${encodeURIComponent(month)}`;

    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}

export async function deleteExpense(expenseId: string, userId: string): Promise<any> {
  if (userId === GUEST_USER_ID) {
    const existingJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.EXPENSES);
    const existing: ExpenseItem[] = existingJson ? JSON.parse(existingJson) : [];
    const filtered = existing.filter((e) => e.id !== expenseId);
    await AsyncStorage.setItem(GUEST_STORAGE_KEYS.EXPENSES, JSON.stringify(filtered));
    await calculateGuestDashboard();
    return { status: 'success' };
  }
  const res = await fetch(`${API_BASE_URL}/api/expenses/${expenseId}?user_id=${userId}`, {
    method: 'DELETE'
  });

  if (!res.ok) throw new Error('Failed to delete expense');
  return await res.json();
}

// --- CALENDAR & LEDGER ---
export async function fetchCalendarLedger(userId: string, month?: string): Promise<CalendarLedgerResponse> {
  const monthStr = month || new Date().toISOString().substring(0, 7);
  if (userId === GUEST_USER_ID) {
    const expenses = await fetchExpenses(GUEST_USER_ID, undefined, monthStr);
    const incomes = await fetchIncomes(GUEST_USER_ID, monthStr);
    const days: Record<string, any> = {};
    let totalSpent = 0;
    let totalIncome = 0;
    const transactions: any[] = [];

    expenses.forEach((e) => {
      totalSpent += e.amount;
      if (!days[e.date]) days[e.date] = { date: e.date, total_spent: 0, total_income: 0, count: 0, items: [] };
      days[e.date].total_spent += e.amount;
      days[e.date].count += 1;
      const tx = { ...e, type: 'expense' };
      days[e.date].items.push(tx);
      transactions.push(tx);
    });

    incomes.forEach((i) => {
      totalIncome += i.amount;
      if (!days[i.date]) days[i.date] = { date: i.date, total_spent: 0, total_income: 0, count: 0, items: [] };
      days[i.date].total_income += i.amount;
      days[i.date].count += 1;
      const tx = { ...i, type: 'income' };
      days[i.date].items.push(tx);
      transactions.push(tx);
    });

    return {
      month: monthStr,
      total_income: totalIncome,
      total_expense: totalSpent,
      net_balance: totalIncome - totalSpent,
      calendar_days: Object.values(days),
      transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/ledger/${userId}?month=${encodeURIComponent(monthStr)}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return {
    month: monthStr,
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    calendar_days: [],
    transactions: []
  };
}

// --- PRO AI SUBSCRIPTION (Tk 50/Month) ---
export async function submitSubscriptionPayment(payload: {
  user_id: string;
  payment_method: 'bKash' | 'Nagad' | 'Rocket';
  trx_id: string;
  amount?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/subscription/submit-trx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Subscription activation failed' }));
    throw new Error(err.detail || 'Subscription activation error');
  }
  return await res.json();
}

export async function toggleDemoPro(userId: string, enable: boolean): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/subscription/demo-pro-toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, enable })
  });
  if (!res.ok) throw new Error('Failed to toggle Pro');
  return await res.json();
}

export async function fetchSubscriptionStatus(userId: string): Promise<{ is_pro: boolean; tier: string; expiry?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subscription/status/${userId}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return { is_pro: false, tier: 'free' };
}

// --- AI COACH & SIMULATOR ---
export async function fetchAiCoachAdvice(userId: string): Promise<AiCoachData> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return {
    daily_budget_advice_en: "Maintain disciplined daily spending within your safe limit.",
    daily_budget_advice_bn: "আপনার দৈনিক নিরাপদ বাজেটের মধ্যে খরচ সীমাবদ্ধ রাখুন।",
    category_cut_advice_en: "Review mobile banking transactions and dining out.",
    category_cut_advice_bn: "বাইরে খাওয়ার খরচ ও মোবাইল ব্যাংকিং লেনদেনের হিসাব রাখুন।",
    campus_tips_en: [
      "Buy academic books used at Nilkhet for substantial savings.",
      "Eat at campus canteens instead of outside cafes."
    ],
    campus_tips_bn: [
      "নীলক্ষেত থেকে সেকেন্ড-হ্যান্ড বই কিনলে ৫০% এর বেশি সাশ্রয় হবে।",
      "বাইরের রেস্টুরেন্টের বদলে ক্যাম্পাস বা মেসের ক্যান্টিনে খাবার খান।"
    ],
    urgency_level: "normal",
    is_pro: true
  };
}

export async function simulatePurchase(
  userId: string,
  itemTitle: string,
  amount: number,
  category: string
): Promise<PurchaseSimulationResult> {
  const res = await fetch(`${API_BASE_URL}/api/ai-coach/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      item_title: itemTitle,
      amount: amount,
      category: category
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Simulation error' }));
    throw new Error(err.detail || 'Could not simulate purchase');
  }

  return await res.json();
}

// --- MONTHLY ARCHIVES & STATEMENTS ---
export interface MonthlyReportCategoryItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyReportPaymentItem {
  payment_method: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyReportTransactionItem {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  payment_method: string;
  note?: string;
}

export interface MonthlyReportData {
  status: string;
  statement_id: string;
  month: string;
  month_label: string;
  period_start: string;
  period_end: string;
  is_month_end_eligible: boolean;
  generated_at: string;
  student_name: string;
  university_type?: string;
  year_of_study?: string;
  living_arrangement?: string;
  total_funds_available: number;
  total_inflows_logged: number;
  rent_mess_fixed: number;
  mess_meal_fixed: number;
  academic_fee_fixed: number;
  total_fixed_obligations: number;
  variable_expenses_total: number;
  total_outflow: number;
  protected_savings_target: number;
  net_savings_surplus: number;
  savings_rate_pct: number;
  spending_discipline_score: number;
  risk_tier: string;
  streak_days: number;
  executive_summary_en: string;
  executive_summary_bn: string;
  categories_breakdown: MonthlyReportCategoryItem[];
  payment_methods_breakdown: MonthlyReportPaymentItem[];
  transactions: MonthlyReportTransactionItem[];
}

export async function fetchMonthlyReport(userId: string, month?: string): Promise<MonthlyReportData> {
  let url = `${API_BASE_URL}/api/report/monthly/${userId}`;
  if (month) {
    url += `?month=${encodeURIComponent(month)}`;
  }
  const res = await fetchWithTimeout(url, {}, 9000);
  if (!res.ok) {
    throw new Error('Failed to generate monthly statement');
  }
  return await res.json();
}

export async function deleteAccountApi(userId: string): Promise<boolean> {
  if (userId === GUEST_USER_ID) {
    await AsyncStorage.multiRemove([
      GUEST_STORAGE_KEYS.PROFILE,
      GUEST_STORAGE_KEYS.EXPENSES,
      GUEST_STORAGE_KEYS.INCOMES,
      GUEST_STORAGE_KEYS.GOALS,
      GUEST_STORAGE_KEYS.DASHBOARD,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.DASHBOARD_CACHE,
    ]);
    return true;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.DASHBOARD_CACHE,
      ]);
      return true;
    }
  } catch (e) {
    console.error('Delete account error:', e);
  }
  return false;
}

export async function fetchMonthlyArchives(userId: string): Promise<MonthlyArchiveItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/archives/${userId}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}

export async function runMonthEndArchive(userId: string, month: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/archives/run-month-end?user_id=${userId}&month=${encodeURIComponent(month)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to archive month');
  return await res.json();
}

// --- MONTH-END CHECK-IN (Retraining) ---
export async function submitMonthEndCheckin(
  userId: string,
  month: string,
  actualRanOut: boolean,
  notes?: string
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/month-end-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      month: month,
      actual_ran_out_of_money: actualRanOut,
      feedback_notes: notes
    })
  });

  if (!res.ok) throw new Error('Failed to record check-in');
  return await res.json();
}

// --- THREE-BUCKET & SMART COACH API CALLS ---
export async function updateTargetSavings(
  userId: string,
  targetSavings: number
): Promise<{ status: string; target_savings: number; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/user/${userId}/target-savings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_savings: targetSavings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update target savings' }));
    throw new Error(err.detail || 'Failed to update target savings');
  }
  return await res.json();
}

export async function askSmartCoach(
  userId: string,
  question: string
): Promise<AskCoachResponse> {
  const res = await fetch(`${API_BASE_URL}/api/coach/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to consult Smart Coach' }));
    throw new Error(err.detail || 'Failed to consult Smart Coach');
  }
  return await res.json();
}

// --- SAVINGS GOALS (Dream Goal Vault & Dynamic Timeline) ---
export async function fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  if (userId === GUEST_USER_ID) {
    const goalsJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.GOALS);
    return goalsJson ? JSON.parse(goalsJson) : [];
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/goals/${userId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("API offline fallback for goals:", e);
  }
  return [];
}

export async function createSavingsGoal(payload: {
  user_id: string;
  title: string;
  target_amount: number;
  monthly_commitment: number;
  initial_saved?: number;
  category?: string;
  planning_mode?: 'monthly_amount' | 'target_timeline';
  target_months?: number;
  target_date?: string;
}): Promise<SavingsGoal> {
  if (payload.user_id === GUEST_USER_ID) {
    const goalsJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.GOALS);
    const goals: SavingsGoal[] = goalsJson ? JSON.parse(goalsJson) : [];
    const initialSaved = payload.initial_saved || 0;
    const remaining = Math.max(0, payload.target_amount - initialSaved);
    const progress = payload.target_amount > 0 ? Math.round((initialSaved / payload.target_amount) * 100) : 0;
    const isTimelineMode = payload.planning_mode === 'target_timeline';
    const targetMonths = payload.target_months || 6;
    const monthsLeft = isTimelineMode ? targetMonths : (payload.monthly_commitment > 0 ? Math.ceil(remaining / payload.monthly_commitment) : 12);
    const requiredMonthly = isTimelineMode ? Math.ceil(remaining / Math.max(1, targetMonths)) : payload.monthly_commitment;
    const completionDate = new Date(Date.now() + monthsLeft * 30 * 86400000).toISOString().substring(0, 7);

    const newGoal: SavingsGoal = {
      id: 'goal_' + Date.now(),
      user_id: GUEST_USER_ID,
      title: payload.title,
      target_amount: payload.target_amount,
      current_saved: initialSaved,
      monthly_commitment: isTimelineMode ? requiredMonthly : payload.monthly_commitment,
      is_paused: false,
      missed_months: 0,
      category: payload.category || 'General',
      start_date: new Date().toISOString().substring(0, 10),
      is_active: true,
      progress_pct: progress,
      remaining_amount: remaining,
      estimated_months_left: monthsLeft,
      target_completion_date: completionDate,
      target_completion_date_bn: completionDate,
      planning_mode: payload.planning_mode || 'monthly_amount',
      target_months: payload.target_months || 0,
      target_date: payload.target_date || completionDate,
      required_monthly_savings: requiredMonthly,
    };
    goals.push(newGoal);
    await AsyncStorage.setItem(GUEST_STORAGE_KEYS.GOALS, JSON.stringify(goals));
    await calculateGuestDashboard();
    return newGoal;
  }
  const res = await fetch(`${API_BASE_URL}/api/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create goal' }));
    throw new Error(err.detail || 'Failed to create goal');
  }
  return await res.json();
}

export async function boostSavingsGoal(goalId: string, userId: string, amount: number): Promise<SavingsGoal> {
  if (userId === GUEST_USER_ID) {
    const goalsJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.GOALS);
    const goals: SavingsGoal[] = goalsJson ? JSON.parse(goalsJson) : [];
    const idx = goals.findIndex((g) => g.id === goalId);
    if (idx !== -1) {
      goals[idx].current_saved += amount;
      goals[idx].remaining_amount = Math.max(0, goals[idx].target_amount - goals[idx].current_saved);
      goals[idx].progress_pct = Math.round((goals[idx].current_saved / goals[idx].target_amount) * 100);
      await AsyncStorage.setItem(GUEST_STORAGE_KEYS.GOALS, JSON.stringify(goals));
      await calculateGuestDashboard();
      return goals[idx];
    }
  }
  const res = await fetch(`${API_BASE_URL}/api/goals/${goalId}/boost`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to boost goal' }));
    throw new Error(err.detail || 'Failed to boost goal');
  }
  return await res.json();
}

export async function toggleGoalPause(goalId: string, userId: string): Promise<SavingsGoal> {
  const res = await fetch(`${API_BASE_URL}/api/goals/${goalId}/toggle-pause`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to toggle pause' }));
    throw new Error(err.detail || 'Failed to toggle pause');
  }
  return await res.json();
}

export async function sweepLeftoverToGoal(goalId: string, userId: string, amount: number): Promise<SavingsGoal> {
  const res = await fetch(`${API_BASE_URL}/api/goals/${goalId}/sweep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to sweep funds' }));
    throw new Error(err.detail || 'Failed to sweep funds');
  }
  return await res.json();
}

export async function deleteSavingsGoal(goalId: string, userId: string): Promise<any> {
  if (userId === GUEST_USER_ID) {
    const goalsJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.GOALS);
    const goals: SavingsGoal[] = goalsJson ? JSON.parse(goalsJson) : [];
    const filtered = goals.filter((g) => g.id !== goalId);
    await AsyncStorage.setItem(GUEST_STORAGE_KEYS.GOALS, JSON.stringify(filtered));
    await calculateGuestDashboard();
    return { status: 'success' };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/goals/${goalId}?user_id=${userId}`, {
      method: 'DELETE'
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to delete goal' }));
    throw new Error(err.detail || 'Failed to delete goal');
  } catch (e: any) {
    console.warn("deleteSavingsGoal backend notice, falling back to local storage:", e);
    const goalsJson = await AsyncStorage.getItem(GUEST_STORAGE_KEYS.GOALS);
    if (goalsJson) {
      const goals: SavingsGoal[] = JSON.parse(goalsJson);
      const filtered = goals.filter((g) => g.id !== goalId);
      await AsyncStorage.setItem(GUEST_STORAGE_KEYS.GOALS, JSON.stringify(filtered));
    }
    return { status: 'success' };
  }
}

export async function fetchStreak(userId: string): Promise<{ user_id: string; on_track_streak: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/streak/${userId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("API offline fallback for streak:", e);
  }
  return { user_id: userId, on_track_streak: 5 };
}

// --- LEGACY BACKWARD COMPATIBILITY ---
export interface StudentInputPayload {
  gender: string;
  age: number;
  year_of_study: string;
  university_type: string;
  where_you_live: string;
  total_monthly_money: string;
  main_source_of_money: string;
  do_you_earn_income: string;
  monthly_rent: string;
  monthly_food: string;
  monthly_transport: string;
  monthly_entertainment: string;
  track_spending: number;
  money_saved_per_month: string;
  mobile_banking_use: string;
  borrowed_from_friends: string;
  aware_balance: number;
  aware_weekly_track: number;
  aware_check_before_buy: number;
  impulse_spontaneous: number;
  impulse_discounts: number;
  impulse_regret: number;
}

export interface PredictionResult {
  risk_score_pct: number;
  risk_tier: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK';
  risk_tier_bn: 'কম ঝুঁকি' | 'মাঝারি ঝুঁকি' | 'উচ্চ ঝুঁকি';
  summary_warning_en: string;
  summary_warning_bn: string;
  composite_scores: {
    awareness_score: number;
    impulse_score: number;
  };
  top_drivers: RiskDriver[];
  advice: {
    english: string[];
    bengali: string[];
  };
  prediction_id: string;
}

export async function predictStudentRisk(data: StudentInputPayload): Promise<PredictionResult> {
  const res = await fetch(`${API_BASE_URL}/predict-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return await res.json();
}

export async function submitRetrainingFeedback(payload: any) {
  const res = await fetch(`${API_BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

// --- 10. CAMPUS PEER DEBT & LENDING (দেনা-পাওনা) ---
export interface PeerDebtItem {
  id: string;
  user_id: string;
  type: 'owed_to_me' | 'i_owe';
  person_name: string;
  amount: number;
  note?: string;
  due_date?: string;
  is_settled: boolean;
  settled_at?: string;
  created_at: string;
}

export interface PeerDebtSummary {
  status: string;
  debts: PeerDebtItem[];
  total_owed_to_me: number;
  total_i_owe: number;
  net_peer_balance: number;
}

export async function fetchPeerDebts(userId: string, status: 'all' | 'active' | 'settled' = 'all'): Promise<PeerDebtSummary> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/debts/${userId}?status=${status}`, {}, 8000);
  if (!res.ok) throw new Error(`Failed to fetch peer debts: ${res.status}`);
  return await res.json();
}

export async function createPeerDebt(payload: {
  user_id: string;
  type: 'owed_to_me' | 'i_owe';
  person_name: string;
  amount: number;
  note?: string;
  due_date?: string;
}): Promise<PeerDebtItem> {
  const res = await fetch(`${API_BASE_URL}/api/debts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create peer debt: ${res.status}`);
  return await res.json();
}

export async function settlePeerDebt(debtId: string, userId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/debts/${debtId}/settle?user_id=${userId}`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`Failed to settle peer debt: ${res.status}`);
  return await res.json();
}

export async function deletePeerDebt(debtId: string, userId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/debts/${debtId}?user_id=${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete peer debt: ${res.status}`);
  return await res.json();
}

// --- 11. PERSONAL MESS MEAL & DEPOSIT (আমার মেস মিল ও হিসাব) ---
export interface MessSummary {
  status: string;
  month: string;
  total_meals: number;
  estimated_meal_rate: number;
  meal_advance_paid: number;
  consumed_food_cost: number;
  balance_status: 'surplus' | 'deficit';
  balance_amount: number;
  days_logged: number;
  meals_by_date: Record<string, number>;
  enable_mess_meals?: boolean;
}

export async function fetchMessSummary(userId: string, month?: string): Promise<MessSummary> {
  const url = month ? `${API_BASE_URL}/api/mess/${userId}?month=${month}` : `${API_BASE_URL}/api/mess/${userId}`;
  const res = await fetchWithTimeout(url, {}, 8000);
  if (!res.ok) throw new Error(`Failed to fetch mess summary: ${res.status}`);
  return await res.json();
}

export async function logMessMeal(payload: {
  user_id: string;
  date: string;
  meal_count: number;
  note?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/mess/meal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to log mess meal: ${res.status}`);
  return await res.json();
}

export async function updateEstimatedMealRate(payload: {
  user_id: string;
  estimated_meal_rate: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/mess/rate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update meal rate: ${res.status}`);
  return await res.json();
}

export async function updateMessTotalMeals(payload: {
  user_id: string;
  total_meals: number;
  month?: string;
}): Promise<MessSummary> {
  const res = await fetch(`${API_BASE_URL}/api/mess/total-meals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update total meals: ${res.status}`);
  return await res.json();
}

export async function updateMessAdvance(payload: {
  user_id: string;
  meal_advance_paid: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/mess/advance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update mess advance: ${res.status}`);
  return await res.json();
}

export async function toggleMessMealSystem(userId: string, enableMessMeals: boolean): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/mess/toggle`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, enable_mess_meals: enableMessMeals }),
  });
  if (!res.ok) throw new Error(`Failed to toggle mess meal system: ${res.status}`);
  return await res.json();
}
