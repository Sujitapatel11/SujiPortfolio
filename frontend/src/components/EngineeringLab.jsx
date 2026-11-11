import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Server, Code2, Database, Lock, Gauge, Layers, Radio, Container, Brain, ArrowRight, Terminal, Sparkles, Boxes, ShieldCheck, Workflow, Zap } from 'lucide-react';
import { engineeringTopics } from '../data/portfolio';

const topicMeta = {
  'System Architecture': { icon: Network, category: 'system', tags: ['Architecture', 'Scalability', 'Microservices'], visual: Boxes },
  'Backend Engineering': { icon: Server, category: 'backend', tags: ['Django', 'FastAPI', 'ORM'], visual: Workflow },
  'API Development': { icon: Code2, category: 'backend', tags: ['RESTful', 'OpenAPI', 'Validation'], visual: Code2 },
  'Database Design': { icon: Database, category: 'database', tags: ['Schema', 'Indexing', 'Migrations'], visual: Database },
  Authentication: { icon: Lock, category: 'backend', tags: ['JWT', 'OAuth2', 'RBAC'], visual: ShieldCheck },
  'Performance Optimization': { icon: Gauge, category: 'performance', tags: ['Profiling', 'N+1 Fixes', 'Async I/O'], visual: Gauge },
  Caching: { icon: Layers, category: 'database', tags: ['Redis', 'Invalidation', 'Session'], visual: Layers },
  'Real-Time Systems': { icon: Radio, category: 'backend', tags: ['WebSocket', 'Event Streaming', 'Notifications'], visual: Radio },
  'Docker & Deployment': { icon: Container, category: 'devops', tags: ['Docker', 'CI/CD', 'Railway / Vercel'], visual: Container },
  'AI Integration': { icon: Brain, category: 'ai', tags: ['LangChain', 'RAG', 'LLM APIs'], visual: Brain },
};

const categories = [
  { id: 'all', label: 'All Labs', icon: Boxes },
  { id: 'backend', label: 'Backend', icon: Layers },
  { id: 'system', label: 'System Design', icon: Network },
  { id: 'devops', label: 'DevOps', icon: Zap },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'ai', label: 'AI & LLM', icon: Brain },
  { id: 'performance', label: 'Performance', icon: Gauge },
];

const flowNodes = [
  { label: 'Client Layer', sub: 'React / WebGL / Vite', icon: Code2 },
  { label: 'API Gateway', sub: 'FastAPI / Django Async', icon: Server },
  { label: 'Service / RAG', sub: 'LangChain & Embeddings', icon: Brain },
  { label: 'Data Persistence', sub: 'PostgreSQL + pgvector', icon: Database },
];

