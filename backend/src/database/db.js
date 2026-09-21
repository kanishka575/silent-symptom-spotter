import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('asha','doctor')),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    case_number TEXT UNIQUE NOT NULL,
    created_by TEXT NOT NULL,
    assigned_doctor TEXT,
    patient_reference TEXT,
    patient_age TEXT,
    patient_sex TEXT,
    location TEXT,
    audio_url TEXT,
    transcript TEXT,
    language TEXT,
    symptoms TEXT,
    context_analysis TEXT,
    audio_quality INTEGER,
    confidence INTEGER,
    triage_level TEXT NOT NULL,
    triage_reason TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING_SYNC',
    reviewed_by TEXT,
    reviewed_at TEXT,
    follow_up_answers TEXT,
    FOREIGN KEY(created_by) REFERENCES users(id),
    FOREIGN KEY(assigned_doctor) REFERENCES users(id),
    FOREIGN KEY(reviewed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS case_actions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    message TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(actor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    recipient_user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_flag INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(recipient_user_id) REFERENCES users(id)
  );
`);

const seedUsers = [
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

export function seedDemoUsers() {
  const upsertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (@id, @name, @email, @password_hash, @role, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = excluded.role,
      created_at = datetime('now')
  `);

  for (const user of seedUsers) {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    upsertUser.run({
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: passwordHash,
      role: user.role,
    });
  }

  return {
    asha: getUserByEmail("asha@demo.com"),
    doctor: getUserByEmail("doctor@demo.com"),
  };
}

seedDemoUsers();

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function getUsersByRole(role) {
  return db
    .prepare("SELECT * FROM users WHERE role = ? ORDER BY created_at DESC")
    .all(role);
}

export function createCase(input) {
  const caseId = input.id;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO cases (
      id, case_number, created_by, assigned_doctor, patient_reference, patient_age,
      patient_sex, location, audio_url, transcript, language, symptoms, context_analysis,
      audio_quality, confidence, triage_level, triage_reason, status, created_at,
      updated_at, sync_status, follow_up_answers
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    caseId,
    input.case_number,
    input.created_by,
    input.assigned_doctor ?? null,
    input.patient_reference,
    input.patient_age,
    input.patient_sex,
    input.location,
    input.audio_url ?? null,
    input.transcript ?? "",
    input.language ?? "Hindi + regional dialect",
    JSON.stringify(input.symptoms ?? []),
    JSON.stringify(input.context_analysis ?? {}),
    Number(input.audio_quality ?? 0),
    Number(input.confidence ?? 0),
    input.triage_level,
    input.triage_reason ?? "",
    input.status ?? "AWAITING_DOCTOR_REVIEW",
    now,
    now,
    input.sync_status ?? "PENDING_SYNC",
    JSON.stringify(input.follow_up_answers ?? []),
  );

  return getCaseById(caseId);
}

export function getCaseById(id) {
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id);
  if (!row) return null;
  return {
    ...row,
    symptoms: JSON.parse(row.symptoms || "[]"),
    context_analysis: JSON.parse(row.context_analysis || "{}"),
    follow_up_answers: JSON.parse(row.follow_up_answers || "[]"),
  };
}

export function getCasesForUser(userId, role) {
  if (role === "asha") {
    return db
      .prepare(
        "SELECT * FROM cases WHERE created_by = ? ORDER BY created_at DESC",
      )
      .all(userId)
      .map((row) => ({
        ...row,
        symptoms: JSON.parse(row.symptoms || "[]"),
        context_analysis: JSON.parse(row.context_analysis || "{}"),
        follow_up_answers: JSON.parse(row.follow_up_answers || "[]"),
      }));
  }

  return db
    .prepare("SELECT * FROM cases ORDER BY created_at DESC")
    .all()
    .map((row) => ({
      ...row,
      symptoms: JSON.parse(row.symptoms || "[]"),
      context_analysis: JSON.parse(row.context_analysis || "{}"),
      follow_up_answers: JSON.parse(row.follow_up_answers || "[]"),
    }));
}

export function updateCaseStatus({ id, status, reviewedBy, action, message }) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE cases SET status = ?, updated_at = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
  ).run(status, now, reviewedBy ?? null, now, id);

  const actionId = `action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  db.prepare(
    `INSERT INTO case_actions (id, case_id, actor_id, action, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(actionId, id, reviewedBy, action, message, now);

  return getCaseById(id);
}

export function createAlert({ caseId, recipientUserId, type, title, message }) {
  const alertId = `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  db.prepare(
    `INSERT INTO alerts (id, case_id, recipient_user_id, type, title, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    alertId,
    caseId,
    recipientUserId,
    type,
    title,
    message,
    new Date().toISOString(),
  );
}

export function getAlertsForUser(userId) {
  return db
    .prepare(
      `SELECT * FROM alerts WHERE recipient_user_id = ? ORDER BY created_at DESC LIMIT 20`,
    )
    .all(userId);
}

export function createUser({ id, name, email, passwordHash, role }) {
  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
  ).run(id, name, email, passwordHash, role);
  return getUserByEmail(email);
}

export { db };
