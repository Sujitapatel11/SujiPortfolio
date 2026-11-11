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
  ArrowRight,
} from 'lucide-react';
import {
  SiPython,
  SiJavascript,
  SiTypescript,
  SiCplusplus,
  SiC,
  SiReact,
  SiHtml5,
  SiTailwindcss,
  SiFastapi,
  SiDjango,
  SiNodedotjs,
  SiPostman,
  SiPostgresql,
  SiMongodb,
  SiRedis,
  SiTensorflow,
  SiLangchain,
  SiScikitlearn,
  SiDocker,
  SiVercel,
  SiRailway,
  SiGit,
  SiGithub,
} from 'react-icons/si';
import { FaJava, FaCss3Alt } from 'react-icons/fa6';
import { personalInfo, skillCategories } from '../data/portfolio';

const categoryIcons = {
  code: Code2,
  server: Server,
  layout: Layout,
  database: Database,
  cpu: Cpu,
  git: GitBranch,
};

const skillLogoMap = {
  Python: { icon: SiPython, color: '#3776AB' },
  Java: { icon: FaJava, color: '#ED8B00' },
  JavaScript: { icon: SiJavascript, color: '#F7DF1E' },
  TypeScript: { icon: SiTypescript, color: '#3178C6' },
  'C++': { icon: SiCplusplus, color: '#00599C' },
  C: { icon: SiC, color: '#A8B9CC' },
  Django: { icon: SiDjango, color: '#2BA977' },
  FastAPI: { icon: SiFastapi, color: '#009688' },
  'Node.js': { icon: SiNodedotjs, color: '#5FA04E' },
  'REST APIs': { icon: SiPostman, color: '#FF6C37' },
  React: { icon: SiReact, color: '#61DAFB' },
  HTML5: { icon: SiHtml5, color: '#E34F26' },
  HTML: { icon: SiHtml5, color: '#E34F26' },
  CSS3: { icon: FaCss3Alt, color: '#1572B6' },
  CSS: { icon: FaCss3Alt, color: '#1572B6' },
  'Tailwind CSS': { icon: SiTailwindcss, color: '#06B6D4' },
  PostgreSQL: { icon: SiPostgresql, color: '#4169E1' },
  MongoDB: { icon: SiMongodb, color: '#47A248' },
  Redis: { icon: SiRedis, color: '#FF4438' },
  'Machine Learning': { icon: SiTensorflow, color: '#FF6F00' },
  NLP: { icon: SiLangchain, color: '#2DD4BF' },
  'Scikit-learn': { icon: SiScikitlearn, color: '#F7931E' },
  TensorFlow: { icon: SiTensorflow, color: '#FF6F00' },
  'LLM Integration': { icon: SiLangchain, color: '#2DD4BF' },
  Git: { icon: SiGit, color: '#F05032' },
  GitHub: { icon: SiGithub, color: '#FFFFFF' },
  Docker: { icon: SiDocker, color: '#2496ED' },
  Vercel: { icon: SiVercel, color: '#FFFFFF' },
  Railway: { icon: SiRailway, color: '#C084FC' },
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
            <span className="section-label">/ Foundation & Background</span>
            <span className="h-px w-12 bg-border-accent inline-block" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-main">
            Engineering Depth & <span className="text-gradient">Core Foundation</span>
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

            {/* Quick jump to complete skills section */}
            <div className="pt-2 border-t border-border">
              <a
                href="#skills"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#skills')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-mono text-brand-pink hover:text-white bg-bg-secondary hover:bg-brand-pink/20 border border-border hover:border-brand-pink/40 transition-all"
              >
                <span>View All 28 Technology Logos</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </motion.div>

          {/* Categorized Skills Grid with Official SVG Logos */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {skillCategories.map((cat, i) => {
              const CategoryIcon = categoryIcons[cat.icon] || Code2;
              return (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="rounded-3xl p-5 sm:p-6 bg-bg-card/80 border border-border hover:border-brand-pink/40 transition-all duration-200 shadow-md group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-secondary border border-border group-hover:scale-105 transition-transform">
                      <CategoryIcon size={16} className="text-brand-pink" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-main">{cat.category}</h3>
                      <span className="font-mono text-[10px] text-text-muted">
                        Official Stack
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.skills.map((skill) => {
                      const logoMeta = skillLogoMap[skill];
                      const SkillIcon = logoMeta ? logoMeta.icon : Code2;
                      const brandColor = logoMeta ? logoMeta.color : '#A855F7';
                      return (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs text-text-main bg-bg-secondary border border-border/80 hover:border-brand-violet/50 hover:bg-bg-tertiary transition-all group/item shadow-sm"
                          title={`${skill} (Official Technology)`}
                        >
                          <SkillIcon
                            size={14}
                            style={{ color: brandColor }}
                            className="flex-shrink-0 group-hover/item:scale-110 transition-transform"
                            aria-hidden="true"
                          />
                          <span>{skill}</span>
                        </span>
                      );
                    })}
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
