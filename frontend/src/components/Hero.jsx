import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Github,
  Linkedin,
  Terminal,
  Sparkles,
  Phone,
  MessageSquare,
  Server,
  Cpu,
  Layers,
  Code2,
  CheckCircle2,
} from 'lucide-react';
import WorkspaceScene from './WorkspaceScene';
import { personalInfo } from '../data/portfolio';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

export default function Hero() {
  const [viewMode, setViewMode] = useState('portrait'); // 'portrait' | 'workspace'

  return (
    <section
      id="home"
      className="relative min-h-[92vh] flex items-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Bio & Primary CTAs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Terminal greeting badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-secondary/90 border border-brand-violet/30 w-fit font-mono text-xs text-brand-pink shadow-sm"
            >
              <Terminal size={13} className="text-brand-violet" />
              <span>{personalInfo.greeting}</span>
              <span className="w-1.5 h-3.5 bg-brand-pink animate-blink" />
            </motion.div>

            {/* Brand Title & Hero Headline */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.1}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-widest text-brand-violet font-semibold">
                  // {personalInfo.brand} ARCHITECTURE
                </span>
                <span className="h-px w-12 bg-border-accent" />
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.12] tracking-tight text-text-main">
                Engineering Ideas into{' '}
                <span className="text-gradient block sm:inline">Experiences.</span>
              </h1>
            </motion.div>

            {/* Technical Role Chips */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.2}
              className="flex flex-wrap gap-2"
            >
              {personalInfo.roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs text-text-secondary bg-bg-secondary/70 border border-border hover:border-brand-pink/40 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-pink" />
                  {role}
                </span>
              ))}
            </motion.div>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.25}
              className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-xl"
            >
              {personalInfo.description}
            </motion.p>

            {/* Terminal-style status element */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.3}
              className="rounded-xl bg-bg-secondary/90 border border-border p-3.5 font-mono text-xs space-y-1.5 shadow-inner"
            >
              <div className="flex items-center justify-between text-text-muted pb-1 border-b border-border text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-pink" />
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="ml-1 text-text-secondary">suji-core ~ status</span>
                </span>
                <span className="text-brand-violet text-[10px]">v2.6-prod</span>
              </div>
              <div className="text-text-secondary">
                <span className="text-brand-pink">$</span> suji.inspect()
              </div>
              <div className="text-text-muted pl-3 text-[11px] leading-relaxed">
                &#10140; <span className="text-brand-violet font-semibold">Focus:</span> High-Throughput APIs, PostgreSQL RAG, Distributed Systems
                <br />
                &#10140; <span className="text-emerald-400 font-semibold">Integrations:</span> FastAPI &#8226; Django &#8226; LangChain &#8226; React
              </div>
            </motion.div>

            {/* Action Buttons: WhatsApp, Call, Projects, Links */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.35}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <a
                href="#projects"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-primary"
              >
                Explore Projects
                <ArrowRight size={15} />
              </a>

              {/* Direct WhatsApp CTA */}
              <a
                href={personalInfo.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost inline-flex items-center gap-2 border-emerald-500/40 text-emerald-400 hover:text-emerald-300 hover:border-emerald-400"
                title="Chat directly on WhatsApp"
              >
                <MessageSquare size={15} className="text-emerald-400" />
                WhatsApp
              </a>

              {/* Direct Phone Call CTA */}
              <a
                href={personalInfo.phoneCall}
                className="btn-ghost inline-flex items-center gap-2 text-brand-lavender hover:text-white"
                title="Call Sujita directly"
              >
                <Phone size={14} className="text-brand-pink" />
                Call
              </a>

              {/* Social links */}
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <a
                  href={personalInfo.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-bg-card border border-border text-text-secondary hover:text-text-main hover:border-brand-violet/50 transition-colors"
                  aria-label="GitHub Profile"
                  title="GitHub Profile"
                >
                  <Github size={16} />
                </a>
                <a
                  href={personalInfo.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-bg-card border border-border text-text-secondary hover:text-text-main hover:border-brand-violet/50 transition-colors"
                  aria-label="LinkedIn Profile"
                  title="LinkedIn Profile"
                >
                  <Linkedin size={16} />
                </a>
              </div>
            </motion.div>

            {/* Verified Availability Indicator */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.4}
              className="flex items-center gap-2 pt-1 text-xs font-mono text-text-secondary"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-text-main font-semibold">{personalInfo.availability}</span>
              <span className="text-text-muted">&#8212; Full-Stack & Applied AI</span>
            </motion.div>
          </div>

          {/* Right Column: Developer Portrait & Workspace with Floating Status Badges */}
          <div className="lg:col-span-5 relative">
            {/* View Switcher: Portrait vs Workspace */}
            <div className="flex items-center justify-end mb-2.5">
              <div className="inline-flex items-center p-1 rounded-xl bg-bg-secondary/90 border border-border text-xs font-mono">
                <button
                  onClick={() => setViewMode('portrait')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    viewMode === 'portrait'
                      ? 'bg-gradient-to-r from-brand-pink to-brand-violet text-white font-medium shadow-sm'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  Developer Portrait
                </button>
                <button
                  onClick={() => setViewMode('workspace')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    viewMode === 'workspace'
                      ? 'bg-gradient-to-r from-brand-pink to-brand-violet text-white font-medium shadow-sm'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  3D Workspace
                </button>
              </div>
            </div>

            {/* Main Visual Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              {/* Floating Status Card 1: Top Left */}
              <div className="absolute -top-4 -left-4 sm:-top-5 sm:-left-6 z-20 bg-bg-card/95 border border-brand-violet/40 p-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 animate-float max-w-[210px]">
                <div className="w-9 h-9 rounded-xl bg-brand-violet/20 border border-brand-violet/40 flex items-center justify-center text-brand-lavender flex-shrink-0">
                  <Server size={18} />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-brand-pink font-semibold uppercase tracking-wider">
                    Core Backend
                  </p>
                  <p className="text-xs font-bold text-text-main">FastAPI & PostgreSQL</p>
                  <p className="font-mono text-[9px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    100% Operational
                  </p>
                </div>
              </div>

              {/* Floating Status Card 2: Bottom Right */}
              <div className="absolute -bottom-4 -right-4 sm:-bottom-5 sm:-right-6 z-20 bg-bg-card/95 border border-brand-pink/40 p-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 animate-float-slow max-w-[220px]">
                <div className="w-9 h-9 rounded-xl bg-brand-pink/20 border border-brand-pink/40 flex items-center justify-center text-brand-pink flex-shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-brand-violet font-semibold uppercase tracking-wider">
                    Applied AI Agent
                  </p>
                  <p className="text-xs font-bold text-text-main">pgvector RAG Intake</p>
                  <p className="font-mono text-[9px] text-text-muted flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={10} className="text-emerald-400" />
                    Autonomous Qualifying
                  </p>
                </div>
              </div>

              {/* Visual Frame */}
              <div className="relative rounded-3xl overflow-hidden p-1.5 bg-gradient-to-br from-brand-pink/40 via-brand-violet/30 to-brand-lavender/10 border border-border-accent shadow-2xl">
                <div className="relative rounded-[22px] overflow-hidden bg-bg-secondary min-h-[380px] sm:min-h-[440px] flex items-center justify-center">
                  {viewMode === 'portrait' ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                      {/* Ambient developer glow behind portrait */}
                      <div className="absolute inset-0 bg-gradient-to-b from-brand-violet/20 via-transparent to-brand-pink/15 pointer-events-none" />
                      <img
                        src="/assets/suji-portrait.jpg"
                        alt="Sujita Patel — Software Engineer & Applied AI"
                        className="w-full max-h-[420px] object-cover rounded-2xl shadow-lg border border-border"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/sujita.png';
                        }}
                      />
                      <div className="absolute bottom-6 left-6 right-6 p-3 rounded-xl bg-bg-card/90 border border-border/80 backdrop-blur-md flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-text-main">{personalInfo.fullName}</p>
                          <p className="font-mono text-[11px] text-brand-lavender">B.Tech CSE &#8226; Parul University</p>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink border border-brand-pink/40 font-semibold">
                          SUJI
                        </span>
                      </div>
                    </div>
                  ) : (
                    <WorkspaceScene />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
