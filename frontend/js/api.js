// frontend/js/api.js
// Centralised API calls — all routes match backend/server.js

const API_BASE = 'https://healthcareprescription-production-4ac9.up.railway.app/api';

const api = {
  // ── Patients ─────────────────────────────────────────────────────────────────
  getPatients:          () => fetchJSON(`${API_BASE}/patients`),
  getPatient:      (id) => fetchJSON(`${API_BASE}/patients/${id}`),
  createPatient:  (data) => fetchJSON(`${API_BASE}/patients`, 'POST', data),
  updatePatient: (id, d) => fetchJSON(`${API_BASE}/patients/${id}`, 'PUT', d),
  deletePatient:   (id) => fetchJSON(`${API_BASE}/patients/${id}`, 'DELETE'),

  // ── Doctors ──────────────────────────────────────────────────────────────────
  getDoctors:           () => fetchJSON(`${API_BASE}/doctors`),
  createDoctor:   (data) => fetchJSON(`${API_BASE}/doctors`, 'POST', data),
  updateDoctor: (id, d) => fetchJSON(`${API_BASE}/doctors/${id}`, 'PUT', d),
  deleteDoctor:    (id) => fetchJSON(`${API_BASE}/doctors/${id}`, 'DELETE'),

  // ── Medicines ─────────────────────────────────────────────────────────────────
  getMedicines:         () => fetchJSON(`${API_BASE}/medicines`),
  createMedicine: (data) => fetchJSON(`${API_BASE}/medicines`, 'POST', data),
  updateMedicine:(id, d) => fetchJSON(`${API_BASE}/medicines/${id}`, 'PUT', d),
  deleteMedicine:  (id) => fetchJSON(`${API_BASE}/medicines/${id}`, 'DELETE'),

  // ── Interactions DB ───────────────────────────────────────────────────────────
  getInteractions:      () => fetchJSON(`${API_BASE}/interactions`),
  createInteraction:(data)  => fetchJSON(`${API_BASE}/interactions`, 'POST', data),
  updateInteraction:(id, d) => fetchJSON(`${API_BASE}/interactions/${id}`, 'PUT', d),
  deleteInteraction: (id)   => fetchJSON(`${API_BASE}/interactions/${id}`, 'DELETE'),

  // ── Prescriptions ─────────────────────────────────────────────────────────────
  getPrescriptions:      () => fetchJSON(`${API_BASE}/prescriptions`),
  getPrescription:  (id) => fetchJSON(`${API_BASE}/prescriptions/${id}`),
  createPrescription:(d) => fetchJSON(`${API_BASE}/prescriptions`, 'POST', d),
  deletePrescription:(id)=> fetchJSON(`${API_BASE}/prescriptions/${id}`, 'DELETE'),

  // ── Alerts ───────────────────────────────────────────────────────────────────
  getAlerts:    (sev) => fetchJSON(`${API_BASE}/alerts${sev ? '?severity='+sev : ''}`),

  // ── Analytics ────────────────────────────────────────────────────────────────
  getAnalytics:      () => fetchJSON(`${API_BASE}/analytics`),

  // ── Drug Interaction Checker ──────────────────────────────────────────────────
  checkInteraction: (ids) => fetchJSON(`${API_BASE}/check-interaction`, 'POST', { medicine_ids: ids }),
};

async function fetchJSON(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
