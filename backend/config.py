import os
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

# Gemini AI Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Server Configuration
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Paths
MODEL_PATH = BASE_DIR / "financial_risk_model.pkl"
DATASET_PATH = BASE_DIR.parent / "Student_Spending_Survey_200_Responses.xlsx"
SQLITE_DB_PATH = BASE_DIR / "student_finance.db"
DB_PATH = BASE_DIR / "feedback.db"


# Cloud Supabase Configuration (falls back to local SQLite if unset)
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
USE_SUPABASE = bool(SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY))
