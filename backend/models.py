"""
OOP Domain Models for MediCore Patient & Doctor Management System.

Demonstrates Object-Oriented Programming principles:
- Abstraction: BaseEntity defines common properties and contracts.
- Encapsulation: State is protected and mutated only through validating methods.
- Inheritance: Patient, Doctor, and Appointment extend BaseEntity.
- Polymorphism: Standardized validate() and to_dict() implementations.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import re
from typing import Dict, Any, Optional


class ValidationError(Exception):
    """Raised when domain entity validation fails."""
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.field = field

    def to_dict(self) -> Dict[str, Any]:
        result = {"error": self.message}
        if self.field:
            result["field"] = self.field
        return result


class BaseEntity(ABC):
    """
    Abstract Base Class for domain entities.
    Encapsulates identifiers and auditing timestamps.
    """
    def __init__(
        self,
        id: Optional[int] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        self._id = id
        now_iso = datetime.now(timezone.utc).isoformat()
        self._created_at = created_at or now_iso
        self._updated_at = updated_at or now_iso

    @property
    def id(self) -> Optional[int]:
        return self._id

    @id.setter
    def id(self, value: int):
        if self._id is not None and self._id != value:
            raise ValueError("Entity ID is immutable once set.")
        self._id = int(value)

    @property
    def created_at(self) -> str:
        return self._created_at

    @property
    def updated_at(self) -> str:
        return self._updated_at

    def mark_updated(self) -> None:
        """Update the modification timestamp."""
        self._updated_at = datetime.now(timezone.utc).isoformat()

    @abstractmethod
    def validate(self) -> None:
        """Validate internal state according to business invariants."""
        pass

    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Serialize entity to dictionary format."""
        pass


class Patient(BaseEntity):
    """
    Patient domain model.
    Encapsulates patient demographics, contact details, and validation logic.
    """
    VALID_GENDERS = {"Male", "Female", "Other", "Non-Binary", "Prefer not to say"}

    def __init__(
        self,
        name: str,
        age: int,
        gender: str,
        phone: str,
        id: Optional[int] = None,
        email: Optional[str] = None,
        medical_notes: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        super().__init__(id=id, created_at=created_at, updated_at=updated_at)
        self._name = name.strip() if isinstance(name, str) else name
        self._age = age
        self._gender = gender.strip().capitalize() if isinstance(gender, str) else gender
        self._phone = phone.strip() if isinstance(phone, str) else phone
        self._email = email.strip() if isinstance(email, str) and email.strip() else None
        self._medical_notes = medical_notes.strip() if isinstance(medical_notes, str) else (medical_notes or "")

    # Property Getters
    @property
    def name(self) -> str:
        return self._name

    @property
    def age(self) -> int:
        return self._age

    @property
    def gender(self) -> str:
        return self._gender

    @property
    def phone(self) -> str:
        return self._phone

    @property
    def email(self) -> Optional[str]:
        return self._email

    @property
    def medical_notes(self) -> str:
        return self._medical_notes

    def validate(self) -> None:
        """
        Validate patient properties:
        - name: required, non-empty string, length 2-100
        - age: non-negative integer between 0 and 130
        - gender: required valid category
        - phone: at least 7 digits, allowed telephone format
        """
        if not self._name or not isinstance(self._name, str) or len(self._name.strip()) < 2:
            raise ValidationError("Patient name must be at least 2 characters long.", field="name")
        if len(self._name) > 100:
            raise ValidationError("Patient name cannot exceed 100 characters.", field="name")

        try:
            age_val = int(self._age)
        except (ValueError, TypeError):
            raise ValidationError("Patient age must be an integer.", field="age")

        if age_val < 0 or age_val > 130:
            raise ValidationError("Patient age must be between 0 and 130.", field="age")
        self._age = age_val

        # Normalize gender check
        matched_gender = None
        for g in self.VALID_GENDERS:
            if str(self._gender).lower() == g.lower():
                matched_gender = g
                break
        if not matched_gender:
            raise ValidationError(
                f"Invalid gender '{self._gender}'. Allowed values: {', '.join(sorted(self.VALID_GENDERS))}.",
                field="gender"
            )
        self._gender = matched_gender

        if not self._phone or not isinstance(self._phone, str):
            raise ValidationError("Phone number is required.", field="phone")
        
        # Phone validation: must contain at least 7 digits, only standard chars
        digits_only = re.sub(r"\D", "", self._phone)
        if len(digits_only) < 7 or len(digits_only) > 15:
            raise ValidationError("Phone number must contain between 7 and 15 digits.", field="phone")
        if not re.match(r"^[\+]?[0-9\s\-\(\)\.]+$", self._phone):
            raise ValidationError("Phone number contains invalid characters.", field="phone")

        if self._email:
            email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
            if not re.match(email_regex, self._email):
                raise ValidationError("Invalid email address format.", field="email")

    def update_details(
        self,
        name: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        medical_notes: Optional[str] = None
    ) -> None:
        """
        Safely update patient details with instant validation and update timestamp.
        """
        if name is not None:
            self._name = name.strip() if isinstance(name, str) else name
        if age is not None:
            self._age = age
        if gender is not None:
            self._gender = gender.strip() if isinstance(gender, str) else gender
        if phone is not None:
            self._phone = phone.strip() if isinstance(phone, str) else phone
        if email is not None:
            self._email = email.strip() if isinstance(email, str) and email.strip() else None
        if medical_notes is not None:
            self._medical_notes = medical_notes.strip() if isinstance(medical_notes, str) else medical_notes

        self.validate()
        self.mark_updated()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "name": self._name,
            "age": self._age,
            "gender": self._gender,
            "phone": self._phone,
            "email": self._email,
            "medical_notes": self._medical_notes,
            "created_at": self._created_at,
            "updated_at": self._updated_at
        }


