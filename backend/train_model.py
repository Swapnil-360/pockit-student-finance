"""
Reproducible model training script for Student Financial Risk & Warning System.
Replicates the exact preprocessing, feature engineering, and Gradient Boosting pipeline
from machine-learning-project.ipynb.
"""

from pathlib import Path
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from config import DATASET_PATH, MODEL_PATH

RENAME_MAP = {
    'Awareness of own spending (Rate each statement from 1 = Strongly Disagree to 5 = Strongly Agree) [I always know roughly how much money I have left.]': 'aware_balance',
    'Awareness of own spending (Rate each statement from 1 = Strongly Disagree to 5 = Strongly Agree) [I keep track of where most of my money goes each week.]': 'aware_weekly_track',
    'Awareness of own spending (Rate each statement from 1 = Strongly Disagree to 5 = Strongly Agree) [I check my balance/expenses before making non-essential purchases.]': 'aware_check_before_buy',
    'Impulse buying (Rate each statement from 1 = Strongly Disagree to 5 = Strongly Agree) [I often buy things on the spur of the moment without planning.]': 'impulse_spontaneous',
    'Impulse buying (Rate each statement from 1 = Strongly Disagree to 5 = Strongly Agree) [I find it hard to resist discounts, flash sales, or cravings.]': 'impulse_discounts',
    'Impulse buying (Rate each statement from 1 = Strongly Disagree to 5 = Strongly Agree) [I frequently regret unplanned purchases shortly after buying them.]': 'impulse_regret',
}

ORDINAL_MAPS = {
    'Year of study': ['1st year', '2nd year', '3rd year', '4th year', 'Masters'],
    'Total monthly money available (Tk)': ['<5k', '5–10k', '10–15k', '15–20k', '>20k'],
    'Monthly rent/accommodation (Tk)': ['0', '<3k', '3–6k', '6–9k', '>9k'],
    'Monthly food (Tk)': ['<3k', '3–5k', '5–7k', '>7k'],
    'Monthly transport (Tk)': ['<1k', '1–2k', '2–3k', '>3k'],
    'Monthly online shopping / eating-out / entertainment (Tk)': ['<1k', '1–2k', '>2k'],
    'Money saved per month (Tk)': ['0', '<500', '500–1k', '>1k'],
    'Mobile banking use (bKash/Nagad/Rocket)': ['Rarely', 'Weekly', 'Daily'],
    'Borrowed money from friends in last 3 months': ['Never', '1–2', '3+'],
}


def normalize_dashes(text: str) -> str:
    """Normalize various hyphens and em-dashes to canonical en-dash (–)."""
    if not isinstance(text, str):
        return text
    return text.replace('-', '–').replace('—', '–').strip()


def train_and_save_model(dataset_path: Path = DATASET_PATH, output_path: Path = MODEL_PATH):
    print(f"Loading dataset from: {dataset_path}")
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    df = pd.read_excel(dataset_path, sheet_name=0)
    print(f"Dataset loaded. Shape: {df.shape}")

    # Drop Timestamp if present
    df = df.drop(columns=['Timestamp'], errors='ignore')

    TARGET_COL = 'Do you often run out of money before the end of the month?'
    y = (df[TARGET_COL].astype(str).str.strip() == 'Yes').astype(int)
    X = df.drop(columns=[TARGET_COL]).copy()

    # Rename Likert statements
    X = X.rename(columns=RENAME_MAP)

    # Encode ordinals with dash normalization
    for col, order in ORDINAL_MAPS.items():
        mapping = {normalize_dashes(val): idx for idx, val in enumerate(order)}
        X[col] = X[col].astype(str).apply(normalize_dashes).map(mapping)

    # Feature Engineering
    X['awareness_score'] = X[['aware_balance', 'aware_weekly_track', 'aware_check_before_buy']].mean(axis=1)
    X['impulse_score'] = X[['impulse_spontaneous', 'impulse_discounts', 'impulse_regret']].mean(axis=1)

    cat_cols = X.select_dtypes(include='object').columns.tolist()
    num_cols = X.select_dtypes(exclude='object').columns.tolist()

    print(f"Categorical features ({len(cat_cols)}): {cat_cols}")
    print(f"Numerical features ({len(num_cols)}): {num_cols}")

    preprocessor = ColumnTransformer([
        ('cat', OneHotEncoder(handle_unknown='ignore'), cat_cols),
        ('num', StandardScaler(), num_cols)
    ])

    clf = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.05,
        random_state=42
    )

    pipe = Pipeline([
        ('pre', preprocessor),
        ('clf', clf)
    ])

    print("Fitting Gradient Boosting Pipeline...")
    pipe.fit(X, y)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, output_path)
    print(f"Model pipeline successfully saved to: {output_path}")
    return pipe


if __name__ == '__main__':
    train_and_save_model()

