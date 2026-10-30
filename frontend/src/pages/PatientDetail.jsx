import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CalendarPlus, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  AlertCircle, 
  RefreshCw,
  Clock,
  User,
  CheckCircle,
  CalendarDays
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatDate, getInitials } from '../utils/formatters';

export function PatientDetail({ 
  patientId, 
  onBack, 
  onOpenBookModal, 
  onOpenRescheduleModal, 
  onOpenCancelDialog, 
  onCompleteAppointment,
  onNotify 
}) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPatientById(patientId);
      if (res.success) {
        setPatient(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve patient file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <RefreshCw className="spin-icon text-brand-primary" size={32} />
          <p>Loading patient clinical file...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="page-container">
        <div className="error-state">
          <AlertCircle size={32} className="text-danger" />
          <h3>Unable to load patient</h3>
          <p>{error || 'Patient not found'}</p>
          <button type="button" className="btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to Patients</span>
          </button>
        </div>
      </div>
    );
  }

  const appointments = patient.appointments || [];
  const upcomingAppts = appointments.filter(
    (a) => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED'
  );
  const pastAppts = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'CANCELLED'
  );

  return (
    <div className="page-container animate-fade-in">
      {/* Back button & Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          className="btn-back"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          <span>Back to Patient Directory</span>
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={() => onOpenBookModal({ defaultPatientId: patient.id })}
        >
          <CalendarPlus size={16} />
          <span>Book Appointment for {patient.name.split(' ')[0]}</span>
        </button>
      </div>

      {/* Patient Dossier Header Card */}
      <div className="patient-dossier-card">
        <div className="dossier-header">
          <div className="flex items-center gap-4">
            <div className="dossier-avatar">
              {getInitials(patient.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="dossier-name">{patient.name}</h2>
                <span className="patient-id-tag">Patient ID #{patient.id}</span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {patient.age} years old • {patient.gender} • Registered {formatDate(patient.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="dossier-grid">
          <div className="dossier-item">
            <span className="dossier-label">Phone Contact</span>
            <div className="flex items-center gap-2 mt-1">
              <Phone size={14} className="text-brand-primary" />
              <span className="dossier-value">{patient.phone}</span>
            </div>
          </div>

          <div className="dossier-item">
            <span className="dossier-label">Email Address</span>
            <div className="flex items-center gap-2 mt-1">
              <Mail size={14} className="text-brand-primary" />
              <span className="dossier-value">{patient.email || 'Not provided'}</span>
            </div>
          </div>

          <div className="dossier-item">
            <span className="dossier-label">Total Appointments</span>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={14} className="text-brand-primary" />
              <span className="dossier-value font-semibold">
                {appointments.length} record{appointments.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="dossier-item col-span-3">
            <span className="dossier-label">Clinical / Medical Notes</span>
            <div className="medical-notes-box">
              <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700 leading-relaxed">
                {patient.medical_notes || 'No medical alerts or allergies noted on file.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Appointments History */}
      <div className="space-y-6">
        {/* Active & Upcoming Appointments */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Active & Upcoming Appointments</h3>
              <p className="panel-subtitle">Scheduled future consultations for this patient</p>
            </div>
            <span className="badge-count">{upcomingAppts.length} active</span>
          </div>

          {upcomingAppts.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppts.map((appt) => (
                    <tr key={appt.id} className="hover-row">
                      <td className="font-semibold text-slate-900">
                        {formatDateTime(appt.appointment_date)}
                      </td>
                      <td>Dr. {appt.doctor_name}</td>
                      <td>
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {appt.doctor_specialization}
                        </span>
                      </td>
                      <td className="text-sm text-slate-600 max-w-xs truncate">
                        {appt.reason || 'General Follow-up'}
                      </td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="text-right">
                        <div className="table-action-group justify-end">
                          <button
                            type="button"
                            className="action-btn text-emerald hover:text-emerald-700"
                            title="Complete Consultation"
                            onClick={() => onCompleteAppointment(appt.id)}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            type="button"
                            className="action-btn text-purple hover:text-purple-700"
                            title="Reschedule Appointment"
                            onClick={() => onOpenRescheduleModal(appt)}
                          >
                            <CalendarDays size={16} />
                          </button>
                          <button
                            type="button"
                            className="action-btn text-rose hover:text-rose-700"
                            title="Cancel Appointment"
                            onClick={() => onOpenCancelDialog(appt)}
                          >
                            <AlertCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-empty-state py-8">
              <Calendar size={32} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-600">No active or upcoming appointments scheduled</p>
            </div>
          )}
        </div>

        {/* Past Consultation History */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Past Consultation History</h3>
              <p className="panel-subtitle">Concluded and cancelled medical appointments</p>
            </div>
            <span className="badge-count text-muted">{pastAppts.length} historical</span>
          </div>

          {pastAppts.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Reason / Details</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {pastAppts.map((appt) => (
                    <tr key={appt.id} className="hover-row">
                      <td className="text-slate-700">
                        {formatDateTime(appt.appointment_date)}
                      </td>
                      <td>Dr. {appt.doctor_name}</td>
                      <td>
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {appt.doctor_specialization}
                        </span>
                      </td>
                      <td className="text-sm text-slate-600">
                        {appt.reason || '—'}
                      </td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-empty-state py-6">
              <p className="text-xs text-slate-500">No past medical history on file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDetail;
