"""
Database persistence layer for MediCore.

Encapsulates:
- SQLite connection management with automatic foreign key enforcement
- Table schema definitions and index creation
- Parameterized safe queries and transaction context managers
- Audit logging for administrative transparency without exposing sensitive PII
- Schema migration and database initialization routines
"""

import sqlite3
import os
from contextlib import contextmanager
from typing import Generator, List, Dict, Any, Optional
from datetime import datetime, timezone


class DatabaseManager:
    """
    Manages SQLite database connections, transactions, and schema execution.
    Can be instantiated with a custom path (e.g., ':memory:' or test database).
    """
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to medicore.db in current working directory or backend directory
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.getenv("MEDICORE_DB_PATH", os.path.join(base_dir, "medicore.db"))
        else:
            self.db_path = db_path

        # If in-memory, keep a persistent connection to retain state across context manager uses
        self._shared_memory_conn: Optional[sqlite3.Connection] = None
        if self.db_path == ":memory:":
            self._shared_memory_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._shared_memory_conn.row_factory = sqlite3.Row
            self._shared_memory_conn.execute("PRAGMA foreign_keys = ON;")

        self.initialize_schema()

    def get_connection(self) -> sqlite3.Connection:
        """
        Creates or returns an active SQLite connection with Foreign Keys enabled.
        """
        if self._shared_memory_conn is not None:
            return self._shared_memory_conn

        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    @contextmanager
    def transaction(self) -> Generator[sqlite3.Cursor, None, None]:
        """
        Context manager for atomic transactional database operations.
        Automatically commits on success or rolls back on exception.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            if self._shared_memory_conn is None:
                conn.close()

    @contextmanager
    def query(self) -> Generator[sqlite3.Cursor, None, None]:
        """
        Context manager for read-only database queries.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
        finally:
            if self._shared_memory_conn is None:
                conn.close()

    def initialize_schema(self) -> None:
        """
        Idempotently create tables, constraints, and performance indexes.
        """
        with self.transaction() as cur:
            # 1. Patients Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    age INTEGER NOT NULL CHECK(age >= 0 AND age <= 130),
                    gender TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT,
                    medical_notes TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)

            # 2. Doctors Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS doctors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    specialization TEXT NOT NULL,
                    is_available INTEGER NOT NULL DEFAULT 1 CHECK(is_available IN (0, 1)),
                    email TEXT,
                    phone TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)

            # 3. Appointments Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    doctor_id INTEGER NOT NULL,
                    appointment_date TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED')),
                    reason TEXT DEFAULT '',
                    duration_minutes INTEGER NOT NULL DEFAULT 30,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
                    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT
                );
            """)

            # 4. Audit Log Table (tracks lifecycle events without leaking sensitive data)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_type TEXT NOT NULL,
                    entity_id INTEGER,
                    action TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    details TEXT DEFAULT ''
                );
            """)

            # 5. Indexes for fast lookups & conflict checking
            cur.execute("CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);")

    def log_audit(self, entity_type: str, entity_id: Optional[int], action: str, details: str = "") -> None:
        """
        Record a high-level audit log entry.
        """
        now = datetime.now(timezone.utc).isoformat()
        try:
            with self.transaction() as cur:
                cur.execute(
                    """
                    INSERT INTO audit_logs (entity_type, entity_id, action, timestamp, details)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (entity_type.upper(), entity_id, action.upper(), now, details)
                )
        except Exception:
            # Audit logging failure should not break main transaction if called independently
            pass

    def close(self) -> None:
        """Close shared connection if opened."""
        if self._shared_memory_conn:
            self._shared_memory_conn.close()
            self._shared_memory_conn = None
