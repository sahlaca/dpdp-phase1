"""Generate downloadable HTML and PDF compliance reports."""

from __future__ import annotations

from datetime import datetime
from html import escape
from typing import Any
from zoneinfo import ZoneInfo

_STATUS_LABELS = {
    "met": "Met",
    "partial": "Partially Met",
    "not_met": "Not Met",
    "not_applicable": "Not Applicable",
}

_STATUS_COLORS = {
    "met": "#16a34a",
    "partial": "#d97706",
    "not_met": "#dc2626",
    "not_applicable": "#64748b",
}

_SECTOR_LABELS = {
    "hospitality": "Hospitality",
    "retail": "Retail & E-commerce",
    "healthcare": "Healthcare",
    "d2c": "D2C / Consumer Brand",
    "food_beverage": "Food & Beverage",
    "travel_tourism": "Travel & Tourism",
    "fintech": "Fintech & Financial Services",
    "insurance": "Insurance",
    "education": "Education & Edtech",
    "real_estate": "Real Estate",
    "logistics": "Logistics & Transport",
    "manufacturing": "Manufacturing",
    "it_saas": "IT, Software & SaaS",
    "professional_services": "Professional Services",
    "media_entertainment": "Media & Entertainment",
    "automotive": "Automotive",
    "telecom": "Telecom",
    "agriculture": "Agriculture & Agritech",
    "nonprofit": "Non-profit / NGO",
    "staffing": "Staffing & HR",
    "beauty_wellness": "Beauty & Wellness",
    "fitness": "Fitness & Sports",
    "other": "Other",
}


def _fmt_date(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo("UTC"))
        ist = dt.astimezone(ZoneInfo("Asia/Kolkata"))
        return ist.strftime("%d %B %Y, %I:%M %p IST")
    except (ValueError, TypeError):
        return iso


def _sector_label(sector: str) -> str:
    return _SECTOR_LABELS.get(sector, sector.replace("_", " ").title())


