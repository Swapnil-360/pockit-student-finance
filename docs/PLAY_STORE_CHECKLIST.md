# Google Play Store & Android APK Release Guide
## Pockit — Student Money & Financial Risk Coach
**Document Version:** `2.6.0`  
**Package Name:** `com.pockit.app`  
**App Scheme:** `pockit`  
**Target Release:** `v2.0.0 (Build 1)`  
**Status:** Play Store & Standalone APK Production Standard

---

## 1. Cloud Backend Deployment & Hosting (Render / Railway)

Before compiling the standalone Android APK, the FastAPI backend must be deployed to a public cloud origin so mobile devices can communicate over cellular/Wi-Fi without `localhost`.

### 1.1 Render One-Click / Git Deployment
- **Repository Root Config:** `render.yaml` or `backend/render.yaml`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables Required on Render:**
  - `PYTHON_VERSION`: `3.11.8`
  - `ENVIRONMENT`: `production`
  - `SUPABASE_URL`: `https://gwxuxomnpvztfkcxdiym.supabase.co`
  - `SUPABASE_ANON_KEY`: `sb_publishable_...`
  - `SUPABASE_SERVICE_ROLE_KEY`: `sb_service_role_...`
  - `GEMINI_API_KEY`: `<Your-Google-Gemini-API-Key>`
- **Health Check Path:** `/` (Returns status 200 system health)

### 1.2 Railway Deployment
- **Config:** `railway.json` and `backend/Procfile`
- **Start Command:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Port Handling:** Dynamic `$PORT` binding managed by Railway Nixpacks.

### 1.3 Free-Tier Cold Start Resilience
- When running on free hosting tiers (Render/Railway), the container sleeps after inactivity and may take 30–50 seconds on cold start.
- **Client Fallback:** `fetchWithTimeout` in `mobile-app/src/services/api.ts` protects the app from hanging. If the cloud backend is spinning up, the app instantly reads cached data or triggers `calculateGuestDashboard()` in `AsyncStorage` so the student never experiences a crash or frozen screen.

---

## 2. Production Build Architecture (EAS & Expo)

### 2.1 App Configuration (`app.json`)
The Expo configuration is configured for Android release:

```json
{
  "expo": {
    "name": "Pockit",
    "slug": "pockit",
    "scheme": "pockit",
    "version": "2.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#172330"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pockit.app"
    },
    "android": {
      "package": "com.pockit.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/brand/adaptive-icon.png",
        "backgroundColor": "#172330"
      },
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "pockit",
              "host": "auth"
            },
            {
              "scheme": "takatrack",
              "host": "auth"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "extra": {
      "apiUrl": "https://pockit-backend.onrender.com"
    }
  }
}
```

### 2.2 EAS Build Profile (`eas.json`)
Supports both **direct standalone APKs** (for testing on real Android phones) and **Play Store App Bundles (`.aab`)**:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://pockit-backend.onrender.com",
        "EXPO_PUBLIC_SUPABASE_URL": "https://gwxuxomnpvztfkcxdiym.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_xKydhMRwSu0SUSkJhn-DqA_7B73HSDu"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://pockit-backend.onrender.com",
        "EXPO_PUBLIC_SUPABASE_URL": "https://gwxuxomnpvztfkcxdiym.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_xKydhMRwSu0SUSkJhn-DqA_7B73HSDu"
      }
    }
  }
}
```

### 2.3 Build Commands

#### A. Generate Standalone Installable Android APK (`.apk`)
```bash
# Navigate to mobile-app directory
cd mobile-app

# Run EAS build for preview profile (produces .apk downloadable link & QR code)
eas build --platform android --profile preview
```

#### B. Generate Google Play Store Release Bundle (`.aab`)
```bash
# Produce signed Android App Bundle (.aab) for Google Play Console upload
eas build --platform android --profile production
```

#### C. Local Build (Without EAS Cloud Queues, Requires Android SDK):
```bash
eas build --platform android --profile preview --local
```

---

## 2. Store Graphic Assets & Visual Specifications

| Asset Type | Dimension / Format | File Path | Status |
|------------|-------------------|-----------|--------|
| **App Launcher Icon** | 1024 x 1024 px (and 512x512 px), 32-bit PNG/RGB, Zoomed-in 84% emblem on `#FFFFFF` canvas | `mobile-app/assets/icon.png` | Verified |
| **Adaptive Foreground** | 1024 x 1024 px PNG (Centered 70% safe zone with transparent background) | `mobile-app/assets/adaptive-icon.png` | Verified |
| **Boot Splash Image** | 1284 x 2778 px PNG, Modern Dark `#172330` with white circular badge & dot grid | `mobile-app/assets/splash.png` | Verified |
| **Feature Graphic** | 1024 x 500 px, 24-bit JPEG/PNG, No transparency | `docs/store_assets/feature_graphic.png` | Required |
| **Phone Screenshots (Min 4)** | 1080 x 2400 px (16:9 / 9:16), PNG/JPEG | `docs/store_assets/screenshots/` | Required |

