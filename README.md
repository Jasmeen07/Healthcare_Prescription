# Healthcare Prescription Interaction Checker
**UCS310 — DBMS Project | Thapar Institute of Engineering & Technology**
Jasmeen (1024030103) · Harshita (1024030126) · Nistha (1024030150)

---

## 🛠️ Tools Required

| Tool | You Have It? | Download |
|------|-------------|---------|
| **Node.js** (v18+) | ✅ already installed | — |
| **VS Code** | ✅ already installed | — |
| **XAMPP** | Need to install | https://www.apachefriends.org |

> **Why XAMPP?** It gives you MySQL without needing Oracle or heavy software. It's free, 1-click install, and your teacher won't complain — it IS SQL (MySQL).

---

## 🚀 Full Setup Pipeline

### STEP 1 — Install XAMPP
1. Download from https://www.apachefriends.org (Windows version)
2. Install it (all defaults are fine)
3. Open **XAMPP Control Panel**
4. Click **Start** next to **MySQL**
5. You should see MySQL running in green ✅

### STEP 2 — Create the database
1. In XAMPP Control Panel, click **Admin** next to MySQL → opens phpMyAdmin in browser
2. Click **SQL** tab at the top
3. Run this:
```sql
CREATE DATABASE healthcare_db;
```
4. Click **Go**

### STEP 3 — Edit your credentials in the project
Open `backend/init-db.js` and `backend/server.js`
Find `DB_CONFIG` near the top and update:
```js
const DB_CONFIG = {
  host:     'localhost',
  user:     'root',      // XAMPP default username is 'root'
  password: '',          // XAMPP default password is blank ''
  database: 'healthcare_db',
};
```
> If you set a password during XAMPP install, put it in the password field.

### STEP 4 — Install Node packages
Open VS Code terminal (`Ctrl + `` `):
```bash
npm install
```
This installs: `express`, `mysql2`, `cors` — all pure JS, no C++ compilation!

### STEP 5 — Initialize the database (run ONCE)
```bash
node backend/init-db.js
```
You should see:
```
✅ Connected to MySQL
✅ Tables + indexes created
✅ Triggers created
✅ Stored procedure, function, views created
✅ Seed data inserted — interaction_log has 6 entries (auto by trigger)
🎉 Done! Now run: node backend/server.js
```

### STEP 6 — Start the server
```bash
node backend/server.js
```
You should see:
```
🏥 Healthcare Prescription Checker
   Running at: http://localhost:3000
```

### STEP 7 — Open the app
Browser → `http://localhost:3000` ✅

---

## 📁 Project Structure

```
healthcare/
├── package.json
├── backend/
│   ├── init-db.js     ← creates all MySQL tables, triggers, procedures, views + seeds data
│   └── server.js      ← Express API (all routes)
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js
        ├── utils.js
        ├── app.js
        └── pages/     ← one file per page (10 pages)
```

---

## 🎓 DBMS Features (for viva/report)

| Feature | Implementation |
|---------|---------------|
| **DDL** | CREATE TABLE with CHECK, FOREIGN KEY, AUTO_INCREMENT, UNIQUE |
| **DML** | INSERT/UPDATE/DELETE on all 7 tables |
| **TRIGGER 1** | `trg_validate_duplicate_medicine` — BEFORE INSERT, prevents same medicine twice |
| **TRIGGER 2** | `trg_interaction_alert` — AFTER INSERT, auto-logs drug interactions |
| **STORED PROCEDURE** | `add_prescription` — with START TRANSACTION + ROLLBACK |
| **FUNCTION** | `get_risk_score(prescription_id)` — returns INT risk score |
| **VIEW 1** | `vw_prescription_overview` — calls get_risk_score() per row |
| **VIEW 2** | `vw_high_risk_alerts` — 5-table JOIN for alert dashboard |
| **INNER JOIN** | Prescriptions: patient + doctor + prescription |
| **SELF JOIN** | Drug checker: medicine table joined to itself for both drug names |
| **Subquery** | Analytics: high-risk patients via WHERE patient_id IN (SELECT …) |
| **Aggregate** | AVG age, COUNT, GROUP BY, ORDER BY, LIMIT |
| **ON DELETE CASCADE** | Deleting a patient removes all their prescriptions + logs |
| **3NF** | No partial/transitive dependencies across all 7 tables |

---

## 🔄 Reset Database

Just run init-db.js again — it drops and recreates everything:
```bash
node backend/init-db.js
```
