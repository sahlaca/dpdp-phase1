import { useEffect, useMemo, useState } from "react";
import {
  downloadReport,
  fetchQuestionnaire,
  fetchSources,
  generateReport,
} from "./api";
import { LegalSourcesSidebar } from "./LegalSourcesSidebar";
import type { GapReport, LegalSource, Question, QuestionnaireResponse } from "./types";
import "./App.css";

type Answers = Record<string, unknown>;

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (question.type === "boolean") {
    return (
      <div className="choice-row">
        <label className="radio-pill">
          <input
            type="radio"
            checked={value === true}
            onChange={() => onChange(value === true ? undefined : true)}
          />
          Yes
        </label>
        <label className="radio-pill">
          <input
            type="radio"
            checked={value === false}
            onChange={() => onChange(value === false ? undefined : false)}
          />
          No
        </label>
      </div>
    );
  }

  if (question.type === "single_choice" && question.options) {
    return (
      <div className="choice-col">
        {question.options.map((opt) => (
          <label key={opt.value} className="choice-item">
            <input
              type="radio"
              name={question.id}
              checked={value === opt.value}
              onChange={() => onChange(value === opt.value ? undefined : opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "multi_choice" && question.options) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="choice-col">
        {question.options.map((opt) => (
          <label key={opt.value} className="choice-item">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, opt.value]
                  : selected.filter((v) => v !== opt.value);
                onChange(next.length > 0 ? next : undefined);
              }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      className="text-input"
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ReportView({
  report,
  onStartOver,
  onDownload,
  downloading,
}: {
  report: GapReport;
  onStartOver: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const byCategory = useMemo(() => {
    const map: Record<string, GapReport["obligations"]> = {};
    for (const o of report.obligations) {
      if (o.status === "not_applicable") continue;
      if (!map[o.category]) map[o.category] = [];
      map[o.category].push(o);
    }
    return map;
  }, [report.obligations]);

  const questionsBySection = useMemo(() => {
    const map: Record<string, NonNullable<GapReport["questionnaire_responses"]>> = {};
    for (const q of report.questionnaire_responses ?? []) {
      if (!map[q.section]) map[q.section] = [];
      map[q.section].push(q);
    }
    return map;
  }, [report.questionnaire_responses]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Compliance gap report</p>
          <h1>{report.company_name}</h1>
          <p className="subtitle">
            {report.sector} · Generated{" "}
            {new Date(report.generated_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}{" "}
            IST
          </p>
        </div>
        <div className="header-actions">
          <button className="btn secondary" onClick={onDownload} disabled={downloading}>
            {downloading ? "Preparing PDF…" : "Download PDF report"}
          </button>
          <button className="btn ghost" onClick={onStartOver}>
            Start over
          </button>
        </div>
      </header>

      <section className="card summary-card">
        <div className="stat">
          <span className="stat-value">{report.summary.total_obligations}</span>
          <span className="stat-label">Obligations</span>
        </div>
        <div className="stat">
          <span className="stat-value">{report.summary.gaps_found}</span>
          <span className="stat-label">Gaps</span>
        </div>
        <div className="stat">
          <span className="stat-value critical">{report.summary.critical_gaps}</span>
          <span className="stat-label">Critical</span>
        </div>
        {report.summary.questions_total != null && (
          <div className="stat">
            <span className="stat-value">{report.summary.questions_answered ?? 0}</span>
            <span className="stat-label">
              Answered / {report.summary.questions_total}
            </span>
          </div>
        )}
      </section>

      {Object.keys(questionsBySection).length > 0 && (
        <section className="card">
          <h2>Questionnaire responses</h2>
          <p className="section-note">
            All assessment questions are listed below. Unanswered items are marked{" "}
            <em>Not answered</em>.
          </p>
          {Object.entries(questionsBySection).map(([section, questions]) => (
            <div key={section} className="questionnaire-section">
              <h3>{section}</h3>
              {questions.map((q) => (
                <article
                  key={q.id}
                  className={`question-response ${q.answered ? "" : "unanswered"}`}
                >
                  <p className="question-prompt">{q.prompt}</p>
                  <p className="question-answer">
                    <strong>Response:</strong> {q.answer_display}
                  </p>
                </article>
              ))}
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h2>Regulatory timeline</h2>
        <div className="timeline">
          {report.regulatory_timeline.map((t) => (
            <div key={t.phase} className="timeline-item">
              <span className="timeline-date">{t.effective_date}</span>
              <div>
                <strong>{t.phase}</strong>
                <p>{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Prioritized action plan</h2>
        {report.prioritized_action_plan.map((phase) => (
          <div key={phase.phase} className="phase-block">
            <h3>
              {phase.phase}
              {phase.deadline && <span className="phase-deadline">{phase.deadline}</span>}
            </h3>
            <ul>
              {phase.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {Object.entries(byCategory).map(([category, obligations]) => (
        <section key={category} className="card">
          <h2>{category}</h2>
          {obligations.map((o) => (
            <article key={o.id} className={`obligation status-${o.status}`}>
              <div className="obligation-header">
                <h3>{o.title}</h3>
                <span className="status-badge">{o.status.replace(/_/g, " ")}</span>
              </div>
              <p className="refs">
                {o.act_sections.join(" · ")} · {o.rule_references.join(" · ")} · Due {o.deadline}
              </p>
              <p className="desc">{o.description}</p>
              <p>{o.gap_summary}</p>
              <p className="action">
                <strong>Action:</strong> {o.recommended_action}
              </p>
              {o.citations.length > 0 && (
                <div className="citations">
                  {o.citations.map((c) => (
                    <blockquote key={c.chunk_id}>
                      <p>"{c.excerpt}"</p>
                      <a href={c.download_url} download>
                        Verify in source PDF ↓
                      </a>
                    </blockquote>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      ))}

      <p className="disclaimer">{report.disclaimer}</p>
    </>
  );
}

export default function App() {
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireResponse | null>(null);
  const [legalSources, setLegalSources] = useState<LegalSource[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("hospitality");
  const [answers, setAnswers] = useState<Answers>({});
  const [report, setReport] = useState<GapReport | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setCompanyName("");
    setSector(questionnaire?.sectors[0]?.value ?? "hospitality");
    setError(null);
    setFormKey((k) => k + 1);
  }

  useEffect(() => {
    Promise.all([fetchQuestionnaire(), fetchSources()])
      .then(([q, catalog]) => {
        setQuestionnaire(q);
        setLegalSources(catalog.sources);
      })
      .catch((err) => setError(err.message));
  }, []);

  const questionsBySection = useMemo(() => {
    if (!questionnaire) return {};
    return questionnaire.sections.reduce<Record<string, Question[]>>((acc, section) => {
      acc[section] = questionnaire.questions.filter((q) => q.section === section);
      return acc;
    }, {});
  }, [questionnaire]);

  const payload = () => ({
    company_name: companyName,
    sector,
    answers,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await generateReport({ company_name: companyName, sector, answers });
      setReport(result);
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

  return (
    <div className="app-shell">
      <LegalSourcesSidebar sources={legalSources} />

      <main className="main-content">
        {report ? (
          <ReportView
            report={report}
            onStartOver={handleStartOver}
            onDownload={handleDownload}
            downloading={downloading}
          />
        ) : (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">DPDP Phase 1</p>
                <h1>Compliance Guidance</h1>
                <p className="subtitle">
                  Answer questions about your data practices to receive a personalized gap report
                  grounded in the DPDP Act 2023 and Rules 2025.
                </p>
              </div>
            </header>

            <form key={formKey} className="questionnaire-form" onSubmit={handleSubmit}>
              <section className="card form-card">
                <h2>Your business</h2>
                <div className="field-grid">
                  <label>
                    Company name
                    <input
                      className="text-input"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Sunrise Hotel"
                    />
                  </label>
                  <label>
                    Sector
                    <select
                      className="text-input"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                    >
                      {(questionnaire?.sectors ?? []).map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {questionnaire &&
                Object.entries(questionsBySection).map(([section, questions]) => (
                  <section key={section} className="card form-card">
                    <h2>{section}</h2>
                    {questions.map((q) => (
                      <fieldset key={q.id} className="question">
                        <legend>{q.prompt}</legend>
                        {q.help_text && <p className="help">{q.help_text}</p>}
                        <QuestionField
                          question={q}
                          value={answers[q.id]}
                          onChange={(val) => updateAnswer(q.id, val)}
                        />
                      </fieldset>
                    ))}
                  </section>
                ))}

              {error && <p className="error-banner">{error}</p>}

              <button className="btn submit-btn" type="submit" disabled={loading || !questionnaire}>
                {loading ? "Generating report…" : "Generate gap report"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
