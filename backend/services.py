"""
Business Services Layer for MediCore.

Separates business logic and database orchestration from Flask route handlers:
- PatientService: Patient CRUD, validation, search, and referential safeguards.
- DoctorService: Doctor registration, availability management, and directory filters.
- AppointmentService: Booking validation, scheduling constraints, conflict detection,
  and state-machine transitions (reschedule, cancel, complete).
- DashboardService: Real-time statistical aggregations and audit event history.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import sqlite3

from models import Patient, Doctor, Appointment, ValidationError
from database import DatabaseManager


class NotFoundError(Exception):
    """Raised when an entity is not found by ID or query."""
    pass


class ConflictError(Exception):
    """Raised when an operation conflicts with existing state (e.g. overlapping appointment)."""
    pass


def _parse_iso(dt_str: str) -> datetime:
    """Helper to parse ISO datetime string with flexible timezone/Z suffix handling."""
    s = dt_str.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        # If naive, assume UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


class PatientService:
    """Service handling patient business operations."""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def create_patient(self, data: Dict[str, Any]) -> Patient:
        """Validate and create a new patient record."""
        patient = Patient(
            name=data.get("name", ""),
            age=data.get("age", 0),
            gender=data.get("gender", ""),
            phone=data.get("phone", ""),
            email=data.get("email"),
            medical_notes=data.get("medical_notes", "")
        )
        patient.validate()

        with self.db.transaction() as cur:
            cur.execute(
                """
                INSERT INTO patients (name, age, gender, phone, email, medical_notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    patient.name,
                    patient.age,
                    patient.gender,
                    patient.phone,
                    patient.email,
                    patient.medical_notes,
                    patient.created_at,
                    patient.updated_at
                )
            )
            patient_id = cur.lastrowid
            patient.id = patient_id

        self.db.log_audit("PATIENT", patient_id, "CREATED", f"Patient registered: {patient.name}")
        return patient

    def get_all_patients(self, search: Optional[str] = None) -> List[Patient]:
        """Retrieve patients, optionally filtered by name or numeric ID."""
        with self.db.query() as cur:
            if search and search.strip():
                term = f"%{search.strip()}%"
                # Check if search term is an exact integer ID
                if search.strip().isdigit():
                    cur.execute(
                        """
                        SELECT * FROM patients
                        WHERE id = ? OR name LIKE ? OR phone LIKE ?
                        ORDER BY id DESC
                        """,
                        (int(search.strip()), term, term)
                    )
                else:
                    cur.execute(
                        """
                        SELECT * FROM patients
                        WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
                        ORDER BY id DESC
                        """,
                        (term, term, term)
                    )
            else:
                cur.execute("SELECT * FROM patients ORDER BY id DESC")

            rows = cur.fetchall()
            return [
                Patient(
                    id=row["id"],
                    name=row["name"],
                    age=row["age"],
                    gender=row["gender"],
                    phone=row["phone"],
                    email=row["email"],
                    medical_notes=row["medical_notes"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"]
                )
                for row in rows
            ]

    def get_patient_by_id(self, patient_id: int) -> Patient:
        """Retrieve single patient by ID or raise NotFoundError."""
        with self.db.query() as cur:
            cur.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
            row = cur.fetchone()
            if not row:
                raise NotFoundError(f"Patient with ID {patient_id} does not exist.")
            return Patient(
                id=row["id"],
                name=row["name"],
                age=row["age"],
                gender=row["gender"],
                phone=row["phone"],
                email=row["email"],
                medical_notes=row["medical_notes"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    def update_patient(self, patient_id: int, data: Dict[str, Any]) -> Patient:
        """Update patient details with validation."""
        patient = self.get_patient_by_id(patient_id)
        patient.update_details(
            name=data.get("name"),
            age=data.get("age"),
            gender=data.get("gender"),
            phone=data.get("phone"),
            email=data.get("email"),
            medical_notes=data.get("medical_notes")
        )

        with self.db.transaction() as cur:
            cur.execute(
                """
                UPDATE patients
                SET name = ?, age = ?, gender = ?, phone = ?, email = ?, medical_notes = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    patient.name,
                    patient.age,
                    patient.gender,
                    patient.phone,
                    patient.email,
                    patient.medical_notes,
                    patient.updated_at,
                    patient_id
                )
            )

        self.db.log_audit("PATIENT", patient_id, "UPDATED", f"Updated details for patient {patient.name}")
        return patient

    def delete_patient(self, patient_id: int) -> None:
        """
        Delete a patient record if no active appointments exist.
        If only historical (completed/cancelled) appointments exist, clean them up safely.
        """
        patient = self.get_patient_by_id(patient_id)

        with self.db.transaction() as cur:
            # Check for active appointments
            cur.execute(
                """
                SELECT COUNT(*) as count FROM appointments
                WHERE patient_id = ? AND status IN ('SCHEDULED', 'RESCHEDULED')
                """,
                (patient_id,)
            )
            row = cur.fetchone()
            if row and row["count"] > 0:
                raise ValidationError(
                    f"Cannot delete patient '{patient.name}' because they have {row['count']} active appointment(s). "
                    "Cancel or complete these appointments first.",
                    field="patient_id"
                )

            # Safely delete historical appointments to satisfy foreign key constraints
            cur.execute("DELETE FROM appointments WHERE patient_id = ?", (patient_id,))
            cur.execute("DELETE FROM patients WHERE id = ?", (patient_id,))

        self.db.log_audit("PATIENT", patient_id, "DELETED", f"Patient deleted: {patient.name}")


class DoctorService:
    """Service handling doctor business operations."""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def register_doctor(self, data: Dict[str, Any]) -> Doctor:
        """Register a new doctor."""
        doctor = Doctor(
            name=data.get("name", ""),
            specialization=data.get("specialization", ""),
            is_available=data.get("is_available", True),
            email=data.get("email"),
            phone=data.get("phone")
        )
        doctor.validate()

        with self.db.transaction() as cur:
            cur.execute(
                """
                INSERT INTO doctors (name, specialization, is_available, email, phone, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doctor.name,
                    doctor.specialization,
                    1 if doctor.is_available else 0,
                    doctor.email,
                    doctor.phone,
                    doctor.created_at,
                    doctor.updated_at
                )
            )
            doctor_id = cur.lastrowid
            doctor.id = doctor_id

        self.db.log_audit("DOCTOR", doctor_id, "REGISTERED", f"Doctor registered: Dr. {doctor.name} ({doctor.specialization})")
        return doctor

    def get_all_doctors(
        self,
        search: Optional[str] = None,
        specialization: Optional[str] = None,
        available_only: Optional[bool] = None
    ) -> List[Doctor]:
        """Retrieve doctors with optional search and filters."""
        query_sql = "SELECT * FROM doctors WHERE 1=1"
        params: List[Any] = []

        if search and search.strip():
            term = f"%{search.strip()}%"
            query_sql += " AND (name LIKE ? OR specialization LIKE ?)"
            params.extend([term, term])

        if specialization and specialization.strip():
            query_sql += " AND specialization = ?"
            params.append(specialization.strip())

        if available_only is not None:
            query_sql += " AND is_available = ?"
            params.append(1 if available_only else 0)

        query_sql += " ORDER BY name ASC"

        with self.db.query() as cur:
            cur.execute(query_sql, params)
            rows = cur.fetchall()
            return [
                Doctor(
                    id=row["id"],
                    name=row["name"],
                    specialization=row["specialization"],
                    is_available=bool(row["is_available"]),
                    email=row["email"],
                    phone=row["phone"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"]
                )
                for row in rows
            ]

    def get_doctor_by_id(self, doctor_id: int) -> Doctor:
        """Retrieve doctor by ID or raise NotFoundError."""
        with self.db.query() as cur:
            cur.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,))
            row = cur.fetchone()
            if not row:
                raise NotFoundError(f"Doctor with ID {doctor_id} does not exist.")
            return Doctor(
                id=row["id"],
                name=row["name"],
                specialization=row["specialization"],
                is_available=bool(row["is_available"]),
                email=row["email"],
                phone=row["phone"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    def update_doctor(self, doctor_id: int, data: Dict[str, Any]) -> Doctor:
        """Update doctor details."""
        doctor = self.get_doctor_by_id(doctor_id)
        doctor.update_details(
            name=data.get("name"),
            specialization=data.get("specialization"),
            is_available=data.get("is_available"),
            email=data.get("email"),
            phone=data.get("phone")
        )

        with self.db.transaction() as cur:
            cur.execute(
                """
                UPDATE doctors
                SET name = ?, specialization = ?, is_available = ?, email = ?, phone = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    doctor.name,
                    doctor.specialization,
                    1 if doctor.is_available else 0,
                    doctor.email,
                    doctor.phone,
                    doctor.updated_at,
                    doctor_id
                )
            )

        self.db.log_audit("DOCTOR", doctor_id, "UPDATED", f"Updated details for Dr. {doctor.name}")
        return doctor

    def get_specializations(self) -> List[str]:
        """Return unique list of existing doctor specializations."""
        with self.db.query() as cur:
            cur.execute("SELECT DISTINCT specialization FROM doctors ORDER BY specialization ASC")
            return [row["specialization"] for row in cur.fetchall()]


class AppointmentService:
    """Service handling appointment scheduling, conflicts, and lifecycle operations."""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.patient_service = PatientService(db_manager)
        self.doctor_service = DoctorService(db_manager)

    def _check_time_conflict(
        self,
        doctor_id: int,
        start_time: datetime,
        duration_minutes: int,
        exclude_appointment_id: Optional[int] = None
    ) -> None:
        """
        Verify that the doctor does not have any overlapping active appointments.
        Two intervals [S1, E1) and [S2, E2) overlap if S1 < E2 and S2 < E1.
        """
        end_time = start_time + timedelta(minutes=duration_minutes)

        with self.db.query() as cur:
            # Query all active appointments for this doctor
            sql = """
                SELECT id, appointment_date, duration_minutes, status
                FROM appointments
                WHERE doctor_id = ? AND status IN ('SCHEDULED', 'RESCHEDULED')
            """
            params: List[Any] = [doctor_id]
            if exclude_appointment_id:
                sql += " AND id != ?"
                params.append(exclude_appointment_id)

            cur.execute(sql, params)
            active_appts = cur.fetchall()

            for appt in active_appts:
                existing_start = _parse_iso(appt["appointment_date"])
                existing_end = existing_start + timedelta(minutes=appt["duration_minutes"])

                # Overlap test
                if start_time < existing_end and existing_start < end_time:
                    existing_start_str = existing_start.strftime("%Y-%m-%d %H:%M")
                    existing_end_str = existing_end.strftime("%H:%M")
                    raise ConflictError(
                        f"Doctor has an existing appointment (ID #{appt['id']}) scheduled from "
                        f"{existing_start_str} to {existing_end_str}. Please choose a non-overlapping time."
                    )

    def book_appointment(self, data: Dict[str, Any]) -> Appointment:
        """
        Book a new appointment enforcing business rules:
        1. Patient must exist.
        2. Doctor must exist.
        3. Doctor must be marked as available.
        4. Appointment must be scheduled in the future.
        5. Doctor cannot have overlapping active appointments.
        """
        patient_id = data.get("patient_id")
        doctor_id = data.get("doctor_id")
        appointment_date_str = data.get("appointment_date")
        duration = int(data.get("duration_minutes", 30))
        reason = data.get("reason", "")

        if not patient_id:
            raise ValidationError("Patient ID is required.", field="patient_id")
        if not doctor_id:
            raise ValidationError("Doctor ID is required.", field="doctor_id")
        if not appointment_date_str:
            raise ValidationError("Appointment date and time are required.", field="appointment_date")

        # 1 & 2: Existence checks
        patient = self.patient_service.get_patient_by_id(int(patient_id))
        doctor = self.doctor_service.get_doctor_by_id(int(doctor_id))

        # 3: Doctor availability
        if not doctor.is_available:
            raise ValidationError(
                f"Dr. {doctor.name} is currently marked as unavailable for new appointments.",
                field="doctor_id"
            )

        # Domain model instantiation & validation
        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            appointment_date=appointment_date_str,
            duration_minutes=duration,
            reason=reason,
            patient_name=patient.name,
            doctor_name=doctor.name,
            doctor_specialization=doctor.specialization
        )
        appointment.validate()

        # 4: Future date check
        start_time = appointment.get_parsed_datetime()
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)

        if start_time <= now_utc:
            raise ValidationError("Appointments must be scheduled for a future date and time.", field="appointment_date")

        # 5: Doctor conflict check
        self._check_time_conflict(doctor.id, start_time, duration)

        # Persist appointment
        with self.db.transaction() as cur:
            cur.execute(
                """
                INSERT INTO appointments (
                    patient_id, doctor_id, appointment_date, status, reason, duration_minutes, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    appointment.patient_id,
                    appointment.doctor_id,
                    appointment.appointment_date,
                    appointment.status,
                    appointment.reason,
                    appointment.duration_minutes,
                    appointment.created_at,
                    appointment.updated_at
                )
            )
            appointment_id = cur.lastrowid
            appointment.id = appointment_id

        self.db.log_audit(
            "APPOINTMENT",
            appointment_id,
            "BOOKED",
            f"Booked appointment for Patient #{patient.id} with Dr. #{doctor.id} at {appointment.appointment_date}"
        )
        return appointment

    def get_all_appointments(
        self,
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
        date: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Appointment]:
        """
        Retrieve appointments with optional filters for patient, doctor, date (YYYY-MM-DD), and status.
        Joins patient and doctor names for rich representation.
        """
        sql = """
            SELECT 
                a.*,
                p.name AS patient_name,
                d.name AS doctor_name,
                d.specialization AS doctor_specialization
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE 1=1
        """
        params: List[Any] = []

        if patient_id:
            sql += " AND a.patient_id = ?"
            params.append(int(patient_id))

        if doctor_id:
            sql += " AND a.doctor_id = ?"
            params.append(int(doctor_id))

        if date and date.strip():
            # Match date prefix (YYYY-MM-DD)
            sql += " AND a.appointment_date LIKE ?"
            params.append(f"{date.strip()}%")

        if status and status.strip():
            sql += " AND a.status = ?"
            params.append(status.strip().upper())

        sql += " ORDER BY a.appointment_date ASC"

        with self.db.query() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [
                Appointment(
                    id=row["id"],
                    patient_id=row["patient_id"],
                    doctor_id=row["doctor_id"],
                    appointment_date=row["appointment_date"],
                    status=row["status"],
                    reason=row["reason"],
                    duration_minutes=row["duration_minutes"],
                    patient_name=row["patient_name"],
                    doctor_name=row["doctor_name"],
                    doctor_specialization=row["doctor_specialization"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"]
                )
                for row in rows
            ]

    def get_appointment_by_id(self, appointment_id: int) -> Appointment:
        """Retrieve single appointment by ID with joined names."""
        sql = """
            SELECT 
                a.*,
                p.name AS patient_name,
                d.name AS doctor_name,
                d.specialization AS doctor_specialization
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = ?
        """
        with self.db.query() as cur:
            cur.execute(sql, (appointment_id,))
            row = cur.fetchone()
            if not row:
                raise NotFoundError(f"Appointment with ID {appointment_id} does not exist.")
            return Appointment(
                id=row["id"],
                patient_id=row["patient_id"],
                doctor_id=row["doctor_id"],
                appointment_date=row["appointment_date"],
                status=row["status"],
                reason=row["reason"],
                duration_minutes=row["duration_minutes"],
                patient_name=row["patient_name"],
                doctor_name=row["doctor_name"],
                doctor_specialization=row["doctor_specialization"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    def reschedule_appointment(self, appointment_id: int, new_datetime_str: str, reason: Optional[str] = None) -> Appointment:
        """
        Reschedule an appointment:
        1. Validates that appointment exists.
        2. Validates that appointment is not COMPLETED or CANCELLED.
        3. Validates that new time is in the future.
        4. Verifies doctor is available and does not have an overlapping active appointment.
        5. Updates status to RESCHEDULED.
        """
        appointment = self.get_appointment_by_id(appointment_id)

        # Check doctor availability
        doctor = self.doctor_service.get_doctor_by_id(appointment.doctor_id)
        if not doctor.is_available:
            raise ValidationError(
                f"Dr. {doctor.name} is currently marked as unavailable for appointments.",
                field="doctor_id"
            )

        # Parse new date and ensure future
        appointment.reschedule(new_datetime_str, reason=reason)
        new_start = appointment.get_parsed_datetime()
        if new_start.tzinfo is None:
            new_start = new_start.replace(tzinfo=timezone.utc)
        if new_start <= datetime.now(timezone.utc):
            raise ValidationError("New appointment time must be in the future.", field="appointment_date")

        # Conflict check excluding this appointment itself
        self._check_time_conflict(appointment.doctor_id, new_start, appointment.duration_minutes, exclude_appointment_id=appointment.id)

        with self.db.transaction() as cur:
            cur.execute(
                """
                UPDATE appointments
                SET appointment_date = ?, status = ?, reason = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    appointment.appointment_date,
                    appointment.status,
                    appointment.reason,
                    appointment.updated_at,
                    appointment.id
                )
            )

        self.db.log_audit(
            "APPOINTMENT",
            appointment_id,
            "RESCHEDULED",
            f"Rescheduled appointment #{appointment_id} to {appointment.appointment_date}"
        )
        return appointment

    def cancel_appointment(self, appointment_id: int, reason: Optional[str] = None) -> Appointment:
        """
        Cancel an active appointment.
        Completed appointments cannot be cancelled.
        Cancelled appointments free up the doctor's calendar slot.
        """
        appointment = self.get_appointment_by_id(appointment_id)
        appointment.cancel(reason=reason)

        with self.db.transaction() as cur:
            cur.execute(
                """
                UPDATE appointments
                SET status = ?, reason = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    appointment.status,
                    appointment.reason,
                    appointment.updated_at,
                    appointment.id
                )
            )

        self.db.log_audit(
            "APPOINTMENT",
            appointment_id,
            "CANCELLED",
            f"Cancelled appointment #{appointment_id}"
        )
        return appointment

    def complete_appointment(self, appointment_id: int) -> Appointment:
        """
        Mark appointment as completed.
        Cancelled appointments cannot be completed.
        """
        appointment = self.get_appointment_by_id(appointment_id)
        appointment.complete()

        with self.db.transaction() as cur:
            cur.execute(
                """
                UPDATE appointments
                SET status = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    appointment.status,
                    appointment.updated_at,
                    appointment.id
                )
            )

        self.db.log_audit(
            "APPOINTMENT",
            appointment_id,
            "COMPLETED",
            f"Completed appointment #{appointment_id}"
        )
        return appointment


class DashboardService:
    """Service providing aggregate metrics, schedule summaries, and recent activity feed."""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Compute real, verified metrics from persistent SQLite tables."""
        now_utc = datetime.now(timezone.utc)
        today_prefix = now_utc.strftime("%Y-%m-%d")

        with self.db.query() as cur:
            # 1. Total Patients
            cur.execute("SELECT COUNT(*) AS total FROM patients")
            total_patients = cur.fetchone()["total"]

            # 2. Total Doctors
            cur.execute("SELECT COUNT(*) AS total FROM doctors")
            total_doctors = cur.fetchone()["total"]

            # 3. Available Doctors
            cur.execute("SELECT COUNT(*) AS total FROM doctors WHERE is_available = 1")
            available_doctors = cur.fetchone()["total"]

            # 4. Total Appointments
            cur.execute("SELECT COUNT(*) AS total FROM appointments")
            total_appointments = cur.fetchone()["total"]

            # 5. Today's Appointments
            cur.execute(
                "SELECT COUNT(*) AS total FROM appointments WHERE appointment_date LIKE ?",
                (f"{today_prefix}%",)
            )
            todays_appointments = cur.fetchone()["total"]

            # 6. Status distribution
            cur.execute(
                """
                SELECT status, COUNT(*) AS count
                FROM appointments
                GROUP BY status
                """
            )
            status_counts = {row["status"]: row["count"] for row in cur.fetchall()}
            for st in ["SCHEDULED", "RESCHEDULED", "COMPLETED", "CANCELLED"]:
                status_counts.setdefault(st, 0)

            # 7. Upcoming Active Appointments (scheduled for future)
            cur.execute(
                """
                SELECT 
                    a.*,
                    p.name AS patient_name,
                    d.name AS doctor_name,
                    d.specialization AS doctor_specialization
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN doctors d ON a.doctor_id = d.id
                WHERE a.status IN ('SCHEDULED', 'RESCHEDULED')
                  AND a.appointment_date >= ?
                ORDER BY a.appointment_date ASC
                LIMIT 6
                """,
                (now_utc.isoformat(),)
            )
            upcoming_appointments = [
                {
                    "id": row["id"],
                    "patient_id": row["patient_id"],
                    "doctor_id": row["doctor_id"],
                    "patient_name": row["patient_name"],
                    "doctor_name": row["doctor_name"],
                    "doctor_specialization": row["doctor_specialization"],
                    "appointment_date": row["appointment_date"],
                    "status": row["status"],
                    "reason": row["reason"],
                    "duration_minutes": row["duration_minutes"]
                }
                for row in cur.fetchall()
            ]

            # 8. Today's Schedule
            cur.execute(
                """
                SELECT 
                    a.*,
                    p.name AS patient_name,
                    d.name AS doctor_name,
                    d.specialization AS doctor_specialization
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN doctors d ON a.doctor_id = d.id
                WHERE a.appointment_date LIKE ?
                ORDER BY a.appointment_date ASC
                """,
                (f"{today_prefix}%",)
            )
            today_schedule = [
                {
                    "id": row["id"],
                    "patient_name": row["patient_name"],
                    "doctor_name": row["doctor_name"],
                    "doctor_specialization": row["doctor_specialization"],
                    "appointment_date": row["appointment_date"],
                    "status": row["status"],
                    "reason": row["reason"]
                }
                for row in cur.fetchall()
            ]

            # 9. Recent Activity from Audit Logs
            cur.execute(
                """
                SELECT * FROM audit_logs
                ORDER BY id DESC
                LIMIT 10
                """
            )
            recent_activity = [
                {
                    "id": row["id"],
                    "entity_type": row["entity_type"],
                    "entity_id": row["entity_id"],
                    "action": row["action"],
                    "timestamp": row["timestamp"],
                    "details": row["details"]
                }
                for row in cur.fetchall()
            ]

            # 10. Doctor Specialization Breakdown
            cur.execute(
                """
                SELECT specialization, COUNT(*) as count
                FROM doctors
                GROUP BY specialization
                ORDER BY count DESC
                """
            )
            specialization_counts = [
                {"specialization": row["specialization"], "count": row["count"]}
                for row in cur.fetchall()
            ]

        return {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "available_doctors": available_doctors,
            "total_appointments": total_appointments,
            "todays_appointments": todays_appointments,
            "status_counts": status_counts,
            "upcoming_appointments": upcoming_appointments,
            "today_schedule": today_schedule,
            "recent_activity": recent_activity,
            "specialization_counts": specialization_counts
        }
