import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import Modal from './components/Modal';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Doctors from './pages/Doctors';
import Appointments from './pages/Appointments';
import AppointmentDetail from './pages/AppointmentDetail';
import api from './services/api';
import { formatDateTime, toDatetimeLocalInput } from './utils/formatters';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Global Quick Action Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingInitialData, setBookingInitialData] = useState({});

  // Global Reschedule & Cancel Modal States (accessible from Dashboard, PatientDetail, AppointmentDetail)
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [cancelDialogAppt, setCancelDialogAppt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Periodic Health Check
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await api.checkHealth();
        if (isMounted) setIsOnline(Boolean(res.success));
      } catch {
        if (isMounted) setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const notify = (type, message) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNavigate = (tab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    setCurrentTab('patient-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAppointment = (id) => {
    setSelectedAppointmentId(id);
    setCurrentTab('appointment-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenBookModal = (initialData = {}) => {
    setBookingInitialData(initialData);
    setIsBookModalOpen(true);
  };

  const handleOpenReschedule = (appt) => {
    setRescheduleModalAppt(appt);
    setRescheduleDate(toDatetimeLocalInput(appt.appointment_date));
  };

  const handleOpenCancel = (appt) => {
    setCancelDialogAppt(appt);
    setCancelReason('');
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleModalAppt || !rescheduleDate) return;

    const selectedTime = new Date(rescheduleDate);
    if (selectedTime <= new Date()) {
      notify('error', 'New appointment time must be in the future.');
      return;
    }

    try {
      setIsRescheduling(true);
      const res = await api.rescheduleAppointment(rescheduleModalAppt.id, {
        appointment_date: selectedTime.toISOString(),
        reason: 'Rescheduled via portal',
      });
      if (res.success) {
        notify('success', 'Appointment rescheduled successfully.');
        setRescheduleModalAppt(null);
        // Force refresh current view if needed
      }
    } catch (err) {
      notify('error', err.message || 'Failed to reschedule.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelDialogAppt) return;
    try {
      setIsCancelling(true);
      const res = await api.cancelAppointment(cancelDialogAppt.id, {
        reason: cancelReason || 'Cancelled by staff',
      });
      if (res.success) {
        notify('success', 'Appointment cancelled successfully. Slot freed.');
        setCancelDialogAppt(null);
      }
    } catch (err) {
      notify('error', err.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCompleteAppointment = async (apptId) => {
    try {
      const res = await api.completeAppointment(apptId);
      if (res.success) {
        notify('success', 'Appointment marked as completed.');
      }
    } catch (err) {
      notify('error', err.message || 'Failed to complete appointment.');
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          currentTab={currentTab}
          onOpenBookModal={() => handleOpenBookModal()}
          onOpenNewPatientModal={() => {
            setCurrentTab('patients');
          }}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main>
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigate={handleNavigate}
              onSelectPatient={handleSelectPatient}
              onSelectAppointment={handleSelectAppointment}
              onOpenBookModal={() => handleOpenBookModal()}
              onOpenRescheduleModal={handleOpenReschedule}
              onOpenCancelDialog={handleOpenCancel}
              onCompleteAppointment={handleCompleteAppointment}
            />
          )}

          {currentTab === 'patients' && (
            <Patients
              onSelectPatient={handleSelectPatient}
              onNotify={notify}
            />
          )}

          {currentTab === 'patient-detail' && (
            <PatientDetail
              patientId={selectedPatientId}
              onBack={() => handleNavigate('patients')}
              onOpenBookModal={handleOpenBookModal}
              onOpenRescheduleModal={handleOpenReschedule}
              onOpenCancelDialog={handleOpenCancel}
              onCompleteAppointment={handleCompleteAppointment}
              onNotify={notify}
            />
          )}

          {currentTab === 'doctors' && (
            <Doctors
              onNotify={notify}
              onOpenBookModal={handleOpenBookModal}
            />
          )}

          {currentTab === 'appointments' && (
            <Appointments
              onSelectAppointment={handleSelectAppointment}
              onSelectPatient={handleSelectPatient}
              onNotify={notify}
              isBookModalOpen={isBookModalOpen}
              setIsBookModalOpen={setIsBookModalOpen}
              initialBookingData={bookingInitialData}
            />
          )}

          {currentTab === 'appointment-detail' && (
            <AppointmentDetail
              appointmentId={selectedAppointmentId}
              onBack={() => handleNavigate('appointments')}
              onSelectPatient={handleSelectPatient}
              onOpenRescheduleModal={handleOpenReschedule}
              onOpenCancelDialog={handleOpenCancel}
              onCompleteAppointment={handleCompleteAppointment}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Global Reschedule Modal */}
      {rescheduleModalAppt && (
        <Modal
          isOpen={Boolean(rescheduleModalAppt)}
          onClose={() => setRescheduleModalAppt(null)}
          title={`Reschedule Appointment #${rescheduleModalAppt.id}`}
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p><strong>Patient:</strong> {rescheduleModalAppt.patient_name}</p>
              <p><strong>Doctor:</strong> Dr. {rescheduleModalAppt.doctor_name} ({rescheduleModalAppt.doctor_specialization})</p>
              <p><strong>Current Slot:</strong> {formatDateTime(rescheduleModalAppt.appointment_date)}</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="global-reschedule-date">
                New Date & Time <span className="text-danger">*</span>
              </label>
              <input
                id="global-reschedule-date"
                type="datetime-local"
                min={toDatetimeLocalInput(new Date())}
                className="form-input"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
              />
              <p className="text-xs text-muted mt-1">
                Must be in the future. The system ensures the physician has no schedule collisions.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRescheduleModalAppt(null)}
                disabled={isRescheduling}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isRescheduling}
              >
                {isRescheduling ? 'Rescheduling...' : 'Save New Time'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Global Cancel Modal */}
      {cancelDialogAppt && (
        <Modal
          isOpen={Boolean(cancelDialogAppt)}
          onClose={() => setCancelDialogAppt(null)}
          title="Cancel Appointment"
          maxWidth="max-w-md"
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Are you sure you want to cancel the appointment for <strong>{cancelDialogAppt.patient_name}</strong> with <strong>Dr. {cancelDialogAppt.doctor_name}</strong>?
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="global-cancel-reason">
                Reason for Cancellation (optional)
              </label>
              <input
                id="global-cancel-reason"
                type="text"
                className="form-input"
                placeholder="e.g. Schedule change, consultation not needed..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="modal-footer pt-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCancelDialogAppt(null)}
                disabled={isCancelling}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleCancelSubmit}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Global Toast Feedback Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default App;
