import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  Linkedin,
  Mail,
  Download,
  Send,
  CheckCircle2,
  ArrowUpRight,
  Terminal,
  Phone,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { personalInfo } from '../data/portfolio';
import { submitInquiry } from '../api/inquiries';

const contactCards = [
  {
    label: 'WhatsApp',
    value: personalInfo.phoneDisplay,
    icon: MessageSquare,
    href: personalInfo.whatsapp,
    isExternal: true,
    accentClass: 'text-emerald-400',
    tag: 'Instant Chat',
  },
  {
    label: 'Direct Call',
    value: personalInfo.phoneDisplay,
    icon: Phone,
    href: personalInfo.phoneCall,
    isExternal: false,
    accentClass: 'text-brand-pink',
    tag: 'Telephone',
  },
  {
    label: 'Email',
    value: personalInfo.email,
    icon: Mail,
    href: `mailto:${personalInfo.email}`,
    isExternal: false,
    accentClass: 'text-brand-violet',
    tag: '24h Response',
  },
  {
    label: 'GitHub',
    value: personalInfo.githubUser,
    icon: Github,
    href: personalInfo.github,
    isExternal: true,
    accentClass: 'text-text-main',
    tag: 'Source Code',
  },
  {
    label: 'LinkedIn',
    value: 'Sujita Patel',
    icon: Linkedin,
    href: personalInfo.linkedin,
    isExternal: true,
    accentClass: 'text-blue-400',
    tag: 'Connect',
  },
  {
    label: 'Resume',
    value: 'Download PDF',
    icon: Download,
    href: personalInfo.resume,
    isExternal: false,
    download: true,
    accentClass: 'text-amber-400',
    tag: 'Curriculum Vitae',
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    project_type: 'Full-Stack Web App',
    budget: '$5,000 - $10,000',
    message: '',
  });
  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setStatus({ loading: false, success: false, error: 'Please enter your name and email.' });
      return;
    }

    setStatus({ loading: true, success: false, error: null });
    try {
      await submitInquiry({
        name: formData.name.trim(),
        email: formData.email.trim(),
        project_type: formData.project_type,
        budget: formData.budget,
        message: formData.message.trim() || 'General inquiry submitted via portfolio form.',
        source: 'form',
      });
      setStatus({ loading: false, success: true, error: null });
      setFormData({
        name: '',
        email: '',
        project_type: 'Full-Stack Web App',
        budget: '$5,000 - $10,000',
        message: '',
      });
    } catch (err) {
      setStatus({
        loading: false,
        success: false,
        error:
          err.message ||
          'Backend is currently offline or unreachable. Please reach out directly on WhatsApp or Email.',
      });
    }
  };

  return (
    <section id="contact" className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center mb-12 sm:mb-14"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="section-label">/ Contact & Intake</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-main mb-3">
            Let's Engineer Something <span className="text-gradient">Impactful.</span>
          </h2>
          <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto">
            Available for software engineering roles, high-throughput backend development, distributed systems, and applied AI applications.
          </p>
        </motion.div>

        {/* Action / Contact Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
          {contactCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.a
                key={card.label}
                href={card.href}
                target={card.isExternal ? '_blank' : undefined}
                rel={card.isExternal ? 'noopener noreferrer' : undefined}
                download={card.download || undefined}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="rounded-2xl p-3.5 flex flex-col items-center text-center gap-2 bg-bg-card border border-border hover:border-brand-pink/50 transition-all duration-200 group hover:-translate-y-1 shadow-md"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-bg-secondary border border-border group-hover:scale-110 transition-transform">
                  <Icon size={18} className={card.accentClass} />
                </div>
                <div className="w-full">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted block">
                    {card.tag}
                  </span>
                  <p className="text-xs font-bold text-text-main mt-0.5">{card.label}</p>
                  <p className="font-mono text-[10px] text-text-secondary mt-0.5 truncate flex items-center justify-center gap-0.5">
                    <span>{card.value}</span>
                    <ArrowUpRight size={10} className="opacity-50" />
                  </p>
                </div>
              </motion.a>
            );
          })}
        </div>

        {/* Direct Inquiries API Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl p-6 sm:p-10 max-w-2xl mx-auto bg-bg-card/90 border border-border-accent shadow-2xl backdrop-blur-xl relative overflow-hidden"
        >
          {/* Ambient card accent */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-brand-pink/15 via-brand-violet/10 to-transparent pointer-events-none rounded-full blur-2xl" />

          {status.success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-xl font-bold text-text-main">Message received</h3>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                Thank you for reaching out! Your message was submitted successfully. Thank you for sharing the details.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => setStatus({ loading: false, success: false, error: null })}
                  className="btn-ghost text-xs px-4 py-2"
                >
                  Send Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-brand-pink" />
                  <span className="font-mono text-xs font-bold text-text-main">
                    INQUIRY_DISPATCHER.fastapi
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ENDPOINT: /api/inquiries
                </span>
              </div>

              {status.error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{status.error}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <a
                        href={personalInfo.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-emerald-400 font-mono text-[11px]"
                      >
                        Message on WhatsApp &#10140;
                      </a>
                      <a
                        href={`mailto:${personalInfo.email}`}
                        className="underline text-brand-lavender font-mono text-[11px]"
                      >
                        Email Sujita &#10140;
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border text-xs sm:text-sm text-text-main placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="alex@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border text-xs sm:text-sm text-text-main placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">
                    Project Type
                  </label>
                  <select
                    value={formData.project_type}
                    onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border text-xs sm:text-sm text-text-main focus:border-brand-pink focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="Full-Stack Web App">Full-Stack Web Application</option>
                    <option value="Backend & High-Throughput API">Backend & High-Throughput API</option>
                    <option value="Applied AI / RAG Pipeline">Applied AI / RAG Pipeline</option>
                    <option value="Consulting / Architectural Audit">Consulting / Architectural Audit</option>
                    <option value="Engineering Role / Full-Time">Full-Time Engineering Opportunity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">
                    Budget / Scope Tier
                  </label>
                  <select
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border text-xs sm:text-sm text-text-main focus:border-brand-pink focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="< $2,000">&lt; $2,000 (Sprint / Prototype)</option>
                    <option value="$2,000 - $5,000">$2,000 - $5,000 (Core MVP)</option>
                    <option value="$5,000 - $10,000">$5,000 - $10,000 (Production System)</option>
                    <option value="$10,000+">$10,000+ (Full Platform Build)</option>
                    <option value="Competitive Salary">Competitive Salary (Full-Time)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">
                  Project Description or Role Overview
                </label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell me about your architectural goals, timeline, and key requirements..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border text-xs sm:text-sm text-text-main placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-text-muted flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Form validation • Secure API submission
                </span>
                <button
                  type="submit"
                  disabled={status.loading}
                  className="btn-primary w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status.loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Dispatching to API...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Dispatch Inquiry
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
