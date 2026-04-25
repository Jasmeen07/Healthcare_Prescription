// frontend/js/pages/interactions-db.js

async function renderInteractionsDbPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Interaction Database</h1><p>Define known drug-drug interaction pairs with severity levels — referenced by triggers</p></div>
      <div class="flex" style="gap:10px">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="intSearch" placeholder="Search interactions…" />
        </div>
        <button class="btn btn-primary" onclick="openAddInteractionModal()">+ Add Interaction</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrapper" id="intTableWrapper">${spinner()}</div>
    </div>
  `;
  await loadIntTable();
  filterTable('intSearch', 'intTable');
}

async function loadIntTable() {
  const wrapper = document.getElementById('intTableWrapper');
  if (!wrapper) return;
  try {
    const list = await api.getInteractions();
    if (!list.length) { wrapper.innerHTML = emptyState('⚡', 'No interactions defined.'); return; }
    wrapper.innerHTML = `
      <table id="intTable">
        <thead><tr><th>ID</th><th>Drug 1</th><th>Drug 2</th><th>Severity</th><th>Description</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map(i => `
            <tr>
              <td><span class="badge badge-pill">#${i.interaction_id}</span></td>
              <td><strong>${i.drug_1}</strong></td>
              <td><strong>${i.drug_2}</strong></td>
              <td>${severityBadge(i.interaction_severity)}</td>
              <td style="max-width:260px;font-size:12.5px;color:var(--text-secondary)" title="${i.description||''}">${i.description ? i.description.substring(0, 80) + (i.description.length > 80 ? '…' : '') : '—'}</td>
              <td>
                <div class="flex" style="gap:6px">
                  <button class="btn btn-ghost btn-sm" onclick="openEditInteractionModal(${i.interaction_id},${i.medicine_id_1},${i.medicine_id_2},'${i.interaction_severity}',\`${(i.description||'').replace(/`/g,"'")}\`)">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteInteractionConfirm(${i.interaction_id},'${escQ(i.drug_1)} + ${escQ(i.drug_2)}')">Delete</button>
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

async function openAddInteractionModal() {
  const medicines = await api.getMedicines();
  openModal('Add Drug Interaction', interactionForm({}, medicines));
}
async function openEditInteractionModal(id, m1, m2, sev, desc) {
  const medicines = await api.getMedicines();
  openModal('Edit Drug Interaction', interactionForm({ id, medicine_id_1: m1, medicine_id_2: m2, interaction_severity: sev, description: desc }, medicines));
}

function interactionForm(data = {}, medicines = []) {
  const { id, medicine_id_1 = '', medicine_id_2 = '', interaction_severity = '', description = '' } = data;
  const opts = medicines.map(m => `<option value="${m.medicine_id}">${m.medicine_name} (${m.dosage_form})</option>`).join('');
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Drug 1 *</label>
        <select class="form-control" id="iMed1">
          <option value="">Select…</option>${opts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Drug 2 *</label>
        <select class="form-control" id="iMed2">
          <option value="">Select…</option>${opts}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Severity * <span style="font-size:11px;color:var(--text-secondary)">(CHECK constraint: HIGH/MODERATE/LOW)</span></label>
      <select class="form-control" id="iSev">
        <option value="">Select…</option>
        <option value="HIGH" ${interaction_severity==='HIGH'?'selected':''}>HIGH</option>
        <option value="MODERATE" ${interaction_severity==='MODERATE'?'selected':''}>MODERATE</option>
        <option value="LOW" ${interaction_severity==='LOW'?'selected':''}>LOW</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="iDesc">${description}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveInteraction(${id||'null'})">${id?'Update':'Add'} Interaction</button>
    </div>
  `;
  // Set values after render by delaying slightly
  setTimeout(() => {
    if (medicine_id_1) document.getElementById('iMed1').value = medicine_id_1;
    if (medicine_id_2) document.getElementById('iMed2').value = medicine_id_2;
  }, 10);
}

async function saveInteraction(id) {
  const m1  = parseInt(document.getElementById('iMed1').value);
  const m2  = parseInt(document.getElementById('iMed2').value);
  const sev = document.getElementById('iSev').value;
  const desc= document.getElementById('iDesc').value.trim();

  if (!m1 || !m2 || !sev) { toast('Drug 1, Drug 2, and Severity are required.', 'error'); return; }
  if (m1 === m2) { toast('A drug cannot interact with itself.', 'error'); return; }

  try {
    if (id) {
      await api.updateInteraction(id, { medicine_id_1: m1, medicine_id_2: m2, interaction_severity: sev, description: desc });
      toast('Interaction updated.', 'success');
    } else {
      await api.createInteraction({ medicine_id_1: m1, medicine_id_2: m2, interaction_severity: sev, description: desc });
      toast('Interaction added.', 'success');
    }
    closeModal();
    await loadIntTable();
    filterTable('intSearch', 'intTable');
  } catch (err) { toast(err.message, 'error'); }
}

function deleteInteractionConfirm(id, label) {
  confirmDelete(label, async () => {
    try {
      await api.deleteInteraction(id);
      toast('Interaction deleted.', 'success');
      await loadIntTable();
      filterTable('intSearch', 'intTable');
    } catch (err) { toast(err.message, 'error'); }
  });
}
