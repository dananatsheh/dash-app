/**
 * DASH Backend — Express + MySQL
 * Run: node server.js
 */

import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host:     process.env.MYSQLHOST      || "localhost",
  user:     process.env.MYSQLUSER      || "root",
  password: process.env.MYSQLPASSWORD  || "",
  database: process.env.MYSQL_DATABASE || "railway",
  port:     process.env.MYSQLPORT      || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// Better error messages from MySQL error codes
function friendlyError(e) {
  if (!e) return "Unknown error";
  const msg = e.message || "";
  const code = e.code || "";
  if (code === "ER_DUP_ENTRY" || msg.includes("Duplicate entry")) {
    const match = msg.match(/Duplicate entry '(.+?)' for key/);
    return match ? `Duplicate value: '${match[1]}' already exists` : "Duplicate entry — this record already exists";
  }
  if (code === "ER_NO_REFERENCED_ROW_2" || msg.includes("a foreign key constraint fails")) {
    return "Referenced record does not exist (foreign key violation)";
  }
  if (code === "ER_ROW_IS_REFERENCED_2" || msg.includes("Cannot delete or update a parent row")) {
    return "Cannot delete — other records depend on this one";
  }
  if (code === "ER_BAD_NULL_ERROR" || msg.includes("cannot be null")) {
    const col = msg.match(/Column '(.+?)' cannot be null/);
    return col ? `Field '${col[1]}' is required` : "A required field is missing";
  }
  if (code === "ER_DATA_TOO_LONG") return "One of the values is too long for its field";
  if (code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") return "Invalid value for a field (e.g. wrong data type)";
  if (msg) return msg;
  return `Database error (${code || "unknown"})`;
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await query(`
      SELECT t.*, GROUP_CONCAT(CONCAT(p.First_Name, ' ', p.Last_Name) SEPARATOR ', ') AS assignees
      FROM Task t
      LEFT JOIN Task_Assignment ta ON t.Task_ID = ta.Task_ID
      LEFT JOIN Person p ON ta.SSN = p.SSN
      GROUP BY t.Task_ID
    `);
    res.json(tasks);
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/tasks — now accepts assigneeSSNs: ["1001","1002"]
app.post("/api/tasks", async (req, res) => {
  try {
    const { name, priority, status, progress, due, estHours, description, stageOrder, assigneeSSNs } = req.body;

    // Generate a safe unique Task_ID that won't collide
    const existing = await query("SELECT MAX(Task_ID) AS maxId FROM Task");
    const taskId = Math.max((existing[0].maxId || 0) + 1, 10000 + Math.floor(Math.random() * 89999));

    // Verify the stage exists; if not, use the first available stage
    let safeStageOrder = stageOrder || 2;
    const stages = await query("SELECT Stage_Order FROM Stage WHERE Stage_Order = ?", [safeStageOrder]);
    if (stages.length === 0) {
      const firstStage = await query("SELECT Stage_Order FROM Stage ORDER BY Stage_Order LIMIT 1");
      if (firstStage.length === 0) return res.status(400).json({ error: "No stages exist in the database. Please create a stage first." });
      safeStageOrder = firstStage[0].Stage_Order;
    }

    await query(
      `INSERT INTO Task (Task_ID, Name, Priority, Status, Progress, Due_Date, Estimated_Hours, Actual_Hours, Description, Stage_Order, Start_Date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURDATE())`,
      [taskId, name, priority || "Medium", status || "In Progress", progress || 0, due || null, estHours || 0, description || "", safeStageOrder]
    );
    // Insert assignments
    for (const ssn of (assigneeSSNs || [])) {
      await query("INSERT INTO Task_Assignment (Task_ID, SSN) VALUES (?, ?)", [taskId, ssn]);
    }
    res.json({ success: true, id: taskId });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await query("DELETE FROM Task WHERE Task_ID = ?", [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { progress, status } = req.body;
    await query("UPDATE Task SET Progress = ?, Status = ? WHERE Task_ID = ?", [progress, status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
app.get("/api/employees", async (req, res) => {
  try {
    const rows = await query(`
      SELECT e.SSN, e.Salary, e.Hire_Date, e.Department_ID,
             CAST(e.Employee_Type AS CHAR) AS Employee_Type,
             e.Programming_Language, e.GitHub_Username, e.Certification,
             e.Testing_Type, e.Management_Level, e.Office_Number,
             e.Design_Specialization, e.Portfolio_Link,
             e.PhD, e.Bachelor, e.Master,
             p.First_Name, p.Middle_Name, p.Last_Name, p.Email, p.Gender, p.Address,
             d.Name AS Department_Name
      FROM Employee e
      JOIN Person p ON e.SSN = p.SSN
      LEFT JOIN Department d ON e.Department_ID = d.Department_ID
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.post("/api/employees", async (req, res) => {
  try {
    const { ssn, firstName, middleName, lastName, gender, dob, address, email, salary, hireDate, role, departmentId,
            programmingLanguage, githubUsername, designSpecialization, portfolioLink, testingType, certification, managementLevel, officeNumber } = req.body;

    if (!ssn || !firstName || !lastName) {
      return res.status(400).json({ error: "SSN, first name, and last name are required." });
    }

    // Check if SSN already exists
    const exists = await query("SELECT SSN FROM Person WHERE SSN = ?", [ssn]);
    if (exists.length > 0) {
      return res.status(409).json({ error: `SSN ${ssn} already exists in the database. Please use a different SSN.` });
    }

    const birthDate = new Date(dob || "2000-01-01");
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear() -
      (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);

    await query(
      `INSERT INTO Person (SSN, DOB, First_Name, Middle_Name, Last_Name, Gender, Address, Email, Age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ssn, dob || "2000-01-01", firstName, middleName || "", lastName || "", gender || "Male", address || "", email || "", age]
    );
    if (req.body.phoneNumber) {
      await query("INSERT INTO Person_Phone (SSN, Phone_Number) VALUES (?, ?)", [ssn, req.body.phoneNumber]);
    }
    await query(
      `INSERT INTO Employee (SSN, Salary, Hire_Date, PhD, Bachelor, Master, Employee_Type, Department_ID,
        Programming_Language, GitHub_Username, Design_Specialization, Portfolio_Link,
        Testing_Type, Certification, Management_Level, Office_Number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ssn, salary || 0, hireDate || new Date().toISOString().slice(0,10),
       req.body.phd ? 1 : 0, req.body.bachelor ? 1 : 0, req.body.master ? 1 : 0,
       role || "Developer", departmentId || null,
       programmingLanguage || null, githubUsername || null, designSpecialization || null, portfolioLink || null,
       testingType || null, certification || null, managementLevel || null, officeNumber || null]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.delete("/api/employees/:ssn", async (req, res) => {
  try {
    await query("DELETE FROM Person WHERE SSN = ?", [req.params.ssn]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
app.get("/api/departments", async (req, res) => {
  try {
    const rows = await query(`
      SELECT d.*,
             CONCAT(p.First_Name, ' ', p.Last_Name) AS Manager_Name,
             GROUP_CONCAT(dl.Location) AS Locations
      FROM Department d
      LEFT JOIN Employee e ON d.Manager_SSN = e.SSN
      LEFT JOIN Person p ON e.SSN = p.SSN
      LEFT JOIN Department_Location dl ON d.Department_ID = dl.Department_ID
      GROUP BY d.Department_ID
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.patch("/api/departments/:id/manager", async (req, res) => {
  try {
    const { managerSSN } = req.body;
    await query(
      "UPDATE Department SET Manager_SSN = ?, Manager_Start_Date = CURDATE() WHERE Department_ID = ?",
      [managerSSN, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.post("/api/departments", async (req, res) => {
  try {
    const { name, budget, location } = req.body;
    const existing = await query("SELECT MAX(Department_ID) AS maxId FROM Department");
    const deptId = (existing[0].maxId || 0) + 1;
    await query("INSERT INTO Department (Department_ID, Budget, Name) VALUES (?, ?, ?)", [deptId, budget, name]);
    if (location) await query("INSERT INTO Department_Location (Department_ID, Location) VALUES (?, ?)", [deptId, location]);
    res.json({ success: true, id: deptId });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── GAMES ────────────────────────────────────────────────────────────────────
app.get("/api/games", async (req, res) => {
  try {
    const games = await query("SELECT * FROM Game");
    for (const game of games) {
      const genres    = await query("SELECT Genre FROM Game_Genre WHERE Game_ID = ?", [game.Game_ID]);
      const platforms = await query("SELECT Platform FROM Game_Platform WHERE Game_ID = ?", [game.Game_ID]);
      game.genres    = genres.map(r => r.Genre);
      game.platforms = platforms.map(r => r.Platform);
    }
    res.json(games);
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.post("/api/games", async (req, res) => {
  try {
    const { name, description, budget, status, rating, release, genres, platforms } = req.body;
    const id = Math.floor(Math.random() * 9000) + 1000;
    await query(
      "INSERT INTO Game (Game_ID, Name, Description, Development_Budget, Development_Status, Age_Rating, Release_Date) VALUES (?,?,?,?,?,?,?)",
      [id, name, description, budget, status, rating, release]
    );
    for (const g of (genres || [])) await query("INSERT INTO Game_Genre (Game_ID, Genre) VALUES (?,?)", [id, g]);
    for (const p of (platforms || [])) await query("INSERT INTO Game_Platform (Game_ID, Platform) VALUES (?,?)", [id, p]);
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.delete("/api/games/:id", async (req, res) => {
  try {
    await query("DELETE FROM Game WHERE Game_ID = ?", [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── SALES ────────────────────────────────────────────────────────────────────
app.get("/api/sales", async (req, res) => {
  try {
    const rows = await query(`
      SELECT s.*, g.Name AS Game_Name,
             CONCAT(p.First_Name, ' ', p.Last_Name) AS Customer_Name
      FROM Sale s
      JOIN Game g ON s.Game_ID = g.Game_ID
      JOIN Customer c ON s.Customer_SSN = c.SSN
      JOIN Person p ON c.SSN = p.SSN
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.post("/api/sales", async (req, res) => {
  try {
    const { tax, date, method, unitPrice, discount, qty, customerSSN, gameID } = req.body;
    const id = Math.floor(Math.random() * 9000) + 1000;
    await query(
      "INSERT INTO Sale (Sale_ID, Tax, Date, Payment_Method, Unit_Price, Discount, Quantity, Customer_SSN, Game_ID) VALUES (?,?,?,?,?,?,?,?,?)",
      [id, tax || 0, date, method, unitPrice, discount || 0, qty, customerSSN, gameID]
    );
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
app.get("/api/customers", async (req, res) => {
  try {
    const rows = await query(`
      SELECT c.SSN, c.User_Name, c.Loyalty_Points, p.First_Name, p.Last_Name, p.Email
      FROM Customer c JOIN Person p ON c.SSN = p.SSN
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── CUSTOMERS (write) ────────────────────────────────────────────────────────
app.post("/api/customers", async (req, res) => {
  try {
    const { ssn, firstName, middleName, lastName, gender, dob, address, email, phoneNumber, userName, password, loyaltyPoints } = req.body;
    if (!ssn || !firstName || !lastName) return res.status(400).json({ error: "SSN, first name, and last name are required." });
    const exists = await query("SELECT SSN FROM Person WHERE SSN = ?", [ssn]);
    if (exists.length > 0) return res.status(409).json({ error: `SSN ${ssn} already exists. Use a different SSN.` });
    const birthDate = new Date(dob || "2000-01-01");
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear() -
      (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);

    await query(
      `INSERT INTO Person (SSN, DOB, First_Name, Middle_Name, Last_Name, Gender, Address, Email, Age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ssn, dob || "2000-01-01", firstName, middleName || "", lastName, gender || "Male", address || "", email || "", age]
    );
    if (phoneNumber) await query("INSERT INTO Person_Phone (SSN, Phone_Number) VALUES (?, ?)", [ssn, phoneNumber]);
    await query(
      `INSERT INTO Customer (SSN, User_Name, Password, Loyalty_Points) VALUES (?, ?, ?, ?)`,
      [ssn, userName || ssn, password || "", loyaltyPoints || 0]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

app.delete("/api/customers/:ssn", async (req, res) => {
  try {
    await query("DELETE FROM Person WHERE SSN = ?", [req.params.ssn]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── STAGES ───────────────────────────────────────────────────────────────────
app.get("/api/stages", async (req, res) => {
  try {
    const rows = await query(`
      SELECT s.*, g.Name AS Game_Name,
             COUNT(t.Task_ID) AS Task_Count,
             AVG(t.Progress) AS Avg_Progress
      FROM Stage s
      JOIN Game g ON s.Game_ID = g.Game_ID
      LEFT JOIN Task t ON s.Stage_Order = t.Stage_Order
      GROUP BY s.Stage_Order
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: friendlyError(e) }); }
});

// ─── START ────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n⚡ DASH API running on http://localhost:${PORT}`);
});