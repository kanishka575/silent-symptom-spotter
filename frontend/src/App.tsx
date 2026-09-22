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
  follow_up_request?: FollowUpRequest | null;
  follow_up_response?: FollowUpResponse | null;
};

type FollowUpRequest = {
  questions: string[];
  note: string;
  requested_by?: string;
  requested_at?: string;
};

type FollowUpResponse = {
  answers: { question: string; answer: string }[];
  note: string;
  submitted_at: string;
  submitted_by?: { id: string; name: string } | null;
};

type TimelineEvent = {
  id: string;
  action: string;
  message: string;
  created_at: string;
  actor_name?: string;
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
        element={<Navigate to="/asha/dashboard" replace />}
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
        element={<Navigate to="/doctor/dashboard" replace />}
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

function doctorDisplayName(name: string | undefined) {
  const displayName = name || "Meera";
  return displayName.replace(/^Dr\.\s*/i, "");
}

function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const currentUser = getCurrentUserFromStorage();
  const userName = currentUser.name || (role === "asha" ? "Healthcare worker" : "Doctor");
  const userRole = role === "asha" ? "ASHA worker" : "Doctor";
  const userInitials = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = role === "asha" ? "/login/asha" : "/login/doctor";
  };

  const navItems = role === "asha" ? ASHA_NAV_ITEMS : DOCTOR_NAV_ITEMS;
  const dashboardPath = role === "asha" ? "/asha/dashboard" : "/doctor/dashboard";

  return (
    <div className={`app-shell app-shell--${role}`}>
      {/* Mobile Top Header */}
      <header className="mobile-header" aria-label="Mobile top bar">
        <div className="mobile-header-brand">
          <div className="brand-mark">S</div>
          <span>Silent Symptom Spotter</span>
        </div>
        <div className="mobile-header-right">
          <div className="mobile-user-avatar">{userInitials}</div>
          <button className="mobile-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="role-sidebar" aria-label={`${role} navigation`}>
        <div className="sidebar-brand">
          <div className="brand-mark">S</div>
          <h2>Silent Symptom Spotter</h2>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          <div className="nav-section-label">Menu</div>
          {navItems.map((item) => (
            <NavigationItem
              key={item.to}
              item={item}
              dashboardPath={dashboardPath}
            />
          ))}
        </nav>

        <div className="nav-footer">
          <div className="user-card">
            <div className="avatar-circle">{userInitials}</div>
            <div className="user-info">
              <strong>{userName}</strong>
              <small>{userRole}</small>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-full" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-panel">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" aria-label="Mobile bottom navigation">
        <div className="mobile-bottom-nav-inner">
          {navItems.map((item) => (
            <MobileNavigationItem
              key={item.to}
              item={item}
              dashboardPath={dashboardPath}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function MobileNavigationItem({
  item,
  dashboardPath,
}: {
  item: { label: string; to: string; icon: string };
  dashboardPath: string;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.to === dashboardPath}
      className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}
    >
      <span className="mnav-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}

function NavigationItem({
  item,
  dashboardPath,
}: {
  item: { label: string; to: string; icon: string };
  dashboardPath: string;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.to === dashboardPath}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
    >
      <span className="nav-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}

const ASHA_NAV_ITEMS = [
  { label: "Home", to: "/asha/dashboard", icon: "⌂" },
  { label: "Cases", to: "/asha/cases", icon: "▣" },
  { label: "Alerts", to: "/asha/alerts", icon: "◌" },
];

const DOCTOR_NAV_ITEMS = [
  { label: "Dashboard", to: "/doctor/dashboard", icon: "▣" },
  { label: "Cases", to: "/doctor/cases", icon: "☰" },
  { label: "Alerts", to: "/doctor/alerts", icon: "◔" },
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
      <div className="auth-card-wrap">
        <div className="auth-brand-header">
          <div className="auth-brand-mark">S</div>
          <div className="auth-brand-name">Silent Symptom Spotter</div>
        </div>
        
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              {fieldLabel}
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={
                  role === "asha" ? "e.g. asha@demo.com" : "e.g. doctor@demo.com"
                }
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
              />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitting}
            >
              {submitting ? "Please wait…" : ctaLabel}
            </button>
          </form>

          <div className="auth-footer-row">
            <button type="button" className="text-link muted">
              {footerText}
            </button>
            <button
              type="button"
              className="text-link"
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
          <div className="page-title-row">
            <div>
              <span className="eyebrow">ASHA worker</span>
              <h1>Good morning, {currentUser.name || "Asha"}</h1>
            </div>
            <span className="status-chip offline">📴 Offline</span>
          </div>
        </header>

        <section className="hero-card healthcare-hero">
          <div>
            <span className="eyebrow">Ready to record</span>
            <h2>Ready to record today’s patient cases?</h2>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate("/asha/cases/new")}
          >
            🎙️ Record New Patient
          </button>
        </section>

        <section className="stats-grid stats-grid-5">
          <div className="stat-card">
            <span className="stat-card-label">Today's cases</span>
            <strong className="stat-card-value">{cases.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Routine</span>
            <strong className="stat-card-value primary">{counts.routine}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Urgent</span>
            <strong className="stat-card-value warning">{counts.urgent}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">High Priority</span>
            <strong className="stat-card-value warning">{counts.high}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Emergency</span>
            <strong className="stat-card-value danger">{counts.emergency}</strong>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Offline status</span>
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
          <div className="panel-body">
            <p className="text-muted">
              📴 Offline mode. Changes will sync automatically when your
              connection returns.
            </p>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="panel">
          <div className="panel-header">
            <h3>Recent cases</h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/asha/cases")}
            >
              View all
            </button>
          </div>

          <div className="panel-body">
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
                        <div className="case-card__number">{item.case_number}</div>
                        <div className="case-card__time">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`triage-badge triage-${item.triage_level.toLowerCase().replace('_priority', '')}`}>
                        {triageLabel(item.triage_level)}
                      </span>
                    </div>
                    <div className="case-card__body">
                      <strong className="case-card__patient">{item.patient_reference}</strong>
                      <span className="case-card__meta">{item.location}</span>
                      <span className="case-card__meta">{statusLabel(item.status)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <div className="page-title-row">
            <div>
              <span className="eyebrow">ASHA workflow</span>
              <h1>Patient cases</h1>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/asha/cases/new")}
            >
              + New case
            </button>
          </div>
        </header>

        <section className="panel">
          <div className="panel-body">
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
                        <div className="case-card__number">{item.case_number}</div>
                        <div className="case-card__time">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`triage-badge triage-${item.triage_level.toLowerCase().replace('_priority', '')}`}>
                        {triageLabel(item.triage_level)}
                      </span>
                    </div>
                    <div className="case-card__body">
                      <strong className="case-card__patient">{item.patient_reference}</strong>
                      <span className="case-card__meta">{item.location}</span>
                      <span className="case-card__meta">{statusLabel(item.status)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
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
          <div className="page-title-row">
            <div>
              <span className="eyebrow">Alerts</span>
              <h1>System updates</h1>
            </div>
          </div>
        </header>

        <section className="panel">
          <div className="panel-body">
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
                      <span className="status-badge status-neutral">
                        {alert.type}
                      </span>
                      <span className="text-xs text-muted">
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
          <div className="page-title-row">
            <div>
              <span className="eyebrow">ASHA workflow</span>
              <h1>Create patient case</h1>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/asha/dashboard")}
            >
              Back
            </button>
          </div>
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

          <div className="recording-panel">
            <div className="recording-actions">
              {!recording ? (
                <button className="btn btn-primary" onClick={startRecording}>
                  Start recording
                </button>
              ) : (
                <button className="btn btn-danger" onClick={stopRecording}>
                  Stop recording
                </button>
              )}
              <button className="btn btn-ghost" onClick={useDemoTranscript}>
                Load demo transcript
              </button>
            </div>
            {audioUrl && (
              <div className="audio-player-wrap">
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

          <div className="button-row">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting case..." : "Submit case"}
            </button>
          </div>
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const fetchCaseDetail = async () => {
    if (!caseId) return;
    try {
      const caseResponse = await apiFetch(`/cases/${caseId}`);
      setCaseData(caseResponse.case);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load case.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
  }, [caseId]);

  const submitFollowUp = async () => {
    if (!caseData?.follow_up_request) return;
    const submittedAnswers = caseData.follow_up_request.questions.map(
      (question) => ({
        question,
        answer: answers[question] || "NOT_SURE",
      }),
    );
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/cases/${caseData.id}/follow-up`, {
        method: "POST",
        body: JSON.stringify({ answers: submittedAnswers, note }),
      });
      await fetchCaseDetail();
      setSuccess("✓ Follow-up submitted");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update the case. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><span className="spinner"></span> &nbsp; Loading case…</div>;
  if (!caseData) return <div className="error-box">Case not found.</div>;

  return (
    <AppShell role="asha">
      <div className="page-shell detail-shell">
        <header className="page-header">
          <div className="page-title-row">
            <div>
              <span className="eyebrow">Case details</span>
              <h1>{caseData.case_number}</h1>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/asha/cases")}
            >
              Back
            </button>
          </div>
        </header>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="detail-layout">
          {/* Patient Metadata Grid */}
          <section className="panel">
            <div className="patient-meta-grid">
              <div className="meta-item">
                <small>Patient Ref</small>
                <strong>{caseData.patient_reference}</strong>
              </div>
              <div className="meta-item">
                <small>Location</small>
                <strong>{caseData.location}</strong>
              </div>
              <div className="meta-item">
                <small>Age & Sex</small>
                <strong>
                  {caseData.patient_metadata?.age}y /{" "}
                  {caseData.patient_metadata?.sex}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel triage-assessment">
            <div className="panel-header">
              <h3>AI triage</h3>
              <span className={`triage-badge triage-${caseData.triage_level.toLowerCase().replace('_priority', '')}`}>
                {triageLabel(caseData.triage_level)}
              </span>
            </div>
            <div className="panel-body">
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
              <p className="triage-reason">{caseData.triage_reason}</p>
              
              <div className="ai-disclaimer">
                AI Assessment: Always verify clinically. Triage is indicative based on provided context.
              </div>
            </div>
          </section>

          {caseData.status === "FOLLOW_UP_REQUIRED" &&
            caseData.follow_up_request && (
              <section className="panel followup-box-panel">
                <div className="panel-header">
                  <h3>⚠️ Follow-up requested by Doctor</h3>
                </div>
                <div className="panel-body">
                  <div className="followup-warning">
                    Action required to proceed with this case.
                  </div>
                  <p className="text-muted">Select the response for each requested question.</p>
                  <div style={{ marginTop: '14px' }}>
                    {caseData.follow_up_request.questions.map((question) => (
                      <div className="followup-question-item" key={question}>
                        <strong>{question}</strong>
                        <select
                          value={answers[question] || ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [question]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Select response</option>
                          <option value="YES">Yes</option>
                          <option value="NO">No</option>
                          <option value="NOT_SURE">Not sure</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  
                  {caseData.follow_up_request.note && (
                    <div className="context-phrase-block">
                      <small>Doctor note</small>
                      <p className="context-phrase-text">"{caseData.follow_up_request.note}"</p>
                    </div>
                  )}

                  <label style={{ marginTop: '14px' }}>
                    Note for doctor
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Add any additional context..."
                    />
                  </label>
                  
                  <div className="button-row">
                    <button
                      className="btn btn-primary"
                      onClick={submitFollowUp}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting follow-up..." : "Submit follow-up"}
                    </button>
                  </div>
                </div>
              </section>
            )}

          {caseData.status === "FOLLOW_UP_COMPLETED" &&
            caseData.follow_up_response && (
              <section className="panel followup-box-panel">
                <div className="panel-header">
                  <h3>✓ Follow-up completed</h3>
                </div>
                <div className="panel-body">
                  {caseData.follow_up_response.answers.map((answer) => (
                    <div className="followup-question-item" key={answer.question}>
                      <strong>{answer.question}</strong>
                      <span className="followup-answer">ASHA response: {answer.answer}</span>
                    </div>
                  ))}
                  
                  {caseData.follow_up_response.note && (
                    <div className="context-phrase-block" style={{ marginTop: '12px' }}>
                      <small>ASHA Note</small>
                      <p className="context-phrase-text">"{caseData.follow_up_response.note}"</p>
                    </div>
                  )}
                  {caseData.follow_up_response.submitted_by && (
                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '12px' }}>
                      Submitted by: {caseData.follow_up_response.submitted_by.name}
                    </p>
                  )}
                </div>
              </section>
            )}

          <section className="panel">
            <div className="panel-header">
              <h3>Transcript</h3>
            </div>
            <div className="transcript-body">
              <p className="transcript-quote">{caseData.transcript}</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Detected symptoms</h3>
            </div>
            <div className="symptoms-body">
              <div className="symptom-list">
                {caseData.symptoms.map((symptom) => (
                  <div
                    key={`${caseData.id}-${symptom.name}`}
                    className="symptom-row"
                  >
                    <strong className="symptom-name">{symptom.name}</strong>
                    <span className="symptom-duration">{symptom.duration}</span>
                    <span className={`severity-badge severity-${symptom.severity.toLowerCase()}`}>
                      {symptom.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Context analysis</h3>
            </div>
            <div className="context-body">
              <div className="context-phrase-block">
                <small>Analyzed Phrase</small>
                <span className="context-phrase-text">"{caseData.context_analysis.phrase}"</span>
              </div>
              
              <div className="context-grid">
                <div className="context-item">
                  <small>Phrase intensity</small>
                  <span>{caseData.context_analysis.phraseIntensity}</span>
                </div>
                <div className="context-item">
                  <small>Clinical evidence</small>
                  <span>{caseData.context_analysis.clinicalEvidence}</span>
                </div>
                <div className="context-item">
                  <small>Regional context</small>
                  <span>{caseData.context_analysis.regionalPhraseContext}</span>
                </div>
                <div className="context-item">
                  <small>Voice indicators</small>
                  <span>{caseData.context_analysis.voiceIndicators}</span>
                </div>
              </div>
              
              <p className="context-interpretation">
                <strong>Interpretation:</strong> {caseData.context_analysis.interpretation}
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

  const counts = useMemo(() => {
    return {
      total: cases.length,
      emergency: cases.filter((item) => item.triage_level === "EMERGENCY").length,
    };
  }, [cases]);

  const urgentCases = useMemo(() => {
    return cases.filter(
      (item) =>
        item.triage_level === "EMERGENCY" ||
        item.triage_level === "HIGH_PRIORITY" ||
        item.triage_level === "URGENT"
    );
  }, [cases]);

  return (
    <AppShell role="doctor">
      <div className="page-shell">
        <header className="page-header">
          <div className="page-title-row">
            <div>
              <span className="eyebrow">Primary Health Center</span>
              <h1>Welcome, Dr. {currentUser.name || "Doctor"}</h1>
            </div>
            <span className="status-chip online">🟢 Online</span>
          </div>
        </header>

        <section className="stats-grid stats-grid-4">
          <div className="stat-card">
            <span className="stat-card-label">Total active cases</span>
            <strong className="stat-card-value">{counts.total}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Awaiting review</span>
            <strong className="stat-card-value primary">
              {
                cases.filter(
                  (c) =>
                    c.status === "AWAITING_REVIEW" &&
                    c.triage_level !== "EMERGENCY"
                ).length
              }
            </strong>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Emergencies</span>
            <strong className="stat-card-value danger">{counts.emergency}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">ASHA workers online</span>
            <strong className="stat-card-value">12</strong>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="panel">
          <div className="panel-header">
            <h3>Urgent cases & emergencies</h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/doctor/cases")}
            >
              View all
            </button>
          </div>
          <div className="panel-body">
            {loading ? (
              <div className="loading-state">
                <span className="spinner" /> <span>Loading cases…</span>
              </div>
            ) : urgentCases.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h4>No urgent cases.</h4>
                <p>The queue is clear.</p>
              </div>
            ) : (
              <div className="case-list">
                {urgentCases.map((item) => (
                  <button
                    key={item.id}
                    className="case-card"
                    onClick={() => navigate(`/doctor/cases/${item.id}`)}
                  >
                    <div className="case-card__top">
                      <div>
                        <div className="case-card__number">{item.case_number}</div>
                        <div className="case-card__time">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`triage-badge triage-${item.triage_level.toLowerCase().replace('_priority', '')}`}>
                        {triageLabel(item.triage_level)}
                      </span>
                    </div>
                    <div className="case-card__body">
                      <strong className="case-card__patient">{item.patient_reference}</strong>
                      <span className="case-card__meta">{item.triage_reason}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <div className="page-title-row">
            <div>
              <span className="eyebrow">Case list</span>
              <h1>All triage cases</h1>
            </div>
          </div>
        </header>

        <section className="panel">
          <div className="panel-body">
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
                        <div className="case-card__number">{item.case_number}</div>
                        <div className="case-card__time">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`triage-badge triage-${item.triage_level.toLowerCase().replace('_priority', '')}`}>
                        {triageLabel(item.triage_level)}
                      </span>
                    </div>
                    <div className="case-card__body">
                      <strong className="case-card__patient">{item.patient_reference}</strong>
                      <span className="case-card__meta">{statusLabel(item.status)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
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
          <div className="page-title-row">
            <div>
              <span className="eyebrow">Alerts</span>
              <h1>Care notifications</h1>
            </div>
          </div>
        </header>

        <section className="panel">
          <div className="panel-body">
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
                      <span className="status-badge status-neutral">
                        {alert.type}
                      </span>
                      <span className="text-xs text-muted">
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
        </section>
      </div>
    </AppShell>
  );
}

function DoctorCaseDetail() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showEscalateConfirm, setShowEscalateConfirm] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpNote, setFollowUpNote] = useState("");

  const fetchCase = async () => {
    if (!caseId) return;
    try {
      const [response, timelineResponse] = await Promise.all([
        apiFetch(`/cases/${caseId}`),
        apiFetch(`/cases/${caseId}/timeline`),
      ]);
      setCaseData(response.case);
      setTimeline(timelineResponse.timeline || []);
      setError(null);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load case.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  const updateStatus = async (
    nextAction: "ACKNOWLEDGE" | "REQUEST_FOLLOW_UP" | "ESCALATE",
  ) => {
    if (!caseData) return;
    setAction(nextAction);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/cases/${caseData.id}/action`, {
        method: "PATCH",
        body: JSON.stringify({
          action: nextAction,
          followUpRequest:
            nextAction === "REQUEST_FOLLOW_UP"
              ? { questions: followUpQuestions, note: followUpNote }
              : undefined,
        }),
      });
      await fetchCase();
      setShowFollowUp(false);
      setShowEscalateConfirm(false);
      setSuccess(
        nextAction === "ACKNOWLEDGE"
          ? "✓ Case acknowledged"
          : nextAction === "REQUEST_FOLLOW_UP"
            ? "✓ Follow-up request sent"
            : "🚨 Case escalated",
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update the case. Please try again.",
      );
    } finally {
      setAction(null);
    }
  };

  if (loading)
    return <div className="loading-screen">Loading case review…</div>;
  if (!caseData) return <div className="error-box">Case not found.</div>;

  return (
    <AppShell role="doctor">
      <div className="page-shell detail-shell">
        <header className="page-header">
          <div className="page-title-row">
            <div>
              <span className="eyebrow">Case review</span>
              <h1>{caseData.case_number}</h1>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/doctor/cases")}
            >
              Back
            </button>
          </div>
        </header>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="detail-layout">
          {/* Top details columns */}
          <div className="detail-cols">
            <section className="panel">
              <div className="panel-header">
                <h3>Patient details</h3>
              </div>
              <div className="panel-body">
                <div className="phc-alert-rows">
                  <div className="phc-field">
                    <span className="phc-field-label">Reference</span>
                    <span className="phc-field-value">{caseData.patient_reference}</span>
                  </div>
                  <div className="phc-field">
                    <span className="phc-field-label">Age</span>
                    <span className="phc-field-value">{caseData.patient_age}</span>
                  </div>
                  <div className="phc-field">
                    <span className="phc-field-label">Location</span>
                    <span className="phc-field-value">{caseData.location}</span>
                  </div>
                  <div className="phc-field">
                    <span className="phc-field-label">Language</span>
                    <span className="phc-field-value">{caseData.language}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3>AI triage</h3>
                <span className={`triage-badge triage-${caseData.triage_level.toLowerCase().replace('_priority', '')}`}>
                  {triageLabel(caseData.triage_level)}
                </span>
              </div>
              <div className="panel-body">
                <div className="phc-alert-rows">
                  <div className="phc-field">
                    <span className="phc-field-label">Status</span>
                    <span className="phc-field-value">{statusLabel(caseData.status)}</span>
                  </div>
                  <div className="phc-field">
                    <span className="phc-field-label">Confidence</span>
                    <span className="phc-field-value">{caseData.confidence}%</span>
                  </div>
                  <div className="phc-field">
                    <span className="phc-field-label">Reason</span>
                    <span className="phc-field-value">{caseData.triage_reason}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <h3>Detected symptoms</h3>
            </div>
            <div className="symptoms-body">
              <div className="symptom-list">
                {caseData.symptoms.map((symptom) => (
                  <div
                    key={`${caseData.id}-${symptom.name}`}
                    className="symptom-row"
                  >
                    <strong className="symptom-name">{symptom.name}</strong>
                    <span className="symptom-duration">{symptom.duration}</span>
                    <span className={`severity-badge severity-${symptom.severity.toLowerCase()}`}>
                      {symptom.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {caseData.status === "FOLLOW_UP_COMPLETED" &&
            caseData.follow_up_response && (
              <section className="panel followup-box-panel">
                <div className="panel-header">
                  <h3>✓ Follow-up completed</h3>
                </div>
                <div className="panel-body">
                  {caseData.follow_up_response.answers.map((answer) => (
                    <div className="followup-question-item" key={answer.question}>
                      <strong>{answer.question}</strong>
                      <span className="followup-answer">ASHA response: {answer.answer}</span>
                    </div>
                  ))}
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '12px' }}>
                    Submitted: {new Date(caseData.follow_up_response.submitted_at).toLocaleString()}
                  </p>
                  {caseData.follow_up_response.submitted_by && (
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                      ASHA Worker: {caseData.follow_up_response.submitted_by.name}
                    </p>
                  )}
                </div>
              </section>
            )}

          <section className="panel">
            <div className="panel-header">
              <h3>Context analysis</h3>
            </div>
            <div className="context-body">
              <div className="context-phrase-block">
                <small>Analyzed Phrase</small>
                <span className="context-phrase-text">"{caseData.context_analysis.phrase}"</span>
              </div>
              <div className="context-grid">
                <div className="context-item">
                  <small>Clinical evidence</small>
                  <span>{caseData.context_analysis.clinicalEvidence}</span>
                </div>
                <div className="context-item">
                  <small>Voice indicators</small>
                  <span>{caseData.context_analysis.voiceIndicators}</span>
                </div>
              </div>
              <p className="context-interpretation">
                <strong>Interpretation:</strong> {caseData.context_analysis.interpretation}
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Transcript</h3>
            </div>
            <div className="transcript-body">
              <p className="transcript-quote">{caseData.transcript}</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Case timeline</h3>
            </div>
            <div className="timeline-body">
              <div className="timeline">
                {timeline.map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <span className="timeline-dot" />
                    <div className="timeline-content">
                      <strong>{timelineLabel(event.action)}</strong>
                      <p>{new Date(event.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="doctor-actions-body">
              <h3 className="eyebrow">Doctor Actions</h3>
              <div className="doctor-actions-row">
                <button
                  className="btn btn-primary"
                  onClick={() => updateStatus("ACKNOWLEDGE")}
                  disabled={Boolean(action)}
                >
                  {action === "ACKNOWLEDGE" ? "Acknowledging case…" : "✓ Acknowledge"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowFollowUp(true)}
                  disabled={Boolean(action)}
                >
                  ⚠️ Request follow-up
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowEscalateConfirm(true)}
                  disabled={Boolean(action)}
                >
                  {action === "ESCALATE" ? "Escalating…" : "🚨 Escalate"}
                </button>
              </div>
            </div>
          </section>
        </div>

        {showFollowUp && (
          <div className="modal-backdrop">
            <section
              className="modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="follow-up-title"
            >
              <div className="panel-header" style={{ marginBottom: '16px', paddingBottom: '16px' }}>
                <h3 id="follow-up-title">Request Follow-up</h3>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <p>Select the information you want the ASHA worker to verify.</p>
                <div style={{ marginTop: '16px' }}>
                  {FOLLOW_UP_OPTIONS.map((question) => (
                    <label className="checkbox-row" key={question}>
                      <input
                        type="checkbox"
                        checked={followUpQuestions.includes(question)}
                        onChange={(event) =>
                          setFollowUpQuestions((current) =>
                            event.target.checked
                              ? [...current, question]
                              : current.filter((item) => item !== question),
                          )
                        }
                      />
                      {question}
                    </label>
                  ))}
                </div>
                <label style={{ marginTop: '16px' }}>
                  Note for ASHA worker
                  <textarea
                    rows={3}
                    value={followUpNote}
                    onChange={(event) => setFollowUpNote(event.target.value)}
                    placeholder="Add a note for ASHA worker"
                  />
                </label>
                <div className="button-row" style={{ marginTop: '24px' }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowFollowUp(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={followUpQuestions.length === 0 || Boolean(action)}
                    onClick={() => updateStatus("REQUEST_FOLLOW_UP")}
                  >
                    {action === "REQUEST_FOLLOW_UP"
                      ? "Sending request…"
                      : "Send follow-up request"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {showEscalateConfirm && (
          <div className="modal-backdrop">
            <section
              className="modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="escalate-title"
            >
              <div className="panel-header" style={{ marginBottom: '16px', paddingBottom: '16px' }}>
                <h3 id="escalate-title">Escalate case?</h3>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <p>Are you sure you want to escalate this case to higher medical authorities? This action cannot be undone.</p>
                <div className="button-row" style={{ marginTop: '24px' }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowEscalateConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => updateStatus("ESCALATE")}
                    disabled={Boolean(action)}
                  >
                    {action === "ESCALATE" ? "Escalating…" : "Yes, escalate case"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const FOLLOW_UP_OPTIONS = [
  "Confirm current symptoms",
  "Re-record voice note",
  "Verify breathing difficulty",
  "Confirm symptom duration",
  "Other",
];

function timelineLabel(action: string) {
  switch (action) {
    case "CASE_CREATED":
      return "Case created by ASHA";
    case "AI_ANALYSIS_COMPLETED":
      return "AI analysis completed";
    case "ACKNOWLEDGE":
      return "Doctor acknowledged case";
    case "REQUEST_FOLLOW_UP":
      return "Doctor requested follow-up";
    case "ASHA_FOLLOW_UP_COMPLETED":
      return "ASHA completed follow-up";
    case "ESCALATE":
      return "Case escalated by Doctor";
    default:
      return action;
  }
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
    case "FOLLOW_UP_COMPLETED":
      return "✓ Follow-up completed";
    case "ESCALATED":
      return "🚨 Case escalated";
    default:
      return status;
  }
}

export default App;
