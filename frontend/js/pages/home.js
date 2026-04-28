// frontend/js/pages/home.js

async function renderHomePage(container) {
  try {
    const data = await api.getAnalytics();
    const k = data.kpis;

    container.innerHTML = `
      <div class="home-hero">
        <div class="home-hero-icon">🏥</div>
        <div>
          <h1>Healthcare Prescription Interaction Checker</h1>
          <p>A database-driven system for managing patient records, prescriptions, and detecting adverse drug interactions automatically via SQL triggers and PL/SQL-style stored logic.</p>
        </div>
      </div>

      <div class="kpi-grid" style="margin-bottom:28px">
        <div class="kpi-card">
          <div class="kpi-icon">👤</div>
          <div class="kpi-value">${k.total_patients}</div>
          <div class="kpi-label">Total Patients</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📋</div>
          <div class="kpi-value">${k.total_prescriptions}</div>
          <div class="kpi-label">Prescriptions</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🔴</div>
          <div class="kpi-value" style="color:var(--danger)">${k.high_risk_count}</div>
          <div class="kpi-label">High Risk Alerts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">💊</div>
          <div class="kpi-value">${k.total_medicines}</div>
          <div class="kpi-label">Medicines</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🩺</div>
          <div class="kpi-value">${k.total_doctors}</div>
          <div class="kpi-label">Doctors</div>
        </div>
      </div>

      <div class="home-grid">
        <a class="quick-card" onclick="navigateTo('patients')">
          <div class="quick-card-icon">👤</div>
          <h3>Patient Dashboard</h3>
          <p>View, add, edit and delete patient records with full medical history.</p>
        </a>
        <a class="quick-card" onclick="navigateTo('new-prescription')">
          <div class="quick-card-icon">✚</div>
          <h3>New Prescription</h3>
          <p>Issue a prescription — interactions are detected automatically via triggers.</p>
        </a>
        <a class="quick-card" onclick="navigateTo('alerts')">
          <div class="quick-card-icon">🔔</div>
          <h3>Interaction Alerts</h3>
          <p>${k.high_risk_count} high-risk drug interactions logged in the system.</p>
        </a>
        <a class="quick-card" onclick="navigateTo('drug-checker')">
          <div class="quick-card-icon">💊</div>
          <h3>Drug Interaction Checker</h3>
          <p>Instantly check any combination of medicines for known interactions.</p>
        </a>
        <a class="quick-card" onclick="navigateTo('analytics')">
          <div class="quick-card-icon">📊</div>
          <h3>Analytics</h3>
          <p>Aggregate queries, risk distributions, top medicines, and more.</p>
        </a>
        <a class="quick-card" onclick="navigateTo('prescriptions')">
          <div class="quick-card-icon">📋</div>
          <h3>Prescription History</h3>
          <p>Browse all prescriptions with risk scores computed on the fly.</p>
        </a>
      </div>

      <div class="card mt-16" style="margin-top:24px">
        <div class="card-title">📚 DBMS Features Used</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;font-size:13px">
          <div><strong>DDL:</strong> CREATE TABLE, CHECK constraints, FOREIGN KEYS, INDEXES</div>
          <div><strong>DML:</strong> INSERT, UPDATE, DELETE with referential integrity</div>
          <div><strong>Triggers:</strong> Auto interaction detection on INSERT</div>
          <div><strong>Joins:</strong> INNER JOIN, SELF JOIN across 6 tables</div>
          <div><strong>Subqueries:</strong> Nested SELECT for high-risk patient filtering</div>
          <div><strong>Aggregates:</strong> COUNT, AVG, GROUP BY, HAVING</div>
          <div><strong>Transactions:</strong> COMMIT / ROLLBACK on prescription creation</div>
          <div><strong>Normalization:</strong> 3NF — no partial or transitive dependencies</div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not connect to server. Make sure the backend is running on port 3000.<br><br><code>node backend/server.js</code></p></div>`;
  }
}
