import React, { useState } from 'react';
import { FileText, Cpu, AlertTriangle, Layers, ArrowRight } from 'lucide-react';

export default function ResumeRoastPreview({ isVisible }) {
  const [selectedRole, setSelectedRole] = useState('Backend Engineer');
  const [pipelineStep, setPipelineStep] = useState(2);

  const roles = ['Backend Engineer', 'Full-Stack Developer', 'Applied AI Engineer'];

  const pipelineStages = [
    { num: '01', name: 'PDF Parser', detail: 'Text extraction & tokenization (Planned)' },
    { num: '02', name: 'LLM Evaluator', detail: 'Critique & roasting engine (In dev)' },
    { num: '03', name: 'Action Matrix', detail: 'Bullet rewrite suggestions (Planned)' },
  ];

  return (
    <div className="w-full h-[320px] bg-bg-card rounded-xl overflow-hidden border border-border flex flex-col font-sans select-none">
      {/* Simulation Banner Notice */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
          <AlertTriangle size={12} />
          CONCEPT SIMULATION · IN ACTIVE DEVELOPMENT
        </span>
        <span className="text-[10px] text-text-muted">Planned Architecture</span>
      </div>

      {/* Target Role Selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-card/60">
        <span className="text-[11px] font-mono text-text-muted">Target Profile:</span>
        <div className="flex gap-1.5">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                selectedRole === r
                  ? 'bg-brand-purple text-white'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-main border border-border'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Architecture Flow */}
      <div className="flex-1 p-3.5 flex flex-col justify-between">
        <div className="space-y-2.5">
          <div className="text-xs font-mono text-text-muted flex items-center gap-1.5">
            <Layers size={13} className="text-brand-purple" />
            <span>PLANNED INGESTION PIPELINE:</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {pipelineStages.map((stage, idx) => {
              const isActive = pipelineStep === idx + 1;
              return (
                <button
                  key={stage.num}
                  onClick={() => setPipelineStep(idx + 1)}
                  className={`p-2 rounded-lg text-left transition-all border ${
                    isActive
                      ? 'bg-brand-lavender/10 border-brand-purple/40 text-text-main'
                      : 'bg-bg-secondary border-border text-text-secondary hover:border-brand-purple/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-brand-purple font-bold">/{stage.num}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-purple" />}
                  </div>
                  <p className="text-xs font-semibold">{stage.name}</p>
                  <p className="text-[10px] text-text-muted leading-tight mt-0.5">{stage.detail}</p>
                </button>
              );
            })}
          </div>

          {/* Sample Architecture Preview */}
          <div className="p-2.5 rounded-lg bg-bg-secondary border border-border space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary flex items-center gap-1">
                <FileText size={12} className="text-brand-purple" />
                sample_resume.pdf → {selectedRole}
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                PLANNED AUDIT SPEC
              </span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {pipelineStep === 1 &&
                '→ Design spec: OCR/text layer extraction into structured JSON schema with skill entity extraction.'}
              {pipelineStep === 2 &&
                '→ Design spec: Dual LLM prompt passes: first for technical substance check, second for roast humor and punchy feedback.'}
              {pipelineStep === 3 &&
                '→ Design spec: Generates 3 rewrite variants per bullet point emphasizing measurable metrics and active verbs.'}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-text-muted font-mono bg-bg-secondary/40 px-2.5 py-1 rounded border border-border">
          Status: Backend and prompt pipeline currently in engineering stage.
        </div>
      </div>

      {/* Footer Simulation Tag */}
      <div className="px-3 py-1 bg-bg-secondary/60 border-t border-border text-[10px] font-mono text-text-muted flex justify-between">
        <span>Stack: Python · FastAPI · React · LLM Pipeline</span>
        <span>Illustrative concept mockup</span>
      </div>
    </div>
  );
}

