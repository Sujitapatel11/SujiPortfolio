import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, FolderGit2, Sparkles, CheckCircle2 } from 'lucide-react';
import { experience } from '../data/portfolio';

const typeIcons = {
  education: GraduationCap,
  project: FolderGit2,
  concept: Sparkles,
};

export default function Experience() {
  return (
    <section id="experience" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-12 sm:mb-14"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="section-label">/ Timeline & Projects</span>
            <span className="h-px w-12 bg-border-accent inline-block" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-main">
            Engineering Journey & <span className="text-gradient">Key Milestones</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative pl-8 sm:pl-10">
          {/* Vertical line with gradient glow */}
          <div className="absolute left-3 sm:left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-pink via-brand-violet to-brand-lavender/20" />

          <div className="space-y-6">
            {experience.map((item, i) => {
              const Icon = typeIcons[item.type] || FolderGit2;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="relative"
                >
                  {/* Dot */}
                  <div className="absolute -left-8 sm:-left-10 top-4 w-5 h-5 rounded-full flex items-center justify-center bg-bg-card border border-brand-violet shadow-sm">
                    {item.current && (
                      <span className="absolute inset-0 rounded-full animate-ping opacity-60 bg-emerald-400" />
                    )}
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.current ? 'bg-emerald-400' : 'bg-brand-pink'
                      }`}
                    />
                  </div>

                  <div className="rounded-2xl p-5 sm:p-6 bg-bg-card/85 border border-border hover:border-brand-violet/40 transition-all duration-200 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-brand-pink" />
                        <h3 className="text-base font-bold text-text-main">{item.title}</h3>
                      </div>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-bg-secondary text-brand-lavender border border-border">
                        {item.period}
                      </span>
                    </div>

                    <p className="font-mono text-xs text-text-muted mb-2">{item.org}</p>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
