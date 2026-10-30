import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  CalendarPlus, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  X,
  User,
  Stethoscope,
  Info
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDateTime, toDatetimeLocalInput } from '../utils/formatters';

export function Appointments({ 
  onSelectAppointment, 
  onSelectPatient,
  onNotify, 
  isBookModalOpen, 
  setIsBookModalOpen,
  initialBookingData = {}
}) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');

  // Reschedule & Cancel Modal States
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [currentAppt, setCurrentAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Book Appointment Form State
  const [bookForm, setBookForm] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: toDatetimeLocalInput(),
    duration_minutes: 30,
    reason: '',
  });
  const [bookErrors, setBookErrors] = useState({});

  const fetchDropdownData = async () => {
    try {
      const [patRes, docRes] = await Promise.all([
        api.getPatients(),
        api.getDoctors(),
      ]);
      if (patRes.success) setPatients(patRes.data);
      if (docRes.success) setDoctors(docRes.data);
    } catch (e) {
      console.error('Error fetching dropdown references:', e);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAppointments({
        date: filterDate,
        status: filterStatus,
        doctor_id: filterDoctor || null,
      });
      if (res.success) {
        setAppointments(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, filterStatus, filterDoctor]);

  // Handle prefilled patient or doctor if triggered from external page
  useEffect(() => {
    if (initialBookingData.defaultPatientId) {
      setBookForm((prev) => ({ ...prev, patient_id: String(initialBookingData.defaultPatientId) }));
    }
    if (initialBookingData.defaultDoctorId) {
      setBookForm((prev) => ({ ...prev, doctor_id: String(initialBookingData.defaultDoctorId) }));
    }
  }, [initialBookingData]);

  const handleOpenBookModal = () => {
    setBookForm({
      patient_id: initialBookingData.defaultPatientId ? String(initialBookingData.defaultPatientId) : '',
      doctor_id: initialBookingData.defaultDoctorId ? String(initialBookingData.defaultDoctorId) : '',
      appointment_date: toDatetimeLocalInput(),
      duration_minutes: 30,
      reason: '',
    });
    setBookErrors({});
    setIsBookModalOpen(true);
  };

  const handleOpenReschedule = (appt) => {
    setCurrentAppt(appt);
    setRescheduleDate(toDatetimeLocalInput(appt.appointment_date));
    setIsRescheduleOpen(true);
  };

  const handleOpenCancel = (appt) => {
    setCurrentAppt(appt);
    setCancelReason('');
    setIsCancelOpen(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!bookForm.patient_id) errors.patient_id = 'Please select a patient.';
    if (!bookForm.doctor_id) errors.doctor_id = 'Please select a doctor.';
    if (!bookForm.appointment_date) errors.appointment_date = 'Please choose appointment date & time.';

    // Check future date
    const selectedTime = new Date(bookForm.appointment_date);
    if (selectedTime <= new Date()) {
      errors.appointment_date = 'Appointments must be scheduled for a future time.';
    }

    if (Object.keys(errors).length > 0) {
      setBookErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.bookAppointment({
        patient_id: parseInt(bookForm.patient_id, 10),
        doctor_id: parseInt(bookForm.doctor_id, 10),
        appointment_date: new Date(bookForm.appointment_date).toISOString(),
        duration_minutes: parseInt(bookForm.duration_minutes, 10),
        reason: bookForm.reason,
      });

      if (res.success) {
        onNotify('success', 'Appointment booked successfully.');
        setIsBookModalOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to book appointment.');
      if (err.field) {
        setBookErrors((prev) => ({ ...prev, [err.field]: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleDate) return;

    const selectedTime = new Date(rescheduleDate);
    if (selectedTime <= new Date()) {
      onNotify('error', 'New appointment time must be in the future.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.rescheduleAppointment(currentAppt.id, {
        appointment_date: selectedTime.toISOString(),
        reason: 'Rescheduled via portal',
      });
      if (res.success) {
        onNotify('success', 'Appointment rescheduled successfully.');
        setIsRescheduleOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to reschedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!currentAppt) return;
    try {
      setIsSubmitting(true);
      const res = await api.cancelAppointment(currentAppt.id, {
        reason: cancelReason || 'Cancelled by administrative staff',
      });
      if (res.success) {
        onNotify('success', 'Appointment cancelled successfully. Slot has been freed.');
        setIsCancelOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to cancel appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (apptId) => {
    try {
      const res = await api.completeAppointment(apptId);
      if (res.success) {
        onNotify('success', 'Appointment marked as completed.');
        fetchAppointments();
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to complete appointment.');
    }
  };

  // Get current minimum datetime-local attribute string
  const minDateTime = toDatetimeLocalInput(new Date());

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2 className="section-title">Appointments & Consultations</h2>
          <p className="section-subtitle">Real-time schedule coordination, collision prevention, and state lifecycle management</p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenBookModal}
        >
          <CalendarPlus size={18} />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Status Filter */}
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Doctor Filter */}
          <select
            className="filter-select"
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
          >
            <option value="">All Doctors</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.name} ({doc.specialization})
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="filter-date-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <button
                type="button"
                className="action-btn text-slate-400 hover:text-slate-600"
                onClick={() => setFilterDate('')}
                title="Clear date filter"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="filter-stats">
          <span className="text-sm font-medium text-slate-700">
            {appointments.length} Appointment{appointments.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="btn-icon"
            onClick={fetchAppointments}
            title="Refresh schedule"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spin-icon text-brand-primary" size={32} />
          <p>Retrieving appointment records...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertCircle size={32} className="text-danger" />
          <h3>Error Loading Appointments</h3>
          <p>{error}</p>
          <button type="button" className="btn-primary-sm" onClick={fetchAppointments}>
            Retry
          </button>
        </div>
      ) : appointments.length === 0 ? (
        <div className="panel-empty-state py-12">
          <CalendarDays size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No Appointments Found</h3>
          <p className="text-sm text-slate-500 mb-4">
            No bookings match the selected filters.
          </p>
          <button type="button" className="btn-primary" onClick={handleOpenBookModal}>
            <CalendarPlus size={16} />
            <span>Book New Appointment</span>
          </button>
        </div>
      ) : (
        <div className="table-responsive bg-white rounded-xl shadow-sm border border-slate-200">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Reason</th>
                <th>Duration</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const canModify = appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED';
                return (
                  <tr key={appt.id} className="hover-row">
                    <td>
                      <div className="font-semibold text-slate-900">
                        {formatDateTime(appt.appointment_date)}
                      </div>
                      <span className="text-xs text-muted">ID: #{appt.id}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="patient-name-link font-medium text-slate-900 hover:text-brand-primary text-left"
                        onClick={() => onSelectPatient(appt.patient_id)}
                      >
                        {appt.patient_name}
                      </button>
                    </td>
                    <td>
                      <span className="text-slate-800 font-medium">Dr. {appt.doctor_name}</span>
                      <span className="block text-xs text-muted">{appt.doctor_specialization}</span>
                    </td>
                    <td className="max-w-xs truncate text-sm text-slate-600">
                      {appt.reason || 'General Follow-up'}
                    </td>
                    <td>
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {appt.duration_minutes || 30} mins
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="text-right">
                      <div className="table-action-group justify-end">
                        {canModify ? (
                          <>
                            <button
                              type="button"
                              className="action-btn text-emerald hover:text-emerald-700"
                              title="Mark as Completed"
                              onClick={() => handleComplete(appt.id)}
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn text-purple hover:text-purple-700"
                              title="Reschedule to New Time"
                              onClick={() => handleOpenReschedule(appt)}
                            >
                              <Clock size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn text-rose hover:text-rose-700"
                              title="Cancel Appointment"
                              onClick={() => handleOpenCancel(appt)}
                            >
                              <AlertCircle size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Concluded</span>
                        )}
                        <button
                          type="button"
                          className="action-btn text-brand-primary hover:text-brand-dark"
                          title="View Case Details"
                          onClick={() => onSelectAppointment(appt.id)}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Schedule Clinical Appointment"
      >
        <form onSubmit={handleBookSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="select-patient">
              Select Patient <span className="text-danger">*</span>
            </label>
            <select
              id="select-patient"
              className={`form-select ${bookErrors.patient_id ? 'border-danger' : ''}`}
              value={bookForm.patient_id}
              onChange={(e) => setBookForm({ ...bookForm, patient_id: e.target.value })}
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.name} ({p.age} yrs, {p.phone})
                </option>
              ))}
            </select>
            {bookErrors.patient_id && <p className="form-error">{bookErrors.patient_id}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="select-doctor">
              Select Doctor <span className="text-danger">*</span>
            </label>
            <select
              id="select-doctor"
              className={`form-select ${bookErrors.doctor_id ? 'border-danger' : ''}`}
              value={bookForm.doctor_id}
              onChange={(e) => setBookForm({ ...bookForm, doctor_id: e.target.value })}
              required
            >
              <option value="">-- Choose Doctor --</option>
              {doctors.map((d) => (
                <option 
                  key={d.id} 
                  value={d.id} 
                  disabled={!d.is_available}
                >
                  Dr. {d.name} — {d.specialization} {!d.is_available ? '(UNAVAILABLE)' : '(Available)'}
                </option>
              ))}
            </select>
            {bookErrors.doctor_id && <p className="form-error">{bookErrors.doctor_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="appt-date">
                Date & Time <span className="text-danger">*</span>
              </label>
              <input
                id="appt-date"
                type="datetime-local"
                min={minDateTime}
                className={`form-input ${bookErrors.appointment_date ? 'border-danger' : ''}`}
                value={bookForm.appointment_date}
                onChange={(e) => setBookForm({ ...bookForm, appointment_date: e.target.value })}
                required
              />
              {bookErrors.appointment_date && (
                <p className="form-error">{bookErrors.appointment_date}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="appt-duration">
                Duration (minutes) <span className="text-danger">*</span>
              </label>
              <select
                id="appt-duration"
                className="form-select"
                value={bookForm.duration_minutes}
                onChange={(e) => setBookForm({ ...bookForm, duration_minutes: e.target.value })}
              >
                <option value="15">15 minutes (Quick check)</option>
                <option value="30">30 minutes (Standard)</option>
                <option value="45">45 minutes (Detailed)</option>
                <option value="60">60 minutes (Comprehensive)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="appt-reason">
              Reason for Consultation / Symptoms
            </label>
            <textarea
              id="appt-reason"
              rows={2}
              className="form-textarea"
              placeholder="e.g. Routine blood pressure check, persistent migraine, post-op review..."
              value={bookForm.reason}
              onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsBookModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying & Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title={`Reschedule Appointment #${currentAppt?.id}`}
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <p><strong>Patient:</strong> {currentAppt?.patient_name}</p>
            <p><strong>Doctor:</strong> Dr. {currentAppt?.doctor_name} ({currentAppt?.doctor_specialization})</p>
            <p><strong>Current Slot:</strong> {formatDateTime(currentAppt?.appointment_date)}</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reschedule-date">
              New Date & Time <span className="text-danger">*</span>
            </label>
            <input
              id="reschedule-date"
              type="datetime-local"
              min={minDateTime}
              className="form-input"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted mt-1">
              Must be in the future. The system will verify that Dr. {currentAppt?.doctor_name} has no overlapping appointments.
            </p>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsRescheduleOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rescheduling...' : 'Save New Time'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Appointment"
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Are you sure you want to cancel the appointment for <strong>{currentAppt?.patient_name}</strong> with <strong>Dr. {currentAppt?.doctor_name}</strong> on <strong>{formatDateTime(currentAppt?.appointment_date)}</strong>?
          </p>

          <p className="text-xs text-muted">
            Cancelling will release the physician's calendar slot immediately. Completed appointments cannot be cancelled.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="cancel-reason">
              Reason for Cancellation (optional)
            </label>
            <input
              id="cancel-reason"
              type="text"
              className="form-input"
              placeholder="e.g. Patient schedule conflict, symptoms resolved..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <div className="modal-footer pt-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsCancelOpen(false)}
              disabled={isSubmitting}
            >
              Keep Appointment
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleCancelSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Appointments;
