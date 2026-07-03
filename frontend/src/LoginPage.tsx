import { useState } from "react";
import { login, register } from "./api";
import { setAuth, type AuthUser } from "./auth";

const FEATURES = [
  "Personalized gap report aligned to DPDP Act 2023 and Rules 2025",
  "39 regulatory obligations assessed from your answers",
  "Official legal source PDFs with citation verification",
  "Professional PDF export for internal sharing",
  "Secure report history saved to your account",
];

export function LoginPage({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result =
        mode === "login"
          ? await login(email, password)
          : await register({
              email,
              password,
              full_name: fullName,
              company_name: companyName || undefined,
            });
      setAuth(result.access_token, result.user);
      onSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-hero">
        <p className="eyebrow">DPDP Compliance Guidance</p>
        <h1>Understand your DPDP obligations in minutes</h1>
        <p className="login-lead">
          Built for Indian small and medium businesses. Answer a structured questionnaire and
          receive a personalized compliance gap report grounded in the DPDP Act 2023 and Rules 2025.
        </p>
        <ul className="login-features">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="login-note">
          Phase 1 provides readiness assessment and an action plan — not legal advice. Consult
          qualified counsel for regulatory decisions.
        </p>
      </section>

      <section className="login-panel card">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label>
                Full name
                <input
                  className="text-input"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label>
                Company name <span className="optional">(optional)</span>
                <input
                  className="text-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Sunrise Hotel"
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              className="text-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
              className="text-input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Minimum 8 characters" : "Your password"}
            />
          </label>
          {error && <p className="error-banner">{error}</p>}
          <button className="btn submit-btn" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </div>
  );
}