class Doctor(BaseEntity):
    """
    Doctor domain model.
    Encapsulates doctor qualifications, specialization, and availability status.
    """
    def __init__(
        self,
        name: str,
        specialization: str,
        id: Optional[int] = None,
        is_available: bool = True,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        super().__init__(id=id, created_at=created_at, updated_at=updated_at)
        self._name = name.strip() if isinstance(name, str) else name
        self._specialization = specialization.strip() if isinstance(specialization, str) else specialization
        self._is_available = bool(is_available)
        self._email = email.strip() if isinstance(email, str) and email.strip() else None
        self._phone = phone.strip() if isinstance(phone, str) and phone.strip() else None

    @property
    def name(self) -> str:
        return self._name

    @property
    def specialization(self) -> str:
        return self._specialization

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def availability_status(self) -> str:
        return "Available" if self._is_available else "Unavailable"

    @property
    def email(self) -> Optional[str]:
        return self._email

    @property
    def phone(self) -> Optional[str]:
        return self._phone

    def validate(self) -> None:
        """
        Validate doctor properties:
        - name: required, length 2-100
        - specialization: required, length 2-100
        - availability: boolean
        """
        if not self._name or not isinstance(self._name, str) or len(self._name.strip()) < 2:
            raise ValidationError("Doctor name must be at least 2 characters long.", field="name")
        if len(self._name) > 100:
            raise ValidationError("Doctor name cannot exceed 100 characters.", field="name")

        if not self._specialization or not isinstance(self._specialization, str) or len(self._specialization.strip()) < 2:
            raise ValidationError("Specialization is required.", field="specialization")
        if len(self._specialization) > 100:
            raise ValidationError("Specialization cannot exceed 100 characters.", field="specialization")

        if self._email:
            email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
            if not re.match(email_regex, self._email):
                raise ValidationError("Invalid email address format.", field="email")

        if self._phone:
            digits_only = re.sub(r"\D", "", self._phone)
            if len(digits_only) < 7 or len(digits_only) > 15:
                raise ValidationError("Doctor phone number must contain between 7 and 15 digits.", field="phone")

    def update_details(
        self,
        name: Optional[str] = None,
        specialization: Optional[str] = None,
        is_available: Optional[bool] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None
    ) -> None:
        """Safely update doctor details."""
        if name is not None:
            self._name = name.strip() if isinstance(name, str) else name
        if specialization is not None:
            self._specialization = specialization.strip() if isinstance(specialization, str) else specialization
        if is_available is not None:
            self._is_available = bool(is_available)
        if email is not None:
            self._email = email.strip() if isinstance(email, str) and email.strip() else None
        if phone is not None:
            self._phone = phone.strip() if isinstance(phone, str) and phone.strip() else None

        self.validate()
        self.mark_updated()

    def set_availability(self, available: bool) -> None:
        """Explicitly change availability status."""
        self._is_available = bool(available)
        self.mark_updated()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "name": self._name,
            "specialization": self._specialization,
            "is_available": self._is_available,
            "availability_status": self.availability_status,
            "email": self._email,
            "phone": self._phone,
            "created_at": self._created_at,
            "updated_at": self._updated_at
        }