export default function EngineeringLab() {
  const [activeCategory, setActiveCategory] = useState('all');
  const visibleTopics = useMemo(() => engineeringTopics.filter((topic) => activeCategory === 'all' || topicMeta[topic.title]?.category === activeCategory), [activeCategory]);

  return (
    <section id="engineering-lab" className="relative isolate overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_12%,rgba(216,180,254,0.24),transparent_58%),radial-gradient(ellipse_at_50%_85%,rgba(244,114,182,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-24 top-24 -z-10 h-64 w-64 rounded-full bg-pink-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-36 -z-10 h-72 w-72 rounded-full bg-violet-300/15 blur-3xl" />
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="mb-8 text-center sm:mb-10">
          <div className="mb-3 flex items-center justify-center gap-2"><Code2 size={17} className="text-brand-purple" /><span className="section-label">Engineering Lab</span><Sparkles size={15} className="text-brand-pink" /></div>
          <h2 className="text-4xl font-extrabold tracking-tight text-text-main sm:text-6xl">Engineering <span className="text-gradient">Lab</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">Hands-on practice, system design, and production engineering skills.</p>
        </motion.div>

        <div className="mb-8 flex gap-2 overflow-x-auto px-1 pb-2 no-scrollbar sm:flex-wrap sm:justify-center">
          {categories.map((category) => { const Icon = category.icon; const selected = activeCategory === category.id; return <button key={category.id} type="button" onClick={() => setActiveCategory(category.id)} aria-pressed={selected} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold shadow-sm backdrop-blur-md transition sm:text-sm ${selected ? 'border-brand-purple/50 bg-brand-purple/15 text-text-main shadow-[0_0_18px_rgba(168,85,247,0.18)]' : 'border-border bg-bg-card/70 text-text-secondary hover:border-brand-pink/50 hover:text-text-main'}`}><Icon size={16} />{category.label}</button>; })}
        </div>

        <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {visibleTopics.map((topic, index) => {
            const meta = topicMeta[topic.title] || {}; const Icon = meta.icon || Code2; const Visual = meta.visual || Icon;
            return <motion.article layout key={topic.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, delay: index * 0.025 }} className="group relative flex min-h-[154px] items-center gap-4 overflow-hidden rounded-3xl border border-brand-purple/25 bg-bg-card/75 p-4 shadow-[0_5px_24px_rgba(139,92,246,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-brand-pink/50 hover:shadow-[0_12px_32px_rgba(168,85,247,0.16)] sm:min-h-[166px] sm:gap-5 sm:p-5">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-pink/10 opacity-70" />
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-pink/25 bg-bg-secondary/80 text-brand-purple shadow-[0_4px_16px_rgba(168,85,247,0.12)] transition group-hover:scale-105 group-hover:text-brand-pink sm:h-16 sm:w-16"><Icon size={27} strokeWidth={1.8} /></div>
              <div className="relative z-10 min-w-0 flex-1">
                <h3 className="text-base font-extrabold tracking-tight text-text-main sm:text-lg">{topic.title}</h3>
                <div className="my-2 flex flex-wrap gap-1.5">{(meta.tags || []).map((tag) => <span key={tag} className="rounded-full border border-brand-purple/15 bg-brand-purple/10 px-2.5 py-1 text-[10px] font-semibold text-brand-purple dark:text-brand-lavender">{tag}</span>)}</div>
                <p className="max-w-xl text-xs leading-relaxed text-text-secondary sm:text-sm">{topic.description}</p>
              </div>
              <div className="relative z-10 hidden h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-brand-purple/10 to-brand-pink/10 text-brand-purple/70 sm:flex"><Visual size={43} strokeWidth={1.4} className="drop-shadow-[0_4px_8px_rgba(168,85,247,0.25)] transition duration-300 group-hover:scale-110 group-hover:text-brand-pink" /><span className="absolute inset-2 rounded-[22px] border border-brand-purple/10" /></div>
            </motion.article>;
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="mt-12 rounded-3xl border border-brand-purple/25 bg-bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-brand-pink"><Terminal size={15} />ARCHITECTURE_OVERVIEW</p><span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Illustrative architecture</span></div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
            {flowNodes.map((node, i) => { const NodeIcon = node.icon; return <React.Fragment key={node.label}><div className="group min-w-[150px] rounded-2xl border border-border bg-bg-secondary/80 px-5 py-4 text-center shadow-sm transition hover:border-brand-pink/40"><NodeIcon size={21} className="mx-auto mb-2 text-brand-pink transition group-hover:scale-110" /><p className="text-sm font-bold text-text-main">{node.label}</p><p className="mt-0.5 font-mono text-[10px] text-text-muted">{node.sub}</p></div>{i < flowNodes.length - 1 && <ArrowRight size={16} className="hidden text-brand-purple/70 sm:block" />}</React.Fragment>; })}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-border pt-5">
            <span className="tech-badge"><Layers size={11} className="text-brand-pink" />Redis In-Memory Cache</span><span className="tech-badge"><Brain size={11} className="text-brand-purple" />Vector search concepts</span><span className="tech-badge"><Container size={11} className="text-emerald-500" />Containerized development</span><span className="tech-badge"><Radio size={11} className="text-blue-400" />Real-time communication</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}