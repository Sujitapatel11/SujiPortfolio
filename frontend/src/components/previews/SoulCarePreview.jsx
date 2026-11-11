import React, { useState } from 'react';
import { BookOpen, Sparkles, Heart, MessageSquare, Shield, Send } from 'lucide-react';

export default function SoulCarePreview({ isVisible }) {
  const [activeTab, setActiveTab] = useState('journal');
  const [mood, setMood] = useState('Deep Reflection');
  const [sampleText, setSampleText] = useState(
    'Architecture note: decoupled journaling ingestion from social feeds to ensure creator privacy by default...'
  );
  const [savedCount, setSavedCount] = useState(42);

  const moodTags = ['Deep Reflection', 'Creative Flow', 'Mindful Pause', 'Gratitude'];

  return (
    <div className="w-full h-[320px] bg-bg-card rounded-xl overflow-hidden border border-border flex flex-col font-sans select-none">
      {/* Simulation Banner Notice */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-brand-purple font-semibold">
          <Sparkles size={12} />
          ILLUSTRATIVE SIMULATION
        </span>
        <span className="text-[10px] text-text-muted">Journaling Core & Creator Feed</span>
      </div>

      {/* Internal Navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-card/60">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'journal'
                ? 'bg-brand-purple text-white'
                : 'text-text-secondary hover:text-text-main bg-bg-secondary'
            }`}
          >
            Private Journal Core
          </button>
          <button
            onClick={() => setActiveTab('creator')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'creator'
                ? 'bg-brand-purple text-white'
                : 'text-text-secondary hover:text-text-main bg-bg-secondary'
            }`}
          >
            Creator Circle Feed
          </button>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
          <Shield size={12} />
          <span>Encrypted Vault</span>
        </div>
      </div>

      {/* Main Simulation Body */}
      <div className="flex-1 p-3.5 overflow-y-auto no-scrollbar flex flex-col justify-between">
        {activeTab === 'journal' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-text-muted font-mono">Mood Vector:</span>
              {moodTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setMood(tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors font-mono ${
                    mood === tag
                      ? 'bg-brand-lavender/20 text-brand-purple border border-brand-purple/40 font-semibold'
                      : 'bg-bg-secondary text-text-secondary border border-border'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg bg-bg-secondary border border-border text-text-main focus:outline-none focus:border-brand-purple/50 resize-none font-mono"
                placeholder="Write an authentic thought..."
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-text-muted font-mono">
                Status: Verified creator draft
              </span>
              <button
                onClick={() => setSavedCount((c) => c + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium btn-primary"
              >
                <Send size={11} />
                Publish to Community ({savedCount})
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="p-2.5 rounded-lg bg-bg-secondary border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-main">@sujita · Founder Entry</span>
                <span className="text-[10px] font-mono text-text-muted">2h ago</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                "Writing daily helps untangle complex distributed system problems before writing code. SoulCare was born from this exact habit."
              </p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-text-muted font-mono">
                <span className="flex items-center gap-1 text-rose-500">
                  <Heart size={12} fill="currentColor" /> 128
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} /> 34 discussions
                </span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-bg-secondary/60 border border-border text-xs text-text-muted text-center font-mono text-[11px]">
              Creator monetization & subscriber tipping enabled
            </div>
          </div>
        )}
      </div>

      {/* Footer Simulation Tag */}
      <div className="px-3 py-1 bg-bg-secondary/60 border-t border-border text-[10px] font-mono text-text-muted flex justify-between">
        <span>Framework: Django · PostgreSQL · Redis · React</span>
        <span>Interactive mock preview</span>
      </div>
    </div>
  );
}

