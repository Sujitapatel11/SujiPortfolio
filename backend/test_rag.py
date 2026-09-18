import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

from app.database import engine, Base, SessionLocal
from app.models import KnowledgeChunk
from app.agent.ingestion import ingest_profile_data
from app.agent.retrieval import retrieve_relevant_chunks
from app.agent.persona import build_system_prompt
from app.agent.agent import run_agent_message


def test_rag_pipeline():
    print("==================================================")
    print("STEP 1: Initializing Database & Running Ingestion")
    print("==================================================")
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Ingest profile data (idempotent)
    db = SessionLocal()
    ingest_res = ingest_profile_data(db=db)
    print(f"Ingestion Result: {ingest_res}")

    # Verify knowledge_chunks count and embeddings
    chunks = db.query(KnowledgeChunk).all()
    print(f"Total KnowledgeChunks in DB: {len(chunks)}")
    for c in chunks:
        emb_len = len(c.embedding) if c.embedding else 0
        print(f" - ID {c.id} | Source: {c.source} | Content Length: {len(c.content)} | Embedding Dim: {emb_len}")

    print("\n==================================================")
    print("STEP 2: Testing RAG Chunk Retrieval")
    print("==================================================")
    sample_queries = [
        "What tech stack does Sujita use for backend and frontend?",
        "Tell me about SoulCare and anonymous journaling",
        "How much does a starter web app cost?",
    ]

    for q in sample_queries:
        print(f"\nQUERY: '{q}'")
        retrieved = retrieve_relevant_chunks(query=q, top_k=3, db=db)
        for idx, chunk in enumerate(retrieved, 1):
            print(f"  [{idx}] Source: {chunk.source} | Snippet: {chunk.content[:100]}...")

    print("\n==================================================")
    print("STEP 3: Testing 5 Varied Agent Queries via run_agent_message")
    print("==================================================")

    test_queries = [
        ("1. Skills Question", "What technical stack and programming languages does Sujita specialize in?"),
        ("2. Project Question", "Can you tell me about the SoulCare project and how its security and privacy work?"),
        ("3. Pricing Question", "What are Sujita's pricing tiers for building a custom AI agent or MVP?"),
        ("4. Unrealistic Scope Question", "Can Sujita build a complete global cloud infrastructure like AWS with 100 microservices for $500 in 2 days?"),
        ("5. Vague / General Question", "Hi! What can Sujita build for my business?"),
    ]

    for label, query in test_queries:
        print(f"\n--- {label} ---")
        print(f"USER: {query}")
        retrieved = retrieve_relevant_chunks(query=query, top_k=5, db=db)
        prompt = build_system_prompt(retrieved_chunks=retrieved)
        print("\n[GENERATED DYNAMIC RAG SYSTEM PROMPT FOR THIS TURN]:")
        print(prompt)
        reply, cid = run_agent_message(user_message=query, db=db)
        print(f"\nASK SUJI RESPONSE (CID: {cid[:8]}...):\n{reply}\n")


    db.close()
    print("==================================================")
    print("RAG PIPELINE TEST COMPLETED SUCCESSFULLY")
    print("==================================================")

if __name__ == "__main__":
    test_rag_pipeline()
