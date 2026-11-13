import re
import logging
from typing import Dict, Any, List, Optional
from app.models import Job
from app.data.profile import PROFILE_DATA

logger = logging.getLogger("sujis_world.ai_matcher")


def evaluate_job_fit(
    job_title: str,
    job_description: Optional[str] = None,
    job_location: Optional[str] = None,
    is_remote: bool = False,
    salary_min: Optional[float] = None,
    target_salary_min: Optional[float] = None,
    target_keywords: Optional[List[str]] = None,
    resume_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluate job relevance score and generate explainable criteria breakdown and skills gap analysis.
    Uses candidate's verified profile data (Sujita Patel).
    """
    desc = (job_description or "").lower()
    title = (job_title or "").lower()
    full_text = f"{title} {desc}"

    candidate_skills = PROFILE_DATA.get("skills", [])
    # Flatten candidate skill tokens
    candidate_tokens = set()
    for s in candidate_skills:
        for token in re.split(r'[\s/&]+', s.lower()):
            if len(token) > 1 and token not in ("web", "and", "or", "in"):
                candidate_tokens.add(token)

    # Common tech skills to check in job postings
    tech_catalog = {
        "python": "Python",
        "fastapi": "FastAPI",
        "django": "Django",
        "react": "React",
        "typescript": "TypeScript",
        "javascript": "JavaScript",
        "postgresql": "PostgreSQL",
        "sql": "SQL",
        "docker": "Docker",
        "three.js": "Three.js",
        "langchain": "LangChain",
        "ai": "AI / LLM Agents",
        "redis": "Redis",
        "aws": "AWS",
        "gcp": "Google Cloud",
        "kubernetes": "Kubernetes",
        "graphql": "GraphQL",
        "next.js": "Next.js",
        "tailwind": "TailwindCSS",
        "ci/cd": "CI/CD",
        "linux": "Linux",
    }

    matching_skills: List[str] = []
    missing_skills: List[str] = []

    for kw, label in tech_catalog.items():
        if re.search(r'\b' + re.escape(kw) + r'\b', full_text):
            # Check if candidate has this skill
            kw_tokens = set(re.split(r'[\s/&]+', kw))
            if any(t in candidate_tokens for t in kw_tokens):
                matching_skills.append(label)
            else:
                missing_skills.append(label)

    # 1. Skills score (0.0 - 0.40)
    if matching_skills:
        skill_ratio = min(1.0, len(matching_skills) / max(len(matching_skills) + len(missing_skills), 3))
        skills_score = round(0.15 + skill_ratio * 0.25, 2)
    else:
        skills_score = 0.10

    # 2. Role relevance score (0.0 - 0.35)
    role_score = 0.15
    target_roles = ["python", "full-stack", "full stack", "backend", "ai", "engineer", "developer", "software"]
    matched_role_terms = sum(1 for r in target_roles if r in title)
    if matched_role_terms > 0:
        role_score = min(0.35, 0.20 + (matched_role_terms * 0.05))

    # 3. Location / Remote score (0.0 - 0.15)
    loc_score = 0.10
    if is_remote or "remote" in full_text or "work from home" in full_text:
        loc_score = 0.15
    elif job_location and any(k in job_location.lower() for k in ["germany", "europe", "worldwide", "anywhere"]):
        loc_score = 0.14

    # 4. Compensation / Target fit score (0.0 - 0.10)
    comp_score = 0.08
    if salary_min and target_salary_min:
        if salary_min >= target_salary_min:
            comp_score = 0.10
        else:
            comp_score = 0.05

    # Overall match score (0.0 to 1.0)
    total_score = round(min(1.0, skills_score + role_score + loc_score + comp_score), 2)

    # Generate skills gap analysis explanation
    if missing_skills:
        gap_summary = (
            f"Strong alignment on core stack ({', '.join(matching_skills[:4])}). "
            f"Gap identified in secondary requirements: {', '.join(missing_skills[:3])}. "
            "Recommended to emphasize rapid learning curve and adjacent transferable experience in Docker/Python."
        )
    else:
        gap_summary = f"Exceptional alignment across all required technologies: {', '.join(matching_skills or ['Python', 'Full-Stack'])}."

    match_reason = (
        f"{int(total_score * 100)}% Match: "
        f"{'Remote opportunity with strong ' if is_remote else ''}"
        f"overlap in {', '.join(matching_skills[:3]) or 'software engineering'}. "
        f"Title '{job_title}' aligns well with full-stack and AI engineering profile."
    )

    criteria_breakdown = {
        "skills_alignment": round(skills_score / 0.40, 2),
        "role_relevance": round(role_score / 0.35, 2),
        "location_remote_fit": round(loc_score / 0.15, 2),
        "compensation_fit": round(comp_score / 0.10, 2),
    }

    return {
        "score": total_score,
        "criteria_breakdown": criteria_breakdown,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "skills_gap_analysis": gap_summary,
        "match_reason": match_reason,
    }


def generate_tailored_application(job: Job, profile_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generate tailored application assistance:
    - Tailored proposal draft (freelance / contract)
    - Professional cover letter (employment / full-time)
    - Resume content suggestions (truthful, highlighting real portfolio projects: SoulCare, ResumeRoast, UrmiNexus)
    - Interview preparation questions

    Guarantees: Never fabricates degrees, employment history, or fake credentials.
    """
    profile = profile_data or PROFILE_DATA
    name = profile.get("name", "Sujita Patel")
    title = job.title or "Software Engineer"
    company = job.company or "the team"
    budget = job.budget or "Competitive / Negotiable"
    desc_snippet = (job.description or "")[:200]

    # 1. Freelance Proposal Draft
    proposal_draft = (
        f"Hi {company} team,\n\n"
        f"I came across your posting for '{title}' and would love to help you build and scale this solution.\n\n"
        f"As a Full-Stack & AI Systems Engineer with hands-on experience in FastAPI, React, PostgreSQL, and autonomous LLM pipelines, "
        f"here is how I can directly solve your key requirements:\n\n"
        f"1. Production-Ready Architecture: Clean, modular backend APIs with automated unit testing and containerized Docker setup.\n"
        f"2. Seamless Frontend Integration: Modern, high-performance UI using React and TailwindCSS.\n"
        f"3. Practical AI Integration: Experience designing reliable RAG architectures and conversational tools.\n\n"
        f"In my recent project 'SoulCare' (social reflection platform) and 'UrmiNexus' (consultancy matching system), "
        f"I delivered high-throughput workflows and clean data architectures.\n\n"
        f"My rate/budget target aligns with {budget}. I would welcome the chance to discuss milestones and technical deliverables.\n\n"
        f"Best regards,\n"
        f"{name}\n"
        f"Full-Stack Engineer & AI Developer"
    )

    # 2. Tailored Cover Letter
    cover_letter = (
        f"Dear Hiring Team at {company},\n\n"
        f"I am writing to express my enthusiastic interest in the {title} role. "
        f"With a dedicated background in full-stack web engineering, custom backend microservices (FastAPI/Django), "
        f"and production AI integrations, I specialize in building reliable, end-to-end software systems that deliver measurable business impact.\n\n"
        f"Your mission and role requirements immediately resonated with me. In particular, my work developing systems like 'SoulCare' "
        f"(a creator reflection platform with real-time interactions) and 'UrmiNexus' (an automated administrative management dashboard) "
        f"allowed me to engineer robust PostgreSQL database pipelines, scalable REST APIs, and responsive user interfaces.\n\n"
        f"I pride myself on strong communication, clear architectural decisions, and an owner mentality. "
        f"I would be thrilled to bring these strengths to {company}.\n\n"
        f"Thank you for your time and consideration. I look forward to the possibility of discussing how my experience fits your team.\n\n"
        f"Sincerely,\n"
        f"{name}"
    )

    # 3. Truthful Resume Content Suggestions
    tailored_resume_suggestions = [
        {
            "section": "Professional Summary",
            "recommendation": (
                f"Highlight full-stack and Python engineering expertise tailored to '{title}'. "
                "Emphasize experience with FastAPI, PostgreSQL, and responsive React web applications."
            )
        },
        {
            "section": "Featured Project — SoulCare",
            "recommendation": (
                "Highlight the core architectural achievements: Django + PostgreSQL data models, "
                "Redis caching, creator publishing pipelines, and real-time interaction feeds."
            )
        },
        {
            "section": "Featured Project — UrmiNexus (AIEC)",
            "recommendation": (
                "Emphasize the counselor-student matching engine and structured document intake pipeline "
                "built with FastAPI and React."
            )
        },
        {
            "section": "Skills Matrix",
            "recommendation": (
                f"Elevate technologies matching '{title}' to the top of your technical skills section: "
                "Python, FastAPI, React, PostgreSQL, Docker."
            )
        }
    ]

    # 4. Tailored Interview Preparation Questions
    interview_questions = [
        {
            "topic": "System Architecture & API Design",
            "question": f"How would you design a scalable backend service in Python/FastAPI to support the requirements of '{title}'?",
            "talking_points": [
                "Explain layered architecture: routing, business service layer, and SQLAlchemy ORM/database session management.",
                "Discuss asynchronous endpoints (async/await), connection pooling, and Pydantic validation.",
                "Mention containerization with Docker and multi-stage builds."
            ]
        },
        {
            "topic": "Data Modeling & Performance",
            "question": "How do you handle schema migrations, indexing, and slow query optimization in PostgreSQL?",
            "talking_points": [
                "Alembic migration best practices (reversible upgrade/downgrade scripts).",
                "Indexing strategies: btree indexes on foreign keys, external IDs, and composite search queries.",
                "Connection management using connection pools to prevent exhaustion."
            ]
        },
        {
            "topic": "Frontend-Backend Integration",
            "question": "How do you structure client state and API communication in React to ensure responsive UX?",
            "talking_points": [
                "Error boundary handling, loading skeletons, and optimistic UI updates.",
                "Token-based Bearer JWT authentication and request interceptors."
            ]
        },
        {
            "topic": "Role Fit & Problem Solving",
            "question": f"What attracted you to {company} and this specific '{title}' position?",
            "talking_points": [
                "Connect personal passion for high-impact AI/web engineering with the role's domain.",
                "Mention ownership mindset and continuous learning curve."
            ]
        }
    ]

    return {
        "proposal_draft": proposal_draft,
        "cover_letter": cover_letter,
        "tailored_resume_suggestions": tailored_resume_suggestions,
        "interview_questions": interview_questions,
    }
