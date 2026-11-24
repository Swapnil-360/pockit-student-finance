c# Product Requirements Document (PRD) — Pockit
### Student Money & Risk Coach (মাসের শেষে পকেট খালি হওয়ার আগেই সতর্ক হোন!)

**Version:** 2.1.0 (Living Document)  
**Status:** Production Ready  
**Target Audience:** University Students in Bangladesh (Public, Private, National University)  
**Platforms:** Android (Google Play Store), iOS (App Store), Web (PWA)  
**Core Technologies:** React Native (Expo SDK 58), FastAPI, Supabase / SQLite, Hybrid ML (`financial_risk_model.pkl`), Google Gemini 2.5 Flash  

---

## 1. Product Vision & Target Audience

### 1.1 Problem Statement
University students in Bangladesh face chronic financial insecurity and end-of-month panic ("মাসের শেষে টানাটানি"). The primary drivers are:
- Lump-sum fixed expenses (mess meal advances, hostel/flat rent, private university semester fee installments).
- Irregular inflow timing (family support, student tuition fees, part-time freelance income).
- Peer borrowing ("borrowing from friends") masking real liquidity deficits.
- Cognitive bias: spending without real-time awareness of remaining days in the month.

### 1.2 Core Value Proposition
**Pockit** is a specialized financial copilot designed specifically for the Bangladeshi student reality. Unlike generic accounting apps, it:
1. **Ring-fences fixed living & academic obligations** (Mess, Rent, and Semester Tuition Installments) so students never accidentally spend their housing or exam money.
2. **Protects dream savings goals** (gadgets, courses, laptop funds) so money is actually saved each month.
3. **Calculates a dynamic Safe Daily Spending Limit** that adjusts in real time across remaining days.
4. **Predicts financial risk (0–100%)** using a machine learning model trained on real student spending data.
5. **Provides continuous custom numeric entries & post-sign-in budget management**, allowing students to update their baseline anytime from their Profile.
6. **Offers a "Skip for Now" bypass**, allowing students to start tracking immediately with a pristine clean slate and add expenses or income on-the-fly.

---

## 2. User Flows & Lifecycle

```
[Launch App]
     │
     ▼
[Splash Screen] ──────────► [First Launch?]
                                │
                      Yes ┌─────┴─────┐ No
                          ▼           ▼
               [4-Card Walkthrough] [PIN / Auth]
                          │           │
                          ▼           ▼
                    [Onboarding Survey (if new)]
                                │
                                ▼
                       [Home Dashboard]
```

### 2.1 First-Launch Walkthrough & On-Demand Guide
- **First-Launch Trigger:** Transition smoothly from animated Splash Screen into an interactive 4-card swipeable walkthrough tracked via `AsyncStorage` (`@has_seen_walkthrough`).
  - **Slide 1 — Smart Daily Safe Limit:** Pacing that prevents month-end panic by ring-fencing rent & mess.
  - **Slide 2 — Live Financial Risk Alert:** 0–100% shortage prediction based on 22 student survey features.
  - **Slide 3 — Dream Goal Savings Vault:** Dedicated monthly target savings with pause and sweep mechanics.
  - **Slide 4 — TakaTrack Smart Coach:** Pre-purchase simulator and campus money lifehacks.
  - Controls: Next / Get Started buttons, dot pagination, Skip button on every slide.
- **Always-Accessible `i` (Info) Guide:** Available anytime via a subtle info button in the top header and under Profile settings.

### 2.2 Google One-Tap Sign-In & Profile Avatar Synchronization
- **Zero-Friction Authentication:** Students authenticate with one tap via real Supabase Google OAuth (`supabase.auth.signInWithOAuth`) on both Web and Mobile devices (using `expo-web-browser` and deep link callback `takatrack://auth/callback`).
- **Real Account & Photo Auto-Sync:** Upon authentication, Google's real profile name and high-resolution avatar photo (`https://lh3.googleusercontent.com/...`) are captured and synchronized across the mobile dashboard and Supabase PostgreSQL.
- **Fresh-Slate User Onboarding:** New Google accounts start cleanly without pre-populated dummy transactions or goals, routing the student directly to the Onboarding Wizard (`has_profile = False`) to configure their own authentic university, monthly allowance, rent/mess obligations, and target savings.
- **Live Avatar Synchronization:** The student's Google avatar photo is displayed in the Home Dashboard header alongside their name (`Hello, {Name}`) and in Profile Settings with a "Google Verified Account" identity badge.

