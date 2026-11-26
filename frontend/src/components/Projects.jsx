import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown, Github, Layers, Lock } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { projects } from '../data/portfolio';
import SoulCarePreview from './previews/SoulCarePreview';
import ResumeRoastPreview from './previews/ResumeRoastPreview';
import UrmiNexusPreview from './previews/UrmiNexusPreview';
import SujiPortfolioPreview from './previews/SujiPortfolioPreview';
import LiveFramePreview from './previews/LiveFramePreview';

const previews = {
  soulcare: SoulCarePreview,
  urminexus: UrmiNexusPreview,
  sujiportfolio: SujiPortfolioPreview,
  resumeroast: ResumeRoastPreview,
};

const filters = [
  { id: 'all', label: 'All work' },
  { id: 'social', label: 'Social & Creator' },
  { id: 'education', label: 'Education SaaS' },
  { id: 'engineering', label: 'Engineering' },
];

function ProjectCard({ project, index }) {
  const [expanded, setExpanded] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const Preview = previews[project.id];
  const featureGroups = project.featureGroups || [
    { title: 'Project notes', status: 'implemented', items: project.features || [] },
  ];
  const statusTone = project.status === 'in-development'
    ? 'border-amber-500/25 bg-amber-500/10 text-amber-500'
    : project.status === 'live-preview'
      ? 'border-brand-purple/25 bg-brand-purple/10 text-brand-purple'
      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.38, delay: index * 0.06 }}
      className="surface-card flex min-w-0 h-full flex-col overflow-hidden"
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-brand-purple">{project.number}</span>
          <span className="rounded-full border border-border bg-bg-secondary px-2.5 py-1 text-[10px] font-medium text-text-secondary">{project.category}</span>
          <span className={`ml-auto rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusTone}`}>{project.statusLabel || project.status}</span>
        </div>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-tight tracking-tight text-text-main sm:text-2xl">{project.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">{project.contextLabel || 'Independent project'}</p>
          </div>
          {project.isPrivateRepo && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-bg-secondary px-2 py-1 text-[10px] text-text-muted">
              <Lock size={11} /> Private source
            </span>
          )}
        </div>
      </div>

      <div className="border-b border-border bg-bg-secondary/35 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
            {showLive ? 'Live deployment' : 'Product overview'}
          </span>
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-card p-1 text-[10px]">
            <button
              type="button"
              onClick={() => setShowLive(false)}
              aria-pressed={!showLive}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${!showLive ? 'bg-brand-violet text-white' : 'text-text-secondary hover:text-text-main'}`}
            >
              Overview
            </button>
            {project.liveDemo && (
              <button
                type="button"
                onClick={() => setShowLive(true)}
                aria-pressed={showLive}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${showLive ? 'bg-brand-violet text-white' : 'text-text-secondary hover:text-text-main'}`}
              >
                Live view
              </button>
            )}
          </div>
        </div>
        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-bg-card shadow-sm">
          {showLive ? (
            <LiveFramePreview url={project.liveDemo} title={project.name} isVisible={showLive} />
          ) : Preview ? (
            <Preview isVisible={!showLive} />
          ) : (
            <div className="flex min-h-[250px] items-center justify-center p-8 text-center text-sm text-text-muted">
              Product preview is being prepared.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-sm leading-7 text-text-secondary">{project.description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {project.tech.map((technology) => (
            <span key={technology} className="tech-badge rounded-full px-3 py-1.5">{technology}</span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost inline-flex items-center gap-2 px-3.5 py-2 text-xs"
              title={project.isPrivateRepo ? 'Open repository link (access restricted)' : 'View source on GitHub'}
            >
              <Github size={14} />
              {project.isPrivateRepo ? 'Private repository' : 'Source code'}
            </a>
            {project.liveDemo && (
              <a
                href={project.liveDemo}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 px-3.5 py-2 text-xs"
              >
                Open live site <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-brand-purple transition hover:bg-brand-purple/10"
            aria-expanded={expanded}
          >
            {expanded ? 'Hide project notes' : 'Architecture & scope'}
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                {featureGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                      <Layers size={12} className="text-brand-purple" />
                      {group.title}
                    </p>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-xs leading-relaxed text-text-secondary">
                          <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple/80" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export default function Projects() {
  const [filter, setFilter] = useState('all');
  const filteredProjects = useMemo(
    () => projects.filter((project) => filter === 'all' || project.group === filter),
    [filter]
  );

  return (
    <section id="projects" className="portfolio-section relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_12%,rgba(118,97,143,0.08),transparent_58%)]" />
      <div className="site-container">
        <SectionHeading
          eyebrow="/ Selected work"
          title="Products, platforms"
          accent="& engineering"
          description="A source-linked view of the products I build. Product scope and implementation status are separated, so planned work is not presented as shipped functionality."
        />

        <div className="mb-7 flex flex-wrap items-center gap-2" role="group" aria-label="Filter projects">
          {filters.map((item) => {
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={selected}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${selected ? 'border-brand-purple/45 bg-brand-purple/12 text-text-main' : 'border-border bg-bg-card/70 text-text-secondary hover:border-brand-purple/40 hover:text-text-main'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-2 xl:gap-6">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        <div className="mx-auto mt-7 flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-border bg-bg-card/65 px-5 py-4 text-xs text-text-secondary">
          <span className="font-semibold text-text-main">{projects.length} selected projects</span>
          <span>Repository-backed descriptions</span>
          <span>Implementation status shown explicitly</span>
        </div>
      </div>
    </section>
  );
}
