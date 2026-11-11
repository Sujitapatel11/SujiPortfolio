import React from 'react';
import { Github, Linkedin, Mail, MessageSquare, Phone } from 'lucide-react';
import { personalInfo } from '../data/portfolio';

export default function Footer() {
  return (
    <footer className="relative border-t border-border py-10 px-4 sm:px-6 lg:px-8 bg-bg-card/90">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-pink to-brand-violet flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
            S
          </div>
          <span className="font-extrabold text-base tracking-wider text-text-main">
            SUJI
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-pink ml-0.5" />
          <span className="text-text-muted text-xs font-mono ml-2">
            Engineering Ideas into Experiences.
          </span>
        </div>

        {/* Direct Action Links */}
        <div className="flex items-center gap-2">
          <a
            href={personalInfo.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-border transition-all"
            aria-label="WhatsApp"
            title="WhatsApp: +977 9815280946"
          >
            <MessageSquare size={16} />
          </a>
          <a
            href={personalInfo.phoneCall}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-brand-pink hover:text-brand-pink hover:bg-brand-pink/10 border border-border transition-all"
            aria-label="Call"
            title="Call: +977 9815280946"
          >
            <Phone size={16} />
          </a>
          <a
            href={personalInfo.github}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-bg-secondary border border-border transition-all"
            aria-label="GitHub"
          >
            <Github size={16} />
          </a>
          <a
            href={personalInfo.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-bg-secondary border border-border transition-all"
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
          <a
            href={`mailto:${personalInfo.email}`}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-bg-secondary border border-border transition-all"
            aria-label="Email"
          >
            <Mail size={16} />
          </a>
        </div>

        {/* Copyright */}
        <p className="font-mono text-xs text-text-muted">
          &copy; {new Date().getFullYear()} {personalInfo.fullName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
