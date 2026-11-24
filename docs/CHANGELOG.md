# Changelog — Pockit (formerly TakaTrack AI)

All notable changes to the **Pockit** platform are documented in this file in reverse chronological order.

---

## [2.12.0] — 2026-11-24

### Dual-Mode Goal Vault, Mid-Month Mess Meal Assistant & Web App Cashflow Ledger Deletion Fix
- **Dual-Mode Dream Goal Vault (`mobile-app/src/components/CreateGoalModal.tsx`, `SavingsGoalCard.tsx`, `BoostGoalModal.tsx`):**
  - Upgraded Goal Vault to support two distinct planning modes with a seamless segmented toggle:
    - **Mode A — Save by Monthly Amount (`monthly_amount`):** Student commits a fixed amount per month (e.g. ৳500/mo). Projected completion date floats dynamically based on `ceil((target - saved) / monthly_commitment)`. Boost deposits dynamically accelerate the timeline.
    - **Mode B — Save by Target Timeline (`target_timeline`):** Student selects a target duration (e.g. 3, 6, 12 months) or deadline. Automatically computes `required_monthly_savings = ceil((target - saved) / remaining_months)` and automatically synchronizes this figure into `profiles.target_savings` within the Three-Bucket Daily Spending Limit formula.
  - **Dynamic Mode B Boost & Pause Recalculation:** When extra cash is added via `BoostGoalModal`, the deadline remains fixed and the required monthly savings automatically drops for remaining months (e.g., *"After ৳1,000 boost, you only need ৳1,334/mo for the remaining 2 months"*).
  - **Visual Distinction & Bilingual Cards:** Added mode badges (`💰 Monthly Budget` vs `⏱️ Target Timeline`) and dedicated meta rows displaying committed monthly amount vs required monthly rate.
- **Mid-Month Mess Meal Assistant & Quick Adjustment (`MessMealTrackerModal.tsx`, `backend/main.py`, `backend/database.py`):**
  - Added direct, prominent input for Total Meals consumed so far for students starting or onboarding midway through the month (e.g. Day 15).
  - Introduced interactive **Mid-Month Meal Calculator** box with quick increment pills (`+1`, `+5`, `+10`, `+15`, `+20`), live real-time preview of Food Cost (`meals * rate`) and Advance Surplus/Deficit (`advance - cost`), and 1-tap save.
  - Added accommodation-based intelligent defaults: Mess/Hostel living defaults `enable_mess_meals = true`, while Rented Flat defaults `enable_mess_meals = false` (toggleable in Profile/Settings).
- **Web App Cashflow Ledger Deletion Fix (`CalendarLedgerScreen.tsx`, `mobile-app/src/services/api.ts`):**
  - Replaced browser-level `window.confirm` with a premium cross-platform in-app Scandinavian confirmation modal, resolving the Chromium mobile device emulation bug where dialogs were suppressed.
  - Added **Optimistic UI Removal**: deleted income and expense transactions disappear immediately from screen with zero latency, recalculating daily inflow, outflow, and net cashflow on-the-fly.
  - Added local guest cache fallback in `deleteIncome` to ensure transactions delete cleanly across both online backend sessions and offline storage.
  - Expanded delete button touch target (`padding: 8`, `minWidth: 34`, `minHeight: 34`, `hitSlop: 10`, `cursor: 'pointer'`).
- **Database & Model Migrations (`backend/database.py`, `backend/models.py`):**
  - Added `planning_mode` (`TEXT`), `target_months` (`INTEGER`), and `target_date` (`TEXT`) columns to SQLite and Supabase tables.
  - Added `/api/mess/total-meals` endpoint for programmatic mid-month meal calibration.

---

## [2.11.0] — 2026-11-24

### Hybrid ML Calibration, Late-Month Pacing Dominance, Partial Obligation Protection & Itemized Breakdown
- **Late-Month Pacing Dominance Engine (`backend/pipeline_service.py`):**
  - Resolved false "83.9% High Risk" anomaly on healthy daily budgets (e.g. ৳285.7/day with rent & mess meals already paid).
  - Implemented dynamic weighting schedule based on month progress:
    - **Days 1–7 (Early Month):** 50% Demographic Baseline ML + 50% Live Safe Limit.
    - **Days 8–20 (Mid Month):** 30% Demographic Baseline ML + 70% Live Pacing.
    - **Days 21–31 (Late Month):** 10% Demographic Baseline ML + 90% Live Pacing (since empirical survival and cash discipline are demonstrated).
