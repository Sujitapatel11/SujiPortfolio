import React from 'react';
import { motion } from 'framer-motion';

/**
 * Shared section heading for a consistent editorial grid across the portfolio.
 * The accent phrase uses the same restrained theme token as the rest of the UI.
 */
export default function SectionHeading({ eyebrow, title, accent, description, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.42, ease: 'easeOut' }}
      className="mb-8 max-w-3xl text-left sm:mb-10"
    >
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon size={15} className="shrink-0 text-brand-purple" aria-hidden="true" />}
        <span className="section-label">{eyebrow}</span>
        <span className="h-px w-12 bg-border-accent" aria-hidden="true" />
      </div>
      <h2 className="text-[clamp(1.9rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-text-main">
        {title} {accent && <span className="text-gradient">{accent}</span>}
      </h2>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
          {description}
        </p>
      )}
    </motion.div>
  );
}
