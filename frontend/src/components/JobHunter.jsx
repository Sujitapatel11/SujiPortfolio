import React from 'react';
import { motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  Search,
  BrainCircuit,
  FileText,
  ListChecks,
  ShieldCheck,
  ArrowUpRight,
  LockKeyhole,
  Sparkles,
  Workflow,
} from 'lucide-react';

const capabilities = [
  {
    icon: Search,
    title: 'Opportunity discovery',
    description: 'Bring job listings into one workspace and keep source links attached for verification.',
    tone: 'pink',
  },
  {
    icon: BrainCircuit,
    title: 'AI relevance scoring',
    description: 'Rank opportunities against your skills and target roles, with clear reasons behind each match.',
    tone: 'violet',
  },
  {
    icon: FileText,
    title: 'Proposal drafts',
    description: 'Prepare tailored application drafts for review instead of sending generic copy.',
    tone: 'blue',
  },
  {
    icon: ListChecks,
    title: 'Application pipeline',
    description: 'Track opportunities from discovery and shortlist through approval and application status.',
    tone: 'green',
  },
];

const stages = [
  { label: 'Discover', detail: 'Collect relevant listings', icon: Search },
  { label: 'Analyze', detail: 'Score fit and skill gaps', icon: BrainCircuit },
  { label: 'Review', detail: 'Shortlist and edit drafts', icon: FileText },
  { label: 'Approve', detail: 'You decide what proceeds', icon: ShieldCheck },
];

export default function JobHunter() {
  return (
    <section id="job-hunter" className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-violet/10 blur-3xl" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-12"
        >
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="section-label">/ Personal automation project</span>
            <span className="rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-1 font-mono text-[10px] text-brand-lavender">PRIVATE WORKSPACE</span>
          </div>
          <h2 className="mb-4 text-[clamp(1.9rem,4.2vw,3.3rem)] font-extrabold leading-tight tracking-tight text-text-main">
            Meet <span className="text-gradient">Job Hunter.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            A personal AI-assisted job search workspace designed to discover relevant opportunities,
            evaluate role fit, prepare application drafts, and keep the process organized — with final
            decisions and submissions always under human control.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mb-7 overflow-hidden rounded-3xl border border-border bg-bg-card/90 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-secondary/70 px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-pink to-brand-violet text-white shadow-lg">
                <BriefcaseBusiness size={19} />
              </div>
              <div>
                <p className="text-sm font-bold text-text-main">Job Hunter Workspace</p>
                <p className="font-mono text-[10px] text-text-muted">DISCOVERY → MATCHING → REVIEW</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-mono text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              HUMAN APPROVAL REQUIRED
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-text-main">
                <Workflow size={15} className="text-brand-pink" />
                How the workflow operates
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.label} className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-bg-secondary/55 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-lavender">
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-brand-pink">0{index + 1}</span>
                          <p className="text-sm font-bold text-text-main">{stage.label}</p>
                        </div>
                        <p className="text-xs leading-relaxed text-text-secondary">{stage.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-violet/20 bg-brand-violet/5 p-3 text-xs leading-relaxed text-text-secondary">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-lavender" />
                No automatic applications. The workspace prepares and organizes; the user reviews and approves every next step.
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg-secondary/55 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-text-main">Workspace access</p>
                  <p className="mt-1 text-[11px] text-text-muted">Private job records and agent controls</p>
                </div>
                <LockKeyhole size={19} className="text-brand-violet" />
              </div>
              <div className="mb-5 space-y-3">
                {[
                  'Search controls and saved keywords',
                  'Job match scores and shortlist',
                  'Editable proposal drafts',
                  'Application status tracking',
                  'Agent activity and provider status',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <ShieldCheck size={12} />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
              <a
                href="/admin/login"
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                Open private workspace <ArrowUpRight size={15} />
              </a>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-text-muted">
                Admin sign-in required. Public visitors cannot view private job or application data.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="glow-card rounded-2xl p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink/15 to-brand-violet/15 text-brand-lavender">
                  <Icon size={19} />
                </div>
                <h3 className="mb-2 text-sm font-bold text-text-main">{item.title}</h3>
                <p className="text-xs leading-relaxed text-text-secondary">{item.description}</p>
              </motion.article>
            );
          })}
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] text-text-muted">
          <Sparkles size={12} className="text-brand-pink" />
          Platform availability depends on verified data providers and configured integrations.
        </p>
      </div>
    </section>
  );
}