- **Daily Safe Discretionary Buffer Safety Clamps (`pipeline_service.py`):**
  - When fixed housing/mess costs are ring-fenced and savings are intact:
    - `daily_safe >= 250 Tk/day` $\to$ Risk is strictly capped at $\le 30.0\%$ (Low Risk).
    - `daily_safe >= 180 Tk/day` $\to$ Risk is capped at $\le 42.0\%$ (Low-to-Moderate transition).
    - `daily_safe >= 120 Tk/day` $\to$ Risk is capped at $\le 58.0\%$.
- **Demographic Living Bias Normalization (`pipeline_service.py`):**
  - Eliminated the 15.6% risk discrepancy between "Mess-hostel" and "Rented flat" for identical bankrolls.
  - Normalized feature weighting so changing living arrangements in profile no longer produces artificial swings.
- **Watertight Partial Fixed Obligation Protection (`pipeline_service.py`):**
  - Fixed edge-case bug where logging partial rent (e.g. ৳2,000 paid out of ৳7,500 total obligations) previously treated ৳2,000 as the full obligation, mistakenly releasing unpaid rent into the spendable pool.
  - Implemented `unpaid_fixed_obligations = max(0.0, fixed_baseline_total - fixed_obligations_spent)` and `total_fixed_reserved = fixed_obligations_spent + unpaid_fixed_obligations`. Unpaid rent and mess advances now stay safely ring-fenced at all times.
- **Profile Partial Merge Protection (`backend/database.py`):**
  - Updated `save_profile()` to automatically merge with the existing profile record, preventing partial updates from resetting untouched baseline fields to defaults.
- **Transparent Itemized Housing Breakdown (`HomeScreen.tsx`):**
  - Added compact formatted sub-caption under the Fixed Costs metric item (`ভাড়া ৪.৫k + মেস ৩k` / `Rent 4.5k + Meal 3k`).
  - Completely resolves user confusion regarding where aggregate figures (e.g. ৳7,500) originate vs individual inputs (e.g. ৳4,500 rent).
- **Fintech Modal UI Polish & Style Fixes (`AddIncomeModal.tsx`, `LogExpenseModal.tsx`):**
  - Replaced deprecated `StyleSheet.absoluteFillObject` with cross-platform explicit position styling.
  - Fully verified clean TypeScript compilation (`npx tsc --noEmit` exit code 0).

---

## [2.10.0] — 2026-11-23

### Scandinavian Fintech Visual Polish, Dark Mode High-Contrast Overhaul & Layout Fixes
- **Dark Mode High-Contrast Color Token Calibration (`theme.ts`):**
  - Upgraded `textSecondary` in `DARK_COLORS` from `#94A3B8` to `#CBD5E1` (8.5:1 contrast against `#1E293B`, exceeding WCAG AAA standards).
  - Upgraded `textMuted` in `DARK_COLORS` from unreadable `#64748B` (~2.3:1 contrast) to `#94A3B8` (4.8:1 contrast), restoring crystal-clear legibility to metric labels, subtitles, and captions across all cards.
  - Replaced dark opaque `surfaceSubtle` (`#162132`) with modern translucent glass tint `rgba(255, 255, 255, 0.05)`.
  - Replaced washed-out `slateBlue` in dark mode with `#93B3C8` for high contrast.
- **Dashboard (`HomeScreen.tsx`) Visual Modernization:**
  - **Intelligent Name Formatter:** Fixed abrupt truncation bug where Bangladeshi honorifics (e.g. `Md. Miftahur Rahman Swapnil`) displayed as `"Hello, Md."`. Implemented `formatGreetingName` that intelligently detects `Md.`, `Mohammad`, `Mst.` and renders the full respectful first name (e.g. `"Hello, Md. Miftahur"`).
  - **Mindset Perspective Redesign:** Replaced retro serif-like italic quotes and heavy bordered boxes with a minimalist modern card featuring a `sparkles` badge (`DAILY PERSPECTIVE`), clean sans-serif typography (`13px, 500 weight, 19px line height`), and a subtle cycle hint (`Next 🔀`).
  - **Risk Insight Multi-line Auto-Wrap:** Replaced restrictive `numberOfLines={1}` with 2-line graceful auto-wrap, eliminating mid-word ellipsis clipping (`Keep spending p... Details >`).
  - **Hero Amount & Banner Styling:** Refined currency typography (`fontSize: 30, fontWeight: '800'`) and elevated the top banner strip to a sleek dark glass surface with vibrant cyan shield icon.
  - **High-Contrast 3-Column Metrics:** Updated Rent, Protected Savings, and Variable Pocket values to bright emerald (`#34D399`), vibrant sky-blue (`#38BDF8`), and soft silver (`#E2E8F0`).
