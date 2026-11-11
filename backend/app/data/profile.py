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
                "A social creator platform architected around an introspective journaling core, "
                "empowering creators to publish authentic long-form reflections, build trusted communities, "
                "and monetize content with real-time interactions."
            ),
            "features": [
                "Core journaling module with personal reflection workflows",
                "Creator publishing tools and subscriber community feeds",
                "Identity privacy controls and trust-based community mechanisms",
                "Real-time interactions, comments, and notification pipeline"
            ],
            "tags": ["Django", "PostgreSQL", "Redis", "React"],
            "featured": True
        },
        {
            "title": "ResumeRoast",
            "description": (
                "An AI-powered resume critique engine designed to analyze tech resumes, "
                "deliver candid actionable feedback, and highlight impact gaps before job applications. "
                "(Currently in active development)."
            ),
            "features": [
                "Planned: Automated resume parsing pipeline (In development)",
                "Planned: Dual-mode LLM critique engine (constructive vs candid roast)",
                "Planned: Keyword alignment analysis for target role descriptions",
                "Planned: Modular action-item suggestions for bullet-point impact"
            ],
            "tags": ["Python", "FastAPI", "React", "LLM Pipeline"],
            "featured": True
        },
        {
            "title": "UrmiNexus (AIEC)",
            "description": (
                "A full-scale education consultancy management system connecting students and overseas advisors "
                "with structured intake workflows, document pipelines, and program recommendations."
            ),
            "features": [
                "Student inquiry lifecycle management & tracking dashboard",
                "Administrative portal with counsellor-student matching engine",
                "Application progress tracking and document intake flows",
                "Course and university recommendation filtering system"
            ],
            "tags": ["Python", "FastAPI", "React", "PostgreSQL", "Matching Engine"],
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
