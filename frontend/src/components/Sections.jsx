import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Github,
  Mail,
  MessageCircle,
  CheckCircle2,
  Play,
  Terminal,
  Database,
  Server,
  Layout,
  Container
} from 'lucide-react';
import HeroCanvas from './HeroCanvas';
import { submitInquiry } from '../api/inquiries';

export default function Sections({ onOpenChat }) {
  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    project_type: 'Full-Stack Web App',
    budget: '$5,000 - $10,000',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: null, error: null });

  // Scroll Reveal Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12 }
    );

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: null, error: null });

    try {
      await submitInquiry({
        name: formData.name,
        email: formData.email,
        project_type: formData.project_type,
        budget: formData.budget,
        message: formData.message,
        source: 'form'
      });
      setFormStatus({
        loading: false,
        success: 'Thank you! Your project inquiry has been dispatched to Sujita. She will reach out via email shortly.',
        error: null
      });
      setFormData({
        name: '',
        email: '',
        project_type: 'Full-Stack Web App',
        budget: '$5,000 - $10,000',
        message: ''
      });
    } catch (err) {
      setFormStatus({
        loading: false,
        success: null,
        error: err.message || 'Failed to send inquiry. Please try again.'
      });
    }
  };

  return (
    <div className="sections-wrapper">
      {/* ================= HERO SECTION ================= */}
      <section id="hero" className="hero-section">
        <div className="hero-grid">
          {/* Text Content Column */}
          <div className="hero-text-content">
            <div className="badge-pill">
              <span className="dot-cyan"></span>
              <span>Available for Full-Stack & AI Systems Consulting</span>
            </div>

            <h1 className="hero-headline">
              Hi, I'm <span className="gradient-text">Sujita Patel</span>
            </h1>

            <p className="hero-tagline">
              Full-Stack & AI Systems Engineer
            </p>

            <p className="hero-statement">
              I don't just build apps — <span className="text-highlight">I want them to work.</span>
            </p>

            <p className="hero-bio-short">
              Building high-performance FastAPI backends, reactive WebGL frontends, and autonomous agentic AI workflows.
            </p>

            <div className="hero-actions">
              <a href="#projects" className="btn-primary">
                <span>Explore What I Build</span>
                <ArrowRight size={18} />
              </a>

              <button className="btn-secondary" onClick={onOpenChat}>
                <Sparkles size={18} />
                <span>Talk to Ask Suji AI</span>
              </button>
            </div>
          </div>

          {/* 3D Interactive Avatar Canvas Column */}
          <div className="hero-3d-content">
            <HeroCanvas />
            <div className="avatar-hint">
              <span className="hint-pulse"></span>
              <span>Click Avatar to toggle 3D states (Solid → Wireframe → Mesh)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ABOUT SECTION ================= */}
      <section id="about" className="content-section scroll-reveal">
        <div className="section-header">
          <span className="section-num">01.</span>
          <h2 className="section-title">About Sujita</h2>
          <div className="header-line"></div>
        </div>

        <div className="about-grid">
          <div className="about-bio-card glass-card">
            <h3>Bridging High-Performance Web Engineering with Applied AI</h3>
            <p>
              Holding a <strong>B.Tech in Computer Science and Engineering (CSE)</strong>, Sujita Patel specializes in designing production-grade digital architectures.
            </p>
            <p>
              Her work focuses on combining reactive WebGL frontends with robust FastAPI microservices and LLM agentic tool execution. Whether building privacy-first SaaS platforms or education consultancy ecosystems, Sujita delivers solutions engineered for real-world scaling and business outcomes.
            </p>

            <div className="about-stats-row">
              <div className="stat-box">
                <span className="stat-num">2+</span>
                <span className="stat-label">Featured Flagship Platforms</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">4</span>
                <span className="stat-label">Core Consulting Capabilities</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">100%</span>
                <span className="stat-label">Containerized Arch (Docker)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= AI / ML SECTION ================= */}
      <section id="aiml" className="content-section scroll-reveal">
        <div className="section-header">
          <span className="section-num">02.</span>
          <h2 className="section-title">AI & Agentic Engineering</h2>
          <div className="header-line"></div>
        </div>

        <div className="aiml-grid">
          <div className="aiml-feature-card glass-card">
            <div className="card-icon cyan">
              <Cpu size={24} />
            </div>
            <h3>LangChain & Multi-Model Orchestration</h3>
            <p>
              Designing conversational workflows with dynamic provider routing (OpenAI GPT-4o & Anthropic Claude 3.5 Haiku) with zero downtime fallback handling.
            </p>
          </div>

          <div className="aiml-feature-card glass-card">
            <div className="card-icon violet">
              <Terminal size={24} />
            </div>
            <h3>Autonomous Tool Calling & Lead Intake</h3>
            <p>
              Equipping AI agents with custom Python tool invocation routines (`save_client_inquiry`) to parse, qualify, and store actionable leads directly into PostgreSQL.
            </p>
          </div>

          <div className="aiml-feature-card glass-card">
            <div className="card-icon blue">
              <Database size={24} />
            </div>
            <h3>Context Grounding & RAG Pipelines</h3>
            <p>
              Enforcing strict single-source-of-truth factual grounding (`profile.py`) to ensure client AI agents communicate accurate services, pricing, and project facts.
            </p>
          </div>
        </div>
      </section>

      {/* ================= PROJECTS / GALLERY SECTION ================= */}
      <section id="projects" className="content-section scroll-reveal">
        <div className="section-header">
          <span className="section-num">03.</span>
          <h2 className="section-title">Featured Projects & Gallery</h2>
          <div className="header-line"></div>
        </div>

        <div className="projects-grid">
          {/* Project 1: SoulCare */}
          <div className="project-card glass-card">
            <div className="project-video-placeholder">
              <div className="play-button-overlay">
                <Play size={28} className="play-icon" />
              </div>
              <span className="video-badge">SoulCare — Interactive Walkthrough (Coming Soon)</span>
            </div>

            <div className="project-info">
              <div className="project-category">Mental Wellness & Anonymous Identity</div>
              <h3 className="project-title">SoulCare Platform</h3>
              <p className="project-desc">
                Private journaling platform featuring AI mood insights and an anonymous community with a trust-based identity reveal mechanism. Built for emotional wellbeing with deep encryption and mood analytics.
              </p>

              <div className="tech-tags">
                <span className="tag">React</span>
                <span className="tag">FastAPI</span>
                <span className="tag">Python</span>
                <span className="tag">AI / LLM</span>
                <span className="tag">PostgreSQL</span>
              </div>
            </div>
          </div>

          {/* Project 2: AIEC */}
          <div className="project-card glass-card">
            <div className="project-video-placeholder">
              <div className="play-button-overlay">
                <Play size={28} className="play-icon" />
              </div>
              <span className="video-badge">AIEC Platform — Interactive Walkthrough (Coming Soon)</span>
            </div>

            <div className="project-info">
              <div className="project-category">EdTech & Administrative Automation</div>
              <h3 className="project-title">AIEC (Education Consultancy Platform)</h3>
              <p className="project-desc">
                Comprehensive education consultancy ecosystem equipped with an administrative panel, student inquiry lifecycle management, counsellor-student matching engine, document tracking, and automated university recommendations.
              </p>

              <div className="tech-tags">
                <span className="tag">Python</span>
                <span className="tag">FastAPI</span>
                <span className="tag">React</span>
                <span className="tag">SQLAlchemy</span>
                <span className="tag">PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ENGINEERING / SKILLS SECTION ================= */}
      <section id="engineering" className="content-section scroll-reveal">
        <div className="section-header">
          <span className="section-num">04.</span>
          <h2 className="section-title">Engineering Stack</h2>
          <div className="header-line"></div>
        </div>

        <div className="skills-grid">
          <div className="skill-category-card glass-card">
            <div className="category-header">
              <Layout size={20} className="cat-icon cyan" />
              <h3>Frontend & WebGL</h3>
            </div>
            <ul className="skill-list">
              <li>React 18 & Vite</li>
              <li>JavaScript (ESNext)</li>
              <li>Three.js / React Three Fiber</li>
              <li>GSAP Animations</li>
              <li>Vanilla CSS3 Design Systems</li>
            </ul>
          </div>

          <div className="skill-category-card glass-card">
            <div className="category-header">
              <Server size={20} className="cat-icon violet" />
              <h3>Backend & API Development</h3>
            </div>
            <ul className="skill-list">
              <li>Python 3.10+</li>
              <li>FastAPI & Uvicorn</li>
              <li>Pydantic v2 Validation</li>
              <li>SQLAlchemy ORM</li>
              <li>RESTful API Design</li>
            </ul>
          </div>

          <div className="skill-category-card glass-card">
            <div className="category-header">
              <Cpu size={20} className="cat-icon blue" />
              <h3>AI & Data Engineering</h3>
            </div>
            <ul className="skill-list">
              <li>LangChain Framework</li>
              <li>OpenAI & Anthropic APIs</li>
              <li>PostgreSQL 15</li>
              <li>SQLite (Dev Fallback)</li>
              <li>Alembic Database Migrations</li>
            </ul>
          </div>

          <div className="skill-category-card glass-card">
            <div className="category-header">
              <Container size={20} className="cat-icon emerald" />
              <h3>DevOps & Tooling</h3>
            </div>
            <ul className="skill-list">
              <li>Docker & Docker Compose</li>
              <li>JWT Authentication & Passlib</li>
              <li>Git & GitHub Workflows</li>
              <li>Linux / PowerShell Environments</li>
              <li>Multi-Platform Connector Pipelines</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================= SERVICES SECTION ================= */}
      <section id="services" className="content-section scroll-reveal">
        <div className="section-header">
          <span className="section-num">05.</span>
          <h2 className="section-title">Services Offered</h2>
          <div className="header-line"></div>
        </div>

        <div className="services-grid">
          <div className="service-card glass-card">
            <div className="service-header">
              <h3>Full-Stack Web Apps</h3>
              <span className="price-tag">$2,500 - $5,000+</span>
            </div>
            <p>End-to-end web applications built with FastAPI backends and responsive React frontends.</p>
            <ul className="deliverables-list">
              <li><CheckCircle2 size={14} /> Responsive React UI/UX</li>
              <li><CheckCircle2 size={14} /> FastAPI REST API Integration</li>
              <li><CheckCircle2 size={14} /> Database ORM & Migrations</li>
            </ul>
          </div>

          <div className="service-card glass-card">
            <div className="service-header">
              <h3>Backend & API Development</h3>
              <span className="price-tag">$2,000 - $4,500+</span>
            </div>
            <p>High-throughput Python microservices, database schema design, and secure auth systems.</p>
            <ul className="deliverables-list">
              <li><CheckCircle2 size={14} /> Pydantic Data Validation</li>
              <li><CheckCircle2 size={14} /> JWT Token Authorization</li>
              <li><CheckCircle2 size={14} /> Automated Unit Testing</li>
            </ul>
          </div>

          <div className="service-card glass-card">
            <div className="service-header">
              <h3>SaaS / MVP Building</h3>
              <span className="price-tag">$3,500 - $8,000+</span>
            </div>
            <p>Rapid MVP prototyping designed to take early-stage ideas from architecture to launch.</p>
            <ul className="deliverables-list">
              <li><CheckCircle2 size={14} /> Full Product Architecture</li>
              <li><CheckCircle2 size={14} /> Admin Dashboards & Lead Tracking</li>
              <li><CheckCircle2 size={14} /> Dockerized Deployment Stack</li>
            </ul>
          </div>

          <div className="service-card glass-card">
            <div className="service-header">
              <h3>AI / ML Integration</h3>
              <span className="price-tag">$2,500 - $6,000+</span>
            </div>
            <p>Integrating intelligent LangChain agentic workflows, custom tool calling, and RAG pipelines.</p>
            <ul className="deliverables-list">
              <li><CheckCircle2 size={14} /> Conversational AI Assistants</li>
              <li><CheckCircle2 size={14} /> Automated Lead Intake Tools</li>
              <li><CheckCircle2 size={14} /> Dual LLM Fallback Routing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================= CONTACT SECTION ================= */}
      <section id="contact" className="content-section scroll-reveal">
        <div className="section-header">
          <span className="section-num">06.</span>
          <h2 className="section-title">Client Intake Terminal</h2>
          <div className="header-line"></div>
        </div>

        <div className="contact-container glass-card">
          <div className="contact-intro">
            <h3>Start Your Project or Schedule a Consultation</h3>
            <p>Fill out the inquiry form below to dispatch your project specifications directly to Sujita.</p>
          </div>

          {formStatus.success && (
            <div className="form-alert success">
              <CheckCircle2 size={18} />
              <span>{formStatus.success}</span>
            </div>
          )}

          {formStatus.error && (
            <div className="form-alert error">
              <span>{formStatus.error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="contact-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="e.g. alex@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="project_type">Project Type</label>
                <select
                  id="project_type"
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                >
                  <option value="Full-Stack Web App">Full-Stack Web App</option>
                  <option value="Backend/API Development">Backend/API Development</option>
                  <option value="SaaS/MVP Building">SaaS/MVP Building</option>
                  <option value="AI/ML Integration">AI/ML Integration</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="budget">Estimated Budget</label>
                <select
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                >
                  <option value="$2,500 - $5,000">$2,500 - $5,000 (Starter)</option>
                  <option value="$5,000 - $10,000">$5,000 - $10,000 (Growth)</option>
                  <option value="$10,000+">$10,000+ (Enterprise)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="message">Project Requirements & Details</label>
              <textarea
                id="message"
                rows={4}
                required
                placeholder="Describe your goals, tech stack preferences, and desired timeline..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-submit-form" disabled={formStatus.loading}>
              {formStatus.loading ? (
                <span>Dispatching Inquiry...</span>
              ) : (
                <>
                  <span>Dispatch Project Inquiry</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="footer-section">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="brand-icon">🌌</span>
            <span>SUJI'S WORLD</span>
            <span className="copyright-text">© {new Date().getFullYear()} Sujita Patel. All rights reserved.</span>
          </div>

          <div className="footer-links">
            <a href="mailto:sujitapatel787@gmail.com" className="footer-link" target="_blank" rel="noreferrer">
              <Mail size={16} />
              <span>Email</span>
            </a>
            <a href="https://wa.me/910000000000" className="footer-link" target="_blank" rel="noreferrer">
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </a>
            <a href="https://github.com/sujita" className="footer-link" target="_blank" rel="noreferrer">
              <Github size={16} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