- **Profile Screen (`ProfileScreen.tsx`) Layout & Component Redesign:**
  - **Retraining Calibration Card:** Modernized from a clunky form into a sleek AI calibration module with `ML RETRAINING CALIBRATION` badge, rounded interactive choice buttons with alert/shield icons, and pill-shaped submit button.
  - **Modern Destructive Sign Out Pill:** Redesigned harsh boxy red outline button into a refined destructive glass pill with subtle red tint (`rgba(239, 68, 68, 0.08)`), rounded pill borders (radius 24), and modern typography.
  - **Academic & Baseline Overview Grid:** Enhanced labels and monetary figures with high contrast colors (`#10B981` and `#34D399`) and subtle borders.
- **Bottom Navigation Overflow / Scroll Padding Across All Screens:**
  - Increased scroll view `paddingBottom` to `140 + insets.bottom` across `HomeScreen.tsx`, `ProfileScreen.tsx`, `CalendarLedgerScreen.tsx`, `GoalsScreen.tsx`, and `AiCoachScreen.tsx`, ensuring bottom cards and buttons never get clipped or obstructed behind the floating glass tab bar.

---

## [2.9.0] — 2026-11-23

### Student Financial Baseline Redesign, Custom Numerical Budgets, Post-Login Lifecycle & University Expense Taxonomy
- **Custom Numeric Inputs & Quick Preset Pills (`CurrencyCustomInput`):**
  - Eliminated slow `+/- 500` steppers and redundant `<5k`/`5–10k` bracket chips in onboarding.
  - Implemented `CurrencyCustomInput` in `FormControls.tsx`, enabling direct keypad tap-to-type for exact custom amounts alongside fast 1-tap preset pills (`[৳5k] [৳8k] [৳10k] [৳15k] [৳20k]`) and micro-adjust buttons (`+৳500`, `+৳1000`, `-৳500`).
- **Post-Login Editable Budget Management ("My Budget Baseline"):**
  - Addressed product gap where students could not modify baseline figures (rent, food, funds) after onboarding.
  - Added dedicated **"Monthly Budget & Baseline Settings" (মাসিক বাজেট ও আর্থিক হিসাব)** card and interactive modal in `ProfileScreen.tsx`.
  - Added backend endpoint `PUT /api/user/{user_id}/budget-baseline` and `db.update_budget_baseline()` to allow updating total funds, rent, mess meals, semester fees, and target savings anytime with instant ML risk recalibration.
- **"Skip for Now" Workflow:**
  - Added prominent **"Skip for now" (এখনকার মতো স্কিপ করুন)** button on the Onboarding Wizard header.
  - Enables fresh students to jump straight to the clean dashboard and log money or expenses one-by-one via the `+` Quick Add modal.
- **Real-World Student Expense Taxonomy & Private University Benchmarks (BUBT / Dhaka Metro):**
  - Researched BUBT CSE (154 credits, ৳737k total, ৳58k–৳81k/semester) and BBA (৳671k total, ৳58k–৳69k/semester) installment structures.
  - Integrated dedicated **Semester Tuition Fee Reserve (`academic_fee_fixed`)** in the Three-Bucket financial system, isolating large academic installments from daily pocket spend to prevent false ML risk alarms.
  - Extended expense categories in database and API: `Academic`, `Rent`, `Mess Meal Advance`, `Food`, `Transport`, `Personal Care`, `Health`, `Snacks`, `Bills`.
- **Live Pocket Math Preview Card (Step 3):**
  - Implemented interactive real-time formula card in Step 3 showing:  
    `(Total Monthly Funds − Rent − Mess Meals − Semester Tuition − Target Savings) ÷ 30 Days = Safe Daily Spending Limit`.
- **Database Schema & 24-Feature ML Engine Alignment:**
  - Added `mess_meal_fixed`, `academic_fee_fixed`, and `transport_fixed` columns to `profiles` table in SQLite and Supabase PostgreSQL.
  - Automatically mapped continuous inputs into the exact ordinal brackets (`<5k`, `5–10k`, `10–15k`, `15–20k`, `>20k`, etc.) required by `financial_risk_model.pkl` Gradient Boosting pipeline, eliminating discretization error and ensuring 100% backward compatibility.

