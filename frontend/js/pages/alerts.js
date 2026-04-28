// frontend/js/pages/alerts.js

async function renderAlertsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Interaction Alerts</h1>
        <p>Auto-logged by SQLite trigger when prescriptions are created (mirrors Oracle AFTER INSERT trigger)</p>
      </div>
      <div class="flex" style="gap:8px">
        <select class="form-control" id="alertFilter" style="width:160px">
          <option value="">All Severities</option>
          <option value="HIGH">HIGH</option>
          <option value="MODERATE">MODERATE</option>
          <option value="LOW">LOW</option>
        </select>
      </div>
    </div>
    <div id="alertsList">${spinner()}</div>
  `;
  await loadAlerts();
  document.getElementById('alertFilter').addEventListener('change', loadAlerts);
}

async function loadAlerts() {
  const wrapper = document.getElementById('alertsList');
  if (!wrapper) return;
  const sev = document.getElementById('alertFilter')?.value || '';
  wrapper.innerHTML = spinner();
  try {
    const alerts = await api.getAlerts(sev);

    if (!alerts.length) {
      wrapper.innerHTML = emptyState('✅', 'No interaction alerts found.');
      return;
    }

    // Group by severity
    const grouped = { HIGH: [], MODERATE: [], LOW: [] };
    alerts.forEach(a => { if (grouped[a.severity]) grouped[a.severity].push(a); });

    let html = '';
    for (const [sev, items] of Object.entries(grouped)) {
      if (!items.length) continue;
      const icon = sev === 'HIGH' ? '🔴' : sev === 'MODERATE' ? '🟠' : '🟡';
      html += `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary);margin:0 0 12px">${icon} ${sev} (${items.length})</h3>`;
      items.forEach(a => {
        html += `
          <div class="alert-card ${sev.toLowerCase()}">
            <div class="alert-icon">${icon}</div>
            <div class="alert-content" style="flex:1">
              <div class="alert-title">${a.drug_a} + ${a.drug_b}</div>
              <div class="alert-sub" style="margin-top:4px">
                Patient: <strong>${a.patient_name}</strong> &nbsp;·&nbsp;
                Doctor: ${a.doctor_name} &nbsp;·&nbsp;
                Rx: <strong>#${a.prescription_id}</strong> &nbsp;·&nbsp;
                Detected: ${fmtDate(a.detected_on)}
              </div>
            </div>
            <div>
              <button class="btn btn-ghost btn-sm" onclick="viewPrescription(${a.prescription_id});navigateTo('prescriptions')">View Rx</button>
            </div>
          </div>
        `;
      });
      html += '<div style="margin-bottom:20px"></div>';
    }
    wrapper.innerHTML = html;
  } catch (err) {
    wrapper.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}
