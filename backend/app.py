"""
Flask REST API for MediCore Patient & Doctor Management System.

Features:
- Application factory pattern (create_app) supporting test isolation
- Centralized error handlers for ValidationError, NotFoundError, and ConflictError
- Configurable Flask-CORS security
- Standardized REST response structures
"""

import os
import sys
from typing import Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseManager
from models import ValidationError
from services import (
    PatientService,
    DoctorService,
    AppointmentService,
    DashboardService,
    NotFoundError,
    ConflictError
)

load_dotenv()


def create_app(db_path: Optional[str] = None) -> Flask:
    """Create and configure the Flask REST API application."""
    app = Flask(__name__)

    # Configurable CORS
    allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    # Database and Services Initialization
    db_manager = DatabaseManager(db_path=db_path)
    patient_service = PatientService(db_manager)
    doctor_service = DoctorService(db_manager)
    appointment_service = AppointmentService(db_manager)
    dashboard_service = DashboardService(db_manager)

    # Attach instances to app context for testing/inspection
    app.db_manager = db_manager
    app.patient_service = patient_service
    app.doctor_service = doctor_service
    app.appointment_service = appointment_service
    app.dashboard_service = dashboard_service

    # =========================================================================
    # Error Handlers
    # =========================================================================

    @app.errorhandler(ValidationError)
    def handle_validation_error(e: ValidationError):
        response = {"success": False, "error": e.message}
        if e.field:
            response["field"] = e.field
        return jsonify(response), 400

    @app.errorhandler(NotFoundError)
    def handle_not_found_error(e: NotFoundError):
        return jsonify({"success": False, "error": str(e)}), 404

    @app.errorhandler(ConflictError)
    def handle_conflict_error(e: ConflictError):
        return jsonify({"success": False, "error": str(e)}), 409

    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({"success": False, "error": "Bad Request. Please verify your payload."}), 400

    @app.errorhandler(404)
    def handle_generic_not_found(e):
        return jsonify({"success": False, "error": "Requested resource was not found."}), 404

    @app.errorhandler(Exception)
    def handle_internal_error(e: Exception):
        # Do not expose internal server tracebacks in responses
        return jsonify({
            "success": False,
            "error": "An internal server error occurred. Please try again later."
        }), 500

    # =========================================================================
    # Health Check
    # =========================================================================

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "success": True,
            "status": "healthy",
            "service": "MediCore REST API",
            "version": "1.0.0"
        }), 200

    # =========================================================================
    # Patient Endpoints
    # =========================================================================

    @app.route("/api/patients", methods=["GET"])
    def get_patients():
        search = request.args.get("search", "")
        patients = patient_service.get_all_patients(search=search)
        return jsonify({
            "success": True,
            "count": len(patients),
            "data": [p.to_dict() for p in patients]
        }), 200

    @app.route("/api/patients/<int:patient_id>", methods=["GET"])
    def get_patient(patient_id: int):
        patient = patient_service.get_patient_by_id(patient_id)
        # Also include patient's appointment history
        appointments = appointment_service.get_all_appointments(patient_id=patient_id)
        data = patient.to_dict()
        data["appointments"] = [a.to_dict() for a in appointments]
        return jsonify({"success": True, "data": data}), 200

    @app.route("/api/patients", methods=["POST"])
    def create_patient():
        payload = request.get_json()
        if not payload or not isinstance(payload, dict):
            raise ValidationError("JSON body is required.")
        patient = patient_service.create_patient(payload)
        return jsonify({"success": True, "data": patient.to_dict(), "message": "Patient created successfully."}), 201

    @app.route("/api/patients/<int:patient_id>", methods=["PUT"])
    def update_patient(patient_id: int):
        payload = request.get_json()
        if not payload or not isinstance(payload, dict):
            raise ValidationError("JSON body is required.")
        patient = patient_service.update_patient(patient_id, payload)
        return jsonify({"success": True, "data": patient.to_dict(), "message": "Patient updated successfully."}), 200

    @app.route("/api/patients/<int:patient_id>", methods=["DELETE"])
    def delete_patient(patient_id: int):
        patient_service.delete_patient(patient_id)
        return jsonify({"success": True, "message": f"Patient #{patient_id} deleted successfully."}), 200

    # =========================================================================
    # Doctor Endpoints
    # =========================================================================

    @app.route("/api/doctors", methods=["GET"])
    def get_doctors():
        search = request.args.get("search")
        specialization = request.args.get("specialization")
        available_param = request.args.get("available")
        available_only = None
        if available_param is not None:
            available_only = available_param.lower() in ("true", "1", "yes")

        doctors = doctor_service.get_all_doctors(
            search=search,
            specialization=specialization,
            available_only=available_only
        )
        return jsonify({
            "success": True,
            "count": len(doctors),
            "data": [d.to_dict() for d in doctors]
        }), 200

    @app.route("/api/doctors/<int:doctor_id>", methods=["GET"])
    def get_doctor(doctor_id: int):
        doctor = doctor_service.get_doctor_by_id(doctor_id)
        appointments = appointment_service.get_all_appointments(doctor_id=doctor_id)
        data = doctor.to_dict()
        data["appointments"] = [a.to_dict() for a in appointments]
        return jsonify({"success": True, "data": data}), 200

    @app.route("/api/doctors", methods=["POST"])
    def register_doctor():
        payload = request.get_json()
        if not payload or not isinstance(payload, dict):
            raise ValidationError("JSON body is required.")
        doctor = doctor_service.register_doctor(payload)
        return jsonify({"success": True, "data": doctor.to_dict(), "message": "Doctor registered successfully."}), 201

    @app.route("/api/doctors/<int:doctor_id>", methods=["PUT"])
    def update_doctor(doctor_id: int):
        payload = request.get_json()
        if not payload or not isinstance(payload, dict):
            raise ValidationError("JSON body is required.")
        doctor = doctor_service.update_doctor(doctor_id, payload)
        return jsonify({"success": True, "data": doctor.to_dict(), "message": "Doctor updated successfully."}), 200

    @app.route("/api/doctors/specializations", methods=["GET"])
    def get_specializations():
        specializations = doctor_service.get_specializations()
        return jsonify({"success": True, "data": specializations}), 200

    # =========================================================================
    # Appointment Endpoints
    # =========================================================================

    @app.route("/api/appointments", methods=["GET"])
    def get_appointments():
        patient_id = request.args.get("patient_id")
        doctor_id = request.args.get("doctor_id")
        date = request.args.get("date")
        status = request.args.get("status")

        appointments = appointment_service.get_all_appointments(
            patient_id=int(patient_id) if patient_id and patient_id.isdigit() else None,
            doctor_id=int(doctor_id) if doctor_id and doctor_id.isdigit() else None,
            date=date,
            status=status
        )
        return jsonify({
            "success": True,
            "count": len(appointments),
            "data": [a.to_dict() for a in appointments]
        }), 200

    @app.route("/api/appointments/<int:appointment_id>", methods=["GET"])
    def get_appointment(appointment_id: int):
        appointment = appointment_service.get_appointment_by_id(appointment_id)
        return jsonify({"success": True, "data": appointment.to_dict()}), 200

    @app.route("/api/appointments", methods=["POST"])
    def book_appointment():
        payload = request.get_json()
        if not payload or not isinstance(payload, dict):
            raise ValidationError("JSON body is required.")
        appointment = appointment_service.book_appointment(payload)
        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment booked successfully."}), 201

    @app.route("/api/appointments/<int:appointment_id>/reschedule", methods=["PUT"])
    def reschedule_appointment(appointment_id: int):
        payload = request.get_json() or {}
        new_datetime = payload.get("appointment_date")
        reason = payload.get("reason")
        if not new_datetime:
            raise ValidationError("New appointment_date is required.", field="appointment_date")

        appointment = appointment_service.reschedule_appointment(
            appointment_id=appointment_id,
            new_datetime_str=new_datetime,
            reason=reason
        )
        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment rescheduled successfully."}), 200

    @app.route("/api/appointments/<int:appointment_id>/cancel", methods=["PATCH"])
    def cancel_appointment(appointment_id: int):
        payload = request.get_json() or {}
        reason = payload.get("reason")
        appointment = appointment_service.cancel_appointment(appointment_id, reason=reason)
        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment cancelled successfully."}), 200

    @app.route("/api/appointments/<int:appointment_id>/complete", methods=["PATCH"])
    def complete_appointment(appointment_id: int):
        appointment = appointment_service.complete_appointment(appointment_id)
        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment marked as completed."}), 200

    # =========================================================================
    # Dashboard Statistics Endpoint
    # =========================================================================

    @app.route("/api/dashboard/stats", methods=["GET"])
    def get_dashboard_stats():
        stats = dashboard_service.get_dashboard_stats()
        return jsonify({"success": True, "data": stats}), 200

    return app


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5050))
    application = create_app()
    print(f"Starting MediCore REST API server on port {port}...")
    application.run(host="0.0.0.0", port=port, debug=False)