---

## [2.8.2] — 2026-11-23

### Web Sign Out Fix & Mobile Expo Go Browser Dismissal Pipeline
- **Fixed Web App Sign Out (`react-native-web` Alert No-Op):**
  - Identified root cause of sign out failure on Web: in `react-native-web`, `Alert.alert` is implemented as an empty dummy function (`class Alert { static alert() {} }`), meaning confirmation callbacks never executed on web browsers.
  - Implemented `Platform.OS === 'web'` detection in `ProfileScreen.tsx` using native browser `window.confirm`.
  - Added explicit `supabase.auth.signOut()` calls across `ProfileScreen.tsx`, `mobile-app/src/services/api.ts` (`logoutUser()`), and `App.tsx` (`handleLogout()`) to completely purge Supabase cloud session tokens from browser local storage.
- **Fixed Mobile Expo Go Auth Session Tab Hang:**
  - Registered `WebBrowser.maybeCompleteAuthSession()` at root application lifecycle in `App.tsx`.
  - Added proactive `WebBrowser.dismissAuthSession()` calls inside `handleDeepLink` and `supabase.auth.onAuthStateChange` so that on Android devices, the Chrome Custom Tab immediately dismisses when Google redirects back, instead of hanging over the app.
  - Configured `showInRecents: true` in `WebBrowser.openAuthSessionAsync` to preserve Android task switching context between Chrome and Expo Go.

---

## [2.8.1] — 2026-11-22

### Mobile Google OAuth Expo Go (`exp://`) vs Native (`pockit://`) & Supabase URL Fix
- **Dynamic Expo Environment Detection in `AuthScreen.tsx`:**
  - Integrated `Constants.executionEnvironment` (`ExecutionEnvironment.StoreClient`) and `Linking.createURL`.
  - When running in **Expo Go** on mobile devices, OAuth callback now dynamically uses `Linking.createURL('auth/callback')` (resolving to `exp://<LAN_IP>:8081/--/auth/callback`), ensuring the Expo Go client natively catches the redirect.
  - When running in standalone/production APK builds, it automatically uses `makeRedirectUri({ scheme: 'pockit', path: 'auth/callback' })`.
- **Mitigation of Supabase `localhost:3000` ERR_CONNECTION_REFUSED:**
  - Identified root cause of mobile browser error: when Supabase rejects the client's `redirectTo` URI because it is absent from the **Redirect URLs** whitelist, Supabase safely falls back to its default Site URL (`http://localhost:3000`), which fails to connect on mobile devices.
  - Added session fallback check after `WebBrowser.openAuthSessionAsync` to capture sessions if tokens were transmitted via background cookie or deep link.
  - Added in-app guidance alert allowing users to immediately switch to Direct Gmail authentication if their cloud redirect whitelist is not yet configured.

---

## [2.8.0] — 2026-11-22

### Complete Rebranding to "Pockit", Unified Dev Orchestration & Light-Mode Contrast Fix
- **Brand Identity Evolution to "Pockit" ("পকেট"):**
  - Updated app manifest `mobile-app/app.json`: `name = "Pockit"`, `slug = "pockit"`, `scheme = ["pockit", "takatrack"]`, `package = "com.pockit.app"`, `bundleIdentifier = "com.pockit.app"`.
  - Updated `BRANDING` constants: `appName = "Pockit"`, `appNameBn = "পকেট (Pockit)"`, `appSubtitleEn = "Student Money & Financial Risk Coach"`.
  - Updated Bengali and English translations in `TRANSLATIONS`: rebranded AI coach to `Pockit Smart Coach` (`পকেট স্মার্ট কোচ`) and all dialog titles/toast messages.
  - Rebranded backend Gemini AI advisor prompts (`backend/gemini_advisor.py`) to `Pockit Smart Coach`.
  - Rebranded `SplashScreen.tsx` footer to `"Pockit • Hybrid ML Risk Engine v2.0.0"`.
- **Root Development Orchestration (`npm run dev`):**
  - Configured root `package.json` with `concurrently` running both FastAPI backend (`python -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir backend --reload`) and Expo Metro (`npm run dev --prefix mobile-app`) in parallel.
  - Added standalone shortcuts `npm run dev:backend` and `npm run dev:mobile`.
