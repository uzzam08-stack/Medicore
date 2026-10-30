import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  CalendarDays
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatDate, formatTime } from '../utils/formatters';

export function AppointmentDetail({ 
  appointmentId, 
  onBack, 
  onSelectPatient,
  onOpenRescheduleModal, 
  onOpenCancelDialog, 
  onCompleteAppointment,
  onNotify 
}) {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAppointmentById(appointmentId);
      if (res.success) {
        setAppointment(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve appointment case file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentData();
    }
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <RefreshCw className="spin-icon text-brand-primary" size={32} />
          <p>Retrieving appointment file...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="page-container">
        <div className="error-state">
          <AlertCircle size={32} className="text-danger" />
          <h3>Unable to load appointment</h3>
          <p>{error || 'Appointment record not found'}</p>
          <button type="button" className="btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to Appointments</span>
          </button>
        </div>
      </div>
    );
  }

  const canModify = appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED';

  return (
    <div className="page-container animate-fade-in">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          className="btn-back"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          <span>Back to Appointments</span>
        </button>

        {canModify && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => onCompleteAppointment(appointment.id)}
            >
              <CheckCircle size={16} />
              <span>Mark as Completed</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onOpenRescheduleModal(appointment)}
            >
              <CalendarDays size={16} />
              <span>Reschedule</span>
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => onOpenCancelDialog(appointment)}
            >
              <AlertCircle size={16} />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Appointment Case File Card */}
      <div className="panel-card mb-6">
        <div className="panel-header border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Appointment Case #{appointment.id}
              </h2>
              <StatusBadge status={appointment.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Created on {formatDateTime(appointment.created_at)} • Last updated {formatDateTime(appointment.updated_at)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Patient Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User size={18} className="text-brand-primary" />
                <h3 className="font-semibold text-slate-900">Patient Information</h3>
              </div>
              <button
                type="button"
                className="text-xs text-brand-primary font-medium hover:underline"
                onClick={() => onSelectPatient(appointment.patient_id)}
              >
                View Full Patient File &gt;
              </button>
            </div>
            <div className="space-y-1.5 text-sm text-slate-700">
              <p><strong>Name:</strong> {appointment.patient_name}</p>
              <p><strong>Patient ID:</strong> #{appointment.patient_id}</p>
            </div>
          </div>

          {/* Doctor Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope size={18} className="text-brand-primary" />
              <h3 className="font-semibold text-slate-900">Assigned Physician</h3>
            </div>
            <div className="space-y-1.5 text-sm text-slate-700">
              <p><strong>Doctor:</strong> Dr. {appointment.doctor_name}</p>
              <p><strong>Department / Specialization:</strong> {appointment.doctor_specialization}</p>
              <p><strong>Doctor ID:</strong> #{appointment.doctor_id}</p>
            </div>
          </div>
        </div>

        {/* Timing and Reason Details */}
        <div className="mt-6 border-t border-slate-100 pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 font-medium block">Scheduled Date</span>
              <span className="text-base font-semibold text-slate-900">
                {formatDate(appointment.appointment_date)}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 font-medium block">Appointment Time</span>
              <span className="text-base font-semibold text-slate-900">
                {formatTime(appointment.appointment_date)}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 font-medium block">Allocated Duration</span>
              <span className="text-base font-semibold text-slate-900">
                {appointment.duration_minutes || 30} minutes
              </span>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Reason for Visit & Clinical Details
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {appointment.reason || 'Standard clinical consultation. No specialized symptoms recorded.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppointmentDetail;
