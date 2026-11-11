import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal, Code2, Layers, CheckCircle2 } from 'lucide-react';
import { skillCategories, skillsList } from '../data/skillsData';

export default function Skills() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredSkills =
    activeCategory === 'all'
      ? skillsList
      : skillsList.filter((s) => s.category === activeCategory);

  return (
    <section id="skills" className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center mb-12 sm:mb-16"
        >
          <div className="flex items-center justify-center gap-2 mb-2.5">
            <span className="section-label">/ Tools & Technologies</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-main mb-3">
            Tools I Work With & <span className="text-gradient">What I’m Building</span>
          </h2>
          <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
            A practical snapshot of the languages, frameworks, and tools I’ve used while building projects and strengthening my engineering skills.
          </p>
        </motion.div>

        {/* Category Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-4xl mx-auto"
        >
          {skillCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-pink to-brand-violet text-white font-semibold shadow-lg shadow-brand-pink/25 scale-105'
                    : 'bg-bg-card/90 text-text-secondary border border-border hover:border-brand-violet/50 hover:text-text-main'
                }`}
                aria-pressed={isActive}
              >
                {cat.name}
              </button>
            );
          })}
        </motion.div>

        {/* Responsive Skill Cards Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4"
        >
          <AnimatePresence>
            {filteredSkills.map((tech) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  layout
                  key={tech.name}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.25 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative rounded-2xl p-4 sm:p-5 bg-bg-card/85 border border-border hover:border-border-accent shadow-md backdrop-blur-xl flex flex-col items-center text-center justify-between transition-all duration-200 overflow-hidden"
                  title={`${tech.name} — ${tech.tooltip}`}
                >
                  {/* Subtle brand glow on card hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{
                      background: `radial-gradient(circle at center, ${tech.brandColor}, transparent 70%)`,
                    }}
                  />

                  {/* Official SVG Logo */}
                  <div className="relative mb-3 flex items-center justify-center">
                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center bg-bg-secondary/90 border border-border group-hover:scale-110 group-hover:border-border-accent transition-all duration-200 shadow-sm"
                      style={{
                        boxShadow: `0 4px 14px rgba(0,0,0,0.3)`,
                      }}
                    >
                      <Icon
                        size={28}
                        style={{ color: tech.brandColor }}
                        className="transition-transform duration-200 group-hover:drop-shadow-[0_0_8px_rgba(255,46,147,0.4)]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Technology Name & Details */}
                  <div className="w-full">
                    <h3 className="text-xs sm:text-sm font-bold text-text-main group-hover:text-white transition-colors truncate">
                      {tech.name}
                    </h3>
                    <span
                      className="inline-block mt-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-bg-secondary border border-border/80 text-brand-lavender truncate max-w-full"
                    >
                      {tech.tag}
                    </span>
                  </div>

                  {/* Tooltip text for extra architectural context */}
                  <p className="sr-only">{tech.tooltip}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Bottom Metrics Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-12 rounded-2xl p-4 sm:p-5 bg-bg-card/70 border border-border flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-text-secondary max-w-4xl mx-auto backdrop-blur-md"
        >
          <div className="flex items-center gap-2 text-text-main">
            <Terminal size={14} className="text-brand-pink" />
            <span className="font-semibold">{skillsList.length} Technologies & Tools</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={12} />
              Technology overview
            </span>
            <span>&#8226;</span>
            <span className="text-brand-violet font-semibold">Learning in progress</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
