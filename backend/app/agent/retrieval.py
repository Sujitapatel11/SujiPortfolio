"""Relevance-filtered, scope-aware retrieval for the existing 384-dimension RAG index."""
import logging
import math
import os
from typing import List, Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import KnowledgeChunk
from app.agent.ingestion import generate_embedding

logger = logging.getLogger("sujis_world.agent.retrieval")
MIN_RETRIEVAL_SIMILARITY = float(os.getenv("RAG_MIN_SIMILARITY", "0.30"))


class RetrievalUnavailable(RuntimeError):
    """Raised when embeddings or the retrieval database cannot be used."""


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
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
    db: Optional[Session] = None,
    is_admin_context: bool = False,
    min_similarity: float = MIN_RETRIEVAL_SIMILARITY,
) -> List[KnowledgeChunk]:
    """Return chunks above a cosine-similarity threshold; public chat sees profile facts only."""
    close_session = db is None
    if db is None:
        db = SessionLocal()
    try:
        if not query.strip():
            return []
        query_vec = generate_embedding(query)
        base_query = db.query(KnowledgeChunk).filter(KnowledgeChunk.embedding.isnot(None))
        if not is_admin_context:
            # The current public corpus is profile:* only. Unknown/new namespaces default private.
            base_query = base_query.filter(KnowledgeChunk.source.like("profile:%"))
        if db.get_bind().dialect.name == "postgresql":
            distance = KnowledgeChunk.embedding.cosine_distance(query_vec)
            rows = base_query.order_by(distance).limit(top_k).all()
            scored = []
            for chunk in rows:
                similarity = 1.0 - float(db.query(KnowledgeChunk.embedding.cosine_distance(query_vec)).filter(KnowledgeChunk.id == chunk.id).scalar())
                if similarity >= min_similarity:
                    setattr(chunk, "_retrieval_similarity", similarity)
                    scored.append(chunk)
            logger.info("RAG retrieved %s public-safe chunks (threshold %.2f)", len(scored), min_similarity)
            return scored

        chunks = base_query.all()
        scored = []
        for chunk in chunks:
            if isinstance(chunk.embedding, list):
                similarity = _cosine_similarity(query_vec, chunk.embedding)
                if similarity >= min_similarity:
                    setattr(chunk, "_retrieval_similarity", similarity)
                    scored.append(chunk)
        scored.sort(key=lambda item: getattr(item, "_retrieval_similarity", 0.0), reverse=True)
        result = scored[:top_k]
        logger.info("RAG retrieved %s public-safe chunks (threshold %.2f)", len(result), min_similarity)
        return result
    except Exception as exc:
        logger.exception("RAG retrieval failed.")
        raise RetrievalUnavailable("The knowledge retrieval pipeline is unavailable.") from exc
    finally:
        if close_session:
            db.close()
