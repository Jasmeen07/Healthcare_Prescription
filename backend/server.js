// backend/server.js
// Healthcare Prescription Interaction Checker — Express + MySQL API
// Start: node backend/server.js

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── EDIT THESE TO MATCH YOUR MySQL SETUP ────────────────────────────────────
const DB_CONFIG = {
  host:     process.env.MYSQLHOST     || 'localhost',
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || '1234',
  database: process.env.MYSQLDATABASE || 'healthcare_db',
  port:     process.env.MYSQLPORT     || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : false,
};
// ─────────────────────────────────────────────────────────────────────────────

// Connection pool (reused across all requests)
const pool = mysql.createPool(DB_CONFIG);

// Quick helper: run a query and return rows
async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/patients', async (req, res) => {
  try {
    const rows = await q(`
      SELECT p.*, COUNT(pr.prescription_id) AS prescription_count
      FROM patient p
      LEFT JOIN prescription pr ON pr.patient_id = p.patient_id
      GROUP BY p.patient_id
      ORDER BY p.name
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/patients/:id', async (req, res) => {
  try {
    const [patient] = await q(`SELECT * FROM patient WHERE patient_id = ?`, [req.params.id]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const prescriptions = await q(`
      SELECT pr.prescription_id, pr.prescription_date, d.name AS doctor_name, d.specialization
      FROM prescription pr
      JOIN doctor d ON d.doctor_id = pr.doctor_id
      WHERE pr.patient_id = ?
      ORDER BY pr.prescription_date DESC
    `, [req.params.id]);
    res.json({ ...patient, prescriptions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/patients', async (req, res) => {
  const { name, age, gender, medical_history } = req.body;
  if (!name || !gender) return res.status(400).json({ error: 'Name and gender are required.' });
  if (!['M','F','O'].includes(gender)) return res.status(400).json({ error: 'Gender must be M, F, or O.' });
  try {
    const result = await q(
      `INSERT INTO patient(name,age,gender,medical_history) VALUES (?,?,?,?)`,
      [name, age || null, gender, medical_history || null]
    );
    res.status(201).json({ patient_id: result.insertId, name, age, gender, medical_history });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/patients/:id', async (req, res) => {
  const { name, age, gender, medical_history } = req.body;
  if (!name || !gender) return res.status(400).json({ error: 'Name and gender are required.' });
  try {
    await q(
      `UPDATE patient SET name=?,age=?,gender=?,medical_history=? WHERE patient_id=?`,
      [name, age || null, gender, medical_history || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    await q(`DELETE FROM patient WHERE patient_id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCTORS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/doctors', async (req, res) => {
  try {
    const rows = await q(`
      SELECT d.*, COUNT(pr.prescription_id) AS prescription_count
      FROM doctor d
      LEFT JOIN prescription pr ON pr.doctor_id = d.doctor_id
      GROUP BY d.doctor_id ORDER BY d.name
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/doctors', async (req, res) => {
  const { name, specialization } = req.body;
  if (!name || !specialization) return res.status(400).json({ error: 'Name and specialization required.' });
  try {
    const result = await q(`INSERT INTO doctor(name,specialization) VALUES (?,?)`, [name, specialization]);
    res.status(201).json({ doctor_id: result.insertId, name, specialization });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/doctors/:id', async (req, res) => {
  const { name, specialization } = req.body;
  if (!name || !specialization) return res.status(400).json({ error: 'Name and specialization required.' });
  try {
    await q(`UPDATE doctor SET name=?,specialization=? WHERE doctor_id=?`, [name, specialization, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/doctors/:id', async (req, res) => {
  try {
    await q(`DELETE FROM doctor WHERE doctor_id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// MEDICINES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/medicines', async (req, res) => {
  try {
    const rows = await q(`
      SELECT m.*, COUNT(DISTINCT pd.prescription_id) AS times_prescribed
      FROM medicine m
      LEFT JOIN prescription_details pd ON pd.medicine_id = m.medicine_id
      GROUP BY m.medicine_id ORDER BY m.medicine_name
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/medicines', async (req, res) => {
  const { medicine_name, dosage_form } = req.body;
  const VALID = ['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler'];
  if (!medicine_name || !dosage_form) return res.status(400).json({ error: 'All fields required.' });
  if (!VALID.includes(dosage_form)) return res.status(400).json({ error: 'Invalid dosage form.' });
  try {
    const result = await q(`INSERT INTO medicine(medicine_name,dosage_form) VALUES (?,?)`, [medicine_name, dosage_form]);
    res.status(201).json({ medicine_id: result.insertId, medicine_name, dosage_form });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/medicines/:id', async (req, res) => {
  const { medicine_name, dosage_form } = req.body;
  try {
    await q(`UPDATE medicine SET medicine_name=?,dosage_form=? WHERE medicine_id=?`, [medicine_name, dosage_form, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/medicines/:id', async (req, res) => {
  try {
    await q(`DELETE FROM medicine WHERE medicine_id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DRUG INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/interactions', async (req, res) => {
  try {
    const rows = await q(`
      SELECT di.interaction_id, di.medicine_id_1, di.medicine_id_2,
             m1.medicine_name AS drug_1, m2.medicine_name AS drug_2,
             di.interaction_severity, di.description
      FROM drug_interaction di
      JOIN medicine m1 ON m1.medicine_id = di.medicine_id_1
      JOIN medicine m2 ON m2.medicine_id = di.medicine_id_2
      ORDER BY FIELD(di.interaction_severity,'HIGH','MODERATE','LOW')
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/interactions', async (req, res) => {
  const { medicine_id_1, medicine_id_2, interaction_severity, description } = req.body;
  if (!medicine_id_1 || !medicine_id_2 || !interaction_severity)
    return res.status(400).json({ error: 'medicine_id_1, medicine_id_2, and severity are required.' });
  if (medicine_id_1 == medicine_id_2)
    return res.status(400).json({ error: 'A medicine cannot interact with itself.' });
  try {
    const result = await q(
      `INSERT INTO drug_interaction(medicine_id_1,medicine_id_2,interaction_severity,description) VALUES (?,?,?,?)`,
      [medicine_id_1, medicine_id_2, interaction_severity, description || null]
    );
    res.status(201).json({ interaction_id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This drug pair already exists.' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/interactions/:id', async (req, res) => {
  const { medicine_id_1, medicine_id_2, interaction_severity, description } = req.body;
  try {
    await q(
      `UPDATE drug_interaction SET medicine_id_1=?,medicine_id_2=?,interaction_severity=?,description=? WHERE interaction_id=?`,
      [medicine_id_1, medicine_id_2, interaction_severity, description || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/interactions/:id', async (req, res) => {
  try {
    await q(`DELETE FROM drug_interaction WHERE interaction_id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTIONS — uses vw_prescription_overview VIEW + get_risk_score FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/prescriptions', async (req, res) => {
  try {
    // Uses the MySQL VIEW (vw_prescription_overview) which calls get_risk_score()
    const rows = await q(`SELECT * FROM vw_prescription_overview ORDER BY prescription_date DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/prescriptions/:id', async (req, res) => {
  try {
    const [presc] = await q(`
      SELECT pr.*, pat.name AS patient_name, pat.age, pat.gender, pat.medical_history,
             d.name AS doctor_name, d.specialization,
             get_risk_score(pr.prescription_id) AS risk_score
      FROM prescription pr
      JOIN patient pat ON pat.patient_id = pr.patient_id
      JOIN doctor  d   ON d.doctor_id    = pr.doctor_id
      WHERE pr.prescription_id = ?
    `, [req.params.id]);
    if (!presc) return res.status(404).json({ error: 'Not found' });

    const medicines = await q(`
      SELECT m.medicine_id, m.medicine_name, m.dosage_form, pd.dosage, pd.duration_days
      FROM prescription_details pd
      JOIN medicine m ON m.medicine_id = pd.medicine_id
      WHERE pd.prescription_id = ?
    `, [req.params.id]);

    const alerts = await q(`
      SELECT il.*, m1.medicine_name AS drug_a, m2.medicine_name AS drug_b
      FROM interaction_log il
      JOIN medicine m1 ON m1.medicine_id = il.medicine_id_1
      JOIN medicine m2 ON m2.medicine_id = il.medicine_id_2
      WHERE il.prescription_id = ?
    `, [req.params.id]);

    res.json({ ...presc, medicines, alerts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — uses add_prescription stored procedure + triggers fire during detail inserts
app.post('/api/prescriptions', async (req, res) => {
  const { patient_id, doctor_id, prescription_date, medicines } = req.body;
  if (!patient_id || !doctor_id || !medicines || !medicines.length)
    return res.status(400).json({ error: 'patient_id, doctor_id, and medicines are required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insert prescription
    const pDate = prescription_date || new Date().toISOString().split('T')[0];
    const [result] = await conn.query(
      `INSERT INTO prescription(patient_id,doctor_id,prescription_date) VALUES (?,?,?)`,
      [patient_id, doctor_id, pDate]
    );
    const prescriptionId = result.insertId;

    // Insert each medicine — MySQL trigger fires for each row automatically
    for (const m of medicines) {
      if (!m.dosage || !m.duration_days)
        throw new Error(`Dosage and duration required for medicine ID ${m.medicine_id}`);
      await conn.query(
        `INSERT INTO prescription_details(prescription_id,medicine_id,dosage,duration_days) VALUES (?,?,?,?)`,
        [prescriptionId, m.medicine_id, m.dosage, m.duration_days]
      );
    }

    await conn.commit();

    // Get risk score using the MySQL FUNCTION
    const [[{ risk_score }]] = await conn.query(
      `SELECT get_risk_score(?) AS risk_score`, [prescriptionId]
    );
    const [[{ alert_count }]] = await conn.query(
      `SELECT COUNT(*) AS alert_count FROM interaction_log WHERE prescription_id=?`, [prescriptionId]
    );

    res.status(201).json({
      prescription_id: prescriptionId,
      risk_score,
      interaction_count: alert_count,
      message: risk_score >= 3 ? '⚠️ HIGH RISK — Review Required'
              : risk_score >= 2 ? '⚠️ MODERATE RISK — Monitor Patient'
              : risk_score >= 1 ? '⚠️ LOW RISK — Note in Record'
              : '✅ No Known Interactions Detected'
    });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/prescriptions/:id', async (req, res) => {
  try {
    await q(`DELETE FROM prescription WHERE prescription_id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS — uses vw_high_risk_alerts VIEW
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/alerts', async (req, res) => {
  try {
    const { severity } = req.query;
    let sql = `SELECT * FROM vw_high_risk_alerts`;
    const params = [];
    if (severity) { sql += ` WHERE severity = ?`; params.push(severity.toUpperCase()); }
    sql += ` ORDER BY detected_on DESC`;
    const rows = await q(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — complex queries using JOINs, subqueries, aggregates
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/analytics', async (req, res) => {
  try {
    // KPIs
    const [kpiRow] = await q(`
      SELECT
        (SELECT COUNT(*) FROM patient)      AS total_patients,
        (SELECT COUNT(*) FROM prescription) AS total_prescriptions,
        (SELECT COUNT(*) FROM interaction_log WHERE severity='HIGH') AS high_risk_count,
        (SELECT COUNT(*) FROM medicine)     AS total_medicines,
        (SELECT COUNT(*) FROM doctor)       AS total_doctors
    `);

    // Top 5 medicines — GROUP BY + COUNT + ORDER BY
    const topMedicines = await q(`
      SELECT m.medicine_name, m.dosage_form, COUNT(*) AS times_prescribed
      FROM prescription_details pd
      JOIN medicine m ON m.medicine_id = pd.medicine_id
      GROUP BY m.medicine_id, m.medicine_name, m.dosage_form
      ORDER BY times_prescribed DESC
      LIMIT 5
    `);

    // Doctors by prescriptions — JOIN + GROUP BY
    const topDoctors = await q(`
      SELECT d.name AS doctor_name, d.specialization, COUNT(*) AS total_prescriptions
      FROM prescription pr
      JOIN doctor d ON d.doctor_id = pr.doctor_id
      GROUP BY d.doctor_id, d.name, d.specialization
      ORDER BY total_prescriptions DESC
    `);

    // Avg age of high-risk patients by gender — nested subquery + AVG
    const avgAgeByGender = await q(`
      SELECT p.gender,
             ROUND(AVG(p.age), 1) AS avg_age,
             COUNT(DISTINCT p.patient_id) AS patient_count
      FROM patient p
      WHERE p.patient_id IN (
        SELECT pr.patient_id FROM prescription pr
        JOIN interaction_log il ON il.prescription_id = pr.prescription_id
        WHERE il.severity = 'HIGH'
      )
      GROUP BY p.gender
    `);

    // Severity distribution
    const severityDist = await q(`
      SELECT severity, COUNT(*) AS count
      FROM interaction_log
      GROUP BY severity
    `);

    // Monthly trend
    const monthlyTrend = await q(`
      SELECT DATE_FORMAT(prescription_date,'%Y-%m') AS month, COUNT(*) AS count
      FROM prescription
      GROUP BY month ORDER BY month
    `);

    // High-risk patients (subquery)
    const highRiskPatients = await q(`
      SELECT DISTINCT pat.patient_id, pat.name, pat.age, pat.gender
      FROM patient pat
      WHERE pat.patient_id IN (
        SELECT pr.patient_id FROM prescription pr
        JOIN interaction_log il ON il.prescription_id = pr.prescription_id
        WHERE il.severity = 'HIGH'
      )
    `);

    res.json({ kpis: kpiRow, topMedicines, topDoctors, avgAgeByGender, severityDist, monthlyTrend, highRiskPatients });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DRUG INTERACTION CHECKER (ad-hoc pair check)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/check-interaction', async (req, res) => {
  const { medicine_ids } = req.body;
  if (!medicine_ids || medicine_ids.length < 2)
    return res.status(400).json({ error: 'Provide at least 2 medicine IDs.' });
  try {
    const results = [];
    for (let i = 0; i < medicine_ids.length; i++) {
      for (let j = i + 1; j < medicine_ids.length; j++) {
        const m1 = medicine_ids[i], m2 = medicine_ids[j];
        const [found] = await q(`
          SELECT di.*, med1.medicine_name AS drug_1, med2.medicine_name AS drug_2
          FROM drug_interaction di
          JOIN medicine med1 ON med1.medicine_id = di.medicine_id_1
          JOIN medicine med2 ON med2.medicine_id = di.medicine_id_2
          WHERE (di.medicine_id_1=? AND di.medicine_id_2=?)
             OR (di.medicine_id_1=? AND di.medicine_id_2=?)
          LIMIT 1
        `, [m1,m2,m2,m1]);
        if (found) {
          results.push(found);
        } else {
          const [[n1]] = await pool.query(`SELECT medicine_name FROM medicine WHERE medicine_id=?`,[m1]);
          const [[n2]] = await pool.query(`SELECT medicine_name FROM medicine WHERE medicine_id=?`,[m2]);
          results.push({ drug_1: n1?.medicine_name||m1, drug_2: n2?.medicine_name||m2, interaction_severity:'NONE', description:'No known interaction.' });
        }
      }
    }
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Serve frontend
// ─────────────────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏥 Healthcare Prescription Checker`);
  console.log(`   Running on port ${PORT}\n`);
});