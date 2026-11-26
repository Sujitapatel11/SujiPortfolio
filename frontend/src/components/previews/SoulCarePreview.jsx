import React, { useState } from 'react';
import { Bell, Compass, Heart, MessageCircle, Play, Radio, Sparkles, Users, Video, Waves } from 'lucide-react';

const modules = [
  {
    id: 'community',
    label: 'Community',
    icon: Users,
    eyebrow: 'COMMUNITY FEED',
    title: 'Shared spaces for people and ideas',
    description: 'Community posts, creator discovery, peer connections, reactions, and moderation foundations.',
    tags: ['Posts', 'Peer connections', 'Discovery'],
  },
  {
    id: 'creators',
    label: 'Creator Studio',
    icon: Sparkles,
    eyebrow: 'CREATOR WORKSPACE',
    title: 'Create, publish, and build an audience',
    description: 'Creator identity, publishing workflows, profiles, and creator-facing management surfaces.',
    tags: ['Creator profiles', 'Publishing', 'Analytics foundation'],
  },
  {
    id: 'soultube',
    label: 'SoulTube',
    icon: Play,
    eyebrow: 'WATCH TOGETHER',
    title: 'Synchronized rooms with shared playback',
    description: 'Room-based watch experiences with shared playback state, participant presence, and room chat.',
    tags: ['Watch rooms', 'Playback sync', 'Room chat'],
  },
  {
    id: 'live',
    label: 'Creator Live',
    icon: Radio,
    eyebrow: 'LIVE EXPERIENCES',
    title: 'A foundation for creator-led live sessions',
    description: 'Live-session backend and provider integration exist; production configuration and the full web experience still need validation.',
    tags: ['LiveKit integration', 'Host & participant flows', 'Validation pending'],
  },
];

export default function SoulCarePreview() {
  const [active, setActive] = useState('community');
  const selected = modules.find((module) => module.id === active) || modules[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="flex min-h-[320px] w-full flex-col bg-bg-card font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-bg-secondary/70 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-main">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-purple/20 bg-brand-purple/10 text-brand-purple">
            <Waves size={14} />
          </span>
          SoulCare · Social & creator ecosystem
        </div>
        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-500">In development</span>
      </div>

      <div className="grid flex-1 grid-cols-1 sm:grid-cols-[148px_minmax(0,1fr)]">
        <nav aria-label="SoulCare product modules" className="flex gap-1 overflow-x-auto border-b border-border bg-bg-secondary/35 p-2 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
          {modules.map((module) => {
            const Icon = module.icon;
            const selectedTab = module.id === active;
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => setActive(module.id)}
                aria-pressed={selectedTab}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition sm:w-full ${selectedTab ? 'border border-brand-purple/25 bg-brand-purple/10 text-brand-purple' : 'text-text-secondary hover:bg-bg-card hover:text-text-main'}`}
              >
                <Icon size={13} />
                {module.label}
              </button>
            );
          })}
          <div className="mt-auto hidden border-t border-border px-2 pt-3 text-[10px] leading-relaxed text-text-muted sm:block">
            Journal and Insights are retired in the audited main branch and are not shown as active product modules.
          </div>
        </nav>

        <div className="flex min-w-0 flex-col justify-between gap-5 p-4 sm:p-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-mono text-[9px] font-semibold tracking-[0.16em] text-brand-purple">{selected.eyebrow}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-text-muted"><Bell size={11} /> Product module</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-secondary text-brand-purple">
                <SelectedIcon size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold leading-snug text-text-main sm:text-base">{selected.title}</h4>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-text-secondary">{selected.description}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selected.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-bg-secondary px-2.5 py-1 text-[10px] text-text-secondary">{tag}</span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-[10px] text-text-muted">
              <span className="inline-flex items-center gap-1.5"><Compass size={11} /> Product direction overview</span>
              <span className="inline-flex items-center gap-1.5"><Heart size={11} /> Community-first</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg-secondary/50 px-3.5 py-2 text-[9px] text-text-muted">
        <span>React · Django REST Framework · PostgreSQL · Redis · Channels</span>
        <span className="inline-flex items-center gap-1"><MessageCircle size={10} /> Illustrative preview</span>
      </div>
    </div>
  );
}
