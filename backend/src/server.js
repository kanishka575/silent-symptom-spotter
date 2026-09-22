import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCase } from "./services/ai/analyzeCase.js";
import {
  createAlert,
  createCase,
  createUser,
  getAlertsForUser,
  getCaseById,
  getCaseTimeline,
  getCasesForUser,
  getUserByEmail,
  getUserById,
  submitFollowUp,
  updateCaseStatus,
} from "./database/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "uploads");
mkdirSync(uploadDir, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "silent-symptom-spotter-demo-secret";
const DEFAULT_DOCTOR_ID = "user-doctor";

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedLocalOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
      ];

      if (
        !origin ||
        allowedLocalOrigins.some((pattern) => pattern.test(origin))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired or invalid." });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient role access." });
    }
    return next();
  };
}

function buildCaseNumber() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `SSS-${datePart}-${randomPart}`;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Silent Symptom Spotter API is running." });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role = "asha" } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required." });
  }

  const existing = getUserByEmail(email.toLowerCase());
  if (existing) {
    return res
      .status(409)
      .json({ message: "An account already exists for this email." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = createUser({
    id: `user-${randomUUID()}`,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
  });

  const token = signToken(newUser);
  return res.status(201).json({
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      created_at: newUser.created_at,
    },
    token,
  });
});

function handleRoleLogin(req, res, role) {
  const { email, identifier, password } = req.body;
  const userIdentifier = String(email || identifier || "")
    .trim()
    .toLowerCase();

  if (!userIdentifier || !password) {
    return res.status(400).json({
      message: "Please enter your email and password.",
    });
  }

  const user = getUserByEmail(userIdentifier);
  if (!user) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  if (user.role !== role) {
    const roleLabel = role === "asha" ? "Doctor" : "ASHA worker";
    const roleMessage =
      role === "asha"
        ? "This account belongs to a Doctor. Please use Doctor Sign In."
        : "This account belongs to an ASHA worker. Please use ASHA Sign In.";

    return res.status(403).json({
      message: roleMessage,
      accountRole: roleLabel,
    });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  const token = signToken(user);
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
    token,
  });
}

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Please enter your email and password.",
    });
  }

  const user = getUserByEmail(String(email).trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  const token = signToken(user);
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
    token,
  });
});

app.post("/api/auth/asha/login", async (req, res) => {
  return handleRoleLogin(req, res, "asha");
});

app.post("/api/auth/doctor/login", async (req, res) => {
  return handleRoleLogin(req, res, "doctor");
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  });
});

app.get("/api/cases", authMiddleware, (req, res) => {
  const cases = getCasesForUser(req.user.id, req.user.role);
  const filtered =
    req.user.role === "asha"
      ? cases.filter((item) => item.created_by === req.user.id)
      : cases.filter(
          (item) =>
            item.assigned_doctor === req.user.id || item.status !== "DRAFT",
        );

  return res.json({ cases: filtered });
});

app.get("/api/cases/:id", authMiddleware, (req, res) => {
  const existing = getCaseById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Case not found." });
  }

  const isAllowed =
    req.user.role === "asha" ? existing.created_by === req.user.id : true;

  if (!isAllowed) {
    return res
      .status(403)
      .json({ message: "You do not have access to this case." });
  }

  return res.json({ case: existing });
});

app.post("/api/cases", authMiddleware, requireRole("asha"), (req, res) => {
  const {
    patientReference,
    age,
    sex,
    location,
    transcript,
    selectedDemo,
    audioData,
    audioQuality,
  } = req.body;

  if (!patientReference && !location) {
    return res
      .status(400)
      .json({ message: "Patient reference and location are required." });
  }

  const analysis = analyzeCase({
    transcript: transcript || "",
    selectedDemo: selectedDemo || "dramatic-low-risk",
    audioQuality: Number(audioQuality || 80),
  });

  const caseId = `case-${randomUUID()}`;
  const caseNumber = buildCaseNumber();
  const audioRef = audioData ? `uploads/${caseId}.webm` : null;

  if (audioData) {
    const base64 = audioData.replace(/^data:audio\/webm;base64,/, "");
    const filePath = path.join(uploadDir, `${caseId}.webm`);
    const buffer = Buffer.from(base64, "base64");
    writeFileSync(filePath, buffer);
  }

  const newCase = createCase({
    id: caseId,
    case_number: caseNumber,
    created_by: req.user.id,
    assigned_doctor: DEFAULT_DOCTOR_ID,
    patient_reference: patientReference || "Anonymous patient",
    patient_age: String(age || "Unknown"),
    patient_sex: sex || "Unknown",
    location: location || "Unknown village",
    audio_url: audioRef,
    transcript: analysis.transcript,
    language: analysis.language,
    symptoms: analysis.symptoms,
    context_analysis: analysis.contextAnalysis,
    audio_quality: analysis.audioQuality,
    confidence: analysis.confidence,
    triage_level: analysis.triageLevel,
    triage_reason: analysis.triageReason,
    status: "AWAITING_DOCTOR_REVIEW",
    sync_status: "PENDING_SYNC",
    follow_up_answers: [],
  });

  if (["HIGH_PRIORITY", "EMERGENCY", "URGENT"].includes(analysis.triageLevel)) {
    createAlert({
      caseId: newCase.id,
      recipientUserId: DEFAULT_DOCTOR_ID,
      type: "NEW_CASE",
      title: "New triage alert",
      message: `New ${analysis.triageLevel.toLowerCase().replace("_", " ")} case received: ${caseNumber}`,
    });
  }

  return res.status(201).json({ case: newCase, analysis });
});

