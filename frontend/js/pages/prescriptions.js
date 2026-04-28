// frontend/js/pages/prescriptions.js

async function renderPrescriptionsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Prescription History</h1>
        <p>All prescriptions with auto-computed risk scores (via JOIN + risk function)</p>
      </div>
      <div class="flex" style="gap:10px">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="prescSearch" placeholder="Search…" />
        </div>
        <button class="btn btn-primary" onclick="navigateTo('new-prescription')">+ New Prescription</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrapper" id="prescTableWrapper">${spinner()}</div>
    </div>
  `;
  await loadPrescriptionsTable();
  filterTable('prescSearch', 'prescTable');
}

async function loadPrescriptionsTable() {
  const wrapper = document.getElementById('prescTableWrapper');
  if (!wrapper) return;
  try {
    const list = await api.getPrescriptions();
    if (!list.length) { wrapper.innerHTML = emptyState('📋', 'No prescriptions found.'); return; }

    wrapper.innerHTML = `
      <table id="prescTable">
        <thead>
          <tr>
            <th>ID</th><th>Date</th><th>Patient</th><th>Doctor</th>
            <th>Specialization</th><th>Risk Score</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(p => `
            <tr>
              <td><span class="badge badge-pill">#${p.prescription_id}</span></td>
              <td>${fmtDate(p.prescription_date)}</td>
              <td><strong>${p.patient_name}</strong><br><span class="text-muted" style="font-size:11px">${p.gender ? genderLabel(p.gender) : ''}, ${p.age ?? '?'} yrs</span></td>
              <td>${p.doctor_name}</td>
              <td>${p.specialization}</td>
              <td>${riskBadge(p.risk_score)}</td>
              <td>
                <div class="flex" style="gap:6px">
                  <button class="btn btn-ghost btn-sm" onclick="viewPrescription(${p.prescription_id})">View</button>
                  <button class="btn btn-danger btn-sm" onclick="deletePrescriptionConfirm(${p.prescription_id})">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrapper.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

async function viewPrescription(id) {
  openModal('Prescription Details', spinner());
  try {
    const p = await api.getPrescription(id);
    document.getElementById('modalBody').innerHTML = `
      <div class="presc-detail-header">
        <div class="presc-meta">
          <div class="presc-meta-row"><span class="presc-meta-key">Prescription:</span><strong>#${p.prescription_id}</strong></div>
          <div class="presc-meta-row"><span class="presc-meta-key">Date:</span>${fmtDate(p.prescription_date)}</div>
          <div class="presc-meta-row"><span class="presc-meta-key">Patient:</span>${p.patient_name} (${genderLabel(p.gender)}, ${p.age} yrs)</div>
          <div class="presc-meta-row"><span class="presc-meta-key">History:</span>${p.medical_history || '—'}</div>
          <div class="presc-meta-row"><span class="presc-meta-key">Doctor:</span>${p.doctor_name} — ${p.specialization}</div>
        </div>
        <div style="text-align:right">
          <div style="margin-bottom:8px;font-size:12px;color:var(--text-secondary)">Risk Score</div>
          ${riskBadge(p.risk_score)}
        </div>
      </div>

      <div class="card-title" style="margin-bottom:10px">💊 Medicines (${p.medicines.length})</div>
      <table style="margin-bottom:20px">
        <thead><tr><th>Medicine</th><th>Form</th><th>Dosage</th><th>Duration</th></tr></thead>
        <tbody>
          ${p.medicines.map(m => `
            <tr>
              <td><strong>${m.medicine_name}</strong></td>
              <td><span class="badge badge-pill">${m.dosage_form}</span></td>
              <td>${m.dosage}</td>
              <td>${m.duration_days} days</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${p.alerts.length ? `
        <div class="card-title" style="margin-bottom:10px">⚠️ Detected Interactions (${p.alerts.length})</div>
        ${p.alerts.map(a => `
          <div class="alert-card ${a.severity.toLowerCase()}">
            <div class="alert-icon">${a.severity === 'HIGH' ? '🔴' : a.severity === 'MODERATE' ? '🟠' : '🟡'}</div>
            <div class="alert-content">
              <div class="alert-title">${a.drug_a} + ${a.drug_b}</div>
              <div class="alert-sub">${severityBadge(a.severity)} Detected ${fmtDate(a.detected_on)}</div>
            </div>
          </div>
        `).join('')}
      ` : `<div class="alert-card low"><div class="alert-icon">✅</div><div class="alert-content"><div class="alert-title">No interactions detected</div></div></div>`}
    `;
  } catch (err) {
    document.getElementById('modalBody').innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

function deletePrescriptionConfirm(id) {
  confirmDelete(`Prescription #${id}`, async () => {
    try {
      await api.deletePrescription(id);
      toast('Prescription deleted.', 'success');
      await loadPrescriptionsTable();
      filterTable('prescSearch', 'prescTable');
      refreshAlertBadge();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
