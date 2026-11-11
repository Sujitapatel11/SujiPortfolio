import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github,
  ArrowUpRight,
  ChevronDown,
  Layers,
  Lock,
  Sparkles,
  ExternalLink,
  Laptop,
  Compass,
} from 'lucide-react';
import { projects } from '../data/portfolio';
import SoulCarePreview from './previews/SoulCarePreview';
import ResumeRoastPreview from './previews/ResumeRoastPreview';
import UrmiNexusPreview from './previews/UrmiNexusPreview';
import SujiPortfolioPreview from './previews/SujiPortfolioPreview';
import LiveFramePreview from './previews/LiveFramePreview';

function ProjectCard({ project, index }) {
  const [activeTab, setActiveTab] = useState('sim'); // 'sim' | 'live'
  const [expanded, setExpanded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const hasLiveDemo = Boolean(project.liveDemo);
  const isInDevelopment = project.status === 'in-development';

  const renderSimulation = () => {
    switch (project.id) {
      case 'soulcare':
        return <SoulCarePreview isVisible={isInView} />;
      case 'urminexus':
        return <UrmiNexusPreview isVisible={isInView} />;
      case 'sujiportfolio':
        return <SujiPortfolioPreview isVisible={isInView} />;
      case 'resumeroast':
        return <ResumeRoastPreview isVisible={isInView} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.1 }}
      className="glow-card rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 border-b border-border bg-bg-card flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-xs text-brand-purple font-semibold">
              /{project.number}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border">
              {project.category}
            </span>
            {isInDevelopment && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
                IN ACTIVE DEV
              </span>
            )}
            {project.isPrivateRepo && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted border border-border inline-flex items-center gap-1">
                <Lock size={10} /> Private Source
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-text-main">{project.name}</h3>
        </div>

        {/* View Switcher: Interactive Simulation vs Live App */}
        <div className="flex items-center p-1 rounded-xl bg-bg-secondary border border-border text-xs font-mono">
          <button
            onClick={() => setActiveTab('sim')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === 'sim'
                ? 'bg-brand-purple text-white font-medium shadow-sm'
                : 'text-text-secondary hover:text-text-main'
            }`}
            title="Interactive illustrative simulation"
          >
            Simulation
          </button>
          {hasLiveDemo ? (
            <button
              onClick={() => setActiveTab('live')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'live'
                  ? 'bg-brand-purple text-white font-medium shadow-sm'
                  : 'text-text-secondary hover:text-text-main'
              }`}
              title="Live interactive iframe embed"
            >
              Live App
            </button>
          ) : (
            <span
              className="px-2 py-1 text-[10px] text-text-muted cursor-not-allowed"
              title="Deployment in progress"
            >
              No Live URL
            </span>
          )}
        </div>
      </div>

      {/* Preview Area (Simulation vs Live Frame) */}
      <div className="p-3 bg-bg-secondary/40 border-b border-border">
        {activeTab === 'sim' ? (
          renderSimulation()
        ) : (
          <LiveFramePreview
            url={project.liveDemo}
            title={project.name}
            isVisible={isInView && activeTab === 'live'}
          />
        )}
      </div>

      {/* Card Description & Meta */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {project.description}
        </p>

        {/* Tech Badges */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {project.tech.map((t) => (
            <span key={t} className="tech-badge">
              {t}
            </span>
          ))}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mt-auto pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium btn-ghost"
              title={project.isPrivateRepo ? 'Repository is private (GitHub profile)' : 'View source code on GitHub'}
            >
              <Github size={14} />
              <span>{project.isPrivateRepo ? 'Private Repo' : 'GitHub'}</span>
            </a>

            {hasLiveDemo && (
              <a
                href={project.liveDemo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium btn-primary"
              >
                <span>Live App</span>
                <ArrowUpRight size={13} />
              </a>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs font-mono text-brand-purple hover:underline"
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Hide Details' : 'Architecture & Features'}</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Expandable Case Study / Features Breakdown */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border">
                <p className="font-mono text-[11px] text-text-muted mb-2 tracking-wider uppercase flex items-center gap-1.5">
                  <Layers size={12} className="text-brand-purple" />
                  {isInDevelopment ? 'Planned Engineering Architecture' : 'Verified Capabilities'}
                </p>
                <ul className="space-y-2">
                  {project.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-text-secondary leading-normal"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-10 sm:mb-14"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="section-label">/ Projects</span>
            <span className="h-px w-10 bg-border inline-block" />
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-main">
                Featured Engineering Work
              </h2>
              <p className="text-sm text-text-secondary mt-1.5 max-w-xl">
                Real-world full-stack architectures, creator platforms, and applied AI applications
                built with production-grade backend foundations.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-text-muted bg-bg-secondary/70 px-3 py-1.5 rounded-xl border border-border">
              <Laptop size={14} className="text-brand-purple" />
              <span>Interactive Simulations + Live Deploys</span>
            </div>
          </div>
        </motion.div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
