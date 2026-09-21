import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "src", "database", "data.sqlite");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('asha','doctor')),
    created_at TEXT NOT NULL
  );
`);

const users = [
  {
    id: "user-asha",
    name: "ASHA Worker",
    email: "asha@demo.com",
    password: "asha123",
    role: "asha",
  },
  {
    id: "user-doctor",
    name: "Dr. Demo",
    email: "doctor@demo.com",
    password: "doctor123",
    role: "doctor",
  },
];

for (const user of users) {
  const passwordHash = bcrypt.hashSync(user.password, 10);
  db.prepare(
    `
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (@id, @name, @email, @password_hash, @role, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = excluded.role,
      created_at = datetime('now')
  `,
  ).run({
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: passwordHash,
    role: user.role,
  });
}

console.log("Demo users seeded successfully.");
console.log("ASHA: asha@demo.com / asha123");
console.log("Doctor: doctor@demo.com / doctor123");