def _report_styles(for_pdf: bool) -> str:
    page_rules = """
    @page {
      size: A4;
      margin: 1.6cm 1.4cm 2cm 1.4cm;
      @bottom-center {
        content: "DPDP Compliance Gap Report  ·  Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #94a3b8;
      }
    }
    @page :first {
      margin-top: 1.2cm;
    }
    """ if for_pdf else ""

    return f"""
    {page_rules}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }}
    .cover {{
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #fff;
      padding: 2rem 1.75rem;
      border-radius: 8px;
      margin-bottom: 1.75rem;
    }}
    .cover-eyebrow {{
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #93c5fd;
      margin: 0 0 0.5rem;
    }}
    .cover h1 {{
      margin: 0 0 0.35rem;
      font-size: 22pt;
      font-weight: 700;
      border: none;
      color: #fff;
    }}
    .cover-meta {{
      margin: 0;
      font-size: 10pt;
      color: #cbd5e1;
    }}
    .cover-meta strong {{ color: #fff; }}
    h2.section-title {{
      font-size: 12pt;
      color: #1e40af;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.35rem;
      margin: 1.5rem 0 0.75rem;
    }}
    h2.category {{
      font-size: 11pt;
      color: #1e3a8a;
      background: #eff6ff;
      padding: 0.4rem 0.65rem;
      border-radius: 4px;
      margin: 1.25rem 0 0.5rem;
      border: none;
    }}
    .summary {{
      display: table;
      width: 100%;
      border-collapse: separate;
      border-spacing: 10px 0;
      margin: 0 0 0.5rem;
    }}
    .stat {{
      display: table-cell;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem 0.5rem;
      text-align: center;
      width: 33%;
    }}
    .stat-value {{
      font-size: 22pt;
      font-weight: 700;
      display: block;
      color: #0f172a;
    }}
    .stat-value.critical {{ color: #dc2626; }}
    .stat-label {{
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .timeline-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0.5rem;
    }}
    .timeline-table th, .timeline-table td {{
      border: 1px solid #e2e8f0;
      padding: 0.5rem 0.65rem;
      text-align: left;
      font-size: 9pt;
    }}
    .timeline-table th {{
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }}
    .phase-block {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.75rem;
    }}
    .phase-block h3 {{
      margin: 0 0 0.4rem;
      font-size: 10pt;
      color: #1e40af;
    }}
    .phase-block ul {{
      margin: 0;
      padding-left: 1.1rem;
      font-size: 9.5pt;
    }}
    .phase-block li {{ margin-bottom: 0.25rem; }}
    .obligation {{
      border-left: 4px solid #cbd5e1;
      padding: 0.65rem 0 0.65rem 0.85rem;
      margin: 0.65rem 0;
      page-break-inside: avoid;
    }}
    .ob-row {{
      display: table;
      width: 100%;
      margin-bottom: 0.35rem;
    }}
    .ob-title {{
      display: table-cell;
      font-weight: 600;
      font-size: 10pt;
      vertical-align: top;
      width: 75%;
    }}
    .badge {{
      display: table-cell;
      text-align: right;
      vertical-align: top;
      color: #fff;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      white-space: nowrap;
    }}
    .refs {{
      font-size: 8.5pt;
      color: #64748b;
      margin: 0 0 0.35rem;
    }}
    .obligation p {{ margin: 0.25rem 0; font-size: 9.5pt; }}
    blockquote {{
      margin: 0.4rem 0 0;
      padding: 0.45rem 0.65rem;
      background: #f1f5f9;
      border-left: 3px solid #3b82f6;
      font-size: 8.5pt;
    }}
    blockquote p {{ margin: 0; font-style: italic; color: #334155; }}
    blockquote small {{ color: #64748b; }}
    .sources-list {{
      list-style: none;
      padding: 0;
      margin: 0;
    }}
    .sources-list li {{
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.6rem 0.75rem;
      margin-bottom: 0.5rem;
      font-size: 9pt;
      page-break-inside: avoid;
    }}
    .disclaimer {{
      font-size: 8.5pt;
      color: #64748b;
      font-style: italic;
      margin-top: 1.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
    }}
    .page-break {{ page-break-before: always; }}
    a {{ color: #1d4ed8; text-decoration: none; }}
    .no-print {{ display: none; }}
    """


def render_html_report(report: dict[str, Any], base_url: str = "", for_pdf: bool = False) -> str:
    company = escape(report.get("company_name", ""))
    sector = escape(_sector_label(report.get("sector", "")))
    generated = escape(_fmt_date(report.get("generated_at", "")))
    summary = report.get("summary", {})
    disclaimer = escape(report.get("disclaimer", ""))

    obligations_html = ""
    current_category = ""
    for ob in report.get("obligations", []):
        if ob.get("status") == "not_applicable":
            continue
        cat = ob.get("category", "")
        if cat != current_category:
            current_category = cat
            obligations_html += f'<h2 class="category">{escape(cat)}</h2>\n'

        status = ob.get("status", "")
        status_label = _STATUS_LABELS.get(status, status)
        color = _STATUS_COLORS.get(status, "#333")

        citations_html = ""
        for c in ob.get("citations", []):
            excerpt = escape(c.get("excerpt", ""))
            sid = escape(c.get("source_id", "").replace("_", " "))
            dl = f'{base_url}{c.get("download_url", "")}'
            link = f'<a href="{dl}">Download source PDF</a>' if base_url else sid
            citations_html += f"""
            <blockquote>
              <p>"{excerpt}"</p>
              <small>Source: {sid} — {link}</small>
            </blockquote>"""

        obligations_html += f"""
        <div class="obligation" style="border-left-color:{color}">
          <div class="ob-row">
            <div class="ob-title">{escape(ob.get("title", ""))}</div>
            <div class="badge" style="background:{color}">{status_label}</div>
          </div>
          <p class="refs">{" · ".join(ob.get("act_sections", []))} · {" · ".join(ob.get("rule_references", []))} · Due {escape(ob.get("deadline", ""))}</p>
          <p><strong>Assessment:</strong> {escape(ob.get("gap_summary", ""))}</p>
          <p><strong>Recommended action:</strong> {escape(ob.get("recommended_action", ""))}</p>
          {citations_html}
        </div>"""

    plan_html = ""
    for phase in report.get("prioritized_action_plan", []):
        items = "".join(f"<li>{escape(i)}</li>" for i in phase.get("items", []))
        deadline = phase.get("deadline", "")
        dl_text = f' <span style="color:#64748b;font-weight:400">(by {escape(deadline)})</span>' if deadline else ""
        plan_html += f'<div class="phase-block"><h3>{escape(phase.get("phase", ""))}{dl_text}</h3><ul>{items}</ul></div>'

    sources_html = ""
    for s in report.get("legal_sources", []):
        if not s.get("file_available"):
            continue
        dl = f'{base_url}{s.get("download_url", "")}'
        official = escape(s.get("official_url", ""))
        dl_link = f'<a href="{dl}">Download PDF</a>' if base_url else "See application"
        sources_html += f"""
        <li>
          <strong>{escape(s.get("title", ""))}</strong>
          <span style="color:#64748b"> ({escape(s.get("type", ""))})</span><br/>
          <small style="color:#64748b">{escape(s.get("publisher", ""))}</small><br/>
          {dl_link} · <a href="{official}">Official source</a>
        </li>"""

    timeline_rows = ""
    for t in report.get("regulatory_timeline", []):
        timeline_rows += f"""<tr>
          <td><strong>{escape(t.get("phase", ""))}</strong></td>
          <td>{escape(t.get("effective_date", ""))}</td>
          <td>{escape(t.get("description", ""))}</td>
        </tr>"""

    styles = _report_styles(for_pdf=for_pdf)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>DPDP Compliance Gap Report — {company}</title>
  <style>{styles}</style>
