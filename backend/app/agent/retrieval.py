import logging
import math
from typing import List, Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import KnowledgeChunk
from app.agent.ingestion import generate_embedding

logger = logging.getLogger("sujis_world.agent.retrieval")

def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Compute cosine similarity between two vector lists in Python.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)

def retrieve_relevant_chunks(
    query: str,
    top_k: int = 5,
    db: Optional[Session] = None
) -> List[KnowledgeChunk]:
    """
    Embeds query and retrieves top_k most relevant KnowledgeChunks from database.
    Uses pgvector cosine distance on PostgreSQL, or Python vector similarity on SQLite fallback.
    """
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        query_vec = generate_embedding(query)
        bind = db.get_bind()

        # PostgreSQL pgvector similarity search
        if bind.dialect.name == "postgresql":
            results = (
                db.query(KnowledgeChunk)
                .order_by(KnowledgeChunk.embedding.cosine_distance(query_vec))
                .limit(top_k)
                .all()
            )
            logger.info(f"Retrieved {len(results)} chunks via pgvector for query: '{query}'")
            return results
        else:
            # SQLite / Generic dialect fallback: perform vector similarity in Python
            all_chunks = db.query(KnowledgeChunk).all()
            if not all_chunks:
                logger.warning("No knowledge chunks found in database.")
                return []

            scored_chunks = []
            for chunk in all_chunks:
                emb = chunk.embedding
                if isinstance(emb, list):
                    sim = _cosine_similarity(query_vec, emb)
                    scored_chunks.append((sim, chunk))

            scored_chunks.sort(key=lambda x: x[0], reverse=True)
            results = [chunk for sim, chunk in scored_chunks[:top_k]]
            logger.info(f"Retrieved {len(results)} chunks via fallback similarity for query: '{query}'")
            return results

    except Exception as e:
        logger.error(f"Error during chunk retrieval: {e}", exc_info=True)
        return []
    finally:
        if close_session:
            db.close()
