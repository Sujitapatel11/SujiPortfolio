"""
Single source of truth for Sujita's portfolio facts.
Read directly by FastAPI routes and the LangChain AI agent.
"""

PROFILE_DATA = {
    "name": "Sujita",
    "avatar_url": "/sujita.png",
    "title": "Full-Stack Engineer & AI Developer",
    "bio": (
        "Sujita is a full-stack engineer and AI developer specializing in high-performance "
        "web applications, custom FastAPI backends, LangChain AI agent integrations, and 3D web experiences."
    ),
    "skills": [
        "Full-Stack Web Development",
        "Python",
        "FastAPI",
        "PostgreSQL & SQLAlchemy",
        "React & Vite",
        "Three.js & React Three Fiber",
        "LangChain & LLM Agents (OpenAI / Anthropic)",
        "REST API Architecture",
        "Docker & Cloud Deployment",
        "TailwindCSS / UI Engineering"
    ],
    "projects": [
        {
            "title": "SoulCare",
            "description": (
                "A private journaling platform featuring AI mood insights and an "
                "anonymous community with trust-based identity reveal mechanisms."
            ),
            "features": [
                "Private encrypted journaling",
                "AI-driven emotional & mood analysis",
                "Anonymous peer community support",
                "Trust-based gradual identity reveal system"
            ],
            "tags": ["React", "FastAPI", "Python", "AI/LLM", "PostgreSQL"],
            "featured": True
        },
        {
            "title": "AIEC (Education Consultancy Platform)",
            "description": (
                "A comprehensive education consultancy platform equipped with a powerful administrative panel. "
                "Covers student inquiry management, counsellor-student matching, document and application tracking, "
                "and automated course/university recommendations."
            ),
            "features": [
                "Comprehensive Admin Panel & Analytics Dashboard",
                "Student Inquiry Management & Lifecycle Tracking",
                "Intelligent Counsellor-Student Matching Engine",
                "Document Upload & Application Progress Tracking",
                "Automated Course & University Recommendation System"
            ],
            "tags": ["Python", "FastAPI", "React", "PostgreSQL", "Matching System"],
            "featured": True
        }
    ],
    "services": [
        {
            "name": "Full-Stack Web Apps",
            "description": "Custom, modern web applications built from scratch with clean frontend interfaces and robust backends.",
            "deliverables": [
                "Responsive React/Vite web application",
                "FastAPI REST API backend integration",
                "PostgreSQL database design & setup",
                "Deployment pipeline setup"
            ]
        },
        {
            "name": "Backend/API Development",
            "description": "Scalable REST APIs, microservices, and database systems built for security and high performance.",
            "deliverables": [
                "FastAPI asynchronous REST endpoints",
                "SQLAlchemy ORM models & database migrations",
                "Authentication & authorization integration",
                "Comprehensive API documentation (OpenAPI/Swagger)"
            ]
        },
        {
            "name": "SaaS/MVP Building",
            "description": "Rapid development of Minimum Viable Products (MVPs) for startups to validate and launch product ideas quickly.",
            "deliverables": [
                "Full-stack MVP scoping & architecture",
                "Core product feature implementation",
                "User intake & lead qualification integration",
                "Production launch & Docker containerization"
            ]
        },
        {
            "name": "AI/ML Integration",
            "description": "Custom LangChain conversational agents, automated intake tools, RAG architectures, and LLM integrations.",
            "deliverables": [
                "LangChain agent design & custom tool creation",
                "OpenAI / Anthropic API integration with fallback handling",
                "Context-aware prompt engineering & memory management",
                "Lead qualification database persistence"
            ]
        }
    ],
    "pricing_tiers": [
        {
            "tier": "Starter / Focused Feature",
            "price_range": "$2,500 - $5,000",
            "best_for": "Single service, API backend, or focused component additions."
        },
        {
            "tier": "Growth / Standard App or AI Agent",
            "price_range": "$5,000 - $10,000",
            "best_for": "Complete MVP, Full-Stack Web App, or custom LangChain AI integration."
        },
        {
            "tier": "Enterprise / Complex Platform",
            "price_range": "$10,000+",
            "best_for": "Full SaaS platforms, multi-role systems (like AIEC/SoulCare), or 3D web platforms."
        }
    ],
    "availability": "Currently accepting new client projects and technical consultations."
}

def get_profile_context_str() -> str:
    """Format profile data into a clean, structured context string for LLM system prompts."""
    lines = []
    lines.append(f"Name: {PROFILE_DATA['name']}")
    lines.append(f"Title: {PROFILE_DATA['title']}")
    lines.append(f"Bio: {PROFILE_DATA['bio']}")
    lines.append(f"Availability: {PROFILE_DATA['availability']}\n")
    
    lines.append("=== SKILLS ===")
    for skill in PROFILE_DATA["skills"]:
        lines.append(f"- {skill}")
    lines.append("")
    
    lines.append("=== FEATURED PROJECTS ===")
    for p in PROFILE_DATA["projects"]:
        lines.append(f"Project Name: {p['title']}")
        lines.append(f"Description: {p['description']}")
        lines.append(f"Key Features: {', '.join(p['features'])}")
        lines.append(f"Technologies: {', '.join(p['tags'])}\n")
        
    lines.append("=== SERVICES OFFERED ===")
    for s in PROFILE_DATA["services"]:
        lines.append(f"Service Name: {s['name']}")
        lines.append(f"Description: {s['description']}")
        lines.append(f"Deliverables: {', '.join(s['deliverables'])}\n")
        
    lines.append("=== PRICING TIERS ===")
    for pt in PROFILE_DATA["pricing_tiers"]:
        lines.append(f"Tier: {pt['tier']} | Price: {pt['price_range']} | Best For: {pt['best_for']}")
        
    return "\n".join(lines)
