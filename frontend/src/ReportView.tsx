import { useMemo } from "react";
import { sourceDownloadUrl } from "./api";
import type { GapReport } from "./types";

export function ReportView({
  report,
  onDownload,
  downloading,
}: {
  report: GapReport;
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

  const sourceTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of report.legal_sources) {
      map.set(s.id, s.title);
    }
    return map;
  }, [report.legal_sources]);

  function citationSourceLabel(sourceId: string): string {
    return sourceTitles.get(sourceId) ?? sourceId.replace(/_/g, " ");
  }

  function citationDownloadUrl(citation: GapReport["obligations"][number]["citations"][number]): string {
    if (citation.download_url.startsWith("http")) return citation.download_url;
    if (citation.download_url.startsWith("/")) return citation.download_url;
    return sourceDownloadUrl(citation.source_id);
  }

  const questionsBySection = useMemo(() => {
    const map: Record<string, NonNullable<GapReport["questionnaire_responses"]>> = {};
    for (const q of report.questionnaire_responses ?? []) {
      if (!map[q.section]) map[q.section] = [];
      map[q.section].push(q);
    }
    return map;
  }, [report.questionnaire_responses]);

  return (
    <div className="report-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Compliance Gap Report</p>
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
        </div>
      </header>

      <h2 className="section-title">Executive Summary</h2>
      <section className="card summary-card">
        <div className="stat">
          <span className="stat-value">
            {report.summary.obligations_assessed ?? report.summary.total_obligations}
          </span>
          <span className="stat-label">Obligations Assessed</span>
        </div>
        <div className="stat">
          <span className="stat-value">{report.summary.gaps_found}</span>
          <span className="stat-label">Gaps Identified</span>
        </div>
        <div className="stat">
          <span className="stat-value critical">{report.summary.critical_gaps}</span>
          <span className="stat-label">Critical Gaps</span>
        </div>
      </section>

      {report.obligation_explainer && <p className="summary-intro">{report.obligation_explainer}</p>}

      <section className="card">
        <h2 className="section-title in-card">Regulatory Timeline</h2>
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
        <h2 className="section-title in-card">Prioritized Action Plan</h2>
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

      {report.legal_sources.length > 0 && (
        <section className="card">
          <h2 className="section-title in-card">Legal Source Documents</h2>
          <p className="section-note">Primary and secondary sources used to ground this assessment.</p>
          <ul className="report-sources-list">
            {report.legal_sources
              .filter((s) => s.file_available)
              .map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong>
                  <span className="source-type"> ({s.type})</span>
                  <div className="source-links">
                    <a href={sourceDownloadUrl(s.id)} download>
                      Download PDF
                    </a>
                    <a href={s.official_url} target="_blank" rel="noopener noreferrer">
                      Official source ↗
                    </a>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      {Object.keys(questionsBySection).length > 0 && (
        <section className="card">
          <h2 className="section-title in-card">Questionnaire Responses</h2>
          <p className="section-note">
            Complete record of your assessment answers for reference. Items without a recorded response are
            marked <em>Not answered</em>. ({report.summary.questions_answered ?? 0} of{" "}
            {report.summary.questions_total ?? 0} responses recorded)
          </p>
          {Object.entries(questionsBySection).map(([section, questions]) => (
            <div key={section} className="questionnaire-section">
              <h3>{section}</h3>
              {questions.map((q) => (
                <article key={q.id} className={`question-response ${q.answered ? "" : "unanswered"}`}>
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

      {Object.keys(byCategory).length > 0 && (
        <section className="card obligations-section">
          <h2 className="section-title in-card">Detailed Obligation Assessment</h2>
          <p className="section-note">
            {report.obligation_assessment_intro ??
              "Obligations assessed from your answers. Items marked Not Answered need questionnaire input."}
          </p>
          {report.obligation_relationship_note && (
            <p className="obligation-scope-note">{report.obligation_relationship_note}</p>
          )}
          {Object.entries(byCategory).map(([category, obligations]) => (
            <div key={category} className="obligation-category">
              <h3 className="category-heading">{category}</h3>
              {obligations.map((o) => (
                <article key={o.id} className={`obligation status-${o.status}`}>
                  <div className="obligation-header">
                    <h4>{o.title}</h4>
                    <span className="status-badge">{o.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="refs">
                    {o.act_sections.join(" · ")} · {o.rule_references.join(" · ")} · Due {o.deadline}
                  </p>
                  <p className="desc">{o.description}</p>
                  <p className="gap-summary">{o.gap_summary}</p>
                  <p className="action">
                    <strong>Action:</strong> {o.recommended_action}
                  </p>
                  {o.citations.length > 0 && (
                    <div className="citations">
                      {o.citations.map((c) => (
                        <blockquote key={c.chunk_id}>
                          <p>"{c.excerpt}"</p>
                          <p className="citation-source">
                            Source: {citationSourceLabel(c.source_id)} —{" "}
                            <a href={citationDownloadUrl(c)} download>
                              Download source PDF
                            </a>
                          </p>
                        </blockquote>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ))}
        </section>
      )}

      <p className="disclaimer">{report.disclaimer}</p>
    </div>
  );
}
