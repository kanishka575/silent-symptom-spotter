import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { apiFetch } from "./services/api";
import "./App.css";

type Role = "asha" | "doctor";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
};

type Symptom = {
  name: string;
  duration: string;
  severity: string;
};

type CaseRecord = {
  id: string;
  case_number: string;
  created_by: string;
  patient_reference: string;
  patient_age: string;
  patient_sex: string;
  location: string;
  audio_url: string | null;
  transcript: string;
  language: string;
  symptoms: Symptom[];
  context_analysis: {
    phrase: string;
    phraseIntensity: string;
    clinicalEvidence: string;
    regionalPhraseContext: string;
    voiceIndicators: string;
    interpretation: string;
  };
  audio_quality: number;
  confidence: number;
  triage_level: string;
  triage_reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  sync_status: string;
  reviewed_by?: string | null;
  follow_up_answers?: string[];
};

type AlertItem = {
  id: string;
  case_id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  message: string;
  read_flag: number;
  created_at: string;
};

type DemoCase = {
  id: string;
  title: string;
  transcript: string;
  language: string;
  selectedDemo: "dramatic-low-risk" | "urgent" | "emergency";
};

const DEMO_CASES: DemoCase[] = [
  {
    id: "dramatic-low-risk",
    title: "Dramatic phrase / low risk",
    transcript:
      "Meri haalat bahut kharab hai. Kal se thoda bukhar tha, par ab theek lag raha hai.",
    language: "Hindi + regional dialect",
    selectedDemo: "dramatic-low-risk",
  },
  {
    id: "urgent",
    title: "Urgent concern",
    transcript:
      "Kab se bukhar hai, sir dard bhi ho raha hai, aur thoda saans chadh raha hai.",
    language: "Hindi + Hinglish",
    selectedDemo: "urgent",
  },
  {
    id: "emergency",
    title: "Emergency case",
    transcript:
      "Saans lene mein bahut dikkat ho rahi hai. Chhati mein dard hai aur patient thak gaya hai.",
    language: "Hindi + local dialect",
    selectedDemo: "emergency",
  },
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      setIsBooting(false);
      return;
    }

    try {
      setUser(JSON.parse(savedUser) as User);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      setIsBooting(false);
    }
  }, []);

  if (isBooting) {
    return <div className="loading-screen">Loading session…</div>;
  }

  return (
    <BrowserRouter>
      <AppRoutes
        user={user}
        setUser={setUser}
        error={error}
        setError={setError}
      />
    </BrowserRouter>
  );
}

