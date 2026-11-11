import React from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Code2,
  Server,
  Layout,
  Database,
  Cpu,
  GitBranch,
  MapPin,
  Mail,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { personalInfo, skillCategories } from '../data/portfolio';

const categoryIcons = {
  code: Code2,
  server: Server,
  layout: Layout,
  database: Database,
  cpu: Cpu,
  git: GitBranch,
};

export default function About() {
  return (
    <section id="about" className="relative py-24 px-4 sm:px-6 lg:px-8">
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
            <span className="section-label">/ About & Stack</span>
            <span className="h-px w-12 bg-border-accent inline-block" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-main">
            Engineering Depth & <span className="text-gradient">Architectural Foundation</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Summary Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="glow-card rounded-3xl p-6 sm:p-7 flex flex-col gap-6 h-fit bg-bg-card/90 border border-border-accent shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/sujita.png"
                  alt={personalInfo.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-pink shadow-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/assets/suji-portrait.jpg';
                  }}
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-bg-card" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text-main">{personalInfo.fullName}</h3>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-brand-pink/20 text-brand-pink font-semibold">
                    SUJI
                  </span>
                </div>
                <p className="text-xs font-mono text-brand-lavender mt-0.5">
                  Full-Stack & Applied AI
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-bg-secondary border border-border">
                  <GraduationCap size={16} className="text-brand-pink" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                    Education
                  </p>
                  <p className="text-sm text-text-main font-semibold">B.Tech CSE</p>
                  <p className="text-xs text-text-secondary">Parul University (2023 — Present)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-bg-secondary border border-border">
                  <Server size={16} className="text-brand-violet" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                    Core Specialization
                  </p>
                  <p className="text-sm text-text-main font-semibold">Scalable Backends & AI</p>
                  <p className="text-xs text-text-secondary">
                    FastAPI, Django, pgvector RAG, PostgreSQL, Redis
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-bg-secondary border border-border">
                  <MessageSquare size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                    Direct Outreach
                  </p>
                  <a
                    href={personalInfo.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-emerald-400 hover:underline block"
                  >
                    WhatsApp: {personalInfo.phoneDisplay}
                  </a>
                  <a
                    href={`mailto:${personalInfo.email}`}
                    className="text-xs font-mono text-brand-lavender hover:underline block mt-0.5"
                  >
                    {personalInfo.email}
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Categorized Skills Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {skillCategories.map((cat, i) => {
              const Icon = categoryIcons[cat.icon] || Code2;
              return (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="rounded-3xl p-5 sm:p-6 bg-bg-card/80 border border-border hover:border-brand-pink/40 transition-all duration-200 shadow-md group"
                >
                  <div className="flex items-center gap-3 mb-3.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-secondary border border-border group-hover:scale-105 transition-transform">
                      <Icon size={16} className="text-brand-pink" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-main">{cat.category}</h3>
                      <span className="font-mono text-[10px] text-text-muted">
                        {cat.skills.length} core tools
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs text-text-secondary bg-bg-secondary border border-border/80 hover:border-brand-violet/40 hover:text-white transition-colors"
                      >
                        <span className="w-1 h-1 rounded-full bg-brand-violet" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
