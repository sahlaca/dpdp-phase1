import { useEffect, useState } from "react";
import { fetchReportHistory, fetchSavedReport, type ReportHistoryItem } from "./api";
import type { GapReport } from "./types";

export function ReportHistory({
  onOpenReport,
}: {
  onOpenReport: (report: GapReport) => void;
}) {
  const [items, setItems] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportHistory()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  async function openReport(id: number) {
    try {
      const report = await fetchSavedReport(id);
      onOpenReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    }
  }

  if (loading) return <p className="section-note">Loading report history…</p>;
  if (error) return <p className="error-banner">{error}</p>;
  if (!items.length) {
    return (
      <div className="empty-state card">
        <h2>No saved reports yet</h2>
        <p className="section-note">
          Complete the assessment questionnaire and generate a gap report. Each report is saved to
          your account automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="history-list">
      {items.map((item) => (
        <article key={item.id} className="card history-item">
          <div>
            <h3>{item.company_name}</h3>
            <p className="section-note">
              {item.sector.replace(/_/g, " ")} ·{" "}
              {new Date(item.generated_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              IST
            </p>
            <p className="history-stats">
              {item.summary.gaps_found ?? 0} gaps · {item.summary.critical_gaps ?? 0} critical ·{" "}
              {item.summary.questions_answered ?? 0}/{item.summary.questions_total ?? 0} responses
              recorded
            </p>
          </div>
          <button className="btn secondary small" type="button" onClick={() => openReport(item.id)}>
            View report
          </button>
        </article>
      ))}
    </div>
  );
}
