// frontend/js/pages/analytics.js

async function renderAnalyticsPage(container) {
  container.innerHTML = spinner();
  try {
    const d = await api.getAnalytics();
    const k = d.kpis;

    const sevCount = { HIGH: 0, MODERATE: 0, LOW: 0 };
    d.severityDist.forEach(s => { sevCount[s.severity] = s.count; });
    const totalAlerts = Object.values(sevCount).reduce((a, b) => a + b, 0);

    const maxMed = d.topMedicines[0]?.times_prescribed || 1;
    const maxDoc = d.topDoctors[0]?.total_prescriptions || 1;

    container.innerHTML = `
      <div class="page-header">
        <div><h1>Analytics</h1><p>Aggregate queries, risk analysis, and trends across the healthcare database</p></div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-icon">👤</div><div class="kpi-value">${k.total_patients}</div><div class="kpi-label">Patients</div></div>
        <div class="kpi-card"><div class="kpi-icon">📋</div><div class="kpi-value">${k.total_prescriptions}</div><div class="kpi-label">Prescriptions</div></div>
        <div class="kpi-card"><div class="kpi-icon">🔴</div><div class="kpi-value" style="color:var(--danger)">${k.high_risk_count}</div><div class="kpi-label">High Risk Alerts</div></div>
        <div class="kpi-card"><div class="kpi-icon">💊</div><div class="kpi-value">${k.total_medicines}</div><div class="kpi-label">Medicines</div></div>
        <div class="kpi-card"><div class="kpi-icon">🩺</div><div class="kpi-value">${k.total_doctors}</div><div class="kpi-label">Doctors</div></div>
      </div>

      <!-- Row 1 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">

        <!-- Top Medicines -->
        <div class="card">
          <div class="card-title">💊 Top 5 Prescribed Medicines <span style="font-size:11px;color:var(--text-secondary);font-weight:400">(GROUP BY + ORDER BY)</span></div>
          <div class="bar-chart">
            ${d.topMedicines.map(m => `
              <div class="bar-row">
                <div class="bar-label" title="${m.medicine_name}">${m.medicine_name}</div>
                <div class="bar-track">
                  <div class="bar-fill accent" style="width:${Math.round(m.times_prescribed/maxMed*100)}%"></div>
                </div>
                <div class="bar-val">${m.times_prescribed}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Alert Severity Distribution -->
        <div class="card">
          <div class="card-title">⚠️ Interaction Severity Distribution <span style="font-size:11px;color:var(--text-secondary);font-weight:400">(Trigger logs)</span></div>
          <div class="donut-grid">
            <div class="donut-stat">
              <div class="donut-num" style="color:var(--high-text)">${sevCount.HIGH}</div>
              <div class="donut-lbl">🔴 High</div>
            </div>
            <div class="donut-stat">
              <div class="donut-num" style="color:var(--moderate-text)">${sevCount.MODERATE}</div>
              <div class="donut-lbl">🟠 Moderate</div>
            </div>
            <div class="donut-stat">
              <div class="donut-num" style="color:var(--low-text)">${sevCount.LOW}</div>
              <div class="donut-lbl">🟡 Low</div>
            </div>
            <div class="donut-stat">
              <div class="donut-num">${totalAlerts}</div>
              <div class="donut-lbl">Total Logs</div>
            </div>
          </div>
          <div class="bar-chart" style="margin-top:16px">
            ${[['HIGH', sevCount.HIGH, 'danger'], ['MODERATE', sevCount.MODERATE, 'accent'], ['LOW', sevCount.LOW, '']].map(([label, val, cls]) => `
              <div class="bar-row">
                <div class="bar-label">${label}</div>
                <div class="bar-track">
                  <div class="bar-fill ${cls}" style="width:${totalAlerts ? Math.round(val/totalAlerts*100) : 0}%"></div>
                </div>
                <div class="bar-val">${totalAlerts ? Math.round(val/totalAlerts*100) : 0}%</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Row 2 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">

        <!-- Top Doctors -->
        <div class="card">
          <div class="card-title">🩺 Doctors by Prescriptions Issued</div>
          <div class="bar-chart">
            ${d.topDoctors.map(doc => `
              <div class="bar-row">
                <div class="bar-label" title="${doc.doctor_name}">${doc.doctor_name}</div>
                <div class="bar-track">
                  <div class="bar-fill info" style="width:${Math.round(doc.total_prescriptions/maxDoc*100)}%"></div>
                </div>
                <div class="bar-val">${doc.total_prescriptions}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- High-risk patients avg age by gender -->
        <div class="card">
          <div class="card-title">📐 Avg Age of High-Risk Patients by Gender <span style="font-size:11px;color:var(--text-secondary);font-weight:400">(Subquery + AVG)</span></div>
          ${d.avgAgeByGender.length ? `
            <div class="donut-grid">
              ${d.avgAgeByGender.map(r => `
                <div class="donut-stat">
                  <div class="donut-num">${r.avg_age}</div>
                  <div class="donut-lbl">${genderLabel(r.gender)}<br>${r.patient_count} patients</div>
                </div>
              `).join('')}
            </div>
          ` : emptyState('📐', 'No high-risk patient data.')}
        </div>
      </div>

      <!-- Monthly Trend -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">📅 Monthly Prescription Trend</div>
        ${d.monthlyTrend.length ? (() => {
          const maxV = Math.max(...d.monthlyTrend.map(m => m.count));
          return `<div class="bar-chart">
            ${d.monthlyTrend.map(m => `
              <div class="bar-row">
                <div class="bar-label">${m.month}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${Math.round(m.count/maxV*100)}%"></div>
                </div>
                <div class="bar-val">${m.count}</div>
              </div>
            `).join('')}
          </div>`;
        })() : emptyState('📅', 'No trend data.')}
      </div>

      <!-- High-risk patients table -->
      <div class="card">
        <div class="card-title">🔴 Patients with HIGH-Risk Interactions <span style="font-size:11px;color:var(--text-secondary);font-weight:400">(Subquery: WHERE patient_id IN (SELECT …))</span></div>
        ${d.highRiskPatients.length ? `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Gender</th></tr></thead>
              <tbody>
                ${d.highRiskPatients.map(p => `
                  <tr>
                    <td><span class="badge badge-pill">#${p.patient_id}</span></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.age ?? '—'}</td>
                    <td>${genderLabel(p.gender)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : emptyState('✅', 'No high-risk patients.')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}