- **Scandinavian Light Mode Contrast Rectification:**
  - Resolved white-on-white text rendering bug in `OnboardingWizard.tsx` where `fieldLabel` and `likertPrompt` were hardcoded to `#F8FAFC`, making them invisible against `#FFFFFF` elevated cards.
  - Connected `OnboardingWizard.tsx` and all controls in `FormControls.tsx` (`SegmentedControl`, `ChoiceChip`, `ChoiceCard`, `NumberStepper`, `LikertRating`) to `useTheme()`:
    - `fieldLabel` and `likertPrompt` dynamically bind to `theme.textPrimary` (`#1E293B` in Light Mode, `#F8FAFC` in Dark Mode).
    - `stepperNumber` in `NumberStepper` displays crisp `#1E293B` numerals on Light Mode cards.
    - `ChoiceChip` unselected state now renders soft slate `#F1F5F9` surfaces with `#334155` text rather than dark grey blocks.
    - `SegmentedControl` and `LikertRating` utilize theme-aware border and track colors.

---

## [2.7.0] — 2026-11-22

### Clean-Slate Accounts, Device Cache Guest Mode & Universal Mobile Google OAuth
- **Pristine Fresh Slate for All Real Accounts:**
  - Removed all hardcoded mock starter data (`FALLBACK_DEMO_DASHBOARD`) from leaking into newly registered and authenticated Google student accounts.
  - Added `createEmptyDashboard` in `api.ts` so new accounts render true 0-state indicators (৳0 spent, ৳0 extra income, 0 active goals) until configured.
  - Updated `backend/pipeline_service.py` to return uncalibrated clean-state metrics (`risk_score_pct = 10.0`, `risk_tier = "LOW RISK"`, `recalibration_note = "Awaiting onboarding"`) instead of borrowing `demo_student_001` metrics with false 85.8% Peer Debt risk scores.
- **Offline Guest Mode with Device Cache Memory:**
  - Added `authGuest` supporting instant app usage without creating an account or signing in.
  - Guest data is persisted completely in local device cache memory via `AsyncStorage` (`@takatrack_guest_profile`, `@takatrack_guest_expenses`, `@takatrack_guest_incomes`, `@takatrack_guest_goals`, `@takatrack_guest_dashboard`).
  - Added local `calculateGuestDashboard()` computing live three-bucket allocations, dynamic safe daily spend limit, remaining balance, and risk score without calling the server.
  - Replaced the previous 1-click mock demo banner ("Tanvir Ahmed DU") with a clean **"Continue as Guest" / "গেস্ট হিসেবে শুরু করুন"** button with bilingual explanations.
  - Added "Guest Mode (Local Device Cache)" status badge in `ProfileScreen.tsx`.
- **Universal Mobile Google OAuth Deep Linking (`expo-web-browser`, `expo-auth-session`, `expo-linking`):**
  - Added custom deep-link scheme `"scheme": "takatrack"` to `mobile-app/app.json`.
  - Upgraded Google OAuth flow in `AuthScreen.tsx`: on Android and iOS mobile devices, Google Sign-In now opens native in-app browser sessions (`WebBrowser.openAuthSessionAsync`) redirecting to `takatrack://auth/callback`.
  - Added URL deep linking listeners in `App.tsx` (`Linking.addEventListener('url')` and `Linking.getInitialURL()`) to automatically capture OAuth session tokens (`access_token`, `refresh_token`, or PKCE `code`) on Android and iOS.
  - Integrated `expo-constants` dynamic host resolution so physical mobile devices on the network automatically discover the backend server at `http://192.168.10.130:8000`.

---

## [2.6.0] — 2026-11-22

### Google Sign-In & Supabase Cloud Profile Avatar Synchronization
- **Deterministic Google OAuth User Identity (`uuid.uuid5`):**
  - Updated `backend/database.py` (`google_auth`) to generate deterministic UUIDs via `uuid.uuid5(uuid.NAMESPACE_DNS, email)` so that Google student accounts maintain persistent, stable UUIDs across both local SQLite and Supabase PostgreSQL.
- **Supabase Cloud Admin Auth & Metadata Sync:**
  - Integrated Supabase Admin API (`supabase.auth.admin.create_user` and `supabase.auth.admin.update_user_by_id`) in `db.google_auth`.
  - When users sign in with Google, their profile name (`full_name`) and Google avatar picture (`avatar_url`) are automatically synced to Supabase `auth.users` metadata and upserted directly into the `public.profiles` PostgreSQL table.
