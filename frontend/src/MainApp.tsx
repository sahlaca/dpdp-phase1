import { useEffect, useState } from "react";
import { downloadReport, fetchQuestionnaire, fetchSources, generateReport } from "./api";
import type { AuthUser } from "./auth";
import { clearAuth } from "./auth";
import { LegalSourcesPanel } from "./LegalSourcesPanel";
import { QuestionnaireForm, type Answers } from "./QuestionnaireForm";
import { ReportHistory } from "./ReportHistory";
import { ReportView } from "./ReportView";
import { APP_DISCLAIMER, APP_FEATURES, APP_TAGLINE, DPDP_FULL_NAME } from "./appContent";
import type { GapReport, LegalSource, QuestionnaireResponse } from "./types";

type Tab = "overview" | "assessment" | "sources" | "report" | "history";

export function MainApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireResponse | null>(null);
  const [legalSources, setLegalSources] = useState<LegalSource[]>([]);
  const [companyName, setCompanyName] = useState(user.company_name ?? "");
  const [sector, setSector] = useState("hospitality");
  const [answers, setAnswers] = useState<Answers>({});
  const [report, setReport] = useState<GapReport | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchQuestionnaire(), fetchSources()])
      .then(([q, catalog]) => {
        setQuestionnaire(q);
        setLegalSources(catalog.sources);
      })
      .catch((err) => setError(err.message));
  }, []);

  function updateAnswer(questionId: string, val: unknown) {
    setAnswers((prev) => {
      if (val === undefined) {
        const { [questionId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [questionId]: val };
    });
  }

  function handleStartOver() {
    setReport(null);
    setAnswers({});
    setCompanyName(user.company_name ?? "");
    setSector(questionnaire?.sectors[0]?.value ?? "hospitality");
    setError(null);
    setFormKey((k) => k + 1);
    setTab("assessment");
  }

  const payload = () => ({ company_name: companyName, sector, answers });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await generateReport({ company_name: companyName, sector, answers });
      setReport(result);
      setTab("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await downloadReport(payload());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DPDP_Gap_Report_${companyName.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    onLogout();
  }

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "assessment", label: "Assessment" },
    { id: "sources", label: "Legal sources" },
    { id: "report", label: "Gap report", disabled: !report },
    { id: "history", label: "Report history" },
  ];

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark">DPDP</span>
          <div className="brand-copy">
            <span className="brand-text">Compliance Guidance</span>
            <span className="brand-subtitle">{DPDP_FULL_NAME}</span>
          </div>
        </div>
        <nav className="tab-nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              disabled={t.disabled}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-user">
          <span className="user-name">{user.full_name}</span>
          <button type="button" className="btn ghost small" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="main-content wide">
        {tab === "overview" && (
          <div className="overview-panel">
            <header className="page-header compact">
              <div>
                <p className="eyebrow">Welcome back</p>
                <h1>DPDP Readiness Assessment</h1>
                <p className="subtitle">
                  A structured way for Indian SMEs to understand DPDP Act 2023 and Rules 2025
                  obligations, identify gaps, and plan next steps before the May 2027 deadline.
                </p>
              </div>
              <div className="header-actions">
                <button className="btn" type="button" onClick={() => setTab("assessment")}>
                  Start assessment →
                </button>
              </div>
            </header>

            <div className="overview-grid">
              <section className="card">
                <h2>How it works</h2>
                <ol className="steps-list">
                  <li>Complete the assessment questionnaire about your data practices</li>
                  <li>Receive a personalized gap report with legal citations</li>
                  <li>Download a professional PDF and review your saved report history</li>
                </ol>
              </section>
              <section className="card">
                <h2>What you get</h2>
                <ul className="steps-list">
                  <li>39 DPDP obligations assessed against your answers</li>
                  <li>Prioritized action plan with regulatory deadlines</li>
                  <li>Official source PDFs to verify every recommendation</li>
                </ul>
              </section>
            </div>

            <section className="overview-about">
              <p className="overview-about-eyebrow">About this tool</p>
              <h2>{DPDP_FULL_NAME}</h2>
              <p className="overview-about-lead">{APP_TAGLINE}</p>
              <ul className="overview-about-features">
                {APP_FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="overview-about-note">{APP_DISCLAIMER}</p>
            </section>
          </div>
        )}

        {tab === "assessment" && questionnaire && (
          <QuestionnaireForm
            questionnaire={questionnaire}
            companyName={companyName}
            sector={sector}
            answers={answers}
            formKey={formKey}
            loading={loading}
            error={error}
            onCompanyNameChange={setCompanyName}
            onSectorChange={setSector}
            onAnswerChange={updateAnswer}
            onSubmit={handleSubmit}
          />
        )}

        {tab === "sources" && <LegalSourcesPanel sources={legalSources} />}

        {tab === "report" && report && (
          <>
            <div className="report-toolbar">
              <button className="btn ghost small" type="button" onClick={handleStartOver}>
                New assessment
              </button>
            </div>
            <ReportView report={report} onDownload={handleDownload} downloading={downloading} />
          </>
        )}

        {tab === "history" && (
          <ReportHistory
            onOpenReport={(r) => {
              setReport(r);
              setTab("report");
            }}
          />
        )}
      </main>
    </div>
  );
}