</head>
<body>
  <div class="cover">
    <p class="cover-eyebrow">DPDP Act 2023 · Rules 2025</p>
    <h1>Compliance Gap Report</h1>
    <p class="cover-meta">
      <strong>{company}</strong><br/>
      Sector: {sector}<br/>
      Generated: {generated}
    </p>
  </div>

  <h2 class="section-title">Executive summary</h2>
  <div class="summary">
    <div class="stat">
      <span class="stat-value">{summary.get("total_obligations", 0)}</span>
      <span class="stat-label">Obligations assessed</span>
    </div>
    <div class="stat">
      <span class="stat-value">{summary.get("gaps_found", 0)}</span>
      <span class="stat-label">Gaps identified</span>
    </div>
    <div class="stat">
      <span class="stat-value critical">{summary.get("critical_gaps", 0)}</span>
      <span class="stat-label">Critical gaps</span>
    </div>
  </div>

  <h2 class="section-title">Regulatory timeline</h2>
  <table class="timeline-table">
    <thead><tr><th>Phase</th><th>Date</th><th>Requirement</th></tr></thead>
    <tbody>{timeline_rows}</tbody>
  </table>

  <h2 class="section-title">Prioritized action plan</h2>
  {plan_html}

  <div class="page-break"></div>
  <h2 class="section-title">Detailed obligation assessment</h2>
  <p style="font-size:9pt;color:#64748b;margin-bottom:1rem">
    Applicable obligations only. Status based on questionnaire answers against DPDP Act 2023 and Rules 2025.
  </p>
  {obligations_html}

  <div class="page-break"></div>
  <h2 class="section-title">Legal source documents</h2>
  <p style="font-size:9pt;color:#64748b">Primary and secondary sources used to ground this assessment.</p>
  <ul class="sources-list">{sources_html}</ul>

  <p class="disclaimer">{disclaimer}</p>
</body>
</html>"""


def render_pdf_report(report: dict[str, Any], base_url: str = "") -> bytes:
    """Convert the HTML report to a professional PDF."""
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise RuntimeError(
            "PDF generation requires weasyprint. Use Docker or: pip install weasyprint"
        ) from exc

    html = render_html_report(report, base_url=base_url, for_pdf=True)
    return HTML(string=html).write_pdf()
