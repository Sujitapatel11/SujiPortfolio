import React, { useState } from 'react';
import { Users, GraduationCap, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export default function UrmiNexusPreview({ isVisible }) {
  const [selectedStudent, setSelectedStudent] = useState(0);

  const studentCases = [
    {
      id: '#INQ-1042',
      name: 'Rohan Sharma',
      target: 'M.Sc. Data Science',
      dest: 'Germany · Winter 2026',
      counsellor: 'Dr. Anita Desai',
      status: 'Counsellor Matched',
      docs: '4 / 5 Complete',
      recs: ['TU Munich', 'RWTH Aachen', 'Heidelberg Univ.'],
    },
    {
      id: '#INQ-1043',
      name: 'Priya Patel',
      target: 'B.Sc. Software Systems',
      dest: 'UK · Fall 2026',
      counsellor: 'Marcus Vance',
      status: 'Application Drafted',
      docs: '5 / 5 Complete',
      recs: ['Univ. of Manchester', 'Univ. of Edinburgh', 'King’s College'],
    },
  ];

  const current = studentCases[selectedStudent];

  return (
    <div className="w-full h-[320px] bg-bg-card rounded-xl overflow-hidden border border-border flex flex-col font-sans select-none">
      {/* Simulation Banner Notice */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-brand-purple font-semibold">
          <Sparkles size={12} />
          ILLUSTRATIVE SIMULATION
        </span>
        <span className="text-[10px] text-text-muted">Inquiry Lifecycle & Matching Engine</span>
      </div>

      {/* Case Switcher */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-card/60">
        <span className="text-[11px] font-mono text-text-muted">Inquiry Stream:</span>
        <div className="flex gap-1.5">
          {studentCases.map((st, i) => (
            <button
              key={st.id}
              onClick={() => setSelectedStudent(i)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                selectedStudent === i
                  ? 'bg-brand-purple text-white'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-main border border-border'
              }`}
            >
              {st.id} ({st.name.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Main Simulation View */}
      <div className="flex-1 p-3.5 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Card Top Details */}
          <div className="p-2.5 rounded-lg bg-bg-secondary border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-text-main">{current.name}</p>
                <p className="text-[11px] text-text-secondary font-mono">{current.target} · {current.dest}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={11} />
                {current.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60 text-[11px] font-mono">
              <div>
                <span className="text-text-muted">Advisor: </span>
                <span className="text-text-main font-semibold">{current.counsellor}</span>
              </div>
              <div>
                <span className="text-text-muted">Dossier: </span>
                <span className="text-text-main font-semibold">{current.docs}</span>
              </div>
            </div>
          </div>

          {/* Recommendations Block */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1">
              <GraduationCap size={12} className="text-brand-purple" />
              Automated Program Recommendations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {current.recs.map((rec) => (
                <span
                  key={rec}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-secondary border border-border text-brand-purple"
                >
                  {rec}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted bg-bg-secondary/40 px-2.5 py-1 rounded border border-border">
          <span>Matching Engine: Weighted criteria</span>
          <span className="text-brand-purple">Database: PostgreSQL</span>
        </div>
      </div>

      {/* Footer Simulation Tag */}
      <div className="px-3 py-1 bg-bg-secondary/60 border-t border-border text-[10px] font-mono text-text-muted flex justify-between">
        <span>Stack: FastAPI · React · PostgreSQL · Matching System</span>
        <span>Illustrative intake simulation</span>
      </div>
    </div>
  );
}

