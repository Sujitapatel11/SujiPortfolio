import React, { useState } from 'react';
import { ArrowRight, BookOpen, Building2, CheckCircle2, ClipboardList, FileCheck2, GraduationCap, Users } from 'lucide-react';

const stages = [
  { id: 'intake', label: 'Lead intake', detail: 'Questionnaire and inquiry capture', icon: ClipboardList },
  { id: 'counselling', label: 'Counselling', detail: 'Staff assignment, notes and follow-ups', icon: Users },
  { id: 'enrolment', label: 'Student enrolment', detail: 'Student profile and process tracking', icon: GraduationCap },
  { id: 'applications', label: 'Applications', detail: 'University, offer and timeline workflows', icon: BookOpen },
  { id: 'documents', label: 'Documents', detail: 'Collection, checklists and review', icon: FileCheck2 },
];

export default function UrmiNexusPreview() {
  const [active, setActive] = useState('intake');
  const current = stages.find((stage) => stage.id === active) || stages[0];
  const CurrentIcon = current.icon;

  return (
    <div className="flex min-h-[320px] w-full flex-col bg-bg-card font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-bg-secondary/70 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-main">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-purple/20 bg-brand-purple/10 text-brand-purple"><Building2 size={14} /></span>
          UrmiNexus · Study-abroad SaaS
        </div>
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">AIEC initial tenant</span>
      </div>

      <div className="grid flex-1 grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-semibold tracking-[0.16em] text-brand-purple">STUDENT JOURNEY</p>
              <h4 className="mt-1 text-sm font-bold text-text-main">From inquiry to application</h4>
            </div>
            <span className="rounded-lg border border-border bg-bg-secondary px-2 py-1 text-[9px] text-text-muted">Illustrative</span>
          </div>
          <div className="space-y-1.5">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const selected = stage.id === active;
              return (
                <React.Fragment key={stage.id}>
                  <button
                    type="button"
                    onClick={() => setActive(stage.id)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${selected ? 'border-brand-purple/35 bg-brand-purple/10' : 'border-transparent bg-bg-secondary/55 hover:border-border hover:bg-bg-secondary'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${selected ? 'border-brand-purple/25 bg-brand-purple/10 text-brand-purple' : 'border-border bg-bg-card text-text-muted'}`}><Icon size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-text-main">{stage.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-text-muted">{stage.detail}</span>
                    </span>
                    {selected && <CheckCircle2 size={14} className="shrink-0 text-brand-purple" />}
                  </button>
                  {index < stages.length - 1 && <div className="ml-[27px] h-1.5 w-px bg-border" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-5 p-4 sm:p-5">
          <div>
            <p className="font-mono text-[9px] font-semibold tracking-[0.16em] text-brand-purple">WORKFLOW DETAIL</p>
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-secondary text-brand-purple"><CurrentIcon size={18} /></div>
            <h4 className="mt-3 text-sm font-bold text-text-main">{current.label}</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{current.detail}. This module belongs to the shared UrmiNexus platform and follows the consultancy tenant's workspace and permissions.</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary/65 p-3">
            <p className="text-[10px] font-semibold text-text-main">Tenant model</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-text-secondary">
              <Building2 size={13} className="text-brand-purple" />
              <span>UrmiNexus platform</span>
            </div>
            <div className="my-2 ml-1.5 h-3 w-px bg-border" />
            <div className="flex items-center gap-2 text-[10px] text-text-secondary">
              <Users size={13} className="text-brand-purple" />
              <span>AIEC · Birgunj, Nepal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg-secondary/50 px-3.5 py-2 text-[9px] text-text-muted">
        <span>React · Django REST Framework · PostgreSQL</span>
        <span className="inline-flex items-center gap-1">Multi-tenant architecture <ArrowRight size={10} /></span>
      </div>
    </div>
  );
}
