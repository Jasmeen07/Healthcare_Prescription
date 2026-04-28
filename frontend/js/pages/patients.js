// frontend/js/pages/patients.js

async function renderPatientsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Patient Dashboard</h1>
        <p>Manage patient records — add, edit, delete, view prescription history</p>
      </div>
      <div class="flex" style="gap:10px">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="patientSearch" placeholder="Search patients…" />
        </div>
        <button class="btn btn-primary" onclick="openAddPatientModal()">+ Add Patient</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrapper" id="patientTableWrapper">${spinner()}</div>
    </div>
  `;

  await loadPatientsTable();
  filterTable('patientSearch', 'patientTable');
}

async function loadPatientsTable() {
  const wrapper = document.getElementById('patientTableWrapper');
  if (!wrapper) return;
  try {
    const patients = await api.getPatients();
    if (!patients.length) { wrapper.innerHTML = emptyState('👤', 'No patients found. Add your first patient.'); return; }

    wrapper.innerHTML = `
      <table id="patientTable">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Age</th><th>Gender</th>
            <th>Medical History</th><th>Prescriptions</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${patients.map(p => `
            <tr>
              <td><span class="badge badge-pill">#${p.patient_id}</span></td>
              <td><strong>${p.name}</strong></td>
              <td>${p.age ?? '—'}</td>
              <td>${genderLabel(p.gender)}</td>
              <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${p.medical_history || ''}">${p.medical_history || '<span class="text-muted">—</span>'}</td>
              <td><span class="badge badge-info">${p.prescription_count}</span></td>
              <td>
                <div class="flex" style="gap:6px">
                  <button class="btn btn-ghost btn-sm" onclick="viewPatient(${p.patient_id})">View</button>
                  <button class="btn btn-ghost btn-sm" onclick="openEditPatientModal(${p.patient_id},'${escQ(p.name)}',${p.age || 'null'},'${p.gender}','${escQ(p.medical_history || '')}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deletePatientConfirm(${p.patient_id},'${escQ(p.name)}')">Delete</button>
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

function escQ(s) { return String(s).replace(/'/g, "\\'"); }

function openAddPatientModal() {
  openModal('Add New Patient', patientForm());
}

function openEditPatientModal(id, name, age, gender, history) {
  openModal('Edit Patient', patientForm({ id, name, age, gender, medical_history: history }));
}

function patientForm(data = {}) {
  const { id, name = '', age = '', gender = '', medical_history = '' } = data;
  return `
    <div class="form-group">
      <label class="form-label">Full Name *</label>
      <input class="form-control" id="pName" value="${name}" placeholder="e.g. Rajesh Kumar" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Age</label>
        <input class="form-control" id="pAge" type="number" value="${age}" placeholder="e.g. 45" min="1" max="149" />
      </div>
      <div class="form-group">
        <label class="form-label">Gender *</label>
        <select class="form-control" id="pGender">
          <option value="">Select…</option>
          <option value="M" ${gender==='M'?'selected':''}>Male</option>
          <option value="F" ${gender==='F'?'selected':''}>Female</option>
          <option value="O" ${gender==='O'?'selected':''}>Other</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Medical History</label>
      <textarea class="form-control" id="pHistory" placeholder="e.g. Hypertension, Type 2 Diabetes">${medical_history}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePatient(${id || 'null'})">${id ? 'Update' : 'Add'} Patient</button>
    </div>
  `;
}

async function savePatient(id) {
  const name    = document.getElementById('pName').value.trim();
  const age     = document.getElementById('pAge').value;
  const gender  = document.getElementById('pGender').value;
  const history = document.getElementById('pHistory').value.trim();

  if (!name)   { toast('Name is required.', 'error'); return; }
  if (!gender) { toast('Gender is required.', 'error'); return; }

  try {
    if (id) {
      await api.updatePatient(id, { name, age: age ? +age : null, gender, medical_history: history });
      toast('Patient updated.', 'success');
    } else {
      await api.createPatient({ name, age: age ? +age : null, gender, medical_history: history });
      toast('Patient added.', 'success');
    }
    closeModal();
    await loadPatientsTable();
    filterTable('patientSearch', 'patientTable');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function viewPatient(id) {
  openModal('Patient Details', spinner());
  try {
    const p = await api.getPatient(id);
    document.getElementById('modalBody').innerHTML = `
      <div style="margin-bottom:16px">
        <div class="presc-meta-row"><span class="presc-meta-key">Name:</span><strong>${p.name}</strong></div>
        <div class="presc-meta-row"><span class="presc-meta-key">Age:</span>${p.age ?? '—'}</div>
        <div class="presc-meta-row"><span class="presc-meta-key">Gender:</span>${genderLabel(p.gender)}</div>
        <div class="presc-meta-row"><span class="presc-meta-key">History:</span>${p.medical_history || '—'}</div>
      </div>
      <div class="card-title">📋 Prescription History (${p.prescriptions.length})</div>
      ${p.prescriptions.length ? `
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Doctor</th><th>Specialization</th></tr></thead>
          <tbody>
            ${p.prescriptions.map(pr => `
              <tr>
                <td><span class="badge badge-pill">#${pr.prescription_id}</span></td>
                <td>${fmtDate(pr.prescription_date)}</td>
                <td>${pr.doctor_name}</td>
                <td>${pr.specialization}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : emptyState('📋', 'No prescriptions yet.')}
    `;
  } catch (err) {
    document.getElementById('modalBody').innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

function deletePatientConfirm(id, name) {
  confirmDelete(name, async () => {
    try {
      await api.deletePatient(id);
      toast(`${name} deleted (cascades to prescriptions).`, 'success');
      await loadPatientsTable();
      filterTable('patientSearch', 'patientTable');
      refreshAlertBadge();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
