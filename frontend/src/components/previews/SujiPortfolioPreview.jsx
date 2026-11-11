import React, { useState } from 'react';
import { Terminal, Bot, Database, Zap, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SujiPortfolioPreview({ isVisible }) {
  const [activeTab, setActiveTab] = useState('agent');
  const [query, setQuery] = useState('What architectures does Suji build?');
  const [simResponse, setSimResponse] = useState(
    'Sujita specializes in high-throughput FastAPI and Django backends, pgvector RAG pipelines, and automated client intake workflows.'
  );
  const [tested, setTested] = useState(false);

  const sampleQueries = [
    'What architectures does Suji build?',
    'Explain pgvector RAG retrieval',
    'How does admin context isolation work?',
  ];

  const handleTest = (q) => {
    setQuery(q);
    setTested(true);
    if (q.includes('RAG')) {
      setSimResponse(
        'Retrieved top 3 semantic chunks from PostgreSQL via 384-d embeddings (all-MiniLM-L6-v2) with cosine similarity > 0.82.'
      );
    } else if (q.includes('isolation')) {
      setSimResponse(
        'Public agent strictly restricts tools to [save_client_inquiry, book_appointment]. Admin JWT grants privileged command tools.'
      );
    } else {
      setSimResponse(
        'Sujita specializes in high-throughput FastAPI and Django backends, pgvector RAG pipelines, and automated client intake workflows.'
      );
    }
  };

  return (
    <div className="w-full h-[320px] bg-bg-card rounded-xl overflow-hidden border border-border flex flex-col font-sans select-none">
      {/* Simulation Banner Notice */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-brand-pink font-semibold">
          <Sparkles size={12} />
          AI & FASTAPI ARCHITECTURE SIMULATION
        </span>
        <span className="text-[10px] text-text-muted">pgvector RAG & Leads Engine</span>
      </div>

      {/* Internal Navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-card/60">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'agent'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-text-secondary hover:text-text-main bg-bg-secondary'
            }`}
          >
            RAG Agent Introspection
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'endpoints'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-text-secondary hover:text-text-main bg-bg-secondary'
            }`}
          >
            Backend Health & Routes
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PostgreSQL Active</span>
        </div>
      </div>

      {/* Main Simulation Body */}
      <div className="flex-1 p-3.5 overflow-y-auto no-scrollbar flex flex-col justify-between">
        {activeTab === 'agent' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-text-muted font-mono">Simulate Prompt:</span>
              {sampleQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => handleTest(q)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                    query === q
                      ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/40'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-main border border-border'
                  }`}
                >
                  {q.slice(0, 24)}...
                </button>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-bg-secondary border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                  <Bot size={13} className="text-brand-purple" />
                  "Ask Suji" RAG Inference
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Latency: 184ms
                </span>
              </div>
              <p className="text-xs text-text-secondary font-mono leading-relaxed bg-bg-primary/50 p-2.5 rounded border border-border">
                {simResponse}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-bg-secondary border border-border">
                <div className="text-[10px] text-text-muted">ENDPOINT</div>
                <div className="text-text-main font-semibold mt-0.5">POST /api/inquiries</div>
                <div className="text-[10px] text-emerald-400 mt-1">201 CREATED (Pydantic validated)</div>
              </div>
              <div className="p-2.5 rounded bg-bg-secondary border border-border">
                <div className="text-[10px] text-text-muted">ENDPOINT</div>
                <div className="text-text-main font-semibold mt-0.5">POST /api/chat</div>
                <div className="text-[10px] text-brand-pink mt-1">LangChain pgvector Stream</div>
              </div>
              <div className="p-2.5 rounded bg-bg-secondary border border-border">
                <div className="text-[10px] text-text-muted">DB MIGRATIONS</div>
                <div className="text-text-main font-semibold mt-0.5">Alembic 004_appointments</div>
                <div className="text-[10px] text-emerald-400 mt-1">Up to date</div>
              </div>
              <div className="p-2.5 rounded bg-bg-secondary border border-border">
                <div className="text-[10px] text-text-muted">ISOLATION</div>
                <div className="text-text-main font-semibold mt-0.5">Public / Admin Scopes</div>
                <div className="text-[10px] text-brand-lavender mt-1">Bearer JWT Auth Enforced</div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <CheckCircle2 size={12} className="text-emerald-400" />
            FastAPI + PostgreSQL + React
          </span>
          <span className="text-brand-pink font-semibold">Production Ready</span>
        </div>
      </div>
    </div>
  );
}