### Required Store Screenshots:
1. **Screen 1 — Three-Bucket Home Dashboard:** Demonstrating the `Safe Daily Limit` side-by-side with the `Compact Risk Gauge` (108px) and `Target Savings Pill`.
2. **Screen 2 — Dream Goal Savings Vault:** Highlighting the LG UltraGear Monitor goal with `Boost`, `Leftover Sweep`, and `Pause Month` actions.
3. **Screen 3 — Real-Time Calendar Ledger:** Displaying day-by-day cashflow logs, bKash transactions, and dynamic balance recalibration.
4. **Screen 4 — Pre-Purchase Simulator ("Ask AI Before I Buy"):** Showing instant calculation of safe daily limit drop and risk percentage change before buying.

---

## 3. Google Play Data Safety & Privacy Declarations

Under Google Play's Financial Services and User Data policies, TakaTrack AI must declare the following in Google Play Console:

### 3.1 Data Types Collected & Declared

| Data Type | Collected? | Shared? | Purpose | Retention & User Control |
|-----------|------------|---------|---------|--------------------------|
| **User Identifiers** (Name, Email) | Yes | **No** | Account authentication & Google OAuth sync | Deleted on user account deletion |
| **Financial Information** (Expenses, Incomes, Budgets) | Yes | **No** | App functionality, Three-Bucket pacing, ML risk score | Managed directly by user, erasable |
| **App Interactions** (Likert Habit Survey) | Yes | **No** | Baseline risk calibration & machine learning features | Stored securely in profile table |
| **Device & App Diagnostics** | Yes (Anonymized) | **No** | Crash debugging & stability monitoring | Ephemeral |

### 3.2 Security & Data Protection Standards
- **Encryption in Transit:** All network traffic between Expo frontend and FastAPI / Supabase is encrypted using HTTPS / TLS 1.3.
- **PIN & Password Protection:** User passwords and 4-digit security lock PINs are salted and hashed using SHA-256 before persistence; raw PINs are never stored.
- **Row-Level Security (RLS):** Supabase database enforces PostgreSQL RLS policies ensuring users can only read and write their own data.
- **Account & Data Deletion:** In compliance with Google Play requirements, users can permanently wipe their account and all associated transaction records directly from **Profile & Settings -> Privacy -> Delete Account**.

---

## 4. Financial Services Policy Exemption & Audit

> [!IMPORTANT]
> TakaTrack AI is **NOT** a lending app, micro-credit platform, money transmitter, or cryptocurrency service.

- **No Loan Origination:** The app does not offer personal loans, salary advances, or peer-to-peer credit.
- **No Banking Credential Capture:** The app never asks for bank account numbers, debit/credit card CVVs, or bKash/Nagad PINs.
- **Manual Logging:** All expenses and incomes are logged voluntarily by the student to improve personal financial discipline.
- **Freemium Upgrade:** The Tk 50/month AI Coach tier is a digital utility subscription unlocking expanded simulator queries and AI guidance.

---

## 5. Android Permissions Audit

The application requests strictly minimal, non-sensitive Android permissions:

```xml
<!-- Notifications: Required for daily spending pacing reminder -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<!-- Network: Required for API sync with FastAPI/Supabase -->
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>

<!-- Image Selection: Optional permission used solely if user selects avatar photo -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" android:maxSdkVersion="34"/>
```

**Explicitly Excluded Sensitive Permissions:**
- `READ_SMS` / `RECEIVE_SMS` (Zero SMS scraping)
- `READ_CONTACTS` (Zero contact access)
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` (Zero location tracking)
- `CAMERA` (Not required; image picker uses gallery selection)

---

## 6. Pre-Launch Release Protocol

1. **Internal Testing Track:** Verify builds across test devices running Android 10, 11, 12, 13, and 14.
2. **Closed Testing Track (20 Testers for 14 Days):** Mandatory Google Play policy for personal developer accounts.
3. **Deep Link & OAuth Verification:** Verify Google Sign-In SHA-1 fingerprint is registered in Google Cloud Console.
4. **Offline Mode Verification:** Verify `FALLBACK_DEMO_DASHBOARD` and offline ledger caching function seamlessly with Airplane Mode enabled.
5. **Production Release:** Promote vetted build from Closed Testing to Production track with staged rollout (10% -> 25% -> 100%).