### 2.3 Offline Guest Mode (Device Cache Memory)
- **Instant No-Account Access:** Students can tap "Continue as Guest" / "গেস্ট হিসেবে ব্যবহার করুন" to immediately use TakaTrack AI without creating an account or providing credentials.
- **Local Cache Persistence:** All guest data (onboarding survey profile, expenses, multi-source incomes, savings goals, and live dashboard) is persisted locally in device cache memory via `AsyncStorage` (`@takatrack_guest_*`).
- **Zero Mock Data Guarantee:** Guests receive an authentic fresh start (৳0 dummy expenses, no mock student accounts), allowing them to manage their actual student budget offline.

### 2.4 Three-Bucket Financial Architecture & Calibrated Pacing Engine
```
Total Inflow (Baseline Allowance + Tuition + Freelance + Other)
  ├── Bucket 1: Fixed Obligations (Fixed Rent + Mess Meal Advance + Semester Fee)
  ├── Bucket 2: Protected Target Savings (Dream Goal Vault)
  └── Bucket 3: Spendable Variable Daily Pool (Food, Transit, Discretionary)
```
- **Partial Obligation Protection Formula:**
  $$\text{Unpaid Fixed Obligations} = \max\left(0, \text{Fixed Baseline Total} - \text{Fixed Obligations Spent}\right)$$
  $$\text{Total Fixed Reserved} = \text{Fixed Obligations Spent} + \text{Unpaid Fixed Obligations} = \max\left(\text{Fixed Baseline Total}, \text{Fixed Obligations Spent}\right)$$
  $$\text{Spendable Variable Pool} = \text{Total Inflow} - \text{Total Fixed Reserved} - \text{Target Savings} - \text{Variable Spent}$$
- **Safe Daily Formula:**
  $$\text{Safe Daily Limit} = \max\left(0, \frac{\text{Spendable Variable Pool}}{\text{Days Remaining in Month}}\right)$$
- **Calibrated Late-Month Pacing Dominance:**
  - Days 1–7 (Early Month): 50% Baseline ML + 50% Live Safe Limit
  - Days 8–20 (Mid Month): 30% Baseline ML + 70% Live Safe Limit
  - Days 21–31 (Late Month): 10% Baseline ML + 90% Live Safe Limit (empirical cashflow reality overrides demographic priors)
  - Safety Clamp: When daily safe $\ge 250$ Tk/day and savings are intact, maximum risk is strictly bounded at $\le 30.0\%$ (Low Risk).

### 2.3 Dual-Mode Dream Goal Vault ("Save for Big Purchases")
Students configure a target purchase (e.g., `LG UltraGear 27" Gaming Monitor`, `৳32,000`) using one of two flexible setup modes:
- **Mode A — Save by Monthly Amount (`monthly_amount`):** Student commits a fixed amount per month (e.g., `৳500/month`). Projected completion date floats dynamically based on `ceil((Target - Saved) / Monthly_Commitment)`.
  - **Dynamic Acceleration:** Adding cash via `Boost` or leftover sweep accelerates the timeline (e.g., *"Boosted! Timeline shortened by 2 months — 8 months left"*).
- **Mode B — Save by Target Timeline (`target_timeline`):** Student selects a duration (e.g., 3, 6, 12 months) or target deadline date.
  - **Required Monthly Sync:** Instantly computes `Required Monthly Savings = ceil((Target - Saved) / Remaining_Months)` and automatically synchronizes this into `target_savings` within the Three-Bucket Daily Spending Limit formula.
  - **Dynamic Boost Recalculation:** Adding extra funds lowers the required monthly commitment for remaining months while keeping the deadline fixed (e.g., *"After ৳1,000 boost, you only need ৳1,334/mo for the remaining 2 months"*).
