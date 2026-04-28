// frontend/js/pages/medicines.js

async function renderMedicinesPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Medicines</h1><p>Manage the medicine catalogue with dosage form validation (CHECK constraint)</p></div>
      <div class="flex" style="gap:10px">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="medSearch" placeholder="Search medicines…" />
        </div>
        <button class="btn btn-primary" onclick="openAddMedModal()">+ Add Medicine</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrapper" id="medTableWrapper">${spinner()}</div>
    </div>
  `;
  await loadMedTable();
  filterTable('medSearch', 'medTable');
}

async function loadMedTable() {
  const wrapper = document.getElementById('medTableWrapper');
  if (!wrapper) return;
  try {
    const meds = await api.getMedicines();
    if (!meds.length) { wrapper.innerHTML = emptyState('💊', 'No medicines found.'); return; }
    wrapper.innerHTML = `
      <table id="medTable">
        <thead><tr><th>ID</th><th>Medicine Name</th><th>Dosage Form</th><th>Times Prescribed</th><th>Actions</th></tr></thead>
        <tbody>
          ${meds.map(m => `
            <tr>
              <td><span class="badge badge-pill">#${m.medicine_id}</span></td>
              <td><strong>${m.medicine_name}</strong></td>
              <td><span class="badge badge-pill">${m.dosage_form}</span></td>
              <td><span class="badge badge-info">${m.times_prescribed}</span></td>
              <td>
                <div class="flex" style="gap:6px">
                  <button class="btn btn-ghost btn-sm" onclick="openEditMedModal(${m.medicine_id},'${escQ(m.medicine_name)}','${m.dosage_form}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteMedConfirm(${m.medicine_id},'${escQ(m.medicine_name)}')">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrapper.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

const DOSAGE_FORMS = ['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler'];

function openAddMedModal() { openModal('Add Medicine', medForm()); }
function openEditMedModal(id, name, form) { openModal('Edit Medicine', medForm({ id, name, dosage_form: form })); }

function medForm(data = {}) {
  const { id, name = '', dosage_form = '' } = data;
  return `
    <div class="form-group">
      <label class="form-label">Medicine Name *</label>
      <input class="form-control" id="mName" value="${name}" placeholder="e.g. Warfarin" />
    </div>
    <div class="form-group">
      <label class="form-label">Dosage Form * <span style="font-size:11px;color:var(--text-secondary)">(CHECK constraint enforced)</span></label>
      <select class="form-control" id="mForm">
        <option value="">Select form…</option>
        ${DOSAGE_FORMS.map(f => `<option value="${f}" ${dosage_form===f?'selected':''}>${f}</option>`).join('')}
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveMed(${id||'null'})">${id?'Update':'Add'} Medicine</button>
    </div>
  `;
}

async function saveMed(id) {
  const name = document.getElementById('mName').value.trim();
  const form = document.getElementById('mForm').value;
  if (!name || !form) { toast('All fields are required.', 'error'); return; }
  try {
    if (id) { await api.updateMedicine(id, { medicine_name: name, dosage_form: form }); toast('Medicine updated.', 'success'); }
    else    { await api.createMedicine({ medicine_name: name, dosage_form: form }); toast('Medicine added.', 'success'); }
    closeModal();
    await loadMedTable();
    filterTable('medSearch', 'medTable');
  } catch (err) { toast(err.message, 'error'); }
}

function deleteMedConfirm(id, name) {
  confirmDelete(name, async () => {
    try {
      await api.deleteMedicine(id);
      toast(`${name} deleted.`, 'success');
      await loadMedTable();
      filterTable('medSearch', 'medTable');
    } catch (err) { toast(err.message, 'error'); }
  });
}
