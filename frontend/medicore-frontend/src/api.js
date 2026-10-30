/**
 * MediCore API Integration Layer
 * 
 * Provides a clean interface for interacting with the backend.
 * Gracefully falls back when the C++ backend HTTP server is not yet connected.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * Fetch patient records from backend once C++ HTTP endpoint is active.
 */
export async function getPatients() {
  try {
    const res = await fetch(`${API_BASE_URL}/patients`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Graceful fallback to demo mode when backend is offline
    return null;
  }
}

/**
 * Fetch registered physicians from backend.
 */
export async function getDoctors() {
  try {
    const res = await fetch(`${API_BASE_URL}/doctors`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * Fetch appointment schedule from backend.
 */
export async function getAppointments() {
  try {
    const res = await fetch(`${API_BASE_URL}/appointments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * Book an appointment on the backend.
 */
export async function bookAppointment(payload) {
  const res = await fetch(`${API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Booking failed: ${res.statusText}`);
  return await res.json();
}

/**
 * Cancel an appointment on the backend.
 */
export async function cancelAppointment(appointmentId) {
  const res = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
  });
}

/**
 * Register a new patient on the backend.
 */
export async function createPatient(patientData) {
  try {
    const res = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    if (!res.ok) throw new Error(`Registration failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    // Graceful fallback to demo mode when backend is offline
    return null;
  }
}