- **Pause Month:** If an emergency strikes, students can pause savings for 1 month without shame; the completion timeline or required savings dynamically adjusts.
- **Leftover Sweep:** At month-end, unspent variable pocket money can be swept into the vault with 1 tap.
- **Boost:** Allows instant custom deposits when gifted extra cash.

### 2.4 Mess Meal System & Mid-Month Calibration Assistant
- **Accommodation-Aware Intelligence:** Automatically defaults to Active for "Mess-hostel" living arrangements and Inactive for "Rented flat" / "With family" (with instant toggle in Profile/Settings).
- **Mid-Month Onboarding Adjustment:** Students who start tracking in the middle of the month (e.g. Day 15) can directly enter their prior cumulative meals consumed so far via a dedicated Mid-Month Meal Adjustment calculator.
- **Real-Time Food Cost & Surplus Computation:** Live feedback calculates `Food Cost = Total Meals * Meal Rate` and `Advance Surplus = Mess Meal Advance - Food Cost` in real time.

### 2.4 Weekly Discipline Streak Tracker
- Full-width 7-day visual node strip tracking consecutive days spent within or below the safe daily allowance.

---

## 3. UI/UX Design System (Scandinavian Soft-Card)

- **Aesthetic:** Calm Scandinavian fintech aesthetic inspired by Wise, Linear, and Revolut.
- **Light Mode (Default):** Soft powder slate canvas (`#EEF3F6`), pure white elevated cards with diffused soft shadow (`#466B85`, 10% opacity).
- **Dark Mode:** Deep slate-obsidian canvas (`#0F172A`) with dark slate elevated cards (`#1E293B`).
- **Primary Accent:** Warm Terracotta Coral (`#F47B4E`).
- **Secondary Accent:** Dusty Slate-Blue (`#5A8296`).
- **Inflow / Success:** Emerald (`#10B981`).
- **Strict Anti-Cliché Rule:** No sparkles, flames, robot avatars, or combined mathematical symbol buttons (`+ Add`). Single clean vector icon + label only.
- **Bilingual:** 100% bilingual English and Bengali (`বাংলা`).

---

## 4. Freemium vs. Smart Coach Pro Model (Tk 50/Month)

| Feature | Free Tier | Smart Coach Pro (Tk 50/mo) |
| :--- | :---: | :---: |
| Real-time Calendar & Multi-Source Ledger | Yes | Yes |
| Dynamic Safe Daily Spending Limit | Yes | Yes |
| 0–100% Machine Learning Risk Scoring | Yes | Yes |
| Dream Goal Vault & Leftover Sweep | Yes | Yes |
| 7-Day Discipline Streaks | Yes | Yes |
| Gemini 2.5 Flash Daily Budget Plan | Preview Only | Unlimited |
| "Ask Coach Before I Buy" Simulator | Preview Only | Unlimited |
| Bangladeshi Campus Money Lifehacks | Preview Only | Unlimited |
| Instant bKash / Nagad Send-Money TrxID | N/A | Automated Verification |

---

## 5. Modern Splash Screen & Brand Identity Standard

- **Modern Dark Fintech Boot Splash:**
  - Deep slate/navy dark background (`#172330`) with subtle engineering dot-grid matrix texture.
  - Large elevated circular white badge (`148px`) housing the zoomed-in shield emblem with the terracotta Taka glyph (`ট`) and upward growth trajectory.
  - High-contrast pure white title (`TakaTrack AI`) with bilingual taglines floating directly on the dark canvas without artificial card borders.
  - Modern horizontal capsule progress loader (`264px` x `10px`) with animated Warm Terracotta (`#F47B4E`) fill and glowing shadow.
  - Subtle micro-interactions: 950ms smooth session check-in timer with single-tap skip option.
- **Zoomed-In Brand Assets:**
  - Launcher icon (`1024x1024` RGB on `#FFFFFF` canvas) with shield emblem zoomed to 84% coverage.
  - Android Adaptive Icon with emblem centered in 70% safe zone.
  - Header brand emblem (`BrandLogo.tsx`) proportioned to 42px matching the user avatar on the opposite header side.
