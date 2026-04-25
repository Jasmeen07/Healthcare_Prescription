// frontend/js/pages/drug-checker.js

let checkerMeds = [];

async function renderDrugCheckerPage(container) {
  checkerMeds = [];
  container.innerHTML = spinner();
  try {
    const medicines = await api.getMedicines();
    const medOpts = medicines.map(m => `<option value="${m.medicine_id}" data-name="${m.medicine_name}">${m.medicine_name} (${m.dosage_form})</option>`).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Drug Interaction Checker</h1>
          <p>Select 2 or more medicines to instantly check all possible interaction pairs</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">

        <div class="card">
          <div class="card-title">💊 Select Medicines</div>
          <div class="checker-zone">
            <div class="medicine-tags" id="checkerTags">
              <span class="text-muted" style="font-size:13px;align-self:center" id="checkerPlaceholder">Add medicines below…</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px">
              <select class="form-control" id="checkerMedSelect">
                <option value="">Choose medicine…</option>
                ${medOpts}
              </select>
              <button class="btn btn-ghost" onclick="addCheckerMed()">+ Add</button>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" onclick="checkerMeds=[];renderCheckerTags();document.getElementById('checkerResults').innerHTML=''">Clear</button>
            <button class="btn btn-primary" onclick="runInteractionCheck()">🔍 Check Interactions</button>
          </div>
        </div>

        <div id="checkerResults">
          <div class="card">
            <div class="card-title">Results</div>
            ${emptyState('🔍', 'Add medicines and click Check Interactions')}
          </div>
        </div>
      </div>

      <!-- Full interaction DB quick view -->
      <div class="card" style="margin-top:24px">
        <div class="card-title">⚡ All Known Drug Interactions (Self-Join View)</div>
        <div id="allInteractionsTable">${spinner()}</div>
      </div>
    `;

    loadAllInteractionsTable();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function addCheckerMed() {
  const sel = document.getElementById('checkerMedSelect');
  const id  = parseInt(sel.value);
  if (!id) { toast('Select a medicine.', 'warning'); return; }
  const name = sel.options[sel.selectedIndex].dataset.name;
  if (checkerMeds.find(m => m.id === id)) { toast('Already added.', 'warning'); return; }
  checkerMeds.push({ id, name });
  renderCheckerTags();
  sel.value = '';
}

function removeCheckerMed(id) {
  checkerMeds = checkerMeds.filter(m => m.id !== id);
  renderCheckerTags();
}

function renderCheckerTags() {
  const tags = document.getElementById('checkerTags');
  const ph   = document.getElementById('checkerPlaceholder');
  if (!tags) return;
  if (!checkerMeds.length) {
    tags.innerHTML = `<span class="text-muted" style="font-size:13px;align-self:center" id="checkerPlaceholder">Add medicines below…</span>`;
    return;
  }
  tags.innerHTML = checkerMeds.map(m => `
    <span class="med-tag">
      ${m.name}
      <button onclick="removeCheckerMed(${m.id})">✕</button>
    </span>
  `).join('');
}

async function runInteractionCheck() {
  if (checkerMeds.length < 2) { toast('Add at least 2 medicines to check.', 'warning'); return; }
  const results = document.getElementById('checkerResults');
  results.innerHTML = spinner();
  try {
    const data = await api.checkInteraction(checkerMeds.map(m => m.id));
    const dangerous = data.filter(r => r.interaction_severity !== 'NONE');
    const safe      = data.filter(r => r.interaction_severity === 'NONE');

    let html = `<div class="card"><div class="card-title">Results — ${data.length} pair(s) checked</div>`;
    if (dangerous.length) {
      dangerous.forEach(r => {
        html += `
          <div class="interaction-result ${r.interaction_severity}">
            <div class="ir-drugs">${severityBadge(r.interaction_severity)} &nbsp; ${r.drug_1} + ${r.drug_2}</div>
            <div class="ir-desc">${r.description}</div>
          </div>
        `;
      });
    }
    if (safe.length) {
      safe.forEach(r => {
        html += `
          <div class="interaction-result NONE">
            <div class="ir-drugs">${severityBadge('NONE')} &nbsp; ${r.drug_1} + ${r.drug_2}</div>
            <div class="ir-desc">No known interaction.</div>
          </div>
        `;
      });
    }
    html += '</div>';
    results.innerHTML = html;
  } catch (err) {
    results.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

async function loadAllInteractionsTable() {
  const wrapper = document.getElementById('allInteractionsTable');
  if (!wrapper) return;
  try {
    const list = await api.getInteractions();
    if (!list.length) { wrapper.innerHTML = emptyState('⚡', 'No interactions defined.'); return; }
    wrapper.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>#</th><th>Drug 1</th><th>Drug 2</th><th>Severity</th><th>Description</th></tr></thead>
          <tbody>
            ${list.map(i => `
              <tr>
                <td><span class="badge badge-pill">${i.interaction_id}</span></td>
                <td><strong>${i.drug_1}</strong></td>
                <td><strong>${i.drug_2}</strong></td>
                <td>${severityBadge(i.interaction_severity)}</td>
                <td style="max-width:300px;font-size:12.5px;color:var(--text-secondary)">${i.description || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    wrapper.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}
