# Student Financial Management & Risk Warning System (Backend)
### শিক্ষার্থীর অর্থ ব্যবস্থাপনা — ব্যাকএন্ড সার্ভিস v2.0

Production FastAPI service powering the hybrid ML inference engine, real-time daily expense tracking, Gemini 2.5 Flash financial coaching, purchase simulation, multi-source income tracking, calendar ledger, subscription gating, and continuous retraining check-ins.

---

### Core Architecture & Capabilities

1. **Hybrid Dynamic ML Inference Engine (`financial_risk_model.pkl`):**
   - Ingests static student baseline profiles and aggregates live daily expenses.
   - Preserves the exact 22 input features and categorical encodings matching `Student_Spending_Survey_200_Responses.xlsx`.
   - Evaluates composite behavioral indicators:
     - $\text{awareness\_score} = \frac{\text{aware\_balance} + \text{aware\_weekly\_track} + \text{aware\_check\_before\_buy}}{3}$
     - $\text{impulse\_score} = \frac{\text{impulse\_spontaneous} + \text{impulse\_discounts} + \text{impulse\_regret}}{3}$
   - Dynamic ordinal mapping for `Total monthly money available (Tk)` based on multi-source funds added across the month.
   - Dynamically projects month-end burn rate and remaining savings:
     $$\text{projected\_month\_end\_savings} = \text{monthly\_allowance} - \text{monthly\_rent\_fixed} - \left(\frac{\text{total\_spent}}{\text{day\_of\_month}}\right) \times \text{days\_in\_month}$$
   - Re-evaluates 0–100% financial risk and risk tiers (`LOW RISK <40%`, `MODERATE RISK 40–69%`, `HIGH RISK >=70%`) in real time with each transaction.
   - Calculates the **Daily Safe-to-Spend** limit (protecting fixed rent from being accidentally spent):
     $$\text{Daily Safe-to-Spend} = \max\left(0, \frac{\text{Total Funds Available} - \text{Fixed Rent} - \text{Total Spent}}{\text{Days Remaining}}\right)$$

2. **1-Click Instant Demo Login & Security:**
   - Pre-seeded student profile (`demo_student_001` / `demo@student.edu.bd`) with realistic transactions and baseline habit scores for instant testing.
   - Full JWT/token-based registration and login backed by SQLite (`student_finance.db`).
   - Row-Level Security (RLS) PostgreSQL schema provided in `supabase_schema.sql` for cloud deployment.
   - 4-Digit App Lock PIN endpoints (`/api/auth/set-pin`, `/api/auth/verify-pin`) and Password Reset (`/api/auth/forgot-password`).

3. **Multi-Source Incomes & Calendar Ledger (1st to 28th/30th/31st):**
   - Add funds anytime across multiple sources (`Family`, `Tuition`, `Freelance`, `Scholarship`, `Gift/Other`) via Cash, bKash, Nagad, Rocket, or Bank Transfer.
   - Calendar Ledger endpoint (`GET /api/ledger/{user_id}?month=YYYY-MM`) provides daily net cashflows and chronological transaction listings.
   - Automated month-end archiving (`POST /api/archives/run-month-end`) saves snapshots into `monthly_archives`.

4. **Freemium & Pro AI Subscription (Tk 50/Month):**
   - Free tier: Calendar ledger, multi-source incomes, daily expenses, 0–100% ML risk score, and rule-based advice.
   - Pro AI tier: Unlocks Google Gemini 2.5 Flash personalized daily spending plans, category cuts, and pre-purchase simulation.
   - bKash/Nagad TrxID submission (`POST /api/subscription/submit-trx`).
   - Instant developer testing toggle (`POST /api/subscription/demo-pro-toggle`).

5. **Bilingual AI Financial Coach & Pre-Purchase Simulator (Google Gemini 2.5 Flash):**
   - Powered by the official `google-genai` Interactions API (`client.interactions.create`).
   - Generates daily spending guidance, category trim suggestions, and campus life hacks in English and culturally nuanced Bengali.
   - "Ask AI Before I Buy" purchase simulator (`POST /api/ai-coach/simulate`): algorithmic verdict (`PROCEED`, `WARN`, `AVOID`), before/after risk shift, and safe daily impact.
   - Automatic fallback to localized rule heuristics if offline or without API key.

6. **Continuous Retraining Check-In Pipeline:**
   - Collects actual month-end ground truth ("Did you run out of money?").
   - Automatically serializes the full 24-column training row matching `Student_Spending_Survey_200_Responses.xlsx`.
   - Export endpoint (`GET /api/month-end-checkin/export?format=csv` or `json`) to download new survey rows directly.

---

### Quick Start

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Verify Environment Variables (`.env`):**
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=8000
   HOST=0.0.0.0
   ENVIRONMENT=development
   ```

3. **Run Automated Test Suite (10 Integration Tests):**
   ```bash
   python test_suite.py
   ```

4. **Start Backend Server:**
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   Interactive Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs)
