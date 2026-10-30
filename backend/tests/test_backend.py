"""
Automated Test Suite for MediCore.

Tests cover:
- Patient registration, validation, retrieval, update, search, deletion safeguards
- Invalid patient inputs (negative age, empty name, invalid phone format)
- Doctor registration, availability toggle, specialization filter
- Appointment booking with future datetime validation
- Nonexistent patient / doctor error handling
- Booking with unavailable doctor rejected
- Overlapping appointment conflict detection
- Appointment cancellation freeing doctor slot
- Rescheduling validation and conflict checks
- Completed appointment immutability (cannot cancel or reschedule)
- Database persistence across separate connections
- REST API integration endpoints
"""

import os
import tempfile
import pytest
from datetime import datetime, timezone, timedelta

from database import DatabaseManager
from models import Patient, Doctor, Appointment, ValidationError
from services import (
    PatientService,
    DoctorService,
    AppointmentService,
    DashboardService,
    NotFoundError,
    ConflictError
)
from app import create_app


@pytest.fixture
def temp_db():
    """Provides a fresh isolated temporary SQLite database for each test."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    db = DatabaseManager(db_path=path)
    yield db
    db.close()
    if os.path.exists(path):
        os.remove(path)


@pytest.fixture
def test_client(temp_db):
    """Provides a Flask test client with the isolated test database."""
    app = create_app(db_path=temp_db.db_path)
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# =============================================================================
# 1. Patient Model & Service Tests
# =============================================================================

def test_patient_creation_and_retrieval(temp_db):
    service = PatientService(temp_db)
    patient = service.create_patient({
        "name": "Sarah Connor",
        "age": 29,
        "gender": "Female",
        "phone": "+1 (555) 987-6543",
        "email": "sarah@example.com",
        "medical_notes": "No known allergies"
    })

    assert patient.id is not None
    assert patient.name == "Sarah Connor"
    assert patient.age == 29

    fetched = service.get_patient_by_id(patient.id)
    assert fetched.name == "Sarah Connor"
    assert fetched.email == "sarah@example.com"
    assert fetched.medical_notes == "No known allergies"


def test_patient_validation_errors(temp_db):
    service = PatientService(temp_db)

    # Empty name
    with pytest.raises(ValidationError) as exc:
        service.create_patient({
            "name": "   ",
            "age": 30,
            "gender": "Male",
            "phone": "+1 555-1234567"
        })
    assert "name" in str(exc.value).lower()

    # Negative age
    with pytest.raises(ValidationError) as exc:
        service.create_patient({
            "name": "John Doe",
            "age": -5,
            "gender": "Male",
            "phone": "+1 555-1234567"
        })
    assert "age" in str(exc.value).lower()

    # Age over 130
    with pytest.raises(ValidationError) as exc:
        service.create_patient({
            "name": "John Doe",
            "age": 150,
            "gender": "Male",
            "phone": "+1 555-1234567"
        })
    assert "age" in str(exc.value).lower()

    # Invalid gender
    with pytest.raises(ValidationError) as exc:
        service.create_patient({
            "name": "John Doe",
            "age": 30,
            "gender": "Martian",
            "phone": "+1 555-1234567"
        })
    assert "gender" in str(exc.value).lower()

    # Invalid phone format
    with pytest.raises(ValidationError) as exc:
        service.create_patient({
            "name": "John Doe",
            "age": 30,
            "gender": "Male",
            "phone": "abc-no-digits"
        })
    assert "phone" in str(exc.value).lower()


def test_patient_search_and_update(temp_db):
    service = PatientService(temp_db)
    p1 = service.create_patient({
        "name": "Alice Cooper",
        "age": 45,
        "gender": "Female",
        "phone": "+1 555-0101"
    })
    p2 = service.create_patient({
        "name": "Bob Dylan",
        "age": 52,
        "gender": "Male",
        "phone": "+1 555-0202"
    })

    # Search by name
    results = service.get_all_patients(search="cooper")
    assert len(results) == 1
    assert results[0].id == p1.id

    # Search by ID
    results_id = service.get_all_patients(search=str(p2.id))
    assert any(p.id == p2.id for p in results_id)

    # Update
    updated = service.update_patient(p1.id, {"age": 46, "medical_notes": "Updated note"})
    assert updated.age == 46
    assert updated.medical_notes == "Updated note"


# =============================================================================
# 2. Doctor Model & Service Tests
# =============================================================================

def test_doctor_registration_and_availability(temp_db):
    service = DoctorService(temp_db)
    doc = service.register_doctor({
        "name": "Gregory House",
        "specialization": "Diagnostics",
        "is_available": True,
        "email": "house@princeton.example",
        "phone": "+1 555-333-4444"
    })

    assert doc.id is not None
    assert doc.name == "Gregory House"
    assert doc.is_available is True
    assert doc.availability_status == "Available"

    # Toggle availability
    updated = service.update_doctor(doc.id, {"is_available": False})
    assert updated.is_available is False
    assert updated.availability_status == "Unavailable"

    # Specialization search
    specs = service.get_specializations()
    assert "Diagnostics" in specs


# =============================================================================
# 3. Appointment Service Tests & Domain Business Rules
# =============================================================================

def test_appointment_booking_success(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    patient = p_svc.create_patient({"name": "Tom Hanks", "age": 60, "gender": "Male", "phone": "+1 555-1111"})
    doctor = d_svc.register_doctor({"name": "Leonard McCoy", "specialization": "General Surgery", "is_available": True})

    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    appt = a_svc.book_appointment({
        "patient_id": patient.id,
        "doctor_id": doctor.id,
        "appointment_date": future_time,
        "duration_minutes": 30,
        "reason": "Routine Checkup"
    })

    assert appt.id is not None
    assert appt.status == Appointment.STATUS_SCHEDULED
    assert appt.is_active is True
    assert appt.patient_name == "Tom Hanks"
    assert appt.doctor_name == "Leonard McCoy"


def test_appointment_nonexistent_patient_or_doctor(temp_db):
    a_svc = AppointmentService(temp_db)
    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

    # Nonexistent patient
    with pytest.raises(NotFoundError):
        a_svc.book_appointment({
            "patient_id": 9999,
            "doctor_id": 1,
            "appointment_date": future_time
        })


def test_appointment_past_date_rejected(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    patient = p_svc.create_patient({"name": "Marty McFly", "age": 18, "gender": "Male", "phone": "+1 555-1985"})
    doctor = d_svc.register_doctor({"name": "Emmett Brown", "specialization": "Temporal Physics", "is_available": True})

    past_time = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
    with pytest.raises(ValidationError) as exc:
        a_svc.book_appointment({
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            "appointment_date": past_time
        })
    assert "future" in str(exc.value).lower()


def test_appointment_with_unavailable_doctor_rejected(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    patient = p_svc.create_patient({"name": "Bruce Wayne", "age": 35, "gender": "Male", "phone": "+1 555-9999"})
    doctor = d_svc.register_doctor({"name": "Harleen Quinzel", "specialization": "Psychiatry", "is_available": False})

    future_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    with pytest.raises(ValidationError) as exc:
        a_svc.book_appointment({
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            "appointment_date": future_time
        })
    assert "unavailable" in str(exc.value).lower()


def test_appointment_conflict_detection(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    p1 = p_svc.create_patient({"name": "Clark Kent", "age": 32, "gender": "Male", "phone": "+1 555-0001"})
    p2 = p_svc.create_patient({"name": "Lois Lane", "age": 31, "gender": "Female", "phone": "+1 555-0002"})
    doc = d_svc.register_doctor({"name": "Stephen Strange", "specialization": "Neurology", "is_available": True})

    # Book slot at day+1 10:00 for 30 minutes (10:00 - 10:30)
    slot1 = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    a_svc.book_appointment({
        "patient_id": p1.id,
        "doctor_id": doc.id,
        "appointment_date": slot1.isoformat(),
        "duration_minutes": 30
    })

    # Try booking overlapping slot at 10:15 (overlaps 10:00 - 10:30)
    slot2 = slot1 + timedelta(minutes=15)
    with pytest.raises(ConflictError) as exc:
        a_svc.book_appointment({
            "patient_id": p2.id,
            "doctor_id": doc.id,
            "appointment_date": slot2.isoformat(),
            "duration_minutes": 30
        })
    assert "existing appointment" in str(exc.value).lower()

    # Booking at 10:30 (immediately following, non-overlapping) should succeed
    slot3 = slot1 + timedelta(minutes=30)
    appt3 = a_svc.book_appointment({
        "patient_id": p2.id,
        "doctor_id": doc.id,
        "appointment_date": slot3.isoformat(),
        "duration_minutes": 30
    })
    assert appt3.id is not None


def test_cancellation_frees_slot_and_prevents_duplicate_cancel(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    p1 = p_svc.create_patient({"name": "Peter Parker", "age": 21, "gender": "Male", "phone": "+1 555-3210"})
    p2 = p_svc.create_patient({"name": "Miles Morales", "age": 17, "gender": "Male", "phone": "+1 555-4321"})
    doc = d_svc.register_doctor({"name": "Curt Connors", "specialization": "Genetics", "is_available": True})

    slot = (datetime.now(timezone.utc) + timedelta(days=2)).replace(hour=14, minute=0, second=0, microsecond=0)
    appt1 = a_svc.book_appointment({
        "patient_id": p1.id,
        "doctor_id": doc.id,
        "appointment_date": slot.isoformat(),
        "duration_minutes": 30
    })

    # Cancel appt1
    cancelled = a_svc.cancel_appointment(appt1.id, reason="Patient unavailable")
    assert cancelled.status == Appointment.STATUS_CANCELLED
    assert cancelled.is_active is False

    # Attempting to cancel again should raise ValidationError
    with pytest.raises(ValidationError) as exc:
        a_svc.cancel_appointment(appt1.id)
    assert "already cancelled" in str(exc.value).lower()

    # Now p2 can book the same slot because appt1 is cancelled!
    appt2 = a_svc.book_appointment({
        "patient_id": p2.id,
        "doctor_id": doc.id,
        "appointment_date": slot.isoformat(),
        "duration_minutes": 30
    })
    assert appt2.id is not None
    assert appt2.status == Appointment.STATUS_SCHEDULED


def test_reschedule_validation_and_conflict(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    p1 = p_svc.create_patient({"name": "Diana Prince", "age": 30, "gender": "Female", "phone": "+1 555-8888"})
    doc = d_svc.register_doctor({"name": "Beverly Crusher", "specialization": "Internal Medicine", "is_available": True})

    orig_slot = (datetime.now(timezone.utc) + timedelta(days=3)).replace(hour=9, minute=0, second=0, microsecond=0)
    appt = a_svc.book_appointment({
        "patient_id": p1.id,
        "doctor_id": doc.id,
        "appointment_date": orig_slot.isoformat(),
        "duration_minutes": 30
    })

    # Reschedule to valid future slot
    new_slot = orig_slot + timedelta(hours=2)
    rescheduled = a_svc.reschedule_appointment(appt.id, new_slot.isoformat(), reason="Doctor requested shift")
    assert rescheduled.status == Appointment.STATUS_RESCHEDULED
    assert rescheduled.appointment_date == new_slot.isoformat()

    # Reschedule to past should fail
    past_slot = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    with pytest.raises(ValidationError):
        a_svc.reschedule_appointment(appt.id, past_slot)


def test_completed_appointment_immutability(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    patient = p_svc.create_patient({"name": "Arthur Dent", "age": 42, "gender": "Male", "phone": "+1 555-4242"})
    doctor = d_svc.register_doctor({"name": "John Watson", "specialization": "General Medicine", "is_available": True})

    slot = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    appt = a_svc.book_appointment({
        "patient_id": patient.id,
        "doctor_id": doctor.id,
        "appointment_date": slot
    })

    # Complete the appointment
    completed = a_svc.complete_appointment(appt.id)
    assert completed.status == Appointment.STATUS_COMPLETED

    # Cannot cancel completed appointment
    with pytest.raises(ValidationError) as exc:
        a_svc.cancel_appointment(appt.id)
    assert "completed" in str(exc.value).lower()

    # Cannot reschedule completed appointment
    with pytest.raises(ValidationError) as exc:
        new_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        a_svc.reschedule_appointment(appt.id, new_time)
    assert "completed" in str(exc.value).lower()


def test_cannot_delete_patient_with_active_appointments(temp_db):
    p_svc = PatientService(temp_db)
    d_svc = DoctorService(temp_db)
    a_svc = AppointmentService(temp_db)

    patient = p_svc.create_patient({"name": "Frodo Baggins", "age": 33, "gender": "Male", "phone": "+1 555-1122"})
    doctor = d_svc.register_doctor({"name": "Elrond Halfelven", "specialization": "Healing", "is_available": True})

    slot = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    a_svc.book_appointment({
        "patient_id": patient.id,
        "doctor_id": doctor.id,
        "appointment_date": slot
    })

    # Patient deletion should be prevented while active appointment exists
    with pytest.raises(ValidationError) as exc:
        p_svc.delete_patient(patient.id)
    assert "active appointment" in str(exc.value).lower()


def test_database_persistence(temp_db):
    """Verify data persists when accessing via a brand new DatabaseManager pointing to same file."""
    db_path = temp_db.db_path
    service1 = PatientService(temp_db)
    created = service1.create_patient({
        "name": "Persistent Record",
        "age": 25,
        "gender": "Other",
        "phone": "+1 555-7777"
    })
    created_id = created.id

    # Create new DatabaseManager instance pointing to the exact same file
    db2 = DatabaseManager(db_path=db_path)
    service2 = PatientService(db2)
    fetched = service2.get_patient_by_id(created_id)
    assert fetched.name == "Persistent Record"
    assert fetched.age == 25
    db2.close()


# =============================================================================
# 4. REST API Endpoint Tests
# =============================================================================

def test_rest_api_full_flow(test_client):
    # 1. Register Patient via API
    p_res = test_client.post("/api/patients", json={
        "name": "Jane Doe",
        "age": 28,
        "gender": "Female",
        "phone": "+1 (555) 123-4567",
        "email": "jane@example.com",
        "medical_notes": "None"
    })
    assert p_res.status_code == 201
    p_data = p_res.get_json()["data"]
    p_id = p_data["id"]

    # 2. Register Doctor via API
    d_res = test_client.post("/api/doctors", json={
        "name": "Stephen Strange",
        "specialization": "Neurology",
        "is_available": True,
        "email": "strange@hospital.example",
        "phone": "+1 (555) 765-4321"
    })
    assert d_res.status_code == 201
    d_data = d_res.get_json()["data"]
    d_id = d_data["id"]

    # 3. Book Appointment via API
    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    a_res = test_client.post("/api/appointments", json={
        "patient_id": p_id,
        "doctor_id": d_id,
        "appointment_date": future_time,
        "duration_minutes": 30,
        "reason": "Consultation"
    })
    assert a_res.status_code == 201
    a_data = a_res.get_json()["data"]
    a_id = a_data["id"]

    # 4. Reschedule Appointment via API
    reschedule_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    resched_res = test_client.put(f"/api/appointments/{a_id}/reschedule", json={
        "appointment_date": reschedule_time,
        "reason": "Moved to next day"
    })
    assert resched_res.status_code == 200
    assert resched_res.get_json()["data"]["status"] == "RESCHEDULED"

    # 5. Complete Appointment via API
    comp_res = test_client.patch(f"/api/appointments/{a_id}/complete")
    assert comp_res.status_code == 200
    assert comp_res.get_json()["data"]["status"] == "COMPLETED"

    # 6. Dashboard Stats API
    dash_res = test_client.get("/api/dashboard/stats")
    assert dash_res.status_code == 200
    stats = dash_res.get_json()["data"]
    assert stats["total_patients"] >= 1
    assert stats["total_doctors"] >= 1
    assert stats["total_appointments"] >= 1
    assert stats["status_counts"]["COMPLETED"] >= 1
