"""
Synthetic Seed Data Generator for MediCore.
Creates realistic sample data for local development and testing.
Contains purely synthetic, fictional records (no real patient PII).
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from database import DatabaseManager
from services import PatientService, DoctorService, AppointmentService


def seed_database(db_manager: Optional[DatabaseManager] = None) -> None:
    """Populates the database with realistic synthetic doctors, patients, and appointments."""
    if db_manager is None:
        db_manager = DatabaseManager()

    patient_svc = PatientService(db_manager)
    doctor_svc = DoctorService(db_manager)
    appt_svc = AppointmentService(db_manager)

    # Check if data already exists
    with db_manager.query() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM patients")
        if cur.fetchone()["count"] > 0:
            print("Database already contains data. Skipping initial seeding.")
            return

    print("Seeding database with synthetic sample records...")

    # 1. Seed Doctors
    doctors_data = [
        {"name": "Sarah Jenkins", "specialization": "Cardiology", "is_available": True, "email": "s.jenkins@medicore-hospital.example", "phone": "+1 (555) 234-5678"},
        {"name": "Marcus Chen", "specialization": "Neurology", "is_available": True, "email": "m.chen@medicore-hospital.example", "phone": "+1 (555) 345-6789"},
        {"name": "Elena Rostova", "specialization": "Pediatrics", "is_available": True, "email": "e.rostova@medicore-hospital.example", "phone": "+1 (555) 456-7890"},
        {"name": "David Okafor", "specialization": "Orthopedics", "is_available": True, "email": "d.okafor@medicore-hospital.example", "phone": "+1 (555) 567-8901"},
        {"name": "Amina Patel", "specialization": "Dermatology", "is_available": True, "email": "a.patel@medicore-hospital.example", "phone": "+1 (555) 678-9012"},
        {"name": "Robert Sterling", "specialization": "General Medicine", "is_available": False, "email": "r.sterling@medicore-hospital.example", "phone": "+1 (555) 789-0123"}
    ]
    doctors = [doctor_svc.register_doctor(d) for d in doctors_data]

    # 2. Seed Patients
    patients_data = [
        {"name": "Alice Montgomery", "age": 34, "gender": "Female", "phone": "+1 (555) 111-2233", "email": "alice.m@example.org", "medical_notes": "Mild asthma, allergic to penicillin"},
        {"name": "James Henderson", "age": 58, "gender": "Male", "phone": "+1 (555) 222-3344", "email": "j.henderson@example.org", "medical_notes": "Hypertension monitoring, routine ECG"},
        {"name": "Sophia Ramirez", "age": 8, "gender": "Female", "phone": "+1 (555) 333-4455", "email": "ramirez.family@example.org", "medical_notes": "Annual pediatric checkup, routine vaccinations"},
        {"name": "Liam Vance", "age": 42, "gender": "Male", "phone": "+1 (555) 444-5566", "email": "liam.vance@example.org", "medical_notes": "Post-op meniscus follow-up"},
        {"name": "Zoe Kim", "age": 27, "gender": "Female", "phone": "+1 (555) 555-6677", "email": "zoe.k@example.org", "medical_notes": "Contact dermatitis on wrists"},
        {"name": "Harper Diaz", "age": 65, "gender": "Other", "phone": "+1 (555) 666-7788", "email": "harper.d@example.org", "medical_notes": "Type 2 diabetes management, quarterly blood work"},
        {"name": "Noah Campbell", "age": 19, "gender": "Male", "phone": "+1 (555) 777-8899", "email": "noah.c@example.org", "medical_notes": "Sports physical clearance"}
    ]
    patients = [patient_svc.create_patient(p) for p in patients_data]

    # 3. Seed Appointments (future dates from current time)
    now = datetime.now(timezone.utc)

    # Future active appointments
    future_slots = [
        (patients[0].id, doctors[0].id, (now + timedelta(days=1, hours=2)).isoformat(), "Follow-up echocardiogram consultation"),
        (patients[1].id, doctors[0].id, (now + timedelta(days=1, hours=4)).isoformat(), "Bi-annual blood pressure checkup"),
        (patients[2].id, doctors[2].id, (now + timedelta(days=2, hours=1)).isoformat(), "Growth milestone evaluation"),
        (patients[3].id, doctors[3].id, (now + timedelta(days=2, hours=3)).isoformat(), "Knee mobility & rehabilitation review"),
        (patients[4].id, doctors[4].id, (now + timedelta(days=3, hours=5)).isoformat(), "Skin allergy patch test examination"),
        (patients[5].id, doctors[1].id, (now + timedelta(days=4, hours=2)).isoformat(), "Migraine headache consultation")
    ]

    for p_id, d_id, appt_time, reason in future_slots:
        appt_svc.book_appointment({
            "patient_id": p_id,
            "doctor_id": d_id,
            "appointment_date": appt_time,
            "duration_minutes": 30,
            "reason": reason
        })

    # Historical appointments (seeded directly into database to preserve history)
    past_slots = [
        (patients[0].id, doctors[0].id, (now - timedelta(days=14)).isoformat(), "COMPLETED", "Initial cardiovascular assessment"),
        (patients[1].id, doctors[0].id, (now - timedelta(days=20)).isoformat(), "COMPLETED", "Holter monitor fitting"),
        (patients[3].id, doctors[3].id, (now - timedelta(days=5)).isoformat(), "COMPLETED", "Pre-op knee examination"),
        (patients[4].id, doctors[4].id, (now - timedelta(days=2)).isoformat(), "CANCELLED", "Patient had schedule conflict")
    ]

    with db_manager.transaction() as cur:
        for p_id, d_id, appt_time, status, reason in past_slots:
            cur.execute(
                """
                INSERT INTO appointments (
                    patient_id, doctor_id, appointment_date, status, reason, duration_minutes, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 30, ?, ?)
                """,
                (p_id, d_id, appt_time, status, reason, appt_time, appt_time)
            )

    print("Database seeding completed successfully.")


if __name__ == "__main__":
    seed_database()
