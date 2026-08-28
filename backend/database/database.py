from pathlib import Path
import sqlite3


# --------------------------------------------------
# DATABASE LOCATION
# --------------------------------------------------

DATABASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = DATABASE_DIR / "veriguard.db"


# --------------------------------------------------
# DATABASE CONNECTION
# --------------------------------------------------

def get_connection() -> sqlite3.Connection:
    """
    Create and return a SQLite database connection.
    """

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = sqlite3.Row

    return connection


# --------------------------------------------------
# INITIALIZE DATABASE
# --------------------------------------------------

def initialize_database() -> None:
    """
    Create the verification history table if it
    does not already exist.
    """

    connection = get_connection()

    try:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS verification_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                document_type TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                decision TEXT NOT NULL,
                confidence INTEGER NOT NULL,
                recommendation TEXT,
                created_at TEXT NOT NULL
            )
            """
        )

        connection.commit()

    finally:

        connection.close()


# --------------------------------------------------
# SAVE VERIFICATION
# --------------------------------------------------

def save_verification(
    document_id: str,
    file_name: str,
    document_type: str,
    risk_score: int,
    risk_level: str,
    decision: str,
    confidence: int,
    recommendation: str,
    created_at: str,
) -> int:
    """
    Save a verification result and return its database ID.
    """

    connection = get_connection()

    try:

        cursor = connection.execute(
            """
            INSERT INTO verification_history (
                document_id,
                file_name,
                document_type,
                risk_score,
                risk_level,
                decision,
                confidence,
                recommendation,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                document_id,
                file_name,
                document_type,
                risk_score,
                risk_level,
                decision,
                confidence,
                recommendation,
                created_at,
            ),
        )

        connection.commit()

        return int(cursor.lastrowid)

    finally:

        connection.close()


# --------------------------------------------------
# GET VERIFICATION HISTORY
# --------------------------------------------------

def get_verification_history(
    limit: int = 20,
) -> list[dict]:
    """
    Return the most recent verification records.
    """

    safe_limit = max(
        1,
        min(limit, 100),
    )

    connection = get_connection()

    try:

        cursor = connection.execute(
            """
            SELECT
                id,
                document_id,
                file_name,
                document_type,
                risk_score,
                risk_level,
                decision,
                confidence,
                recommendation,
                created_at
            FROM verification_history
            ORDER BY id DESC
            LIMIT ?
            """,
            (safe_limit,),
        )

        rows = cursor.fetchall()

        return [
            dict(row)
            for row in rows
        ]

    finally:

        connection.close() 