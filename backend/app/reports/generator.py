from datetime import datetime, timezone

from app.reports.questionnaire_summary import build_questionnaire_responses
from app.questionnaire.schema import QuestionnaireSubmission
from app.rules.engine import evaluate_obligations
from app.rules.models import ComplianceStatus
from app.sources.catalog import get_catalog


def generate_gap_report(submission: QuestionnaireSubmission) -> dict:
    all_obligations = evaluate_obligations(submission.answers)
    obligations = [
        o for o in all_obligations if o.status != ComplianceStatus.NOT_APPLICABLE
    ]
    questionnaire_responses = build_questionnaire_responses(submission.answers)
    catalog = get_catalog()

    gaps = [
        o
        for o in obligations
        if o.status in (ComplianceStatus.NOT_MET, ComplianceStatus.PARTIAL)
    ]
    not_met = [o for o in obligations if o.status == ComplianceStatus.NOT_MET]
    not_answered = [o for o in obligations if o.status == ComplianceStatus.NOT_ANSWERED]
    assessed = [o for o in obligations if o.status != ComplianceStatus.NOT_ANSWERED]

    # Collect unique source IDs referenced across obligations
    referenced_source_ids: set[str] = set()
    for o in obligations:
        referenced_source_ids.update(o.source_ids)
        for c in o.citations:
            referenced_source_ids.add(c["source_id"])

    sources_for_report = [
        s.model_dump()
        for s in catalog.sources
        if s.id in referenced_source_ids or s.type == "primary"
    ]

    action_plan = [
        {
            "phase": "Before Nov 13, 2026",
            "deadline": "2026-11-13",
            "items": [
                "Review Consent Manager provisions and whether registration applies to your use case",
                "Assess and update vendor / Data Processor contracts",
                "Publish or update privacy notice with grievance officer contact",
            ],
        },
        {
            "phase": "Before May 13, 2027 (full compliance)",
            "deadline": "2027-05-13",
            "items": [o.recommended_action for o in not_met] or ["Maintain current controls and monitor regulatory updates"],
        },
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "company_name": submission.company_name,
        "sector": submission.sector,
        "summary": {
            "total_obligations": len(assessed),
            "obligations_assessed": len(assessed),
            "gaps_found": len(gaps),
            "critical_gaps": len(not_met),
            "questions_total": len(questionnaire_responses),
            "questions_answered": sum(1 for q in questionnaire_responses if q["answered"]),
            "questions_not_answered": sum(1 for q in questionnaire_responses if not q["answered"]),
            "obligations_not_answered": len(not_answered),
            "obligations_in_scope": len(obligations),
        },
        "regulatory_timeline": [p.model_dump() for p in catalog.implementation_phases],
        "legal_sources": sources_for_report,
        "questionnaire_responses": questionnaire_responses,
        "obligations": [o.model_dump() for o in obligations],
        "prioritized_action_plan": action_plan,
        "disclaimer": (
            "This report is automated compliance guidance based on your questionnaire answers "
            "and the DPDP Act 2023 / DPDP Rules 2025. It is not legal advice. "
            "Download and verify the cited source documents below. "
            "Consult qualified counsel before relying on this report for regulatory decisions."
        ),
    }
