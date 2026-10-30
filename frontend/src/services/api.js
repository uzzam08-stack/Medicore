/**
 * MediCore API Client
 * Centralized REST client connecting the React frontend to the Flask API.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.error || `HTTP error ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.field = data.field;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the backend server. Please verify the Flask API is running on port 5050.');
    }
    throw error;
  }
}

export const api = {
  // System Health
  checkHealth: () => request('/health'),

  // Dashboard Stats
  getDashboardStats: () => request('/dashboard/stats'),

  // Patients
  getPatients: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/patients${query}`);
  },
  getPatientById: (id) => request(`/patients/${id}`),
  createPatient: (data) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id, data) => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id) => request(`/patients/${id}`, { method: 'DELETE' }),

  // Doctors
  getDoctors: ({ search = '', specialization = '', available = null } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (specialization) params.append('specialization', specialization);
    if (available !== null && available !== undefined && available !== '') {
      params.append('available', available);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/doctors${queryString}`);
  },
  getDoctorById: (id) => request(`/doctors/${id}`),
  registerDoctor: (data) => request('/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id, data) => request(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getSpecializations: () => request('/doctors/specializations'),

  // Appointments
  getAppointments: ({ patient_id = null, doctor_id = null, date = '', status = '' } = {}) => {
    const params = new URLSearchParams();
    if (patient_id) params.append('patient_id', patient_id);
    if (doctor_id) params.append('doctor_id', doctor_id);
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/appointments${queryString}`);
  },
  getAppointmentById: (id) => request(`/appointments/${id}`),
  bookAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  rescheduleAppointment: (id, { appointment_date, reason }) =>
    request(`/appointments/${id}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ appointment_date, reason }),
    }),
  cancelAppointment: (id, { reason } = {}) =>
    request(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  completeAppointment: (id) =>
    request(`/appointments/${id}/complete`, {
      method: 'PATCH',
    }),
};

export default api;
