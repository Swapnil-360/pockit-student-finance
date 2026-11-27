# Pockit — Student Money & Financial Risk Coach
### মাসের শেষে পকেট খালি হওয়ার আগেই সতর্ক হোন! | Get warned before your pocket runs empty!

> **Keywords:** `Pockit` · `Student Expense Tracker Bangladesh` · `Mess Meal Calculator` · `bKash / Nagad Budget App` · `AI Financial Risk Coach` · `Bilingual (EN / বাংলা)`

[![Latest Release](https://img.shields.io/github/v/release/Swapnil-360/pockit-student-finance?label=Download%20APK&color=10B981&style=for-the-badge)](https://github.com/Swapnil-360/pockit-student-finance/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-0EA5E9?style=for-the-badge)](https://github.com/Swapnil-360/pockit-student-finance/releases/latest)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Gemini%20AI-F59E0B?style=for-the-badge)](https://pockit-backend-eppq.onrender.com/docs)

A complete, production-grade cross-platform mobile application and intelligent backend ecosystem engineered specifically for university students in Bangladesh. Powered by a pre-trained hybrid Machine Learning risk model (`financial_risk_model.pkl`) and **Google Gemini 2.5 Flash (`gemini-2.5-flash`)**.

---

## 📱 Download & Install (Android APK)

> **Latest Version:** `v2.0.2` — **Free Direct Download (No Play Store Required)**

1. **[Download `Pockit-2.0.2.apk` (Latest Release)](https://github.com/Swapnil-360/pockit-student-finance/releases/latest/download/Pockit-2.0.2.apk)** *(or browse all versions on the [GitHub Releases](https://github.com/Swapnil-360/pockit-student-finance/releases) page)*.
2. Open the downloaded `.apk` file on your Android phone.
3. If prompted, tap **Settings → Allow from this source** ("Install unknown apps") and tap **Install**.
4. Launch **Pockit** — tap **"⚡ Quick Demo Mode (1-Click)"** or sign in with Google/Email to get started!

**Support & Contact:** [miftahurr503@gmail.com](mailto:miftahurr503@gmail.com) · **Privacy Policy:** [`/privacy`](https://pockit-backend-eppq.onrender.com/privacy)

---

## 1. System Architecture

```
ML Project/
├── backend/                              # FastAPI Python Service
│   ├── main.py                           # API Endpoints (Auth, Ledger, AI Coach, Subscriptions)
│   ├── pipeline_service.py               # 22-Feature Hybrid ML Pipeline & Safe-to-Spend Pacing
│   ├── gemini_advisor.py                 # Gemini 2.5 Flash Interactions API Coach & Simulator
│   ├── database.py                       # SQLite Database with Thread-Safe Thread Pool
│   ├── models.py                         # Pydantic v2 Request/Response Schemas
│   ├── config.py                         # Path & Environment Configurations
│   ├── supabase_schema.sql               # Production PostgreSQL Schema with Row-Level Security (RLS)
│   ├── financial_risk_model.pkl          # Pre-trained GradientBoosting Risk Classifier
│   ├── requirements.txt                  # Python Dependencies
│   ├── .env.example                      # Backend Environment Template
│   └── test_suite.py                     # 10-Point End-to-End Automated Integration Test Suite
│
├── mobile-app/                           # Expo React Native Frontend (SDK 58 + TypeScript)
│   ├── assets/
│   │   └── brand/                        # 🎨 Custom Logo & Brand Asset Drop-In Directory
│   │       ├── logo.png                  # Primary App Logo (1024x1024 recommended)
│   │       ├── splash-icon.png           # Animated Splash Icon
│   │       └── adaptive-icon.png         # Android Adaptive Icon
│   ├── src/
│   │   ├── constants/
│   │   │   ├── branding.ts               # Centralized Brand Identity & Metadata Config
│   │   │   ├── quotes.ts                 # 12+ Relatable Bilingual Student Money Quotes
│   │   │   ├── theme.ts                  # Obsidian & Emerald/Electric Cyan Fintech Theme
│   │   │   └── translations.ts           # Comprehensive Bilingual (English & বাংলা) Dictionary
│   │   ├── components/
│   │   │   ├── BrandLogo.tsx             # Vector Geometric Emblem & Image Logo Renderer
│   │   │   ├── AddIncomeModal.tsx        # Multi-Source Income Modal (Family, Tuition, etc.)
│   │   │   ├── LogExpenseModal.tsx       # <5s Tactile Daily Expense Logger
│   │   │   ├── ProSubscriptionModal.tsx  # Tk 50/Month Pro AI Subscription & TrxID Verification
│   │   │   ├── ForgotPasswordModal.tsx   # Student Password Reset Modal
│   │   │   ├── RiskGauge.tsx             # Animated 0–100% Risk Gauge & Tier Badge
│   │   │   └── FormControls.tsx          # Touch-Compliant Steppers, Chips & Segmented Controls
│   │   ├── screens/
│   │   │   ├── SplashScreen.tsx          # Pulse-Animated Splash Screen with Session Check
│   │   │   ├── PinLockScreen.tsx         # 4-Digit Security PIN & Biometric Unlock
│   │   │   ├── AuthScreen.tsx            # Email/Password Auth & 1-Click Instant Demo Login
│   │   │   ├── OnboardingWizard.tsx      # Baseline Student Survey (Demographics, Habits)
│   │   │   ├── HomeScreen.tsx            # Dashboard with Dynamic Motivational Quotes Banner
│   │   │   ├── CalendarLedgerScreen.tsx  # Real-Time Calendar (1st–31st) & Filterable Ledger
│   │   │   ├── AiCoachScreen.tsx         # Gemini 2.5 Flash Daily Plan & Purchase Simulator
│   │   │   └── ProfileScreen.tsx         # Settings, PIN Security, Archives & Retraining Check-In
│   │   └── services/
│   │       ├── api.ts                    # Full API Client with AsyncStorage Caching
│   │       ├── notifications.ts          # Daily 9:30 PM Reminder & High-Risk Surge Alert (>=70%)
│   │       └── security.ts               # SecureStore Encryption & Local Biometrics
│   ├── app.json                          # Expo App Configuration
│   └── package.json                      # React Native 0.88, React 19, TypeScript
│
└── Student_Spending_Survey_200_Responses.xlsx # Original 200-Student Survey Dataset
```

---

## 2. Brand Identity & Easy Custom Logo Structure

To drop in your own custom logo without modifying component code:
1. Place your PNG/SVG files inside:
   ```
   mobile-app/assets/brand/
   ├── logo.png               # High-res 1024x1024 logo
   ├── splash-icon.png        # Icon used in the animated splash screen
   └── adaptive-icon.png      # Android launcher adaptive icon
   ```
2. The app reads from [`mobile-app/src/constants/branding.ts`](file:///d:/Projects(Uni)/ML%20Project/mobile-app/src/constants/branding.ts) which cleanly organizes app names, subtitles, and taglines:
   - **App Name:** `TakaTrack AI`
   - **Subtitle:** `Student Money & Risk Coach`
   - **Tagline (Bilingual):** `মাসের শেষে পকেট খালি হওয়ার আগেই সতর্ক হোন! | Get warned before your pocket runs empty!`
3. The [`BrandLogo.tsx`](file:///d:/Projects(Uni)/ML%20Project/mobile-app/src/components/BrandLogo.tsx) component automatically supports vector SVG rendering or image rendering with responsive sizing (`sm`, `md`, `lg`, `xl`).

---

## 3. Core Capabilities

### A. Hybrid ML Risk Model (`financial_risk_model.pkl`)
- **Preserved Feature Space:** Strict alignment with all 22 survey features and categorical encodings from `Student_Spending_Survey_200_Responses.xlsx`.
- **Behavioral Indices:**
  $$\text{awareness\_score} = \frac{\text{aware\_balance} + \text{aware\_weekly\_track} + \text{aware\_check\_before\_buy}}{3}$$
  $$\text{impulse\_score} = \frac{\text{impulse\_spontaneous} + \text{impulse\_discounts} + \text{impulse\_regret}}{3}$$
- **Real-Time Dynamic Safe-to-Spend Limit:**
  $$\text{Daily Safe-to-Spend} = \max\left(0, \frac{\text{Total Available Funds} - \text{Fixed Rent} - \text{Total Spent}}{\text{Days Remaining in Month}}\right)$$
  Directly protects fixed mess/rent from accidental discretionary spending.

### B. Dynamic Motivational Quotes Banner
- Located at the top of the Home Dashboard with a rotating pool of 12+ highly relatable bilingual quotes.
- Automatically selects a fresh random quote on app launch and pull-to-refresh.
- Includes a subtle `"পরবর্তী উক্তি ↻ / Next Quote ↻"` button for instant cycling.

### C. Real-Time Monthly Calendar (1st to 28th/30th/31st) & Multi-Source Ledger
- Operates on live month cycles with interactive day cells (green dot for income, red dot for expense). Tapping any date filters the ledger to that day's cashflows.
- **Add Funds Anytime:** Multi-source income entries (`Family Allowance`, `Tuition / Part-Time`, `Freelance`, `Scholarship`, `Gift / Other`) via `Cash`, `bKash`, `Nagad`, `Rocket`, or `Bank Transfer`.
- **Automated Monthly Archiving:** Archived summaries preserved in the `monthly_archives` table and accessible via Profile.

### D. Push Notifications & High-Risk Surge Alerts
- **Daily 9:30 PM Reminder:** Bilingual local push notification prompting students to log daily spending.
- **Instant High-Risk Alert:** Triggers immediately if an expense pushes the student's risk score $\ge 70\%$.

### E. Freemium Tier + Pro AI Subscription (Tk 50/Month)
- **Free Tier:** Calendar ledger, multi-source income tracking, daily expenses, 0–100% ML risk score, and rule-based advice.
- **Pro AI Tier (Tk 50/Month):** Google Gemini 2.5 Flash personalized daily spending plans, category trim recommendations, and the **"Ask AI Before I Buy" Simulator**.
- Payment verification via bKash/Nagad TrxID submission plus **"⚡ Activate Demo Pro (Instant Testing)"** button for seamless developer evaluation.

---

## 4. Quick Start Guide

### Step 1: Start the Backend (FastAPI)
```bash
cd backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure .env with your Gemini API Key
# (Get a free key from https://aistudio.google.com/)
cp .env.example .env

# 3. Run automated 10-point test suite
python test_suite.py

# 4. Start the server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- Swagger UI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 2: Start the Mobile App (Expo)
```bash
cd mobile-app

# 1. Install dependencies
npm install

# 2. Verify project health & type checking
npx tsc --noEmit
npx expo-doctor

# 3. Start Expo development server
npx expo start
```
- Press `w` to open in your web browser.
- Or open **Expo Go** on Android / iOS and scan the QR code.
- Tap **"⚡ Quick Demo Mode (1-Click)"** on the login screen for immediate pre-configured testing.

---

## 5. Production Supabase PostgreSQL Deployment

To deploy on a cloud PostgreSQL database:
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and paste the contents of [`backend/supabase_schema.sql`](file:///d:/Projects(Uni)/ML%20Project/backend/supabase_schema.sql).
3. Copy your project URL, anon key, and service role key into `backend/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```
4. All Row-Level Security (RLS) policies are configured out-of-the-box so users can only access their own financial records.

---

## 6. Cloud Backend Deployment (Render / Railway)

### Deploy to Render.com (Free Tier)
1. Push your repository to GitHub.
2. In [Render.com](https://render.com), click **New + > Web Service** and link your repo:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. In **Environment Variables**, set:
   - `GEMINI_API_KEY`: Your Gemini API key from [Google AI Studio](https://aistudio.google.com/)
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `ENVIRONMENT`: `production`

---

## 7. Android APK Compilation (EAS Build)

Compile a standalone `.apk` directly to install and test on physical Android phones:

```bash
cd mobile-app

# 1. Install EAS CLI (if not already installed)
npm install -g eas-cli

# 2. Login to your Expo account
eas login

# 3. Build standalone Android APK
eas build --platform android --profile preview

# 4. (For Google Play Store submission) Build production App Bundle (.aab)
eas build --platform android --profile production
```


