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
import { skillsList } from '../data/skillsData';
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
          {project.tech.map((t) => {
            const tech = skillsList.find((skill) => skill.name.toLowerCase() === t.toLowerCase());
            const TechIcon = tech?.icon;
            return <span key={t} className="tech-badge rounded-full px-3 py-1.5">{TechIcon ? <TechIcon size={14} style={{ color: tech.brandColor }} /> : <Layers size={13} />}{t}</span>;
          })}
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
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(0);
  const [viewportWidth, setViewportWidth] = useState( window.innerWidth || 1280 );
  const mobile = viewportWidth < 640;
  const tablet = viewportWidth >= 640 && viewportWidth < 1024;
  const slideDistance = Math.min(465, Math.max(205, viewportWidth * (tablet ? 0.34 : 0.36)));
  const sideScale = tablet ? 0.72 : 0.78;
  const filters = [{ id: 'all', label: 'All Projects' }, { id: 'creator', label: 'Social & Creator' }, { id: 'education', label: 'Education' }, { id: 'engineering', label: 'AI & Engineering' }];
  const items = projects.filter((p) => filter === 'all' || (filter === 'creator' && p.id === 'soulcare') || (filter === 'education' && p.id === 'urminexus') || (filter === 'engineering' && p.id === 'sujiportfolio'));
  const count = items.length;
  useEffect(() => setActive(0), [filter]);
  useEffect(() => { const resize = () => setViewportWidth(window.innerWidth); resize(); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const move = (step) => { if (count > 1) setActive((v) => (v + step + count) % count); };
  useEffect(() => { const key = (e) => { if (e.target instanceof HTMLElement && ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)) return; if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [count]);
  const offsets = mobile ? [0] : [-1, 0, 1];
  const cards = offsets.map((offset) => { const index = (active + offset + count) % count; return { project: items[index], index, offset }; }).filter((item, i, arr) => item.project && arr.findIndex((x) => x.index === item.index) === i);
  return (
    <section id="projects" className="relative isolate overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_18%,rgba(216,180,254,0.24),transparent_56%),radial-gradient(ellipse_at_50%_82%,rgba(244,114,182,0.13),transparent_52%)]" />
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="mb-8 text-center sm:mb-10">
          <div className="mb-3 flex items-center justify-center gap-2"><span className="section-label">/ My Projects</span><Sparkles size={14} className="text-brand-pink" /></div>
          <h2 className="text-3xl font-extrabold tracking-tight text-text-main sm:text-5xl">Real-World Projects <span className="text-gradient">I’ve Built</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">A collection of full-stack, AI and product projects — from idea to implementation.</p>
        </motion.div>
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">{filters.map((f) => <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={`rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-md transition sm:text-sm ${filter === f.id ? 'border-brand-purple/50 bg-brand-purple/15 text-text-main shadow-md' : 'border-border bg-bg-card/70 text-text-secondary hover:border-brand-pink/50'}`}>{f.label}</button>)}</div>
        <div className="relative mx-auto max-w-6xl">
          <div className="relative h-[740px] overflow-hidden sm:h-[780px] lg:h-[820px] [perspective:1400px]">
            <motion.div className="relative h-full w-full cursor-grab touch-pan-y active:cursor-grabbing" drag={count > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12} onDragEnd={(_, info) => { if (info.offset.x < -Math.max(40, viewportWidth * 0.07)) move(1); if (info.offset.x > Math.max(40, viewportWidth * 0.07)) move(-1); }} role="group" aria-label="Project carousel. Drag with mouse or swipe to browse.">
              {cards.map(({ project, index, offset }) => { const selected = offset === 0; return <motion.div key={project.id} initial={false} animate={{ x: mobile ? 0 : offset * slideDistance, scale: selected ? 1 : sideScale, opacity: selected ? 1 : tablet ? 0.42 : 0.58, rotateY: mobile ? 0 : offset * (tablet ? -4 : -7), zIndex: selected ? 20 : 10 }} transition={{ type: 'spring', stiffness: 190, damping: 25 }} style={{ translate: '-50% 0', transformStyle: 'preserve-3d' }} className={`absolute left-1/2 top-0 w-[calc(100%-8px)] sm:w-[min(88%,680px)] origin-top ${selected ? 'pointer-events-auto' : 'pointer-events-auto cursor-pointer'}`} onClick={() => { if (!selected) setActive(index); }} aria-hidden={!selected}><ProjectCard project={project} index={index} /></motion.div>; })}
            </motion.div>
          </div>
          <div className="relative z-30 -mt-1 flex items-center justify-center gap-5">
            <button type="button" onClick={() => move(-1)} disabled={count < 2} aria-label="Previous project" className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-purple/40 bg-bg-card/90 text-text-main shadow-lg backdrop-blur-md transition hover:border-brand-pink hover:text-brand-pink disabled:opacity-40"><ChevronDown size={19} className="rotate-90" /></button>
            <div className="min-w-[92px] text-center"><p className="font-mono text-xs tabular-nums text-text-secondary">{String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</p><p className="mt-1 text-[10px] text-text-muted">Drag with mouse or swipe</p></div>
            <button type="button" onClick={() => move(1)} disabled={count < 2} aria-label="Next project" className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-purple/40 bg-bg-card/90 text-text-main shadow-lg backdrop-blur-md transition hover:border-brand-pink hover:text-brand-pink disabled:opacity-40"><ChevronDown size={19} className="-rotate-90" /></button>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-2xl border border-border bg-bg-card/65 px-5 py-4 text-sm text-text-secondary shadow-sm backdrop-blur-md"><div className="flex items-center gap-2"><Layers size={17} className="text-brand-pink" /><span className="font-semibold text-text-main">{projects.length} featured projects</span></div><div className="flex items-center gap-2"><Laptop size={17} className="text-brand-purple" /><span>Interactive previews</span></div><div className="flex items-center gap-2"><Compass size={17} className="text-brand-pink" /><span>Explore the builds</span></div></div>
      </div>
    </section>
  );
}
