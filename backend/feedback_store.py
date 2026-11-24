"""
SQLite Storage for Active User Feedback and Retraining Pipeline.
Saves outcome verifications (whether the student actually ran out of money)
along with input parameters for future model retraining.
"""

import json
import sqlite3
from typing import Optional, Dict, Any
from config import DB_PATH


class FeedbackStore:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prediction_id TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    actual_ran_out_of_money INTEGER NOT NULL,
                    feedback_notes TEXT,
                    student_inputs TEXT
                )
            """)
            conn.commit()

    def record_feedback(
        self,
        prediction_id: Optional[str],
        actual_ran_out_of_money: bool,
        feedback_notes: Optional[str] = None,
        student_inputs: Optional[Dict[str, Any]] = None
    ) -> int:
        inputs_json = json.dumps(student_inputs) if student_inputs else None
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO feedback (prediction_id, actual_ran_out_of_money, feedback_notes, student_inputs)
                VALUES (?, ?, ?, ?)
            """, (prediction_id, int(actual_ran_out_of_money), feedback_notes, inputs_json))
            conn.commit()
            return cursor.lastrowid

    def get_count(self) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM feedback")
            return cursor.fetchone()[0]


feedback_store = FeedbackStore()

