import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ddb",
});

// Show all columns in Employee table
const [cols] = await pool.execute("SHOW COLUMNS FROM Employee");
console.log("\n=== EMPLOYEE TABLE COLUMNS ===");
cols.forEach(c => console.log(c.Field, "-", c.Type));

await pool.end();