function AppRoutes({
  user,
  setUser,
  error,
  setError,
}: {
  user: User | null;
  setUser: (user: User | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
}) {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect user={user} />} />
      <Route path="/login" element={<Navigate to="/login/asha" replace />} />
      <Route
        path="/login/asha"
        element={
          <AshaLoginPage
            user={user}
            setUser={setUser}
            error={error}
            setError={setError}
          />
        }
      />
      <Route
        path="/login/doctor"
        element={
          <DoctorLoginPage
            user={user}
            setUser={setUser}
            error={error}
            setError={setError}
          />
        }
      />

      <Route
        path="/asha/dashboard"
        element={
          <ProtectedRoute user={user} requiredRole="asha">
            <AshaDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/asha/cases"
        element={
          <ProtectedRoute user={user} requiredRole="asha">
            <AshaCaseIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="/asha/alerts"
        element={
          <ProtectedRoute user={user} requiredRole="asha">
            <AshaAlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/asha/profile"
        element={
          <ProtectedRoute user={user} requiredRole="asha">
            <AshaProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/asha/cases/new"
        element={
          <ProtectedRoute user={user} requiredRole="asha">
            <AshaCaseForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/asha/cases/:caseId"
        element={
          <ProtectedRoute user={user} requiredRole="asha">
            <AshaCaseDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute user={user} requiredRole="doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/cases"
        element={
          <ProtectedRoute user={user} requiredRole="doctor">
            <DoctorCaseIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/alerts"
        element={
          <ProtectedRoute user={user} requiredRole="doctor">
            <DoctorAlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/profile"
        element={
          <ProtectedRoute user={user} requiredRole="doctor">
            <DoctorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/cases/:caseId"
        element={
          <ProtectedRoute user={user} requiredRole="doctor">
            <DoctorCaseDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={
              user
                ? user.role === "asha"
                  ? "/asha/dashboard"
                  : "/doctor/dashboard"
                : "/login/asha"
            }
            replace
          />
        }
      />
    </Routes>
  );
}

function HomeRedirect({ user }: { user: User | null }) {
  if (!user) return <Navigate to="/login/asha" replace />;
  return (
    <Navigate
      to={user.role === "asha" ? "/asha/dashboard" : "/doctor/dashboard"}
      replace
    />
  );
}

function ProtectedRoute({
  user,
  requiredRole,
  children,
}: {
  user: User | null;
  requiredRole: Role;
  children: ReactNode;
}) {
  if (!user) {
    return (
      <Navigate
        to={requiredRole === "asha" ? "/login/asha" : "/login/doctor"}
        replace
      />
    );
  }
  if (user.role !== requiredRole) {
    return (
      <Navigate
        to={user.role === "asha" ? "/asha/dashboard" : "/doctor/dashboard"}
        replace
      />
    );
  }
  return <>{children}</>;
}

function getCurrentUserFromStorage(): Partial<User> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") as Partial<User>;
  } catch {
    return {};
  }
}

function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const currentUser = getCurrentUserFromStorage();

  return (
    <div className={`app-shell app-shell--${role}`}>
      <aside className="role-sidebar" aria-label={`${role} navigation`}>
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <div className="eyebrow">Healthcare triage</div>
            <h2>Silent Symptom Spotter</h2>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {(role === "asha" ? ASHA_NAV_ITEMS : DOCTOR_NAV_ITEMS).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={
                item.to ===
                (role === "asha" ? "/asha/dashboard" : "/doctor/dashboard")
              }
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-footer">
          <div className="user-card">
            <div className="avatar-circle">
              {(currentUser.name || "User").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{currentUser.name || "Healthcare worker"}</strong>
              <small>{role === "asha" ? "ASHA worker" : "Doctor / PHC"}</small>
            </div>
          </div>
          <button
            className="secondary-button small full-width"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href =
                role === "asha" ? "/login/asha" : "/login/doctor";
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="content-panel">{children}</main>
    </div>
  );
}

const ASHA_NAV_ITEMS = [
  { label: "Home", to: "/asha/dashboard", icon: "⌂" },
  { label: "Cases", to: "/asha/cases", icon: "▣" },
  { label: "Alerts", to: "/asha/alerts", icon: "◌" },
  { label: "Profile", to: "/asha/profile", icon: "◍" },
];

const DOCTOR_NAV_ITEMS = [
  { label: "Dashboard", to: "/doctor/dashboard", icon: "▣" },
  { label: "Cases", to: "/doctor/cases", icon: "☰" },
  { label: "Alerts", to: "/doctor/alerts", icon: "◔" },
  { label: "Profile", to: "/doctor/profile", icon: "◍" },
];

function AshaLoginPage({
  user,
  setUser,
  error,
  setError,
}: {
  user: User | null;
  setUser: (user: User | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
}) {
  return (
    <RoleLoginPage
      user={user}
      setUser={setUser}
      error={error}
      setError={setError}
      role="asha"
      title="Welcome, ASHA Worker"
      subtitle="Record and triage patient symptoms, even when you're offline."
      fieldLabel="Mobile Number / Email"
      helperText="📴 Works offline for recording and case capture"
      ctaLabel="Sign In"
      footerText="Need help signing in?"
    />
  );
}

function DoctorLoginPage({
  user,
  setUser,
  error,
  setError,
}: {
  user: User | null;
  setUser: (user: User | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
}) {
  return (
    <RoleLoginPage
      user={user}
      setUser={setUser}
      error={error}
      setError={setError}
      role="doctor"
      title="Doctor Sign In"
      subtitle="Review patient cases and AI-assisted triage assessments."
      fieldLabel="Email / Medical ID"
      helperText="Clinician workflow for case review and escalation"
      ctaLabel="Sign In"
      footerText="Forgot password?"
    />
  );
}

function RoleLoginPage({
  user,
  setUser,
  error,
  setError,
  role,
  title,
  subtitle,
  fieldLabel,
  helperText,
  ctaLabel,
  footerText,
}: {
  user: User | null;
  setUser: (user: User | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  role: Role;
  title: string;
  subtitle: string;
  fieldLabel: string;
  helperText: string;
  ctaLabel: string;
  footerText: string;
}) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(
    role === "asha" ? "asha@demo.com" : "doctor@demo.com",
  );
  const [password, setPassword] = useState(
    role === "asha" ? "asha123" : "doctor123",
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role === role) {
      navigate(user.role === "asha" ? "/asha/dashboard" : "/doctor/dashboard", {
        replace: true,
      });
    }
  }, [user, role, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch(`/auth/${role}/login`, {
        method: "POST",
        body: JSON.stringify({ email: identifier, identifier, password }),
      });

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      setUser(response.user);
      navigate(
        response.user.role === "asha" ? "/asha/dashboard" : "/doctor/dashboard",
        {
          replace: true,
        },
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to authenticate.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="auth-brand">Silent Symptom Spotter</div>
          <h2>Offline-first AI triage for community healthcare</h2>
          <div className="auth-checklist">
            <span>✔ Faster triage capture</span>
            <span>✔ Secure clinical review</span>
            <span>✔ Mobile-first field workflows</span>
          </div>
          <div className="auth-badge">{helperText}</div>
        </div>

        <div className="auth-card">
          <div className="brand-row">
            <div>
              <p className="eyebrow">Silent Symptom Spotter</p>
              <h1>{title}</h1>
            </div>
          </div>

          <p className="auth-subtitle">{subtitle}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              {fieldLabel}
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={
                  role === "asha" ? "+91 98xxx xxxxx" : "doctor@clinic.org"
                }
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? "Please wait…" : ctaLabel}
            </button>
          </form>

          <div className="auth-footer-row">
            <button type="button" className="text-link">
              {footerText}
            </button>
            <button
              type="button"
              className="text-link muted"
              onClick={() =>
                navigate(role === "asha" ? "/login/doctor" : "/login/asha")
              }
            >
              {role === "asha" ? "Doctor sign in" : "ASHA sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AshaDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = getCurrentUserFromStorage();

  const fetchCases = async () => {
    try {
      const response = await apiFetch("/cases");
      setCases(response.cases || []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load cases.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    const timer = window.setInterval(fetchCases, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(
    () => ({
      routine: cases.filter((item) => item.triage_level === "ROUTINE").length,
      urgent: cases.filter((item) => item.triage_level === "URGENT").length,
      high: cases.filter((item) => item.triage_level === "HIGH_PRIORITY")
        .length,
      emergency: cases.filter((item) => item.triage_level === "EMERGENCY")
        .length,
    }),
    [cases],
  );

  return (
    <AppShell role="asha">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">ASHA worker</p>
            <h1>Good morning, {currentUser.name || "Asha"}</h1>
          </div>
          <span className="status-chip offline">📴 Offline</span>
        </header>

        <section className="hero-card healthcare-hero">
          <div>
            <p className="eyebrow">Ready to record</p>
            <h2>Ready to record today’s patient cases?</h2>
          </div>
          <button
            className="primary-button large"
            onClick={() => navigate("/asha/cases/new")}
          >
            🎙️ Record New Patient
          </button>
        </section>

        <section className="stats-grid compact-grid">
          <div className="stat-card">
            <span>Today's cases</span>
            <strong>{cases.length}</strong>
          </div>
          <div className="stat-card">
            <span>Routine</span>
            <strong>{counts.routine}</strong>
          </div>
          <div className="stat-card">
            <span>Urgent</span>
            <strong>{counts.urgent}</strong>
          </div>
          <div className="stat-card">
            <span>High Priority</span>
            <strong>{counts.high}</strong>
          </div>
          <div className="stat-card emergency">
            <span>Emergency</span>
            <strong>{counts.emergency}</strong>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow uppercase">Offline status</p>
              <h3>Waiting to sync</h3>
            </div>
            <span className="status-chip neutral">
              {
                cases.filter((item) => item.sync_status === "PENDING_SYNC")
                  .length
              }{" "}
              cases
            </span>
          </div>
          <p className="muted-text">
            📴 Offline mode. Changes will sync automatically when your
            connection returns.
          </p>
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="panel">
          <div className="panel-header">
            <h3>Recent cases</h3>
            <button
              className="ghost-button small"
              onClick={() => navigate("/asha/cases")}
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner" />
              <span>Loading cases…</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h4>No cases recorded today.</h4>
              <p>Start by recording a new patient.</p>
            </div>
          ) : (
            <div className="case-list">
              {cases.map((item) => (
                <button
                  key={item.id}
                  className="case-card"
                  onClick={() => navigate(`/asha/cases/${item.id}`)}
                >
                  <div className="case-card__top">
                    <div>
                      <div className="case-card__label">{item.case_number}</div>
                      <div className="case-card__time">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className="status-badge"
                      style={{ background: triageColor(item.triage_level) }}
                    >
                      {triageLabel(item.triage_level)}
                    </span>
                  </div>
                  <div className="case-card__body">
                    <strong>{item.patient_reference}</strong>
                    <span>{item.location}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function AshaCaseIndex() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await apiFetch("/cases");
        setCases(response.cases || []);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  return (
    <AppShell role="asha">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">ASHA workflow</p>
            <h1>Patient cases</h1>
          </div>
          <button
            className="primary-button compact"
            onClick={() => navigate("/asha/cases/new")}
          >
            + New case
          </button>
        </header>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" /> <span>Loading cases…</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h4>No cases recorded yet.</h4>
            <p>Start by recording a new patient.</p>
          </div>
        ) : (
          <div className="case-list">
            {cases.map((item) => (
              <button
                key={item.id}
                className="case-card"
                onClick={() => navigate(`/asha/cases/${item.id}`)}
              >
                <div className="case-card__top">
                  <div>
                    <div className="case-card__label">{item.case_number}</div>
                    <div className="case-card__time">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className="status-badge"
                    style={{ background: triageColor(item.triage_level) }}
                  >
                    {triageLabel(item.triage_level)}
                  </span>
                </div>
                <div className="case-card__body">
                  <strong>{item.patient_reference}</strong>
                  <span>{item.location}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AshaAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await apiFetch("/alerts");
        setAlerts(response.alerts || []);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <AppShell role="asha">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Alerts</p>
            <h1>System updates</h1>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" /> <span>Loading alerts…</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h4>All caught up.</h4>
            <p>No cases are currently awaiting attention.</p>
          </div>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => (
              <div key={alert.id} className="alert-card">
                <div className="alert-card__head">
                  <span className="status-badge neutral-badge">
                    {alert.type}
                  </span>
                  <span className="case-card__time">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AshaProfilePage() {
  const currentUser = getCurrentUserFromStorage();

  return (
    <AppShell role="asha">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h1>Worker profile</h1>
          </div>
        </header>

        <section className="panel profile-panel">
          <div className="profile-header">
            <div className="avatar-circle large">
              {(currentUser.name || "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{currentUser.name || "Asha Devi"}</h3>
              <p>{currentUser.email || "asha@demo.com"}</p>
            </div>
          </div>
          <div className="profile-grid">
            <div>
              <small>Role</small>
              <strong>ASHA Worker</strong>
            </div>
            <div>
              <small>Location</small>
              <strong>Madhopur</strong>
            </div>
            <div>
              <small>Last sync</small>
              <strong>Just now</strong>
            </div>
            <div>
              <small>Offline queue</small>
              <strong>3 pending</strong>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AshaCaseForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientReference: "Asha Devi",
    age: "48",
    sex: "Female",
    location: "Madhopur",
    transcript: "",
    selectedDemo: "dramatic-low-risk" as DemoCase["selectedDemo"],
  });
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioData(String(reader.result));
        reader.readAsDataURL(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
      setError(null);
    } catch {
      setError(
        "Microphone permission is required to record a patient voice note.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const useDemoTranscript = () => {
    const selected = DEMO_CASES.find(
      (item) => item.selectedDemo === form.selectedDemo,
    );
    setForm((prev) => ({
      ...prev,
      transcript: selected?.transcript || prev.transcript,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const selected = DEMO_CASES.find(
        (item) => item.selectedDemo === form.selectedDemo,
      )!;
      const payload = {
        patientReference: form.patientReference,
        age: form.age,
        sex: form.sex,
        location: form.location,
        transcript: form.transcript || selected.transcript,
        selectedDemo: form.selectedDemo,
        audioQuality: 82,
        audioData,
      };

      const response = await apiFetch("/cases", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      navigate(`/asha/cases/${response.case.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save the case.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell role="asha">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">ASHA workflow</p>
            <h1>Create patient case</h1>
          </div>
          <button
            className="ghost-button small"
            onClick={() => navigate("/asha/dashboard")}
          >
            Back
          </button>
        </header>

        {error && <div className="error-box">{error}</div>}

        <section className="panel form-panel">
          <div className="form-grid">
            <label>
              Patient reference
              <input
                value={form.patientReference}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    patientReference: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Age
              <input
                value={form.age}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, age: event.target.value }))
                }
              />
            </label>
            <label>
              Sex
              <input
                value={form.sex}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sex: event.target.value }))
                }
              />
            </label>
            <label>
              Village / Area
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </label>
          </div>

          <label>
            Demo scenario
            <select
              value={form.selectedDemo}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  selectedDemo: event.target.value as DemoCase["selectedDemo"],
                }))
              }
            >
              {DEMO_CASES.map((item) => (
                <option key={item.id} value={item.selectedDemo}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <div className="recording-panel compact">
            <div className="recording-actions">
              {!recording ? (
                <button className="primary-button" onClick={startRecording}>
                  Start recording
                </button>
              ) : (
                <button className="secondary-button" onClick={stopRecording}>
                  Stop recording
                </button>
              )}
              <button className="ghost-button" onClick={useDemoTranscript}>
                Load demo transcript
              </button>
            </div>
            {audioUrl && (
              <div className="audio-box">
                <audio controls src={audioUrl} />
              </div>
            )}
          </div>

          <label>
            Transcript
            <textarea
              rows={5}
              value={form.transcript}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, transcript: event.target.value }))
              }
            />
          </label>

          <button
            className="primary-button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting case..." : "Submit case"}
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function AshaCaseDetail() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseDetail = async () => {
      if (!caseId) return;
      try {
        const response = await apiFetch(`/cases/${caseId}`);
        setCaseData(response.case);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseDetail();
  }, [caseId]);

  if (loading) return <div className="loading-screen">Loading case…</div>;
  if (!caseData) return <div className="error-box">Case not found.</div>;

  return (
    <AppShell role="asha">
      <div className="page-shell detail-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Case details</p>
            <h1>{caseData.case_number}</h1>
          </div>
          <button
            className="ghost-button small"
            onClick={() => navigate("/asha/cases")}
          >
            Back
          </button>
        </header>

        <div className="detail-layout">
          <section className="panel">
            <div className="panel-header">
              <h3>AI triage</h3>
              <span
                className="status-badge"
                style={{ background: triageColor(caseData.triage_level) }}
              >
                {triageLabel(caseData.triage_level)}
              </span>
            </div>
            <div className="metrics-row">
              <div>
                <small>Confidence</small>
                <strong>{caseData.confidence}%</strong>
              </div>
              <div>
                <small>Status</small>
                <strong>{statusLabel(caseData.status)}</strong>
              </div>
            </div>
            <p className="muted-text">{caseData.triage_reason}</p>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Transcript</h3>
            </div>
            <p className="transcript-box">“{caseData.transcript}”</p>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Detected symptoms</h3>
            </div>
            <div className="symptom-list">
              {caseData.symptoms.map((symptom) => (
                <div
                  key={`${caseData.id}-${symptom.name}`}
                  className="symptom-row"
                >
                  <strong>{symptom.name}</strong>
                  <span>{symptom.duration}</span>
                  <span className="severity">{symptom.severity}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Context analysis</h3>
            </div>
            <div className="context-box">
              <p>
                <strong>Phrase:</strong> {caseData.context_analysis.phrase}
              </p>
              <p>
                <strong>Phrase intensity:</strong>{" "}
                {caseData.context_analysis.phraseIntensity}
              </p>
              <p>
                <strong>Clinical evidence:</strong>{" "}
                {caseData.context_analysis.clinicalEvidence}
              </p>
              <p>
                <strong>Regional phrase context:</strong>{" "}
                {caseData.context_analysis.regionalPhraseContext}
              </p>
              <p>
                <strong>Voice indicators:</strong>{" "}
                {caseData.context_analysis.voiceIndicators}
              </p>
              <p className="interpretation">
                {caseData.context_analysis.interpretation}
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function DoctorDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const currentUser = getCurrentUserFromStorage();

  const fetchCases = async () => {
    try {
      const response = await apiFetch("/cases");
      setCases(response.cases || []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load cases.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    const timer = window.setInterval(fetchCases, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "emergency" && item.triage_level === "EMERGENCY") ||
        (filter === "high" && item.triage_level === "HIGH_PRIORITY") ||
        (filter === "urgent" && item.triage_level === "URGENT") ||
        (filter === "awaiting" && item.status === "AWAITING_DOCTOR_REVIEW") ||
        (filter === "acknowledged" && item.status === "ACKNOWLEDGED");

      const query = search.toLowerCase();
      const matchesSearch =
        query.trim() === "" ||
        item.case_number.toLowerCase().includes(query) ||
        item.patient_reference.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.triage_reason.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [cases, filter, search]);

  return (
    <AppShell role="doctor">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">PHC doctor</p>
            <h1>Good morning, Dr. {currentUser.name || "Meera"}</h1>
          </div>
          <span className="status-chip online">🟢 Online</span>
        </header>

        <section className="stats-grid doctor-grid">
          <div className="stat-card">
            <span>Emergency</span>
            <strong>
              {cases.filter((item) => item.triage_level === "EMERGENCY").length}
            </strong>
          </div>
          <div className="stat-card">
            <span>High Priority</span>
            <strong>
              {
                cases.filter((item) => item.triage_level === "HIGH_PRIORITY")
                  .length
              }
            </strong>
          </div>
          <div className="stat-card">
            <span>Urgent</span>
            <strong>
              {cases.filter((item) => item.triage_level === "URGENT").length}
            </strong>
          </div>
          <div className="stat-card">
            <span>Awaiting review</span>
            <strong>
              {
                cases.filter((item) => item.status === "AWAITING_DOCTOR_REVIEW")
                  .length
              }
            </strong>
          </div>
        </section>

        <section className="panel doctor-filter-bar">
          <div className="toolbar-row">
            <input
              aria-label="Search cases"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search case or patient"
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="emergency">Emergency</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
              <option value="awaiting">Awaiting Review</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="panel">
          <div className="panel-header">
            <h3>Cases requiring attention</h3>
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner" /> <span>Loading cases…</span>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h4>All caught up.</h4>
              <p>No cases are currently awaiting review.</p>
            </div>
          ) : (
            <div className="case-list">
              {filteredCases.map((item) => (
                <button
                  key={item.id}
                  className="case-card"
                  onClick={() => navigate(`/doctor/cases/${item.id}`)}
                >
                  <div className="case-card__top">
                    <div>
                      <div className="case-card__label">{item.case_number}</div>
                      <div className="case-card__time">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className="status-badge"
                      style={{ background: triageColor(item.triage_level) }}
                    >
                      {triageLabel(item.triage_level)}
                    </span>
                  </div>
                  <div className="case-card__body">
                    <strong>{item.patient_reference}</strong>
                    <span>{item.triage_reason}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function DoctorCaseIndex() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await apiFetch("/cases");
        setCases(response.cases || []);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  return (
    <AppShell role="doctor">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Case list</p>
            <h1>All triage cases</h1>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" /> <span>Loading cases…</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h4>No cases available.</h4>
            <p>New submissions will appear here.</p>
          </div>
        ) : (
          <div className="case-list">
            {cases.map((item) => (
              <button
                key={item.id}
                className="case-card"
                onClick={() => navigate(`/doctor/cases/${item.id}`)}
              >
                <div className="case-card__top">
                  <div>
                    <div className="case-card__label">{item.case_number}</div>
                    <div className="case-card__time">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className="status-badge"
                    style={{ background: triageColor(item.triage_level) }}
                  >
                    {triageLabel(item.triage_level)}
                  </span>
                </div>
                <div className="case-card__body">
                  <strong>{item.patient_reference}</strong>
                  <span>{item.status}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DoctorAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await apiFetch("/alerts");
        setAlerts(response.alerts || []);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <AppShell role="doctor">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Alerts</p>
            <h1>Care notifications</h1>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" /> <span>Loading alerts…</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h4>All caught up.</h4>
            <p>No active notifications at the moment.</p>
          </div>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => (
              <div key={alert.id} className="alert-card">
                <div className="alert-card__head">
                  <span className="status-badge neutral-badge">
                    {alert.type}
                  </span>
                  <span className="case-card__time">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DoctorProfilePage() {
  const currentUser = getCurrentUserFromStorage();

  return (
    <AppShell role="doctor">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h1>Doctor profile</h1>
          </div>
        </header>

        <section className="panel profile-panel">
          <div className="profile-header">
            <div className="avatar-circle large">
              {(currentUser.name || "D").charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{currentUser.name || "Dr. Meera Sinha"}</h3>
              <p>{currentUser.email || "doctor@demo.com"}</p>
            </div>
          </div>
          <div className="profile-grid">
            <div>
              <small>Role</small>
              <strong>Doctor / PHC</strong>
            </div>
            <div>
              <small>Clinic</small>
              <strong>Primary Health Centre</strong>
            </div>
            <div>
              <small>Shift</small>
              <strong>Morning</strong>
            </div>
            <div>
              <small>Review queue</small>
              <strong>7 active</strong>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function DoctorCaseDetail() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCase = async () => {
    if (!caseId) return;
    try {
      const response = await apiFetch(`/cases/${caseId}`);
      setCaseData(response.case);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  const updateStatus = async (
    action: "ACKNOWLEDGE" | "REQUEST_FOLLOW_UP" | "ESCALATE",
  ) => {
    if (!caseData) return;
    try {
      await apiFetch(`/cases/${caseData.id}/action`, {
        method: "PATCH",
        body: JSON.stringify({ action, message: `${action} action recorded.` }),
      });
      fetchCase();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading)
    return <div className="loading-screen">Loading case review…</div>;
  if (!caseData) return <div className="error-box">Case not found.</div>;

  return (
    <AppShell role="doctor">
      <div className="page-shell detail-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Case review</p>
            <h1>{caseData.case_number}</h1>
          </div>
          <button
            className="ghost-button small"
            onClick={() => navigate("/doctor/cases")}
          >
            Back
          </button>
        </header>

        <div className="detail-layout">
          <section className="panel">
            <div className="panel-header">
              <h3>Patient details</h3>
              <span
                className="status-badge"
                style={{ background: triageColor(caseData.triage_level) }}
              >
                {triageLabel(caseData.triage_level)}
              </span>
            </div>
            <div className="metrics-row">
              <div>
                <small>Patient</small>
                <strong>{caseData.patient_reference}</strong>
              </div>
              <div>
                <small>Age</small>
                <strong>{caseData.patient_age}</strong>
              </div>
              <div>
                <small>Location</small>
                <strong>{caseData.location}</strong>
              </div>
              <div>
                <small>Confidence</small>
                <strong>{caseData.confidence}%</strong>
              </div>
            </div>
          </section>

          <section className="panel alert-box">
            <div className="panel-header">
              <h3>PHC alert</h3>
            </div>
            <p>
              <strong>Case:</strong> {caseData.case_number}
            </p>
            <p>
              <strong>Reason:</strong> {caseData.triage_reason}
            </p>
            <p>
              <strong>Status:</strong> {statusLabel(caseData.status)}
            </p>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Transcript</h3>
            </div>
            <p className="transcript-box">“{caseData.transcript}”</p>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Detected symptoms</h3>
            </div>
            <div className="symptom-list">
              {caseData.symptoms.map((symptom) => (
                <div
                  key={`${caseData.id}-${symptom.name}`}
                  className="symptom-row"
                >
                  <strong>{symptom.name}</strong>
                  <span>{symptom.duration}</span>
                  <span className="severity">{symptom.severity}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Context analysis</h3>
            </div>
            <div className="context-box">
              <p>
                <strong>Language:</strong> {caseData.language}
              </p>
              <p>
                <strong>Phrase context:</strong>{" "}
                {caseData.context_analysis.phrase}
              </p>
              <p>
                <strong>Clinical evidence:</strong>{" "}
                {caseData.context_analysis.clinicalEvidence}
              </p>
              <p>
                <strong>Voice indicators:</strong>{" "}
                {caseData.context_analysis.voiceIndicators}
              </p>
              <p>
                <strong>Interpretation:</strong>{" "}
                {caseData.context_analysis.interpretation}
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Case timeline</h3>
            </div>
            <div className="timeline">
              <div className="timeline-item">
                <span className="timeline-dot" />
                <div>
                  <strong>Case created</strong>
                  <p>{new Date(caseData.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="timeline-item">
                <span className="timeline-dot" />
                <div>
                  <strong>AI analysis completed</strong>
                  <p>{new Date(caseData.updated_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="timeline-item">
                <span className="timeline-dot" />
                <div>
                  <strong>Doctor notified</strong>
                  <p>Queued for review</p>
                </div>
              </div>
            </div>
          </section>

          <section className="button-row stack-mobile">
            <button
              className="primary-button"
              onClick={() => updateStatus("ACKNOWLEDGE")}
            >
              Acknowledge
            </button>
            <button
              className="secondary-button"
              onClick={() => updateStatus("REQUEST_FOLLOW_UP")}
            >
              Request follow-up
            </button>
            <button
              className="ghost-button"
              onClick={() => updateStatus("ESCALATE")}
            >
              Escalate
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function triageColor(label: string) {
  switch (label) {
    case "ROUTINE":
      return "#2bb673";
    case "URGENT":
      return "#f59e0b";
    case "HIGH_PRIORITY":
      return "#f97316";
    case "EMERGENCY":
      return "#ef4444";
    default:
      return "#8b5cf6";
  }
}

function triageLabel(label: string) {
  switch (label) {
    case "ROUTINE":
      return "Routine";
    case "URGENT":
      return "Urgent";
    case "HIGH_PRIORITY":
      return "High Priority";
    case "EMERGENCY":
      return "Emergency";
    case "NEEDS_VERIFICATION":
      return "Needs Verification";
    default:
      return label;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "AWAITING_DOCTOR_REVIEW":
      return "Awaiting Doctor Review";
    case "ACKNOWLEDGED":
      return "✓ Doctor acknowledged";
    case "FOLLOW_UP_REQUIRED":
      return "⚠️ Follow-up requested";
    case "ESCALATED":
      return "🚨 Case escalated";
    default:
      return status;
  }
}

export default App;
