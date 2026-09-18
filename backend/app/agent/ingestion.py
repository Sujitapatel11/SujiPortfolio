import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import KnowledgeChunk
from app.data.profile import PROFILE_DATA

logger = logging.getLogger("sujis_world.agent.ingestion")

_EMBEDDING_MODEL = None

def get_embedding_model():
    """
    Lazily load the sentence-transformers model (all-MiniLM-L6-v2) for 384-dimensional embeddings.
    """
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        logger.info("Loading sentence-transformers model 'all-MiniLM-L6-v2'...")
        from sentence_transformers import SentenceTransformer
        _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _EMBEDDING_MODEL

def generate_embedding(text: str) -> List[float]:
    """
    Generate a 384-dimensional vector embedding for a given text string.
    """
    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()

def generate_profile_chunks() -> List[Dict[str, str]]:
    """
    Split profile.py into logical, structured chunks:
    - Bio / Overview
    - Skill categories (overview, frontend, backend, AI & cloud)
    - Projects (SoulCare, AIEC)
    - Services (Full-Stack, Backend/API, SaaS/MVP, AI/ML)
    - Pricing Tiers (Starter, Growth, Enterprise)
    """
    chunks = []

    # 1. Bio / Overview
    chunks.append({
        "source": "profile:bio",
        "content": (
            f"Name: {PROFILE_DATA['name']}. Title: {PROFILE_DATA['title']}. "
            f"Bio: {PROFILE_DATA['bio']} Availability: {PROFILE_DATA['availability']}"
        )
    })

    # 2. Skill categories
    skills = PROFILE_DATA.get("skills", [])
    chunks.append({
        "source": "profile:skills:overview",
        "content": f"Sujita's technical skills and core tech stack: {', '.join(skills)}."
    })
    
    chunks.append({
        "source": "profile:skills:frontend",
        "content": "Frontend Engineering & UI Skills: React & Vite, Three.js & React Three Fiber, TailwindCSS, modern UI Engineering, responsive design, dynamic web applications."
    })

    chunks.append({
        "source": "profile:skills:backend",
        "content": "Backend & API Engineering Skills: Python, FastAPI, PostgreSQL, SQLAlchemy ORM, REST API Architecture, database modeling, authentication, microservices."
    })

    chunks.append({
        "source": "profile:skills:ai_cloud",
        "content": "AI/ML & Cloud Infrastructure Skills: LangChain & LLM Agents (OpenAI / Anthropic), RAG vector retrieval, custom tool creation, Docker containerization, cloud deployment."
    })

    # 3. Projects (one chunk per project)
    for p in PROFILE_DATA.get("projects", []):
        title_slug = p['title'].lower().split()[0].replace('(', '').replace(')', '')
        source_key = f"profile:project:{title_slug}"
        content_text = (
            f"Featured Project: {p['title']}. "
            f"Description: {p['description']} "
            f"Key Features: {', '.join(p.get('features', []))}. "
            f"Technologies / Tech Stack: {', '.join(p.get('tags', []))}."
        )
        chunks.append({
            "source": source_key,
            "content": content_text
        })

    # 4. Services (one chunk per service)
    for s in PROFILE_DATA.get("services", []):
        service_slug = s['name'].lower().replace(' ', '_').replace('/', '_').replace('-', '_')
        source_key = f"profile:service:{service_slug}"
        content_text = (
            f"Service Offered: {s['name']}. "
            f"Description: {s['description']} "
            f"Deliverables: {', '.join(s.get('deliverables', []))}."
        )
        chunks.append({
            "source": source_key,
            "content": content_text
        })

    # 5. Pricing Tiers (one chunk per pricing tier)
    for pt in PROFILE_DATA.get("pricing_tiers", []):
        tier_slug = pt['tier'].lower().split()[0]
        source_key = f"profile:pricing:{tier_slug}"
        content_text = (
            f"Pricing Tier: {pt['tier']}. "
            f"Price Range: {pt['price_range']}. "
            f"Best For / Scope: {pt['best_for']}"
        )
        chunks.append({
            "source": source_key,
            "content": content_text
        })

    return chunks

def ingest_profile_data(db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Ingests or updates all profile chunks into the knowledge_chunks table.
    Idempotent: updates existing records by source, or inserts new ones.
    """
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        raw_chunks = generate_profile_chunks()
        updated_count = 0
        inserted_count = 0

        for chunk_data in raw_chunks:
            source = chunk_data["source"]
            content = chunk_data["content"]
            embedding = generate_embedding(content)

            existing = db.query(KnowledgeChunk).filter(KnowledgeChunk.source == source).first()
            if existing:
                existing.content = content
                existing.embedding = embedding
                existing.created_at = datetime.now(timezone.utc)
                updated_count += 1
            else:
                new_chunk = KnowledgeChunk(
                    source=source,
                    content=content,
                    embedding=embedding,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(new_chunk)
                inserted_count += 1

        db.commit()
        total_chunks = updated_count + inserted_count
        logger.info(f"Idempotent profile ingestion completed: {inserted_count} inserted, {updated_count} updated. Total: {total_chunks}")
        return {
            "status": "success",
            "total_chunks": total_chunks,
            "inserted": inserted_count,
            "updated": updated_count
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error during profile data ingestion: {e}", exc_info=True)
        raise e
    finally:
        if close_session:
            db.close()
