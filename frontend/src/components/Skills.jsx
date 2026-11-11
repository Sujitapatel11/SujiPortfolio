import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Layers3, Sparkles, Terminal } from 'lucide-react';
import { skillCategories, skillsList } from '../data/skillsData';

const VISIBLE_OFFSETS = [0, -1, 1, -2, 2];

export default function Skills() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const filteredSkills = useMemo(
    () => activeCategory === 'all'
      ? skillsList
      : skillsList.filter((skill) => skill.category === activeCategory),
    [activeCategory]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [activeCategory]);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 640);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const move = (direction) => {
    setActiveIndex((current) => (current + direction + filteredSkills.length) % filteredSkills.length);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredSkills.length]);

  const visibleCards = VISIBLE_OFFSETS.map((offset) => {
    const index = (activeIndex + offset + filteredSkills.length) % filteredSkills.length;
    return { skill: filteredSkills[index], index, offset };
  }).filter((item, position, items) =>
    item.skill && items.findIndex((candidate) => candidate.index === item.index) === position
  );

  const activeSkill = filteredSkills[activeIndex];
  const ActiveIcon = activeSkill?.icon;

  return (
    <section id="skills" className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(168,85,247,0.13),transparent_58%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-10 text-center sm:mb-14"
        >
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="section-label">/ Tools & Technologies</span>
            <Sparkles size={14} className="text-brand-pink" />
          </div>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-text-main sm:text-5xl">
            Technologies I <span className="text-gradient">Work With</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Explore the languages, frameworks, and tools I use while building projects and growing as an engineer.
          </p>
        </motion.div>

        <div className="mb-8 flex justify-center">
          <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto px-1 pb-2">
            {skillCategories.map((category) => {
              const selected = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  aria-pressed={selected}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
                    selected
                      ? 'border-brand-pink/60 bg-brand-pink/15 text-text-main shadow-[0_0_18px_rgba(255,46,147,0.16)]'
                      : 'border-border bg-bg-card/70 text-text-secondary hover:border-brand-violet/60 hover:text-text-main'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[min(78vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet/10 blur-3xl" />

          <div className="relative flex h-[400px] items-center justify-center overflow-hidden sm:h-[460px] [perspective:1200px]">
            <motion.div
              className="relative h-full w-full touch-pan-y"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              onDragEnd={(_, info) => {
                if (info.offset.x < -45) move(1);
                if (info.offset.x > 45) move(-1);
              }}
              role="group"
              aria-label="Interactive technology carousel. Drag or swipe to browse."
            >
              {visibleCards.map(({ skill, index, offset }) => {
                const Icon = skill.icon;
                const isActive = offset === 0;
                return (
                  <motion.article
                    key={skill.name}
                    initial={false}
                    animate={{
                      x: offset * (isMobile ? 155 : 215),
                      scale: isActive ? 1 : Math.abs(offset) === 1 ? 0.88 : 0.76,
                      rotateY: offset * -13,
                      opacity: isActive ? 1 : Math.abs(offset) === 1 ? 0.76 : 0.36,
                      zIndex: 10 - Math.abs(offset),
                    }}
                    transition={{ type: 'spring', stiffness: 230, damping: 25, mass: 0.8 }}
                    className={`absolute left-1/2 top-1/2 flex h-[310px] w-[220px] flex-col items-center rounded-3xl border p-5 text-center backdrop-blur-xl sm:h-[350px] sm:w-[260px] sm:p-6 ${
                      isActive
                        ? 'border-brand-pink/70 bg-bg-card shadow-[0_0_35px_rgba(168,85,247,0.28),0_0_12px_rgba(255,46,147,0.2)]'
                        : 'border-border bg-bg-card/85 shadow-xl'
                    }`}
                    style={{ transformStyle: 'preserve-3d', translate: '-50% -50%' }}
                    onClick={() => {
                      if (!isActive) setActiveIndex(index);
                    }}
                    aria-label={`${skill.name}, ${skill.categoryLabel}`}
                  >
                    <div className="mb-5 flex w-full items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
                        {String(index + 1).padStart(2, '0')} / {String(filteredSkills.length).padStart(2, '0')}
                      </span>
                      {isActive && (
                        <span className="rounded-full border border-brand-violet/50 bg-brand-violet/15 px-2.5 py-1 text-[10px] font-semibold text-brand-lavender">
                          Featured
                        </span>
                      )}
                    </div>

                    <div
                      className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-bg-secondary/90 sm:h-24 sm:w-24"
                      style={{ boxShadow: isActive ? `0 0 28px ${skill.brandColor}35` : 'none' }}
                    >
                      <Icon size={isActive ? 52 : 44} style={{ color: skill.brandColor }} aria-hidden="true" />
                    </div>

                    <h3 className="mb-2 text-xl font-bold tracking-tight text-text-main sm:text-2xl">
                      {skill.name}
                    </h3>
                    <span className="mb-4 rounded-full border border-border bg-bg-secondary px-3 py-1 font-mono text-[10px] text-brand-lavender">
                      {skill.tag}
                    </span>
                    <p className="mt-auto line-clamp-3 text-xs leading-relaxed text-text-secondary sm:text-sm">
                      {skill.tooltip}
                    </p>
                    {isActive && (
                      <div className="mt-4 h-1 w-16 overflow-hidden rounded-full bg-bg-tertiary">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-brand-pink to-brand-violet" />
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </motion.div>
          </div>

          <div className="relative z-40 mt-5 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous technology"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-violet/50 bg-bg-card text-text-main transition hover:border-brand-pink hover:text-brand-pink hover:shadow-[0_0_18px_rgba(255,46,147,0.22)]"
            >
              <ArrowLeft size={19} />
            </button>
            <div className="min-w-[92px] text-center">
              <p className="font-mono text-xs tabular-nums text-text-secondary">
                {String(activeIndex + 1).padStart(2, '0')} <span className="text-text-muted">/</span> {String(filteredSkills.length).padStart(2, '0')}
              </p>
              <p className="mt-1 text-[10px] text-text-muted">Drag or swipe</p>
            </div>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next technology"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-violet/50 bg-bg-card text-text-main transition hover:border-brand-pink hover:text-brand-pink hover:shadow-[0_0_18px_rgba(255,46,147,0.22)]"
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card/65 px-5 py-4 text-xs text-text-secondary backdrop-blur-md sm:flex-row">
          <div className="flex items-center gap-2 text-text-main">
            <Layers3 size={16} className="text-brand-pink" />
            <span className="font-semibold">{skillsList.length} technologies across {skillCategories.length - 1} categories</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-brand-lavender">
            <Terminal size={13} />
            <span>{activeSkill?.categoryLabel ?? 'Technology stack'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
