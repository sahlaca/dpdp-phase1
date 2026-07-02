import type { GapReport, LegalSource, QuestionnaireResponse, SourcesCatalog } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchQuestionnaire(): Promise<QuestionnaireResponse> {
  const res = await fetch(`${API_BASE}/api/v1/questionnaire`);
  if (!res.ok) throw new Error("Failed to load questionnaire");
  return res.json();
}

export async function fetchSources(): Promise<SourcesCatalog> {
  const res = await fetch(`${API_BASE}/api/v1/sources`);
  if (!res.ok) throw new Error("Failed to load legal sources");
  return res.json();
}

export function sourceDownloadUrl(sourceId: string): string {
  return `${API_BASE}/api/v1/sources/${sourceId}/download`;
}

export async function generateReport(payload: {
  company_name: string;
  sector: string;
  answers: Record<string, unknown>;
}): Promise<GapReport> {
  const res = await fetch(`${API_BASE}/api/v1/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to generate report");
  return res.json();
}

export async function downloadReport(payload: {
  company_name: string;
  sector: string;
  answers: Record<string, unknown>;
}): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/v1/reports/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to download report");
  return res.blob();
}

export type { LegalSource };