class Appointment(BaseEntity):
    """
    Appointment domain model.
    Encapsulates booking details, status workflow, and lifecycle state transitions.
    """
    STATUS_SCHEDULED = "SCHEDULED"
    STATUS_RESCHEDULED = "RESCHEDULED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CANCELLED = "CANCELLED"

    VALID_STATUSES = {
        STATUS_SCHEDULED,
        STATUS_RESCHEDULED,
        STATUS_COMPLETED,
        STATUS_CANCELLED
    }

    def __init__(
        self,
        patient_id: int,
        doctor_id: int,
        appointment_date: str,
        id: Optional[int] = None,
        status: str = STATUS_SCHEDULED,
        reason: Optional[str] = None,
        duration_minutes: int = 30,
        patient_name: Optional[str] = None,
        doctor_name: Optional[str] = None,
        doctor_specialization: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        super().__init__(id=id, created_at=created_at, updated_at=updated_at)
        self._patient_id = int(patient_id)
        self._doctor_id = int(doctor_id)
        self._appointment_date = appointment_date.strip() if isinstance(appointment_date, str) else appointment_date
        self._status = status.upper().strip() if isinstance(status, str) else self.STATUS_SCHEDULED
        self._reason = reason.strip() if isinstance(reason, str) else (reason or "")
        self._duration_minutes = int(duration_minutes) if duration_minutes else 30
        
        # Denormalized presentation metadata
        self._patient_name = patient_name
        self._doctor_name = doctor_name
        self._doctor_specialization = doctor_specialization

    @property
    def patient_id(self) -> int:
        return self._patient_id

    @property
    def doctor_id(self) -> int:
        return self._doctor_id

    @property
    def appointment_date(self) -> str:
        return self._appointment_date

    @property
    def status(self) -> str:
        return self._status

    @property
    def reason(self) -> str:
        return self._reason

    @property
    def duration_minutes(self) -> int:
        return self._duration_minutes

    @property
    def patient_name(self) -> Optional[str]:
        return self._patient_name

    @property
    def doctor_name(self) -> Optional[str]:
        return self._doctor_name

    @property
    def doctor_specialization(self) -> Optional[str]:
        return self._doctor_specialization

    @property
    def is_active(self) -> bool:
        """Active appointments occupy doctor calendar slots."""
        return self._status in {self.STATUS_SCHEDULED, self.STATUS_RESCHEDULED}

    def validate(self) -> None:
        """
        Validate appointment integrity:
        - patient_id and doctor_id must be positive integers
        - appointment_date must parse as valid ISO datetime
        - status must be one of the recognized constants
        - duration must be positive
        """
        if not self._patient_id or self._patient_id <= 0:
            raise ValidationError("Valid patient ID is required.", field="patient_id")
        if not self._doctor_id or self._doctor_id <= 0:
            raise ValidationError("Valid doctor ID is required.", field="doctor_id")

        if self._status not in self.VALID_STATUSES:
            raise ValidationError(
                f"Invalid status '{self._status}'. Valid: {', '.join(sorted(self.VALID_STATUSES))}.",
                field="status"
            )

        if not self._appointment_date:
            raise ValidationError("Appointment date and time are required.", field="appointment_date")

        # Parse date
        try:
            parsed = self.get_parsed_datetime()
        except Exception:
            raise ValidationError(
                "Appointment date must be a valid ISO format (e.g., YYYY-MM-DDTHH:MM:SS).",
                field="appointment_date"
            )

        if self._duration_minutes <= 0 or self._duration_minutes > 480:
            raise ValidationError("Duration must be between 1 and 480 minutes.", field="duration_minutes")

    def get_parsed_datetime(self) -> datetime:
        """Parse appointment_date string into a datetime object."""
        date_str = str(self._appointment_date)
        # Handle trailing Z or timezone offsets
        if date_str.endswith("Z"):
            date_str = date_str[:-1] + "+00:00"
        return datetime.fromisoformat(date_str)

    def cancel(self, reason: Optional[str] = None) -> None:
        """
        Cancel the appointment.
        Business rule: Completed or already cancelled appointments cannot be cancelled.
        """
        if self._status == self.STATUS_COMPLETED:
            raise ValidationError("Completed appointments cannot be cancelled.")
        if self._status == self.STATUS_CANCELLED:
            raise ValidationError("Appointment is already cancelled.")

        self._status = self.STATUS_CANCELLED
        if reason:
            self._reason = f"{self._reason} [Cancelled: {reason.strip()}]".strip()
        self.mark_updated()

    def reschedule(self, new_date_time: str, reason: Optional[str] = None) -> None:
        """
        Reschedule the appointment to a new date/time.
        Business rule: Completed or cancelled appointments cannot be rescheduled.
        """
        if self._status == self.STATUS_COMPLETED:
            raise ValidationError("Completed appointments cannot be rescheduled.")
        if self._status == self.STATUS_CANCELLED:
            raise ValidationError("Cancelled appointments cannot be rescheduled. Please book a new appointment.")

        old_date = self._appointment_date
        self._appointment_date = new_date_time.strip()
        self._status = self.STATUS_RESCHEDULED
        if reason:
            self._reason = f"{self._reason} [Rescheduled from {old_date}: {reason.strip()}]".strip()
        
        self.validate()
        self.mark_updated()

    def complete(self) -> None:
        """
        Mark appointment as completed.
        Business rule: Cancelled appointments cannot be completed.
        """
        if self._status == self.STATUS_CANCELLED:
            raise ValidationError("Cannot complete a cancelled appointment.")
        if self._status == self.STATUS_COMPLETED:
            return  # Idempotent

        self._status = self.STATUS_COMPLETED
        self.mark_updated()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "patient_id": self._patient_id,
            "doctor_id": self._doctor_id,
            "appointment_date": self._appointment_date,
            "status": self._status,
            "reason": self._reason,
            "duration_minutes": self._duration_minutes,
            "patient_name": self._patient_name,
            "doctor_name": self._doctor_name,
            "doctor_specialization": self._doctor_specialization,
            "is_active": self.is_active,
            "created_at": self._created_at,
            "updated_at": self._updated_at
        }
