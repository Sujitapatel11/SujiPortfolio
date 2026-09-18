import logging
from app.models import Job

logger = logging.getLogger("sujis_world.proposal_drafter")


def generate_proposal_draft(job: Job) -> str:
    """
    Generate an initial tailored client application/proposal draft based on job details.
    """
    title = job.title or "Project"
    description = job.description or ""
    budget = job.budget or "Negotiable"

    draft = (
        f"Hi there,\n\n"
        f"I saw your posting for '{title}' and would love to help you build this project!\n\n"
        f"I specialize in Full-Stack Web Development, custom FastAPI backends, and AI agent integration. "
        f"Having reviewed your requirements ({description[:120]}...), here is how I can deliver value:\n\n"
        f"1. Robust backend architecture tailored to your scaling needs.\n"
        f"2. Modern, clean UI/UX frontend implementation.\n"
        f"3. Thorough unit testing and containerized deployment (Docker).\n\n"
        f"My proposed rate/budget fits your target ({budget}). I would welcome the chance to connect "
        f"and discuss the timeline and technical milestones.\n\n"
        f"Best regards,\n"
        f"Sujita Patel\n"
        f"Full-Stack & AI Systems Engineer"
    )

    return draft
