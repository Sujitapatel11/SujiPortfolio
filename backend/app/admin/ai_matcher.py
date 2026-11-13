import re
import logging
from typing import Dict, Any, List, Optional
from app.models import Job
from app.data.profile import PROFILE_DATA

logger = logging.getLogger("sujis_world.ai_matcher")


def _contains_term(text: str, term: str) -> bool:
    """Match a phrase/token without accidental substring hits (e.g. 'ai' in 'retail')."""
    normalized_text = re.sub(r"[^a-z0-9+#.]+", " ", (text or "").lower())
    normalized_term = re.sub(r"[^a-z0-9+#.]+", " ", (term or "").lower()).strip()
    if not normalized_term:
        return False
    return re.search(r"(?<![a-z0-9])" + re.escape(normalized_term) + r"(?![a-z0-9])", normalized_text) is not None


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
    Explainable first-pass ranking. Eligibility is a separate hard gate in the orchestrator.
    Only PROFILE_DATA.skills are treated as candidate skills; project tags are not proof of proficiency.
    """
    title = job_title or ""
    description = job_description or ""
    full_text = f"{title}\n{description}"
    candidate_skills = PROFILE_DATA.get("skills", [])

    # Canonical labels and common spelling variants. Matching is phrase/token based.
    skill_aliases = {
        "python": ("python",),
        "fastapi": ("fastapi",),
        "django": ("django",),
        "react": ("react",),
        "typescript": ("typescript", "ts"),
        "javascript": ("javascript", "js"),
        "postgresql": ("postgresql", "postgres"),
        "sql": ("sql", "sqlalchemy"),
        "docker": ("docker",),
        "three.js": ("three.js", "threejs"),
        "langchain": ("langchain",),
        "llm agents": ("llm", "llm agents", "large language model"),
        "redis": ("redis",),
        "aws": ("aws", "amazon web services"),
        "gcp": ("gcp", "google cloud"),
        "kubernetes": ("kubernetes", "k8s"),
        "graphql": ("graphql",),
        "next.js": ("next.js", "nextjs"),
        "tailwindcss": ("tailwindcss", "tailwind"),
        "ci/cd": ("ci/cd", "continuous integration", "continuous delivery"),
        "linux": ("linux",),
        "rest api": ("rest api", "restful api"),
        "vite": ("vite",),
        "sqlalchemy": ("sqlalchemy",),
    }

    candidate_text = " | ".join(str(skill) for skill in candidate_skills)
    candidate_capabilities = {
        canonical for canonical, aliases in skill_aliases.items()
        if any(_contains_term(candidate_text, alias) for alias in aliases)
    }

    required_skills = []
    preferred_skills = []
    for canonical, aliases in skill_aliases.items():
        if any(_contains_term(full_text, alias) for alias in aliases):
            # Explicit preferred/nice-to-have language is weaker evidence than a requirement.
            evidence_window = full_text.lower()
            is_preferred = any(marker in evidence_window for marker in (
                "nice to have", "nice-to-have", "preferred", "bonus", "plus", "desirable"
            ))
            (preferred_skills if is_preferred else required_skills).append(canonical)

    matching_skills = [skill for skill in required_skills if skill in candidate_capabilities]
    missing_skills = [skill for skill in required_skills if skill not in candidate_capabilities]
    matching_preferred = [skill for skill in preferred_skills if skill in candidate_capabilities]

    # User-requested keywords now directly affect the ranking.
    requested = []
    for keyword in (target_keywords or []):
        term = str(keyword).strip()
        if term and term.lower() not in {x.lower() for x in requested}:
            requested.append(term)
    matched_targets = [term for term in requested if _contains_term(full_text, term)]
    missing_targets = [term for term in requested if term not in matched_targets]
    target_coverage = (len(matched_targets) / len(requested)) if requested else None

    # Skills: if the listing names no skills, use a neutral score rather than inventing alignment.
    if required_skills:
        skills_score = 0.40 * (len(matching_skills) / len(required_skills))
    else:
        skills_score = 0.20
    if preferred_skills:
        skills_score += min(0.04, 0.04 * len(matching_preferred) / len(preferred_skills))
        skills_score = min(0.40, skills_score)

    # Target keyword relevance is blended into the skill/role evidence, never used as candidate skill proof.
    if target_coverage is not None:
        skills_score = min(0.40, skills_score * 0.75 + (0.40 * target_coverage) * 0.25)

    title_lower = title.lower()
    role_groups = {
        "backend": ("backend", "back-end", "server-side"),
        "frontend": ("frontend", "front-end", "ui engineer"),
        "full-stack": ("full stack", "full-stack", "fullstack"),
        "ai-ml": ("ai engineer", "machine learning", "ml engineer", "llm engineer", "applied ai"),
        "software": ("software engineer", "software developer", "software development"),
        "python": ("python developer", "python engineer"),
        "data": ("data engineer", "data scientist", "analytics engineer"),
    }
    matched_roles = [
        role for role, aliases in role_groups.items()
        if any(_contains_term(title_lower, alias) for alias in aliases)
    ]
    role_score = 0.15 + min(0.20, 0.10 * len(matched_roles))
    if requested and matched_targets:
        role_score = min(0.35, role_score + min(0.05, 0.05 * target_coverage))

    # This is a preference signal only. Hard applicant eligibility is handled separately.
    location_text = (job_location or "").lower()
    if is_remote or _contains_term(full_text, "work from home") or _contains_term(full_text, "remote"):
        loc_score = 0.15
    elif any(_contains_term(location_text, term) for term in ("India", "Nepal", "worldwide", "anywhere")):
        loc_score = 0.14
    else:
        loc_score = 0.08

    # Do not compare salary values here unless caller has already normalized currency and pay period.
    comp_score = 0.05
    if salary_min is not None and target_salary_min is not None:
        comp_score = 0.10 if salary_min >= target_salary_min else 0.02

    total_score = round(min(1.0, skills_score + role_score + loc_score + comp_score), 3)
    criteria_breakdown = {
        "skills_alignment": round(skills_score / 0.40, 3),
        "role_relevance": round(role_score / 0.35, 3),
        "location_remote_fit": round(loc_score / 0.15, 3),
        "compensation_fit": round(comp_score / 0.10, 3),
    }

    if missing_skills:
        gap_summary = (
            f"Required skills not evidenced in candidate profile: {', '.join(missing_skills[:8])}. "
            f"Profile-supported matches: {', '.join(matching_skills[:8]) or 'none detected'}."
        )
    elif required_skills:
        gap_summary = f"All detected required skills appear in the candidate profile: {', '.join(matching_skills)}."
    else:
        gap_summary = "The listing did not expose clear technical skill requirements; skill alignment is uncertain."

    reason_parts = []
    if matching_skills:
        reason_parts.append("profile-supported skills: " + ", ".join(matching_skills[:5]))
    if matched_roles:
        reason_parts.append("role signals: " + ", ".join(matched_roles))
    if matched_targets:
        reason_parts.append("query terms: " + ", ".join(matched_targets))
    if not reason_parts:
        reason_parts.append("limited direct evidence; inspect the job description manually")

    return {
        "score": total_score,
        "criteria_breakdown": criteria_breakdown,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "matching_preferred_skills": matching_preferred,
        "matching_target_keywords": matched_targets,
        "missing_target_keywords": missing_targets,
        "matched_role_groups": matched_roles,
        "skills_gap_analysis": gap_summary,
        "match_reason": f"{int(total_score * 100)}% preliminary match based on " + "; ".join(reason_parts) + ".",
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
