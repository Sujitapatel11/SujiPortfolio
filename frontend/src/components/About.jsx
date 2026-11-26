import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './SectionHeading';
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
  Railway: { icon: SiRailway, color: '#76618F' },
};

export default function About() {
  return (
    <section id="about" className="portfolio-section relative">
      <div className="site-container">
        <SectionHeading
          eyebrow="/ Foundation & Background"
          title="Engineering Depth &"
          accent="Core Foundation"
        />

        <div className="grid min-w-0 grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.55fr)] lg:gap-6">
          {/* Profile Summary Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="surface-card flex h-full min-w-0 flex-col gap-6 p-5 text-left sm:p-6"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <img
                  src="/sujita.png"
                  alt={personalInfo.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-purple shadow-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/assets/suji-portrait.jpg';
                  }}
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-bg-card" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-base font-bold leading-tight text-text-main sm:text-lg">{personalInfo.fullName}</h3>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-semibold">
                    SUJI
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary sm:text-sm">
                  Full-Stack & Applied AI
                </p>
              </div>
            </div>

            <div className="space-y-5 border-t border-border pt-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-secondary">
                  <GraduationCap size={16} className="text-brand-purple" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 text-left">
                  <p className="font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-text-muted">
                    Education
                  </p>
                  <p className="text-sm font-semibold leading-5 text-text-main">B.Tech CSE</p>
                  <p className="text-xs leading-relaxed text-text-secondary">Parul University (2023 — Present)</p>
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
                  <p className="text-sm font-semibold leading-5 text-text-main">Scalable Backends & AI</p>
                  <p className="break-words text-xs leading-relaxed text-text-secondary">
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
                    className="block break-words text-xs font-mono leading-relaxed text-emerald-500 hover:underline"
                  >
                    WhatsApp: {personalInfo.phoneDisplay}
                  </a>
                  <a
                    href={`mailto:${personalInfo.email}`}
                    className="mt-1 block break-all text-xs font-mono leading-relaxed text-text-secondary hover:text-brand-purple hover:underline"
                  >
                    {personalInfo.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Quick jump to complete skills section */}
            <div className="mt-auto border-t border-border pt-5">
              <a
                href="#skills"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#skills')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-center text-xs font-medium text-brand-purple transition-all hover:border-brand-purple/40 hover:bg-brand-purple/10"
              >
                <span>View All 28 Technology Logos</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </motion.div>

          {/* Categorized Skills Grid with Official SVG Logos */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            {skillCategories.map((cat, i) => {
              const CategoryIcon = categoryIcons[cat.icon] || Code2;
              return (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="surface-card group min-w-0 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-purple/35 sm:p-5"
                >
                  <div className="mb-4 flex min-w-0 items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-secondary border border-border group-hover:scale-105 transition-transform">
                      <CategoryIcon size={16} className="text-brand-purple" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold leading-5 text-text-main">{cat.category}</h3>
                      <span className="font-mono text-[10px] text-text-muted">
                        Official Stack
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {cat.skills.map((skill) => {
                      const logoMeta = skillLogoMap[skill];
                      const SkillIcon = logoMeta ? logoMeta.icon : Code2;
                      const brandColor = logoMeta ? logoMeta.color : '#76618F';
                      return (
                        <span
                          key={skill}
                          className="group/item inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-xl border border-border/80 bg-bg-secondary px-2.5 py-1.5 font-mono text-xs leading-4 text-text-main shadow-sm transition-all hover:border-brand-violet/50 hover:bg-bg-tertiary"
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