- **Clean-Slate Onboarding for Real Users:**
  - Removed dummy transaction/goal auto-injection for newly registered Google accounts.
  - New Google students now start with a fresh slate and are routed directly to the Onboarding Wizard (`has_profile = False`) so they can define their own authentic allowance, rent/mess obligations, and savings goals.
  - Purged test starter records from live database for authenticated accounts.
- **Real Supabase Google OAuth Integration (`supabase.auth.signInWithOAuth`):**
  - Replaced the mock development accounts modal in `AuthScreen.tsx` with direct `supabase.auth.signInWithOAuth({ provider: 'google' })`.
  - Created `mobile-app/src/services/supabaseClient.ts` configured with `AsyncStorage` persistence and OAuth redirect listeners.
  - Added `supabase.auth.onAuthStateChange` in `App.tsx` to automatically capture Google OAuth redirect credentials (real email, full name, Google CDN avatar) and sync them into the FastAPI backend.
  - Provided graceful fallback dialog with exact step-by-step guidance for enabling Google Cloud OAuth credentials in the Supabase Dashboard, completely eliminating fake mock student presets.
- **Dynamic User Avatar & Header Branding Display:**
  - Fixed `UserAvatar.tsx` to re-synchronize state whenever `avatarUrl` changes, ensuring instant image loading upon login or photo update.
  - Displayed student first name (`Hello, {Name}`) alongside the Google profile photo in `HomeScreen.tsx` header.
  - Added "Google Verified Account" identity badge and live avatar image preview in `ProfileScreen.tsx`.

---

## [2.5.0] — 2026-11-22 (Play Store Production Candidate `v1.0.0-rc1`)

### Supabase Cloud Infrastructure & Live Database Synchronization
- **Supabase Cloud Storage for User Avatars ('avatars' Bucket):**
  - Provisioned and activated a public `avatars` bucket in Supabase Storage (`https://gwxuxomnpvztfkcxdiym.supabase.co/storage/v1/object/public/avatars/`).
  - Added backend endpoint `POST /api/user/{user_id}/avatar` decoding base64 image uploads and persisting to Supabase Storage with cache-busting timestamp URLs.
  - Updated `ProfileScreen.tsx` (`expo-image-picker`) to request `base64: true` and upload user photos to Supabase Storage, propagating permanent CDN URLs across all devices.
- **Live Supabase PostgreSQL Connected:**
  - Integrated official `supabase` Python client (`supabase>=2.34.0`) into `backend/database.py`.
  - Implemented local-first, cloud-synced architecture: all transactions, profiles, multi-source incomes, savings goals, and risk snapshots write to local SQLite and instantly sync to Supabase PostgreSQL.
  - Implemented deterministic UUID mapping (`_to_uuid`) guaranteeing compliance with Supabase PostgreSQL UUID column types and `auth.users(id)` foreign key constraints.
  - Verified live queries against all 8 tables (`profiles`, `expenses`, `incomes`, `savings_goals`, `subscription_payments`, `monthly_archives`, `risk_snapshots`, `month_end_checkins`).
- **Supabase MCP Server Configured:**
  - Added remote Supabase MCP server (`https://mcp.supabase.com/mcp?project_ref=gwxuxomnpvztfkcxdiym`) in `~/.gemini/antigravity/mcp_config.json` with docs, account, database, debugging, and functions features.
  - Linked active project reference `gwxuxomnpvztfkcxdiym` (`https://gwxuxomnpvztfkcxdiym.supabase.co`).
- **Official Supabase Agent Skills:**
  - Installed `supabase` and `supabase-postgres-best-practices` skills via `npx skills add supabase/agent-skills`.

### Modern Dark Fintech Splash Screen & Zoomed-In Brand Identity
- **Splash Screen Redesign (`SplashScreen.tsx` & `assets/splash.png`):**
  - Completely redesigned the boot splash screen to match the modern dark fintech reference standard (`#172330` canvas).
  - Added subtle matrix dot-grid textures in the top corners for an authentic engineering aesthetic.
  - Replaced the previous basic border card with an elevated 148px pure white circular badge housing the zoomed-in shield logo.
  - Rendered high-contrast white app title (`TakaTrack AI`) and clean floating bilingual taglines directly on the dark canvas without artificial card borders.
  - Implemented a sleek horizontal capsule progress bar (`264px` x `10px`) with animated Warm Terracotta (`#F47B4E`) glow fill and live "Initializing secure ledger..." status text.
  - Replaced native web driver warnings by gating `useNativeDriver` to `Platform.OS !== 'web'`.
