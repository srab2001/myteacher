"""
Document Review Service for Maryland Special Education Tools.

AI-powered IEP and Evaluation document review tool that checks for
required components per COMAR regulations.
"""

import json
import os
from typing import Dict, Any, List, Optional
import openai
from dotenv import load_dotenv

from db.connection import get_artifact, create_review

load_dotenv()

# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# Maryland COMAR IEP Required Components
IEP_REQUIRED_COMPONENTS = [
    {
        "name": "Present Levels (PLAAFP)",
        "key": "present_levels",
        "description": "Present Levels of Academic Achievement and Functional Performance",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Measurable Annual Goals",
        "key": "annual_goals",
        "description": "Measurable annual goals with benchmarks/objectives",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Special Education Services",
        "key": "special_ed_services",
        "description": "Special education and related services (type, frequency, duration, location)",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Supplementary Aids and Services",
        "key": "supplementary_aids",
        "description": "Supplementary aids and services to support the student",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Least Restrictive Environment (LRE)",
        "key": "lre",
        "description": "Participation with nondisabled children and LRE justification",
        "comar_reference": "COMAR 13A.05.01.10",
    },
    {
        "name": "Accommodations and Modifications",
        "key": "accommodations",
        "description": "Accommodations and modifications for instruction and assessment",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Assessment Participation",
        "key": "assessment_participation",
        "description": "How the student will participate in state/district assessments",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Transition Services",
        "key": "transition",
        "description": "Transition services and post-secondary goals (required at age 14+)",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Service Dates",
        "key": "service_dates",
        "description": "Start dates, frequency, location, and duration of services",
        "comar_reference": "COMAR 13A.05.01.09",
    },
    {
        "name": "Progress Monitoring",
        "key": "progress_monitoring",
        "description": "How progress will be measured and reported to parents",
        "comar_reference": "COMAR 13A.05.01.09",
    },
]

# SMART Goal Criteria
SMART_CRITERIA = {
    "specific": "Is the goal specific about what the student will do?",
    "measurable": "Can progress be measured with objective criteria?",
    "achievable": "Is the goal achievable within the IEP timeframe?",
    "relevant": "Is the goal relevant to the student's needs?",
    "time_bound": "Does the goal have a clear timeframe?",
}


def review_iep(extracted_text: str) -> Dict[str, Any]:
    """
    Review an IEP document for required components and quality.

    Uses GPT-4o with structured output to:
    1. Check for all required IEP components per COMAR
    2. Analyze goals for SMART criteria
    3. Generate questions and change requests

    Args:
        extracted_text: Text content extracted from the IEP document

    Returns:
        Dictionary with detailed review findings
    """
    # Build the review prompt
    components_list = "\n".join([
        f"- {comp['name']}: {comp['description']} ({comp['comar_reference']})"
        for comp in IEP_REQUIRED_COMPONENTS
    ])

    prompt = f"""You are an expert Maryland special education advocate reviewing an IEP document.

Analyze this IEP for compliance with Maryland COMAR regulations.

Required IEP Components to check:
{components_list}

For each component, determine:
1. found: true/false - Is this component present in the document?
2. location: Where in the document is it located (section/page if identifiable)
3. quality_score: 1-5 rating (5 is excellent, 1 is poor/missing)
4. issues: List any problems, vagueness, or concerns

Also analyze any goals found for SMART criteria:
- Specific: Clear about what student will do
- Measurable: Objective measurement criteria included
- Achievable: Realistic for IEP timeframe
- Relevant: Addresses student's identified needs
- Time-bound: Clear timeline

IEP Document Text:
---
{extracted_text[:30000]}
---

Respond with a JSON object containing:
{{
    "components": {{
        "present_levels": {{"found": bool, "location": str, "quality_score": int, "issues": [str]}},
        "annual_goals": {{"found": bool, "location": str, "quality_score": int, "issues": [str]}},
        ... (for each component)
    }},
    "goals_analysis": [
        {{
            "goal_text": str,
            "specific": bool,
            "measurable": bool,
            "achievable": bool,
            "relevant": bool,
            "time_bound": bool,
            "issues": [str]
        }}
    ],
    "overall_score": int (1-100),
    "summary": str (2-3 sentence summary),
    "critical_gaps": [str] (most important missing/deficient items)
}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a Maryland special education expert. Respond only with valid JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        return {
            "error": str(e),
            "components": {},
            "goals_analysis": [],
            "overall_score": 0,
            "summary": "Review failed due to an error",
            "critical_gaps": []
        }


def generate_questions_and_requests(findings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate questions for IEP team and specific change requests.

    Args:
        findings: Review findings from review_iep()

    Returns:
        Dictionary with questions and requests with COMAR citations
    """
    questions = []
    requests = []

    components = findings.get("components", {})
    goals_analysis = findings.get("goals_analysis", [])
    critical_gaps = findings.get("critical_gaps", [])

    # Generate questions based on missing/weak components
    for comp in IEP_REQUIRED_COMPONENTS:
        comp_key = comp["key"]
        comp_findings = components.get(comp_key, {})

        if not comp_findings.get("found", False):
            questions.append({
                "question": f"The IEP appears to be missing {comp['name']}. Can the team clarify where this information is documented?",
                "comar_reference": comp["comar_reference"],
                "priority": "high"
            })
            requests.append({
                "request": f"Please add {comp['name']} ({comp['description']}) to comply with {comp['comar_reference']}.",
                "comar_reference": comp["comar_reference"],
                "priority": "high"
            })
        elif comp_findings.get("quality_score", 0) <= 2:
            issues = comp_findings.get("issues", [])
            for issue in issues[:2]:  # Limit to 2 issues per component
                questions.append({
                    "question": f"Regarding {comp['name']}: {issue}",
                    "comar_reference": comp["comar_reference"],
                    "priority": "medium"
                })

    # Generate questions based on goal analysis
    for i, goal in enumerate(goals_analysis[:5]):  # Limit to 5 goals
        if not all([
            goal.get("specific"),
            goal.get("measurable"),
            goal.get("achievable"),
            goal.get("relevant"),
            goal.get("time_bound")
        ]):
            missing = []
            if not goal.get("specific"):
                missing.append("more specific")
            if not goal.get("measurable"):
                missing.append("measurable criteria")
            if not goal.get("time_bound"):
                missing.append("a clear timeline")

            if missing:
                questions.append({
                    "question": f"Goal {i+1} could be strengthened. Can we revise it to include {', '.join(missing)}?",
                    "comar_reference": "COMAR 13A.05.01.09",
                    "priority": "medium"
                })

    # Add questions based on critical gaps
    for gap in critical_gaps[:3]:
        questions.append({
            "question": f"Identified gap: {gap}. How can we address this?",
            "comar_reference": "COMAR 13A.05.01.09",
            "priority": "high"
        })

    return {
        "questions": questions,
        "requests": requests,
        "total_questions": len(questions),
        "high_priority_items": len([q for q in questions if q["priority"] == "high"])
    }


