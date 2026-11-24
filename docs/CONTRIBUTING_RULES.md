# TakaTrack AI — Engineering & Documentation Sync Rules

## 1. MANDATORY CONTINUOUS DOCUMENTATION RULE
> [!IMPORTANT]
> **BINDING PROJECT RULE FOR ALL AGENTS & CONTRIBUTORS:**
> Every single time any feature, database schema/table, API endpoint, or UI workflow is added, modified, or removed in future turns, you **MUST automatically update the corresponding sections in `/docs/` in the EXACT SAME TURN** without needing to be reminded.

### Required Sync Targets:
1. **`/docs/PRD.md` (Product Requirements Document):**
   - Must be updated whenever user flows, business logic, feature sets, calculation formulas, or user stories are added, updated, or removed.
2. **`/docs/TRD.md` (Technical Requirements Document):**
   - Must be updated whenever architectural patterns, algorithms, ML pipelines, folder structures, or dependencies change.
3. **`/docs/DATABASE_AND_API.md` (Database Schema & API Reference):**
   - Must be updated whenever database columns/tables change, RLS policies change, or FastAPI routes, request bodies, or responses change.
4. **`/docs/CHANGELOG.md` (Living Version History):**
   - Must always append an entry describing the exact changes, versions, and date of modification.
5. **`/docs/PLAY_STORE_CHECKLIST.md`:**
   - Must be audited whenever app version codes, bundle identifiers, store disclosures, or permissions are adjusted.

---

## 2. Global Design & Code Quality Standards

1. **Scandinavian Soft-Card Fintech Aesthetic:**
   - Primary Accent: Warm Terracotta Coral (`#F47B4E`).
   - Secondary Accent: Dusty Slate-Blue (`#5A8296`).
   - Success / Inflow Accent: Fresh Emerald (`#10B981`).
   - Canvas: Soft Powder Slate (`#EEF3F6`) in Light Mode, Slate (`#0F172A`) in Dark Mode.
2. **Zero "AI-Cliché" Policy:**
   - Never use sparkle icons (`✨`), robot icons, flame emojis (`🔥`), or target bullseyes (`🎯`) in UI copy or button labels.
   - Strictly human-crafted, clean fintech aesthetic inspired by Wise, Revolut, and Monzo.
3. **Strict Single-Symbol Rule:**
   - Action buttons must use a single vector icon + text label (e.g., `Boost` with trending-up icon, `Add Income`, `Add Expense`).
   - Never combine vector icons with text math symbols (NEVER `+ Boost`, `+ Add Income`, or `- Add Expense`).
4. **100% Bilingual Support:**
   - Every user-facing string must support both English and Bengali (`বাংলা`) through `src/constants/translations.ts`.
5. **Three-Bucket Financial Integrity:**
   - Discretionary safe daily spend must always ring-fence fixed rent/mess obligations and monthly target savings.