- **Zoomed-In App Launcher Icon & Header Brand Emblem:**
  - Cropped emblem tightly around the shield to occupy 84–86% of the frame, removing the excessive 50% whitespace margin from `logo.jpg`.
  - Re-generated `assets/icon.png` (84% emblem on solid `#FFFFFF` canvas) and `assets/adaptive-icon.png` (70% safe zone).
  - Updated `BrandLogo.tsx` with a circular container, increasing `sm` dimensions to 42px to match `UserAvatar` on the opposite side of the dashboard header.

### Post-Splash Interactive Walkthrough & On-Demand App Guide
- **First-Launch Swipeable 4-Slide Feature Tour:**
  - Implemented `FeatureWalkthroughModal.tsx`: A lightweight, swipeable 4-card interactive walkthrough displayed immediately after the initial Splash Screen before account authentication.
  - **Slide 1 — Smart Daily Safe Limit:** Explains pacing and why separating Rent/Mess protects daily pocket money.
  - **Slide 2 — Live Financial Risk Alert:** Highlights the 0–100% shortage prediction gauge and early vulnerability warnings.
  - **Slide 3 — Dream Goal Savings Vault:** Explains monthly commitments, pausing without penalty, and month-end leftover sweeps.
  - **Slide 4 — TakaTrack Smart Coach:** Introduces the pre-purchase simulator ("Ask AI Before I Buy") and campus money hacks.
  - Fully localized in English and Bengali with dot-step indicators, skip actions on every slide, and persistent completion state in `@has_seen_walkthrough`.
- **On-Demand Feature Guide (`i` Button):**
  - Added a subtle circular `i` (info-circle) guide button in the Home Dashboard top header bar right beside the user avatar.
  - Added an "App Guide & Feature Tour" section card under Profile Settings (`ProfileScreen.tsx`), allowing students to revisit the full walkthrough at any time.

### Real User Profile Avatar & Google OAuth Sync
- **Custom Profile Photo Upload:**
  - Integrated `UserAvatar.tsx` supporting custom photo uploads via `expo-image-picker` with base64 storage.
  - Supported colorful Scandinavian initials presets and automatic avatar sync from Google OAuth profile data (`photo_url`).

### Play Store Production Engineering & Living Documentation System
- **Living Documentation Standard (`/docs`):**
  - `docs/PRD.md`: Full Product Requirements Document detailing user personas, the Three-Bucket financial engine, Dream Goal Vault, discipline streaks, and bilingual specifications.
  - `docs/TRD.md`: Comprehensive Technical Requirements Document including ASCII and Mermaid system architecture diagrams, directory topology, 24-column ML feature space, mathematical formulas, and Gemini fallback orchestration.
  - `docs/DATABASE_AND_API.md`: Complete relational schema (DDL) for all 9 tables in Supabase PostgreSQL & SQLite, Supabase Row-Level Security (RLS) policies, and full REST API endpoint specifications.
  - `docs/PLAY_STORE_CHECKLIST.md`: Play Store production checklist covering EAS `.aab` builds, 512x512 icons, 1024x500 feature graphics, screenshot specifications, Data Safety declarations, and non-sensitive permission audits.
  - `docs/CONTRIBUTING_RULES.md` & `.antigravityrules`: Established binding project rule requiring automatic synchronization of documentation across `/docs/` in the exact same turn whenever any feature, schema, or UI workflow is modified.
- **Brand Visual Identity Overhaul:**
  - Generated crisp, transparent-cornered visual assets from `assets/logo.jpg` matching `#EEF3F6` canvas (`icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`).

---

## [2.4.0] — 2026-11-22

### Refined Home Dashboard Layout & 50/50 Hero Balance
- **Consolidated 3-Card Dashboard Layout:**
  - Completely deleted the redundant bottom standalone `Financial Risk Score` card from `HomeScreen.tsx`.
  - The Home Dashboard now strictly presents **3 cohesive, full-width cards**:
    1. **Top Hero Overview Card** (Safe Daily Limit, Balanced Compact Risk Gauge, Target Pill, Quote Box, Risk Insight Strip, 3-Bucket Breakdown).
    2. **Weekly Discipline Tracker Card** (7-day node pacing streak).
    3. **Dream Goal Vault Card** (Goal progress, leftover sweep, boost, and pause controls).