def review_evaluation(extracted_text: str) -> Dict[str, Any]:
    """
    Review an evaluation report for required components.

    Args:
        extracted_text: Text content from evaluation document

    Returns:
        Dictionary with review findings
    """
    prompt = f"""You are an expert Maryland special education advocate reviewing an educational evaluation.

Analyze this evaluation for completeness and compliance with Maryland requirements.

Check for these required elements:
1. Reason for referral
2. Background information (developmental, educational, medical history)
3. Assessment instruments used
4. Cognitive assessment results
5. Academic achievement results
6. Behavioral observations
7. Social/emotional assessment
8. Communication assessment (if applicable)
9. Eligibility determination
10. Recommendations for services

Evaluation Document Text:
---
{extracted_text[:30000]}
---

Respond with a JSON object containing:
{{
    "components": {{
        "referral_reason": {{"found": bool, "quality_score": int, "notes": str}},
        "background": {{"found": bool, "quality_score": int, "notes": str}},
        "assessment_instruments": {{"found": bool, "instruments": [str], "quality_score": int}},
        "cognitive_results": {{"found": bool, "quality_score": int, "notes": str}},
        "achievement_results": {{"found": bool, "quality_score": int, "notes": str}},
        "observations": {{"found": bool, "quality_score": int, "notes": str}},
        "social_emotional": {{"found": bool, "quality_score": int, "notes": str}},
        "eligibility": {{"found": bool, "category": str, "quality_score": int}},
        "recommendations": {{"found": bool, "quality_score": int, "notes": str}}
    }},
    "overall_score": int (1-100),
    "summary": str,
    "concerns": [str]
}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a Maryland special education expert. Respond only with valid JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        return {
            "error": str(e),
            "components": {},
            "overall_score": 0,
            "summary": "Review failed due to an error",
            "concerns": []
        }


async def run_review(artifact_id: str) -> Dict[str, Any]:
    """
    Run a complete review on an artifact.

    Args:
        artifact_id: UUID of the artifact to review

    Returns:
        Dictionary with review results and review_id
    """
    # Get artifact
    artifact = get_artifact(artifact_id)
    if not artifact:
        return {"error": "Artifact not found", "status": "failed"}

    if not artifact.get("extracted_text"):
        return {"error": "No extracted text available", "status": "failed"}

    extracted_text = artifact["extracted_text"]
    artifact_type = artifact.get("artifact_type", "unknown")

    # Determine review type and run appropriate review
    if artifact_type in ["iep", "unknown"]:
        findings = review_iep(extracted_text)
        review_type = "iep_review"
        questions_data = generate_questions_and_requests(findings)
        findings["questions_and_requests"] = questions_data
    elif artifact_type == "evaluation":
        findings = review_evaluation(extracted_text)
        review_type = "evaluation_review"
    else:
        findings = review_iep(extracted_text)  # Default to IEP review
        review_type = "iep_review"
        questions_data = generate_questions_and_requests(findings)
        findings["questions_and_requests"] = questions_data

    # Store review in database
    review_id = create_review(
        artifact_id=artifact_id,
        review_type=review_type,
        findings=findings,
        summary=findings.get("summary"),
        score=findings.get("overall_score")
    )

    return {
        "status": "success",
        "review_id": review_id,
        "review_type": review_type,
        "summary": findings.get("summary"),
        "overall_score": findings.get("overall_score"),
        "findings_count": len(findings.get("components", {})),
        "questions_count": findings.get("questions_and_requests", {}).get("total_questions", 0)
    }
