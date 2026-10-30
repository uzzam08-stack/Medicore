import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Eye, 
  AlertCircle, 
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  X
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getInitials, formatDate } from '../utils/formatters';

export function Patients({ onSelectPatient, onNotify }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [currentPatient, setCurrentPatient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    medical_notes: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchPatients = async (query = searchQuery) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPatients(query);
      if (res.success) {
        setPatients(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(searchQuery);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchPatients('');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      gender: 'Male',
      phone: '',
      email: '',
      medical_notes: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    }
    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      errors.age = 'Age must be a valid number between 0 and 130.';
    }
    if (!formData.phone || formData.phone.trim().length < 7) {
      errors.phone = 'Valid phone number is required (min 7 digits).';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (patient) => {
    setCurrentPatient(patient);
    setFormData({
      name: patient.name || '',
      age: patient.age || '',
      gender: patient.gender || 'Male',
      phone: patient.phone || '',
      email: patient.email || '',
      medical_notes: patient.medical_notes || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (patient) => {
    setCurrentPatient(patient);
    setIsDeleteOpen(true);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const res = await api.createPatient({
        ...formData,
        age: parseInt(formData.age, 10),
      });
      if (res.success) {
        onNotify('success', `Patient ${formData.name} added successfully.`);
        setIsAddModalOpen(false);
        fetchPatients(searchQuery);
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to create patient record.');
      if (err.field) {
        setFormErrors((prev) => ({ ...prev, [err.field]: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const res = await api.updatePatient(currentPatient.id, {
        ...formData,
        age: parseInt(formData.age, 10),
      });
      if (res.success) {
        onNotify('success', `Patient details for ${formData.name} updated.`);
        setIsEditModalOpen(false);
        fetchPatients(searchQuery);
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to update patient record.');
      if (err.field) {
        setFormErrors((prev) => ({ ...prev, [err.field]: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!currentPatient) return;
    try {
      setIsSubmitting(true);
      const res = await api.deletePatient(currentPatient.id);
      if (res.success) {
        onNotify('success', res.message || 'Patient deleted successfully.');
        setIsDeleteOpen(false);
        fetchPatients(searchQuery);
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to delete patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header & Search Bar */}
      <div className="page-header-row">
        <div>
          <h2 className="section-title">Patient Directory</h2>
          <p className="section-subtitle">Manage registered patient profiles, contact details, and clinical records</p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenAddModal}
        >
          <UserPlus size={18} />
          <span>Add New Patient</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search patients by name, phone, or ID (e.g. 'Alice' or '1')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button type="submit" className="btn-secondary-sm">
            Search
          </button>
        </form>

        <div className="filter-stats">
          <span className="text-sm font-medium text-slate-700">
            {patients.length} Patient{patients.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="btn-icon"
            onClick={() => fetchPatients(searchQuery)}
            title="Refresh list"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spin-icon text-brand-primary" size={32} />
          <p>Retrieving patient records...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertCircle size={32} className="text-danger" />
          <h3>Error loading patients</h3>
          <p>{error}</p>
          <button type="button" className="btn-primary-sm" onClick={() => fetchPatients(searchQuery)}>
            Retry
          </button>
        </div>
      ) : patients.length === 0 ? (
        <div className="panel-empty-state py-12">
          <Users size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No Patients Found</h3>
          <p className="text-sm text-slate-500 mb-4">
            {searchQuery
              ? `No records match "${searchQuery}". Try clearing your search query.`
              : 'The patient registry is currently empty. Add your first patient to begin.'}
          </p>
          {searchQuery ? (
            <button type="button" className="btn-secondary" onClick={handleClearSearch}>
              Clear Search
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleOpenAddModal}>
              <UserPlus size={16} />
              <span>Register Patient</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive bg-white rounded-xl shadow-sm border border-slate-200">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Demographics</th>
                <th>Contact Info</th>
                <th>Medical Notes</th>
                <th>Registered</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="hover-row">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar-circle">
                        {getInitials(patient.name)}
                      </div>
                      <div>
                        <button
                          type="button"
                          className="patient-name-link font-semibold text-slate-900 hover:text-brand-primary text-left"
                          onClick={() => onSelectPatient(patient.id)}
                        >
                          {patient.name}
                        </button>
                        <span className="block text-xs text-muted">ID: #{patient.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">{patient.age} yrs</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span>{patient.gender}</span>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Phone size={12} className="text-slate-400" />
                        <span>{patient.phone}</span>
                      </div>
                      {patient.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail size={12} className="text-slate-400" />
                          <span>{patient.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs">
                    <p className="text-xs text-slate-600 truncate">
                      {patient.medical_notes || <span className="text-slate-400 italic">None recorded</span>}
                    </p>
                  </td>
                  <td>
                    <span className="text-xs text-slate-500">
                      {formatDate(patient.created_at)}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="table-action-group justify-end">
                      <button
                        type="button"
                        className="action-btn text-brand-primary"
                        title="View Complete Profile & History"
                        onClick={() => onSelectPatient(patient.id)}
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        type="button"
                        className="action-btn text-slate-600 hover:text-slate-900"
                        title="Edit Details"
                        onClick={() => handleOpenEditModal(patient)}
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        type="button"
                        className="action-btn text-rose hover:text-rose-700"
                        title="Delete Patient"
                        onClick={() => handleOpenDelete(patient)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Patient Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Patient"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="patient-name">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              id="patient-name"
              type="text"
              className={`form-input ${formErrors.name ? 'border-danger' : ''}`}
              placeholder="e.g. Jane Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="patient-age">
                Age (years) <span className="text-danger">*</span>
              </label>
              <input
                id="patient-age"
                type="number"
                min="0"
                max="130"
                className={`form-input ${formErrors.age ? 'border-danger' : ''}`}
                placeholder="e.g. 34"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
              />
              {formErrors.age && <p className="form-error">{formErrors.age}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="patient-gender">
                Gender <span className="text-danger">*</span>
              </label>
              <select
                id="patient-gender"
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="patient-phone">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                id="patient-phone"
                type="tel"
                className={`form-input ${formErrors.phone ? 'border-danger' : ''}`}
                placeholder="e.g. +1 (555) 012-3456"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="patient-email">
                Email Address
              </label>
              <input
                id="patient-email"
                type="email"
                className={`form-input ${formErrors.email ? 'border-danger' : ''}`}
                placeholder="e.g. jane@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {formErrors.email && <p className="form-error">{formErrors.email}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="patient-notes">
              Medical Notes / Clinical Observations
            </label>
            <textarea
              id="patient-notes"
              rows={3}
              className="form-textarea"
              placeholder="Known conditions, allergies, or chronic health notes..."
              value={formData.medical_notes}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Save Patient Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Patient Details #${currentPatient?.id}`}
      >
        <form onSubmit={handleUpdatePatient} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="edit-patient-name">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              id="edit-patient-name"
              type="text"
              className={`form-input ${formErrors.name ? 'border-danger' : ''}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-patient-age">
                Age <span className="text-danger">*</span>
              </label>
              <input
                id="edit-patient-age"
                type="number"
                min="0"
                max="130"
                className={`form-input ${formErrors.age ? 'border-danger' : ''}`}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
              />
              {formErrors.age && <p className="form-error">{formErrors.age}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-patient-gender">
                Gender <span className="text-danger">*</span>
              </label>
              <select
                id="edit-patient-gender"
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-patient-phone">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                id="edit-patient-phone"
                type="tel"
                className={`form-input ${formErrors.phone ? 'border-danger' : ''}`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-patient-email">
                Email Address
              </label>
              <input
                id="edit-patient-email"
                type="email"
                className={`form-input ${formErrors.email ? 'border-danger' : ''}`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {formErrors.email && <p className="form-error">{formErrors.email}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-patient-notes">
              Medical Notes
            </label>
            <textarea
              id="edit-patient-notes"
              rows={3}
              className="form-textarea"
              value={formData.medical_notes}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Update Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeletePatient}
        title="Delete Patient Record"
        message={`Are you sure you want to permanently delete patient "${currentPatient?.name}" (ID #${currentPatient?.id})? This action cannot be undone. Active appointments must be cancelled or completed first.`}
        confirmText="Delete Patient"
        isDanger={true}
        isLoading={isSubmitting}
      />
    </div>
  );
}

export default Patients;
