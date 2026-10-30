import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Search, 
  Plus, 
  Edit3, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  X,
  Filter
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export function Doctors({ onNotify, onOpenBookModal }) {
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    is_available: true,
    email: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchDoctorsAndSpecs = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docRes, specRes] = await Promise.all([
        api.getDoctors({
          search: searchQuery,
          specialization: selectedSpec,
          available: selectedAvailability === '' ? null : selectedAvailability === 'true',
        }),
        api.getSpecializations(),
      ]);

      if (docRes.success) setDoctors(docRes.data);
      if (specRes.success) setSpecializations(specRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load physician directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorsAndSpecs();
  }, [selectedSpec, selectedAvailability]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctorsAndSpecs();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      specialization: '',
      is_available: true,
      email: '',
      phone: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Doctor name must be at least 2 characters.';
    }
    if (!formData.specialization || formData.specialization.trim().length < 2) {
      errors.specialization = 'Specialization field is required.';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please provide a valid email format.';
    }
    if (formData.phone && formData.phone.trim().length < 7) {
      errors.phone = 'Phone number must be at least 7 digits.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (doctor) => {
    setCurrentDoctor(doctor);
    setFormData({
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      is_available: Boolean(doctor.is_available),
      email: doctor.email || '',
      phone: doctor.phone || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleToggleAvailability = async (doctor) => {
    try {
      const newStatus = !doctor.is_available;
      const res = await api.updateDoctor(doctor.id, {
        is_available: newStatus,
      });
      if (res.success) {
        onNotify(
          'success',
          `Dr. ${doctor.name} marked as ${newStatus ? 'Available' : 'Unavailable'}.`
        );
        fetchDoctorsAndSpecs();
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to toggle availability.');
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const res = await api.registerDoctor(formData);
      if (res.success) {
        onNotify('success', `Dr. ${formData.name} registered successfully.`);
        setIsAddModalOpen(false);
        fetchDoctorsAndSpecs();
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to register doctor.');
      if (err.field) {
        setFormErrors((prev) => ({ ...prev, [err.field]: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const res = await api.updateDoctor(currentDoctor.id, formData);
      if (res.success) {
        onNotify('success', `Dr. ${formData.name} record updated.`);
        setIsEditModalOpen(false);
        fetchDoctorsAndSpecs();
      }
    } catch (err) {
      onNotify('error', err.message || 'Failed to update doctor.');
      if (err.field) {
        setFormErrors((prev) => ({ ...prev, [err.field]: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2 className="section-title">Medical Staff Directory</h2>
          <p className="section-subtitle">Manage doctor credentials, medical specialties, and consultation availability</p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenAddModal}
        >
          <Plus size={18} />
          <span>Register Physician</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="doctor-filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-box-wrapper flex-1">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by physician name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                api.getDoctors({ specialization: selectedSpec }).then((res) => setDoctors(res.data));
              }}
            >
              <X size={16} />
            </button>
          )}
          <button type="submit" className="btn-secondary-sm">
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          {/* Specialization Filter */}
          <select
            className="filter-select"
            value={selectedSpec}
            onChange={(e) => setSelectedSpec(e.target.value)}
          >
            <option value="">All Specializations</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            className="filter-select"
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="true">Available Only</option>
            <option value="false">Unavailable Only</option>
          </select>

          <button
            type="button"
            className="btn-icon"
            onClick={fetchDoctorsAndSpecs}
            title="Refresh directory"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Doctors Grid Content */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spin-icon text-brand-primary" size={32} />
          <p>Loading medical directory...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertCircle size={32} className="text-danger" />
          <h3>Error Loading Directory</h3>
          <p>{error}</p>
          <button type="button" className="btn-primary-sm" onClick={fetchDoctorsAndSpecs}>
            Retry
          </button>
        </div>
      ) : doctors.length === 0 ? (
        <div className="panel-empty-state py-12">
          <Stethoscope size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No Doctors Found</h3>
          <p className="text-sm text-slate-500 mb-4">
            No doctors matched your criteria. Try adjusting the search filters.
          </p>
        </div>
      ) : (
        <div className="doctor-cards-grid">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="doctor-card hover-lift">
              <div className="doctor-card-top">
                <div className="doctor-badge-wrapper">
                  <div className="doctor-avatar">
                    <Stethoscope size={22} className="text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="doctor-name">Dr. {doctor.name}</h3>
                    <span className="doctor-spec-tag">{doctor.specialization}</span>
                  </div>
                </div>

                <StatusBadge status={doctor.is_available} type="availability" />
              </div>

              <div className="doctor-card-body">
                <div className="doctor-info-row">
                  <Phone size={14} className="text-slate-400" />
                  <span>{doctor.phone || 'Phone not registered'}</span>
                </div>
                <div className="doctor-info-row">
                  <Mail size={14} className="text-slate-400" />
                  <span className="truncate">{doctor.email || 'Email not registered'}</span>
                </div>
              </div>

              <div className="doctor-card-footer">
                <div className="availability-toggle-box">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={doctor.is_available}
                      onChange={() => handleToggleAvailability(doctor)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span className="text-xs font-medium text-slate-600">
                    {doctor.is_available ? 'Accepting Patients' : 'Not Accepting'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="action-btn text-slate-600 hover:text-slate-900"
                    title="Edit Doctor"
                    onClick={() => handleOpenEditModal(doctor)}
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    type="button"
                    className={`btn-primary-xs ${!doctor.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (doctor.is_available) {
                        onOpenBookModal({ defaultDoctorId: doctor.id });
                      } else {
                        onNotify('error', `Cannot book: Dr. ${doctor.name} is currently marked as unavailable.`);
                      }
                    }}
                    title={doctor.is_available ? 'Book with this doctor' : 'Doctor is unavailable'}
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Doctor Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Medical Specialist"
      >
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="doc-name">
              Full Name (without 'Dr.') <span className="text-danger">*</span>
            </label>
            <input
              id="doc-name"
              type="text"
              className={`form-input ${formErrors.name ? 'border-danger' : ''}`}
              placeholder="e.g. Sarah Jenkins"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-spec">
              Specialization / Clinical Department <span className="text-danger">*</span>
            </label>
            <input
              id="doc-spec"
              type="text"
              className={`form-input ${formErrors.specialization ? 'border-danger' : ''}`}
              placeholder="e.g. Cardiology, Neurology, Pediatrics..."
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              required
            />
            {formErrors.specialization && <p className="form-error">{formErrors.specialization}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="doc-phone">
                Contact Phone
              </label>
              <input
                id="doc-phone"
                type="tel"
                className={`form-input ${formErrors.phone ? 'border-danger' : ''}`}
                placeholder="e.g. +1 (555) 234-5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="doc-email">
                Institutional Email
              </label>
              <input
                id="doc-email"
                type="email"
                className={`form-input ${formErrors.email ? 'border-danger' : ''}`}
                placeholder="e.g. doctor@hospital.example"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {formErrors.email && <p className="form-error">{formErrors.email}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                className="checkbox-custom"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">
                Immediately Available for Consultation Bookings
              </span>
            </label>
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
              {isSubmitting ? 'Registering...' : 'Register Physician'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Physician: Dr. ${currentDoctor?.name}`}
      >
        <form onSubmit={handleUpdateDoctor} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="edit-doc-name">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              id="edit-doc-name"
              type="text"
              className={`form-input ${formErrors.name ? 'border-danger' : ''}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-doc-spec">
              Specialization <span className="text-danger">*</span>
            </label>
            <input
              id="edit-doc-spec"
              type="text"
              className={`form-input ${formErrors.specialization ? 'border-danger' : ''}`}
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              required
            />
            {formErrors.specialization && <p className="form-error">{formErrors.specialization}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-doc-phone">
                Phone
              </label>
              <input
                id="edit-doc-phone"
                type="tel"
                className={`form-input ${formErrors.phone ? 'border-danger' : ''}`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-doc-email">
                Email
              </label>
              <input
                id="edit-doc-email"
                type="email"
                className={`form-input ${formErrors.email ? 'border-danger' : ''}`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {formErrors.email && <p className="form-error">{formErrors.email}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                className="checkbox-custom"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">
                Mark as Available for Bookings
              </span>
            </label>
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
              {isSubmitting ? 'Saving...' : 'Update Details'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Doctors;