app.patch(
  "/api/cases/:id/action",
  authMiddleware,
  requireRole("doctor"),
  (req, res) => {
    const { action, message, followUpRequest } = req.body;
    const caseData = getCaseById(req.params.id);

    if (!caseData) {
      return res.status(404).json({ message: "Case not found." });
    }

    const statusMap = {
      ACKNOWLEDGE: "ACKNOWLEDGED",
      REQUEST_FOLLOW_UP: "FOLLOW_UP_REQUIRED",
      ESCALATE: "ESCALATED",
    };

    if (!statusMap[action]) {
      return res.status(400).json({ message: "Unsupported case action." });
    }

    if (
      action === "REQUEST_FOLLOW_UP" &&
      (!followUpRequest ||
        !Array.isArray(followUpRequest.questions) ||
        followUpRequest.questions.length === 0)
    ) {
      return res.status(400).json({
        message: "At least one follow-up question is required.",
      });
    }

    const nextStatus = statusMap[action];
    const updatedCase = updateCaseStatus({
      id: req.params.id,
      status: nextStatus,
      reviewedBy: req.user.id,
      action,
      message:
        message ||
        (action === "REQUEST_FOLLOW_UP"
          ? "Doctor requested follow-up."
          : action === "ESCALATE"
            ? "Case escalated by Doctor."
            : "Doctor acknowledged case."),
      followUpRequest:
        action === "REQUEST_FOLLOW_UP"
          ? {
              questions: followUpRequest.questions,
              note: followUpRequest.note || "",
              requested_by: req.user.id,
              requested_at: new Date().toISOString(),
            }
          : undefined,
    });

    const creator = getUserById(caseData.created_by);
    if (creator) {
      const alertByAction = {
        ACKNOWLEDGE: {
          title: "Doctor acknowledged case",
          message: `Doctor acknowledged Case ${caseData.case_number}.`,
        },
        REQUEST_FOLLOW_UP: {
          title: "Follow-up requested",
          message: `Doctor requested follow-up for Case ${caseData.case_number}.`,
        },
        ESCALATE: {
          title: "Case escalated",
          message: `Doctor escalated Case ${caseData.case_number}.`,
        },
      }[action];
      createAlert({
        caseId: caseData.id,
        recipientUserId: creator.id,
        type: action,
        title: alertByAction.title,
        message: alertByAction.message,
      });
    }

    return res.json({ case: updatedCase, action });
  },
);

app.post(
  "/api/cases/:id/follow-up",
  authMiddleware,
  requireRole("asha"),
  (req, res) => {
    const caseData = getCaseById(req.params.id);
    if (!caseData) {
      return res.status(404).json({ message: "Case not found." });
    }
    if (caseData.created_by !== req.user.id) {
      return res.status(403).json({ message: "You do not own this case." });
    }
    if (caseData.status !== "FOLLOW_UP_REQUIRED") {
      return res.status(400).json({
        message: "This case does not have an active follow-up request.",
      });
    }

    const { answers, note = "" } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res
        .status(400)
        .json({ message: "Follow-up answers are required." });
    }

    const updatedCase = submitFollowUp({
      id: req.params.id,
      actorId: req.user.id,
      answers,
      note,
    });
    if (caseData.assigned_doctor) {
      createAlert({
        caseId: caseData.id,
        recipientUserId: caseData.assigned_doctor,
        type: "FOLLOW_UP_COMPLETED",
        title: "Follow-up completed",
        message: `ASHA worker completed follow-up for Case ${caseData.case_number}.`,
      });
    }
    return res.json({ case: updatedCase });
  },
);

app.get("/api/cases/:id/timeline", authMiddleware, (req, res) => {
  const caseData = getCaseById(req.params.id);
  if (!caseData) return res.status(404).json({ message: "Case not found." });
  const isAllowed =
    req.user.role === "asha" ? caseData.created_by === req.user.id : true;
  if (!isAllowed) {
    return res
      .status(403)
      .json({ message: "You do not have access to this case." });
  }
  return res.json({ timeline: getCaseTimeline(req.params.id) });
});

app.get("/api/alerts", authMiddleware, (req, res) => {
  const alerts = getAlertsForUser(req.user.id);
  return res.json({ alerts });
});

app.get("/api/users", authMiddleware, (req, res) => {
  const users = getUserById(req.user.id)
    ? [
        { id: "user-asha", name: "Asha Devi", role: "asha" },
        { id: "user-doctor", name: "Dr. Meera Sinha", role: "doctor" },
      ]
    : [];
  return res.json({ users });
});

app.listen(PORT, () => {
  console.log(
    `Silent Symptom Spotter backend running on http://localhost:${PORT}`,
  );
});
