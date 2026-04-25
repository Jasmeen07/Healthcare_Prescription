// frontend/js/pages/new-prescription.js

let selectedMedicines = []; // { medicine_id, medicine_name, dosage_form, dosage, duration_days }

async function renderNewPrescriptionPage(container) {
  selectedMedicines = [];
  container.innerHTML = spinner();

  try {
    const [patients, doctors, medicines] = await Promise.all([
      api.getPatients(), api.getDoctors(), api.getMedicines()
    ]);

    const patientOpts = patients.map(p => `<option value="${p.patient_id}">${p.name} (${p.age ?? '?'}yrs, ${genderLabel(p.gender)})</option>`).join('');
    const doctorOpts  = doctors.map(d  => `<option value="${d.doctor_id}">${d.name} — ${d.specialization}</option>`).join('');
    const medOpts     = medicines.map(m => `<option value="${m.medicine_id}" data-form="${m.dosage_form}">${m.medicine_name} (${m.dosage_form})</option>`).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>New Prescription</h1>
          <p>Interactions are auto-detected by the SQLite trigger on insert — mirrors Oracle's AFTER INSERT trigger</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">

        <!-- Form -->
        <div class="card">
          <div class="card-title">📋 Prescription Details</div>

          <div class="form-group">
            <label class="form-label">Patient *</label>
            <select class="form-control" id="rxPatient">
              <option value="">Select patient…</option>
              ${patientOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Doctor *</label>
            <select class="form-control" id="rxDoctor">
              <option value="">Select doctor…</option>
              ${doctorOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prescription Date</label>
            <input class="form-control" type="date" id="rxDate" value="${new Date().toISOString().split('T')[0]}" />
          </div>

          <div class="card-title" style="margin-top:8px">💊 Add Medicines</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px">
            <select class="form-control" id="medSelect">
              <option value="">Choose medicine…</option>
              ${medOpts}
            </select>
            <button class="btn btn-ghost" onclick="addMedicineRow()">+ Add</button>
          </div>

          <div id="medicineRows"></div>

          <div class="form-actions" style="margin-top:20px">
            <button class="btn btn-ghost" onclick="selectedMedicines=[];renderMedicineRows();toast('Reset.','default')">Reset</button>
            <button class="btn btn-primary" onclick="submitPrescription()">💾 Issue Prescription</button>
          </div>
        </div>

        <!-- Live preview + result -->
        <div>
          <div class="card" id="previewCard">
            <div class="card-title">👁 Preview</div>
            <div id="previewBody">
              <div class="empty-state" style="padding:20px">
                <div class="empty-icon" style="font-size:32px">📋</div>
                <p>Fill in the form to see a preview here</p>
              </div>
            </div>
          </div>
          <div id="resultCard" style="margin-top:16px"></div>
        </div>

      </div>
    `;

    // Live preview
    ['rxPatient','rxDoctor','rxDate'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', updatePreview);
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function addMedicineRow() {
  const sel = document.getElementById('medSelect');
  const id  = parseInt(sel.value);
  if (!id) { toast('Select a medicine first.', 'warning'); return; }
  const name = sel.options[sel.selectedIndex].text;
  const form = sel.options[sel.selectedIndex].dataset.form;

  if (selectedMedicines.find(m => m.medicine_id === id)) {
    toast('This medicine is already added.', 'warning');
    return;
  }
  selectedMedicines.push({ medicine_id: id, medicine_name: name.split(' (')[0], dosage_form: form, dosage: '', duration_days: '' });
  renderMedicineRows();
  updatePreview();
  sel.value = '';
}

function removeMedicineRow(idx) {
  selectedMedicines.splice(idx, 1);
  renderMedicineRows();
  updatePreview();
}

function renderMedicineRows() {
  const container = document.getElementById('medicineRows');
  if (!container) return;
  if (!selectedMedicines.length) {
    container.innerHTML = `<div class="empty-state" style="padding:16px"><p>No medicines added yet.</p></div>`;
    return;
  }
  container.innerHTML = selectedMedicines.map((m, i) => `
    <div class="medicine-row">
      <button class="remove-med" onclick="removeMedicineRow(${i})">✕</button>
      <div style="font-weight:600;margin-bottom:8px">${m.medicine_name} <span class="badge badge-pill">${m.dosage_form}</span></div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Dosage *</label>
          <input class="form-control" placeholder="e.g. 500mg twice daily"
            value="${m.dosage}"
            oninput="selectedMedicines[${i}].dosage=this.value;updatePreview()" />
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Duration (days) *</label>
          <input class="form-control" type="number" placeholder="e.g. 30" min="1"
            value="${m.duration_days}"
            oninput="selectedMedicines[${i}].duration_days=parseInt(this.value)||'';updatePreview()" />
        </div>
      </div>
    </div>
  `).join('');
}

function updatePreview() {
  const preview = document.getElementById('previewBody');
  if (!preview) return;
  const patSel = document.getElementById('rxPatient');
  const docSel = document.getElementById('rxDoctor');
  const date   = document.getElementById('rxDate')?.value;
  const patName = patSel?.options[patSel.selectedIndex]?.text || '—';
  const docName = docSel?.options[docSel.selectedIndex]?.text || '—';

  preview.innerHTML = `
    <div class="presc-meta-row"><span class="presc-meta-key">Patient:</span>${patSel?.value ? patName : '<span class="text-muted">Not selected</span>'}</div>
    <div class="presc-meta-row"><span class="presc-meta-key">Doctor:</span>${docSel?.value ? docName : '<span class="text-muted">Not selected</span>'}</div>
    <div class="presc-meta-row"><span class="presc-meta-key">Date:</span>${date || '—'}</div>
    <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
    ${selectedMedicines.length ? selectedMedicines.map(m => `
      <div style="margin-bottom:8px;font-size:13px">
        <strong>💊 ${m.medicine_name}</strong>
        <span class="badge badge-pill" style="margin-left:4px">${m.dosage_form}</span><br>
        <span class="text-muted">${m.dosage || 'Dosage not set'} · ${m.duration_days || '?'} days</span>
      </div>
    `).join('') : '<p class="text-muted" style="font-size:13px">No medicines added.</p>'}
  `;
}

async function submitPrescription() {
  const patient_id = document.getElementById('rxPatient')?.value;
  const doctor_id  = document.getElementById('rxDoctor')?.value;
  const prescription_date = document.getElementById('rxDate')?.value;

  if (!patient_id) { toast('Select a patient.', 'error'); return; }
  if (!doctor_id)  { toast('Select a doctor.', 'error'); return; }
  if (!selectedMedicines.length) { toast('Add at least one medicine.', 'error'); return; }
  for (const m of selectedMedicines) {
    if (!m.dosage) { toast(`Enter dosage for ${m.medicine_name}.`, 'error'); return; }
    if (!m.duration_days) { toast(`Enter duration for ${m.medicine_name}.`, 'error'); return; }
  }

  try {
    const result = await api.createPrescription({
      patient_id: +patient_id,
      doctor_id:  +doctor_id,
      prescription_date,
      medicines: selectedMedicines.map(m => ({
        medicine_id:   m.medicine_id,
        dosage:        m.dosage,
        duration_days: m.duration_days,
      }))
    });

    const resultCard = document.getElementById('resultCard');
    const sevClass = result.risk_score >= 3 ? 'high' : result.risk_score >= 2 ? 'moderate' : result.risk_score >= 1 ? 'low' : '';
    resultCard.innerHTML = `
      <div class="alert-card ${sevClass}" style="border-radius:var(--radius)">
        <div class="alert-icon">✅</div>
        <div class="alert-content">
          <div class="alert-title">Prescription #${result.prescription_id} created!</div>
          <div class="alert-sub">${result.message}</div>
          ${result.interaction_count > 0 ? `<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="navigateTo('alerts')">View ${result.interaction_count} Alert(s)</button></div>` : ''}
        </div>
      </div>
    `;

    toast('Prescription issued successfully!', 'success');
    selectedMedicines = [];
    renderMedicineRows();
    updatePreview();
    refreshAlertBadge();
  } catch (err) {
    toast(err.message, 'error');
  }
}
