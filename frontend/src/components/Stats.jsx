import React from 'react';
import { motion } from 'framer-motion';
import { FolderGit2, Cpu, GraduationCap, CheckCircle2 } from 'lucide-react';
import { stats } from '../data/portfolio';

const iconMap = {
  projects: FolderGit2,
  tech: Cpu,
  education: GraduationCap,
  status: CheckCircle2,
};

export default function Stats() {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 -mt-6 z-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-5xl mx-auto rounded-2xl p-5 sm:p-7 glow-card"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-8">
          {stats.map((stat, i) => {
            const Icon = iconMap[stat.icon] || CheckCircle2;
            return (
              <React.Fragment key={stat.label}>
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-bg-secondary border border-border"
                  >
                    <Icon
                      size={18}
                      className="text-brand-purple"
                    />
                  </div>
                  <div>
                    <div
                      className={`text-xl sm:text-2xl font-bold tracking-tight ${
                        'text-text-main'
                      }`}
                    >
                      {stat.value}
                    </div>
                    <div className="font-mono text-[11px] text-text-secondary uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                </div>
                {/* Separator */}
                {i < stats.length - 1 && (
                  <div className="hidden lg:block w-px h-10 bg-border self-center" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
