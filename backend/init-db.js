// backend/init-db.js
// Run ONCE to create + seed the MySQL database
// Command: node backend/init-db.js
//
// BEFORE RUNNING:
//   1. Start MySQL (via XAMPP Control Panel → Start MySQL)
//   2. Open MySQL Workbench or phpMyAdmin
//   3. Run:  CREATE DATABASE healthcare_db;
//   4. Edit DB_CONFIG below with your credentials

const mysql = require('mysql2/promise');

// ─── EDIT THESE ───────────────────────────────────────────────────────────────
const DB_CONFIG = {
  host:     process.env.MYSQLHOST     || 'localhost',
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || '1234',
  database: process.env.MYSQLDATABASE || 'healthcare_db',
  port:     process.env.MYSQLPORT     || 3306,
  multipleStatements: true,
  ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : false,
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL\n');

    // Drop all in safe order
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    for (const t of ['interaction_log','prescription_details','prescription','drug_interaction','medicine','doctor','patient']) {
      await conn.query(`DROP TABLE IF EXISTS ${t}`);
    }
    for (const v of ['vw_prescription_overview','vw_high_risk_alerts']) {
      await conn.query(`DROP VIEW IF EXISTS ${v}`);
    }
    await conn.query(`DROP PROCEDURE IF EXISTS add_prescription`);
    await conn.query(`DROP FUNCTION  IF EXISTS get_risk_score`);
    await conn.query(`DROP TRIGGER   IF EXISTS trg_validate_duplicate_medicine`);
    await conn.query(`DROP TRIGGER   IF EXISTS trg_interaction_alert`);
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // ── TABLES ────────────────────────────────────────────────────────────────

    await conn.query(`
      CREATE TABLE patient (
        patient_id      INT          PRIMARY KEY AUTO_INCREMENT,
        name            VARCHAR(100) NOT NULL,
        age             INT          CHECK(age > 0 AND age < 150),
        gender          CHAR(1)      NOT NULL CHECK(gender IN ('M','F','O')),
        medical_history TEXT
      )
    `);

    await conn.query(`
      CREATE TABLE doctor (
        doctor_id      INT          PRIMARY KEY AUTO_INCREMENT,
        name           VARCHAR(100) NOT NULL,
        specialization VARCHAR(100) NOT NULL
      )
    `);

    await conn.query(`
      CREATE TABLE medicine (
        medicine_id   INT          PRIMARY KEY AUTO_INCREMENT,
        medicine_name VARCHAR(100) NOT NULL,
        dosage_form   VARCHAR(20)  NOT NULL
          CHECK(dosage_form IN ('Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler'))
      )
    `);

    await conn.query(`
      CREATE TABLE prescription (
        prescription_id   INT  PRIMARY KEY AUTO_INCREMENT,
        patient_id        INT  NOT NULL,
        doctor_id         INT  NOT NULL,
        prescription_date DATE NOT NULL DEFAULT (CURDATE()),
        FOREIGN KEY (patient_id) REFERENCES patient(patient_id)  ON DELETE CASCADE,
        FOREIGN KEY (doctor_id)  REFERENCES doctor(doctor_id)    ON DELETE RESTRICT
      )
    `);

    await conn.query(`
      CREATE TABLE prescription_details (
        prescription_id INT          NOT NULL,
        medicine_id     INT          NOT NULL,
        dosage          VARCHAR(100) NOT NULL,
        duration_days   INT          CHECK(duration_days > 0),
        PRIMARY KEY (prescription_id, medicine_id),
        FOREIGN KEY (prescription_id) REFERENCES prescription(prescription_id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id)     REFERENCES medicine(medicine_id)         ON DELETE RESTRICT
      )
    `);

    await conn.query(`
      CREATE TABLE drug_interaction (
        interaction_id       INT         PRIMARY KEY AUTO_INCREMENT,
        medicine_id_1        INT         NOT NULL,
        medicine_id_2        INT         NOT NULL,
        interaction_severity VARCHAR(10) NOT NULL
          CHECK(interaction_severity IN ('HIGH','MODERATE','LOW')),
        description          TEXT,
        CHECK(medicine_id_1 <> medicine_id_2),
        UNIQUE KEY uq_pair (medicine_id_1, medicine_id_2),
        FOREIGN KEY (medicine_id_1) REFERENCES medicine(medicine_id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id_2) REFERENCES medicine(medicine_id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE interaction_log (
        log_id          INT      PRIMARY KEY AUTO_INCREMENT,
        prescription_id INT      NOT NULL,
        medicine_id_1   INT      NOT NULL,
        medicine_id_2   INT      NOT NULL,
        severity        VARCHAR(10),
        detected_on     DATETIME DEFAULT NOW(),
        FOREIGN KEY (prescription_id) REFERENCES prescription(prescription_id) ON DELETE CASCADE
      )
    `);

    await conn.query(`CREATE INDEX idx_presc_patient ON prescription(patient_id)`);
    await conn.query(`CREATE INDEX idx_presc_doctor  ON prescription(doctor_id)`);
    await conn.query(`CREATE INDEX idx_pd_medicine   ON prescription_details(medicine_id)`);
    await conn.query(`CREATE INDEX idx_log_presc     ON interaction_log(prescription_id)`);

    console.log('✅ Tables + indexes created\n');

    // ── TRIGGERS ──────────────────────────────────────────────────────────────

    await conn.query(`
      CREATE TRIGGER trg_validate_duplicate_medicine
      BEFORE INSERT ON prescription_details
      FOR EACH ROW
      BEGIN
        DECLARE cnt INT;
        SELECT COUNT(*) INTO cnt
          FROM prescription_details
          WHERE prescription_id = NEW.prescription_id
            AND medicine_id     = NEW.medicine_id;
        IF cnt > 0 THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Duplicate medicine in same prescription is not allowed.';
        END IF;
      END
    `);

    await conn.query(`
      CREATE TRIGGER trg_interaction_alert
      AFTER INSERT ON prescription_details
      FOR EACH ROW
      BEGIN
        INSERT INTO interaction_log (prescription_id, medicine_id_1, medicine_id_2, severity, detected_on)
        SELECT
          NEW.prescription_id,
          CASE WHEN di.medicine_id_1 = NEW.medicine_id THEN di.medicine_id_1 ELSE di.medicine_id_2 END,
          CASE WHEN di.medicine_id_1 = NEW.medicine_id THEN di.medicine_id_2 ELSE di.medicine_id_1 END,
          di.interaction_severity,
          NOW()
        FROM drug_interaction di
        WHERE
          (di.medicine_id_1 = NEW.medicine_id OR di.medicine_id_2 = NEW.medicine_id)
          AND (
            di.medicine_id_1 IN (
              SELECT medicine_id FROM prescription_details
              WHERE prescription_id = NEW.prescription_id AND medicine_id <> NEW.medicine_id
            )
            OR di.medicine_id_2 IN (
              SELECT medicine_id FROM prescription_details
              WHERE prescription_id = NEW.prescription_id AND medicine_id <> NEW.medicine_id
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM interaction_log il
            WHERE il.prescription_id = NEW.prescription_id
              AND ((il.medicine_id_1 = di.medicine_id_1 AND il.medicine_id_2 = di.medicine_id_2)
                OR (il.medicine_id_1 = di.medicine_id_2 AND il.medicine_id_2 = di.medicine_id_1))
          );
      END
    `);

    console.log('✅ Triggers created\n');

    // ── STORED PROCEDURE ──────────────────────────────────────────────────────
    await conn.query(`
      CREATE PROCEDURE add_prescription(
        IN  p_patient_id INT,
        IN  p_doctor_id  INT,
        IN  p_date       DATE,
        OUT p_presc_id   INT
      )
      BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
        START TRANSACTION;
          INSERT INTO prescription(patient_id, doctor_id, prescription_date)
          VALUES (p_patient_id, p_doctor_id, p_date);
          SET p_presc_id = LAST_INSERT_ID();
        COMMIT;
      END
    `);

    // ── FUNCTION ──────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE FUNCTION get_risk_score(p_prescription_id INT)
      RETURNS INT
      DETERMINISTIC
      READS SQL DATA
      BEGIN
        DECLARE v_score INT DEFAULT 0;
        SELECT COALESCE(SUM(
          CASE severity WHEN 'HIGH' THEN 3 WHEN 'MODERATE' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END
        ), 0) INTO v_score
        FROM interaction_log
        WHERE prescription_id = p_prescription_id;
        RETURN v_score;
      END
    `);

    // ── VIEWS ─────────────────────────────────────────────────────────────────
    await conn.query(`
      CREATE VIEW vw_prescription_overview AS
      SELECT
        pr.prescription_id, pr.prescription_date,
        pat.patient_id, pat.name AS patient_name, pat.age, pat.gender,
        d.doctor_id,    d.name  AS doctor_name,   d.specialization,
        get_risk_score(pr.prescription_id) AS risk_score
      FROM prescription pr
      JOIN patient pat ON pat.patient_id = pr.patient_id
      JOIN doctor  d   ON d.doctor_id    = pr.doctor_id
    `);

    await conn.query(`
      CREATE VIEW vw_high_risk_alerts AS
      SELECT
        il.log_id, il.prescription_id, il.severity, il.detected_on,
        pat.name AS patient_name, d.name AS doctor_name,
        m1.medicine_name AS drug_a, m2.medicine_name AS drug_b
      FROM interaction_log il
      JOIN prescription pr ON pr.prescription_id = il.prescription_id
      JOIN patient pat     ON pat.patient_id     = pr.patient_id
      JOIN doctor  d       ON d.doctor_id        = pr.doctor_id
      JOIN medicine m1     ON m1.medicine_id     = il.medicine_id_1
      JOIN medicine m2     ON m2.medicine_id     = il.medicine_id_2
    `);

    console.log('✅ Stored procedure, function, views created\n');

    // ── SEED DATA ─────────────────────────────────────────────────────────────
    await conn.query(`
      INSERT INTO patient VALUES
      (1,'Rajesh Kumar',52,'M','Hypertension, Type 2 Diabetes'),
      (2,'Priya Sharma',34,'F','Asthma'),
      (3,'Gurpreet Singh',67,'M','Chronic Kidney Disease, Gout'),
      (4,'Meena Patel',45,'F','Hypothyroidism, Anxiety'),
      (5,'Ankit Verma',28,'M','Epilepsy'),
      (6,'Sunita Rao',61,'F','Atrial Fibrillation, Hypertension'),
      (7,'Harish Tiwari',40,'M','Depression, Insomnia'),
      (8,'Kavita Nair',55,'F','Osteoporosis, Vitamin D Deficiency')
    `);

    await conn.query(`
      INSERT INTO doctor VALUES
      (1,'Dr. Anil Mehta','Cardiologist'),
      (2,'Dr. Sunita Kapoor','General Physician'),
      (3,'Dr. Ramesh Gupta','Neurologist'),
      (4,'Dr. Leena Joshi','Endocrinologist'),
      (5,'Dr. Vikram Bose','Pulmonologist')
    `);

    await conn.query(`
      INSERT INTO medicine VALUES
      (1,'Warfarin','Tablet'),(2,'Aspirin','Tablet'),(3,'Metformin','Tablet'),
      (4,'Atorvastatin','Tablet'),(5,'Amoxicillin','Capsule'),(6,'Ciprofloxacin','Tablet'),
      (7,'Levothyroxine','Tablet'),(8,'Phenytoin','Capsule'),(9,'Fluoxetine','Capsule'),
      (10,'Omeprazole','Capsule'),(11,'Amlodipine','Tablet'),(12,'Salbutamol','Inhaler'),
      (13,'Digoxin','Tablet'),(14,'Lithium','Tablet'),(15,'Ibuprofen','Tablet')
    `);

    await conn.query(`
      INSERT INTO drug_interaction VALUES
      (1,1,2,'HIGH','Warfarin + Aspirin: Greatly increased bleeding risk due to additive anticoagulant effect.'),
      (2,1,15,'HIGH','Warfarin + Ibuprofen: NSAIDs displace warfarin from plasma proteins; severe bleeding risk.'),
      (3,8,9,'HIGH','Phenytoin + Fluoxetine: Fluoxetine inhibits CYP2C9 causing toxic phenytoin accumulation.'),
      (4,9,14,'HIGH','Fluoxetine + Lithium: Risk of Serotonin Syndrome — fever, tremor, confusion.'),
      (5,13,11,'MODERATE','Digoxin + Amlodipine: Amlodipine may raise digoxin plasma levels causing toxicity.'),
      (6,3,15,'MODERATE','Metformin + Ibuprofen: NSAID-induced renal impairment can increase metformin accumulation.'),
      (7,7,10,'MODERATE','Levothyroxine + Omeprazole: PPIs may reduce levothyroxine absorption when co-administered.'),
      (8,5,6,'LOW','Amoxicillin + Ciprofloxacin: Generally avoid dual antibiotic coverage without clear indication.'),
      (9,2,15,'LOW','Aspirin + Ibuprofen: Ibuprofen may competitively inhibit aspirin cardioprotective effect.'),
      (10,4,6,'LOW','Atorvastatin + Ciprofloxacin: Mild CYP3A4 inhibition may marginally increase statin exposure.')
    `);

    await conn.query(`
      INSERT INTO prescription VALUES
      (1,1,1,'2024-01-10'),(2,2,5,'2024-02-14'),(3,3,1,'2024-03-05'),
      (4,4,4,'2024-03-20'),(5,5,3,'2024-04-02'),(6,6,1,'2024-04-18'),
      (7,7,2,'2024-05-01'),(8,1,1,'2024-06-10')
    `);

    // Insert details one-by-one so the trigger fires on each row
    const details = [
      [1,1,'5mg once daily',30],[1,2,'75mg once daily',30],
      [2,12,'2 puffs as needed',14],[2,5,'500mg thrice daily',7],
      [3,13,'0.25mg once daily',60],[3,11,'5mg once daily',60],
      [4,7,'50mcg once daily',90],[4,10,'20mg once daily',30],
      [5,8,'300mg once daily',90],[5,9,'20mg once daily',90],
      [6,1,'4mg once daily',30],[6,15,'400mg as needed',7],
      [7,9,'20mg once daily',60],[7,14,'400mg twice daily',60],
      [8,4,'10mg once daily',30],[8,3,'500mg twice daily',30],
    ];
    for (const [pid,mid,dos,dur] of details) {
      await conn.query(`INSERT INTO prescription_details VALUES (?,?,?,?)`, [pid,mid,dos,dur]);
    }

    const [logs] = await conn.query(`SELECT COUNT(*) AS cnt FROM interaction_log`);
    console.log(`✅ Seed data inserted — interaction_log has ${logs[0].cnt} entries (auto by trigger)\n`);
    console.log('🎉 Done! Now run:  node backend/server.js\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\nCommon fixes:');
    console.error('  • Start MySQL in XAMPP Control Panel');
    console.error('  • Create DB first: CREATE DATABASE healthcare_db;');
    console.error('  • Check username/password in DB_CONFIG at the top of this file\n');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
