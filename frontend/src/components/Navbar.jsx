import React, { useState } from 'react';
import { MessageSquare, Menu, X, ArrowUpRight } from 'lucide-react';

export default function Navbar({ onOpenChat }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'AI/ML', href: '#aiml' },
    { label: 'Projects', href: '#projects' },
    { label: 'Engineering', href: '#engineering' },
    { label: 'Services', href: '#services' },
    { label: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetEl = document.querySelector(href);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="navbar-fixed">
      <div className="navbar-container">
        {/* Brand Logo */}
        <a href="#hero" className="navbar-brand" onClick={(e) => handleNavClick(e, '#hero')}>
          <span className="brand-icon">🌌</span>
          <span className="brand-text">SUJITA PATEL</span>
        </a>

        {/* Desktop Links */}
        <nav className="navbar-nav desktop-only">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-link"
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="navbar-actions">
          <button className="btn-chat-toggle" onClick={onOpenChat}>
            <MessageSquare size={16} />
            <span>Ask Suji AI</span>
          </button>

          <button
            className="mobile-menu-toggle mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-nav-dropdown">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="mobile-nav-link"
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.label}
              <ArrowUpRight size={14} className="opacity-50" />
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
