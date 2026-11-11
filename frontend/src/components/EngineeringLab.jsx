import React from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  Server,
  Code2,
  Database,
  Lock,
  Gauge,
  Layers,
  Radio,
  Container,
  Brain,
  ArrowRight,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { engineeringTopics } from '../data/portfolio';

const topicIcons = {
  architecture: Network,
  backend: Server,
  api: Code2,
  database: Database,
  auth: Lock,
  performance: Gauge,
  cache: Layers,
  realtime: Radio,
  docker: Container,
  ai: Brain,
};

const flowNodes = [
  { label: 'Client Layer', sub: 'React / WebGL / Vite', icon: Code2 },
  { label: 'API Gateway', sub: 'FastAPI / Django Async', icon: Server },
  { label: 'Service / RAG', sub: 'LangChain & Embeddings', icon: Brain },
  { label: 'Data Persistence', sub: 'PostgreSQL + pgvector', icon: Database },
];

export default function EngineeringLab() {
  return (
    <section id="engineering-lab" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-12 sm:mb-14"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="section-label">/ Engineering Systems</span>
            <span className="h-px w-12 bg-border-accent inline-block" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-main">
            Architecture, Patterns & <span className="text-gradient">Systems Engineering</span>
          </h2>
          <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-2xl">
            Core distributed patterns, asynchronous APIs, vector RAG retrieval, and containerized deployment foundations.
          </p>
        </motion.div>

        {/* Architecture Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl p-6 sm:p-8 mb-10 bg-bg-card/90 border border-border-accent shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-xs text-brand-pink flex items-center gap-2 font-semibold">
              <Terminal size={14} className="text-brand-violet" />
              SYSTEM_ARCHITECTURE.flow
            </p>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
              High-Throughput Production Pattern
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2 justify-center flex-wrap">
            {flowNodes.map((node, i) => {
              const Icon = node.icon;
              return (
                <React.Fragment key={i}>
                  <div className="rounded-2xl px-5 py-4 text-center min-w-[140px] bg-bg-secondary/90 border border-border hover:border-brand-violet/50 transition-all duration-200 shadow-md group">
                    <Icon
                      size={20}
                      className="text-brand-pink mx-auto mb-2 group-hover:scale-110 transition-transform"
                    />
                    <p className="text-sm font-bold text-text-main">{node.label}</p>
                    <p className="font-mono text-[11px] text-text-muted mt-0.5">{node.sub}</p>
                  </div>
                  {i < flowNodes.length - 1 && (
                    <ArrowRight size={16} className="text-brand-violet hidden sm:block opacity-75" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Side services */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 pt-5 border-t border-border">
            <span className="tech-badge">
              <Layers size={11} className="mr-1 text-brand-pink" /> Redis In-Memory Cache
            </span>
            <span className="tech-badge">
              <Brain size={11} className="mr-1 text-brand-violet" /> pgvector 384-d Embeddings
            </span>
            <span className="tech-badge">
              <Container size={11} className="mr-1 text-emerald-400" /> Docker Compose Services
            </span>
            <span className="tech-badge">
              <Radio size={11} className="mr-1 text-blue-400" /> WebSocket Push Pipeline
            </span>
          </div>
        </motion.div>

        {/* Topic Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {engineeringTopics.map((topic, i) => {
            const Icon = topicIcons[topic.icon] || Code2;
            return (
              <motion.div
                key={topic.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: (i % 2) * 0.05 }}
                className="rounded-3xl p-5 sm:p-6 flex gap-4 bg-bg-card/80 border border-border hover:border-brand-violet/40 transition-all duration-200 shadow-md group"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center bg-bg-secondary border border-border group-hover:scale-105 transition-transform">
                  <Icon size={20} className="text-brand-pink" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main mb-1">{topic.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{topic.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
