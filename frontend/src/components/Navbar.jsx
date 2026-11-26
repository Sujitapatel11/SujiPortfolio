import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Download, Sun, Moon, MessageSquare, Phone } from 'lucide-react';
import { navLinks, personalInfo } from '../data/portfolio';
import { useTheme } from '../context/ThemeContext';

function useActiveSection() {
  const [active, setActive] = useState('home');
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.replace('#', ''));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-30% 0px -50% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = useActiveSection();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass-strong py-3 shadow-lg' : 'py-5 bg-transparent'
        }`}
      >
        <div className="site-container flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo / Brand */}
          <a
            href="#home"
            onClick={(e) => handleNavClick(e, '#home')}
            className="group flex shrink-0 items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-violet flex items-center justify-center text-white font-extrabold text-sm shadow-md group-hover:scale-105 transition-transform">
              S
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-lg tracking-wider text-text-main group-hover:text-brand-purple transition-colors">
                SUJI
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-purple ml-1 animate-pulse-glow" />
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden min-w-0 items-center gap-0.5 rounded-2xl border border-border bg-bg-secondary/80 px-2 py-1.5 backdrop-blur-md xl:flex">
            {navLinks.map((link) => {
              const id = link.href.replace('#', '');
              const isActive = active === id;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`relative isolate shrink-0 rounded-xl px-2.5 py-2 text-[11px] font-mono font-medium transition-colors duration-200 2xl:px-3 2xl:text-xs ${
                    isActive
                      ? 'text-text-main font-semibold'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  <span className="relative z-10 whitespace-nowrap">{link.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 z-0 rounded-xl border border-brand-violet/25 bg-brand-violet/10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Direct WhatsApp Pill */}
            <a
              href={personalInfo.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
              title="Chat on WhatsApp (+977 9815280946)"
            >
              <MessageSquare size={13} />
              <span>WhatsApp</span>
            </a>

            {/* Direct Call Button */}
            <a
              href={personalInfo.phoneCall}
              className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-text-secondary bg-bg-card border border-border hover:border-brand-violet/50 transition-all"
              title="Call Sujita (+977 9815280946)"
            >
              <Phone size={13} className="text-brand-purple" />
              <span>Call</span>
            </a>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-text-secondary hover:text-text-main hover:bg-bg-secondary border border-border transition-all duration-200"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} className="text-brand-violet" />
              )}
            </button>

            {/* Resume button */}
            <a
              href={personalInfo.resume}
              download
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium btn-primary"
            >
              <Download size={13} />
              Resume
            </a>

            {/* Mobile menu toggle */}
            <button
              className="xl:hidden p-2 text-text-secondary hover:text-text-main transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[68px] z-40 border-b border-border bg-bg-card/95 p-5 shadow-2xl backdrop-blur-xl xl:hidden"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-main hover:bg-bg-secondary transition-colors"
                >
                  {link.label}
                </a>
              ))}

              <div className="pt-3 border-t border-border flex flex-col gap-2 mt-2">
                <a
                  href={personalInfo.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                >
                  <MessageSquare size={14} />
                  Chat on WhatsApp ({personalInfo.phoneDisplay})
                </a>
                <a
                  href={personalInfo.phoneCall}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono text-brand-lavender bg-bg-secondary border border-border"
                >
                  <Phone size={14} className="text-brand-purple" />
                  Call Directly ({personalInfo.phoneDisplay})
                </a>
                <a
                  href={personalInfo.resume}
                  download
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium btn-primary"
                >
                  <Download size={14} />
                  Download Resume (PDF)
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
