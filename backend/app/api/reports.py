from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, Response

from app.questionnaire.schema import QuestionnaireSubmission
from app.reports.export import render_html_report, render_pdf_report
from app.reports.generator import generate_gap_report

router = APIRouter()


def _safe_filename(company_name: str, ext: str) -> str:
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in company_name)[:40]
    return f"DPDP_Gap_Report_{safe}.{ext}"


@router.post("/reports/generate")
def create_report(submission: QuestionnaireSubmission) -> dict:
    """Score obligations and return a structured compliance gap report."""
    try:
        report = generate_gap_report(submission)
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    return report


@router.post("/reports/download")
def download_report_pdf(submission: QuestionnaireSubmission, request: Request) -> Response:
    """Generate and download a professional PDF compliance report."""
    report = generate_gap_report(submission)
    base_url = str(request.base_url).rstrip("/")

    try:
        pdf_bytes = render_pdf_report(report, base_url=base_url)
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{_safe_filename(submission.company_name, "pdf")}"',
        },
    )


@router.post("/reports/download/html")
def download_report_html(submission: QuestionnaireSubmission, request: Request) -> HTMLResponse:
    """Generate and download an HTML version of the report (optional)."""
    report = generate_gap_report(submission)
    base_url = str(request.base_url).rstrip("/")
    html = render_html_report(report, base_url=base_url, for_pdf=False)

    return HTMLResponse(
        content=html,
        headers={
            "Content-Disposition": f'attachment; filename="{_safe_filename(submission.company_name, "html")}"',
        },
    )