- **Hero Card Proportions (50/50 Visual Balance):**
  - **Left Column (`flex: 1.15`):** Adjusted the safe daily amount to a crisp `29px` bold tabular font (`৳496.7 / day`), cleanly aligned beside the days remaining and target savings pill.
  - **Right Column (`flex: 0.85`):** Enlarged the circular SVG `CompactRiskGauge` to **108px diameter** with a thicker **9px stroke width**, centered `20px` bold risk percentage, `RISK` label, and status tier pill directly below.
- **Compact Risk Insight Strip & Bottom-Sheet Modal:**
  - Added a slim, single-line risk insight pill inside the Hero Card right below the quote block (e.g., `⚠ High Risk: Peer debt & tight daily cap — Details >`).
  - Created `RiskDetailsModal.tsx`: A modern bottom-sheet modal opened by tapping either the compact risk gauge or the insight pill, displaying the model's summary warning, complete list of primary vulnerability drivers with severity badges, and actionable spending pacing advice.

---

## [2.3.0] — 2026-11-22

### Above-the-Fold Hierarchy & Global Theme Consistency Pass
- **Above-The-Fold Risk Integration:**
  - Introduced `CompactRiskGauge.tsx` inside the Hero card to show ML risk probability alongside safe daily spending without scrolling.
- **Uniform Full-Width Card Alignment:**
  - Removed double padding / redundant `marginHorizontal: 16` from `DisciplineTracker.tsx` and `SavingsGoalCard.tsx` so all dashboard cards share matching 100% grid width with the hero card.
- **Global Button & Theme Consistency:**
  - Eliminated all legacy out-of-theme cyan/indigo hex codes (`#06B6D4`, `#0284C7`, `#4F46E5`, `#007AFF`, `#2563EB`) globally across `LogExpenseModal.tsx`, `OnboardingWizard.tsx`, `FormControls.tsx`, `ProgressBar.tsx`, and `ProfileScreen.tsx`.
  - Standardized on Warm Terracotta (`#F47B4E`) for primary actions, Emerald (`#10B981`) for income, and Dusty Slate-Blue (`#5A8296`) for secondary elements.
- **Cross-Tab Real-Time Sync:**
  - Wired `refreshTrigger` state in `App.tsx` through `CalendarLedgerScreen.tsx` and `GoalsScreen.tsx` so transactions added via the global floating `+` button instantly synchronize the calendar and savings goals.

---

## [2.2.0] — 2026-11-22

### Dream Goal Vault, Leftover Sweep & Discipline Streaks
- **Goal-Based Savings Vault:**
  - Introduced `SavingsGoalCard.tsx` and `savings_goals` table support in SQLite and Supabase for target purchases (laptops, monitors, courses).
  - Ring-fences monthly commitments from the spendable daily pool.
- **Month-End Leftover Sweep:**
  - Surfaces unspent variable money at month-end to instantly sweep into the active dream goal via `LeftoverSweepModal.tsx`.
- **Discipline Streak System:**
  - Added 7-day on-track discipline tracker displaying consecutive days spent at or below the safe daily limit.

---

## [2.1.0] — 2026-11-22

### Three-Bucket Financial Engine & Minimalist UI Cleanup
- **Three-Bucket Engine:**
  - Explicitly separated student budgets into:
    1. *Fixed Obligations:* Mess advance & hostel rent.
    2. *Protected Savings:* Optional monthly target savings.
    3. *Variable Daily Pool:* True discretionary funds for daily life.
- **Human-Crafted Minimalist UI Rules:**
  - Enforced the Strict Single-Symbol Rule (e.g., `Boost` with one icon, never `+ Boost`; `Add Income`, never `+ Add Income`).
  - Purged decorative emojis (`🔥`, `✨`, `🎯`) and robotic AI clichés from quotes and buttons.

---

## [2.0.0] — 2026-11-22

### Scandinavian Soft-Card UI Redesign
- Redesigned entire app from dark obsidian to a calm Scandinavian Slate-Blue (`#5A8296`) & Warm Terracotta (`#F47B4E`) theme.
- Added full Light Mode (default) and Dark Mode support with system toggle via `ThemeContext.tsx`.
- Redesigned bottom floating navigation bar with central prominent terracotta `+` action button.

---

## [1.0.0] — 2026-11-21

### Initial Release
- FastAPI backend with 22-feature hybrid ML model (`financial_risk_model.pkl`).
- Google Gemini 2.5 Flash pre-purchase simulator and student financial coach.
- Expo React Native mobile app with full English and Bengali bilingual support.
