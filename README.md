# Healthcare Prescription Interaction Checker
**UCS310 — DBMS Project | Thapar Institute of Engineering & Technology**
Jasmeen (1024030103) · Harshita (1024030126) · Nistha (1024030150)

---

## 🛠️ Requirements

- Node.js (v18+)
- MySQL Server 8.0
- MySQL Workbench
- VS Code

---

## 🚀 Setup Pipeline (do this in order)

### STEP 1 — Make sure MySQL Server is running
- Open **Task Manager → Services** tab
- Find **MySQL80** → right-click → **Start**
- OR search **"Services"** in Start menu → find MySQL80 → Start

### STEP 2 — Create the database in MySQL Workbench
- Open MySQL Workbench → connect to Local instance
- In the query tab run:
```sql
CREATE DATABASE healthcare_db;
```
- Click the ⚡ execute button

### STEP 3 — Set your MySQL credentials in the project
Open **both** `backend/init-db.js` and `backend/server.js`
Find `DB_CONFIG` near the top of each file and edit:
```js
const DB_CONFIG = {
  host:     'localhost',
  user:     'root',
  password: '',       // put your MySQL password here, blank if you never set one
  database: 'healthcare_db',
};
```

### STEP 4 — Open the project in VS Code
```
File → Open Folder → select the healthcare folder
```

### STEP 5 — Open terminal in VS Code
```
Ctrl + `  (backtick key)
```

### STEP 6 — Install packages (run once)
```bash
npm install
```

### STEP 7 — Initialize the database (run once)
```bash
node backend/init-db.js
```
You should see:
```
✅ Connected to MySQL
✅ Tables + indexes created
✅ Triggers created
✅ Stored procedure, function, views created
✅ Seed data inserted
🎉 Done! Now run: node backend/server.js
```

### STEP 8 — Start the server
```bash
node backend/server.js
```
You should see:
```
🏥 Healthcare Prescription Checker
   Running at: http://localhost:3000
```
**Keep this terminal open** — closing it stops the server.

### STEP 9 — Open the app
Browser → `http://localhost:3000`  (http, not https)

---

## ⚠️ Common Errors & Fixes

### "EADDRINUSE: address already in use :::3000"
Port 3000 is already occupied by a previous run. Fix:
```bash
npx kill-port 3000
node backend/server.js
```
Or manually:
```bash
netstat -ano | findstr :3000
taskkill /PID <number shown> /F
node backend/server.js
```

### "Unable to connect to 127.0.0.1:3306"
MySQL Server is not running. Fix:
- Press `Win + R` → type `services.msc` → Enter
- Find **MySQL80** → right-click → **Start**
- Then retry

### "Access denied for user 'root'"
Wrong password in DB_CONFIG. Fix:
- Update the `password` field in both `backend/init-db.js` and `backend/server.js`

### "Unknown database 'healthcare_db'"
You forgot to create the database. Fix:
- Open MySQL Workbench → run `CREATE DATABASE healthcare_db;`
- Then run `node backend/init-db.js` again

---

## 🔄 Every time you want to use the app

```bash
# 1. Make sure MySQL80 service is running (check Services)
# 2. In VS Code terminal:
node backend/server.js
# 3. Open browser → http://localhost:3000
```

`init-db.js` only needs to be run once. Never again unless you want to reset everything.

---

## 🔄 Reset the database

```bash
node backend/init-db.js
```
This drops and recreates all tables, triggers, procedures, views and re-seeds data.

---

## 📁 Project Structure

```
healthcare/
├── package.json
├── backend/
│   ├── init-db.js     ← run once to set up MySQL
│   └── server.js      ← run every time to start the app
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js
        ├── utils.js
        ├── app.js
        └── pages/
            ├── home.js
            ├── patients.js
            ├── prescriptions.js
            ├── alerts.js
            ├── analytics.js
            ├── new-prescription.js
            ├── drug-checker.js
            ├── doctors.js
            ├── medicines.js
            └── interactions-db.js
```

---

## 🎓 DBMS Features Used (for viva)

| Feature | Implementation |
|---------|---------------|
| **DDL** | CREATE TABLE with CHECK, FOREIGN KEY, AUTO_INCREMENT, UNIQUE, INDEX |
| **DML** | INSERT / UPDATE / DELETE on all 7 tables via API |
| **TRIGGER 1** | `trg_validate_duplicate_medicine` — BEFORE INSERT, blocks duplicate medicine in same prescription |
| **TRIGGER 2** | `trg_interaction_alert` — AFTER INSERT, auto-logs drug interactions into interaction_log |
| **STORED PROCEDURE** | `add_prescription` — START TRANSACTION + ROLLBACK on failure |
| **FUNCTION** | `get_risk_score(prescription_id)` — returns INT risk score per prescription |
| **VIEW 1** | `vw_prescription_overview` — 3-table JOIN calling get_risk_score() per row |
| **VIEW 2** | `vw_high_risk_alerts` — 5-table JOIN for the alerts dashboard |
| **INNER JOIN** | Prescriptions, alerts, analytics — multiple 3-5 table joins |
| **SELF JOIN** | Drug checker: medicine table joined to itself to resolve both drug names |
| **Subquery** | Analytics: high-risk patients via WHERE patient_id IN (SELECT …) |
| **Aggregate** | AVG, COUNT, GROUP BY, ORDER BY, LIMIT across analytics queries |
| **ON DELETE CASCADE** | Deleting a patient auto-removes all their prescriptions + interaction logs |
| **3NF** | No partial or transitive dependencies across all 7 tables |
