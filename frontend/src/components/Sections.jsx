import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Mail, MessageCircle, Linkedin, Instagram, Github,
  Layout, Server, Rocket, Cpu, ArrowUpRight,
} from 'lucide-react';
import {
  SheetHeader, TitleBlock, RegistrationMarks, SectionMarker,
  DimensionLine, MonoTag, DrawingNotes, CalloutBalloon, HatchFill,
} from '../blueprint/primitives';
import { submitInquiry } from '../api/inquiries';

export default function Sections({ onOpenChat }) {
  /* ── Contact form state ── */
  const [formData, setFormData] = useState({
    name: '', email: '', project_type: 'Full-Stack Web App',
    budget: '$5,000 – $10,000', message: '',
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: null });

  /* ── Scroll reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.scroll-reveal').forEach((el) => obs.observe(el));
    return () => document.querySelectorAll('.scroll-reveal').forEach((el) => obs.unobserve(el));
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });
    try {
      await submitInquiry({
        name: formData.name, email: formData.email,
        project_type: formData.project_type, budget: formData.budget,
        message: formData.message, source: 'form',
      });
      setFormStatus({ loading: false, success: true, error: null });
      setFormData({ name: '', email: '', project_type: 'Full-Stack Web App', budget: '$5,000 – $10,000', message: '' });
    } catch (err) {
      setFormStatus({ loading: false, success: false, error: err.message || 'Failed to send inquiry.' });
    }
  };

  /* ── Bill of Materials data ── */
  const bom = [
    { item: '01', component: 'Python',        category: 'Backend',   status: 'Active' },
    { item: '02', component: 'FastAPI',        category: 'Backend',   status: 'Active' },
    { item: '03', component: 'Django',         category: 'Backend',   status: 'Active' },
    { item: '04', component: 'Flask',          category: 'Backend',   status: 'Familiar' },
    { item: '05', component: 'React',          category: 'Frontend',  status: 'Active' },
    { item: '06', component: 'PostgreSQL',     category: 'Data',      status: 'Active' },
    { item: '07', component: 'MongoDB',        category: 'Data',      status: 'Familiar' },
    { item: '08', component: 'MySQL',          category: 'Data',      status: 'Familiar' },
    { item: '09', component: 'Redis',          category: 'Data',      status: 'Active' },
    { item: '10', component: 'Supabase',       category: 'Data',      status: 'Familiar' },
    { item: '11', component: 'Docker',        category: 'Infra',     status: 'Active' },
    { item: '12', component: 'CI/CD',          category: 'Infra',     status: 'Active' },
    { item: '13', component: 'Git',            category: 'Infra',     status: 'Active' },
    { item: '14', component: 'LangChain',      category: 'AI',        status: 'Active' },
    { item: '15', component: 'RAG',            category: 'AI',        status: 'Active' },
    { item: '16', component: 'Vector Databases', category: 'AI',      status: 'Active' },
  ];

  /* ── Services data ── */
  const services = [
    {
      num: '01', title: 'Full-Stack Web Apps', icon: <Layout size={22} />,
      liner: 'End-to-end applications shipped from blank repo to live URL.',
      chips: ['React', 'FastAPI', 'PostgreSQL', 'Docker'],
      annotations: ['→ Responsive UI engineering', '→ REST API + ORM design', '→ Auth & session flows', '→ Deployment pipeline'],
    },
    {
      num: '02', title: 'Backend & API Development', icon: <Server size={22} />,
      liner: 'High-throughput Python services built for real traffic, not demos.',
      chips: ['FastAPI', 'SQLAlchemy', 'JWT', 'OpenAPI'],
      annotations: ['→ Async endpoint design', '→ Pydantic validation', '→ Database migrations', '→ Rate limiting & caching'],
    },
    {
      num: '03', title: 'SaaS / MVP Building', icon: <Rocket size={22} />,
      liner: 'Take an idea from napkin sketch to a product users can log into.',
      chips: ['MVP', 'Admin Panel', 'Docker', 'Launch'],
      annotations: ['→ Full architecture scoping', '→ Lead tracking & intake', '→ Multi-role access', '→ Containerised deploy'],
    },
    {
      num: '04', title: 'AI/ML Integration', icon: <Cpu size={22} />,
      liner: 'LLM agents, RAG pipelines and tool-calling wired into real products.',
      chips: ['LangChain', 'RAG', 'Tool-calling', 'Vector DB'],
      annotations: ['→ Conversational agent design', '→ Context-grounded RAG', '→ Custom Python tools', '→ Dual-LLM fallback'],
    },
  ];

  /* ── Revision table data ── */
  const revisions = [
    { rev: 'A', date: '2023.08', desc: 'Started B.Tech CSE, Parul University' },
    { rev: 'B', date: '2025.03', desc: 'Shipped SoulCare — journaling + AI mood' },
    { rev: 'C', date: '2025.09', desc: 'Shipped AIEC — education consultancy' },
    { rev: 'D', date: '2026.11', desc: 'Building AI agents & applied AI products' },
  ];

  /* ── Schematic nodes ── */
  const schematicNodes = [
    { label: 'User',       sub: 'INPUT',    callout: 1, calloutLabel: 'Intent & query' },
    { label: 'LLM Agent',  sub: 'REASONING', callout: 2, calloutLabel: 'Plans & decides' },
    { label: 'Tools',      sub: 'EXECUTION', callout: 3, calloutLabel: 'Acts on the world' },
    { label: 'Database',   sub: 'MEMORY',    callout: 4, calloutLabel: 'Stores & recalls' },
  ];

  const specs = [
    { num: '01', text: 'LLM-powered chatbots that hold context across a full conversation.' },
    { num: '02', text: 'RAG knowledge systems grounded in your own documents, not hallucination.' },
    { num: '03', text: 'AI agents with tool-calling that write to databases and call real APIs.' },
    { num: '04', text: 'AI insights embedded inside products — mood analysis, recommendations, scoring.' },
  ];

  const processSteps = ['Discovery call', 'Scoping', 'Weekly updates', 'Delivery'];

  const contactRows = [
    { label: 'Email',    value: 'sujitapatel787@gmail.com',    icon: <Mail size={15} />,       href: 'mailto:sujitapatel787@gmail.com' },
    { label: 'WhatsApp', value: 'Message directly',            icon: <MessageCircle size={15} />, href: 'https://wa.me/910000000000' },
    { label: 'LinkedIn', value: '/in/sujita-patel',            icon: <Linkedin size={15} />,   href: 'https://linkedin.com' },
    { label: 'Instagram', value: '@sujita.codes',              icon: <Instagram size={15} />,  href: 'https://instagram.com' },
    { label: 'GitHub',   value: 'Sujitapatel11',               icon: <Github size={15} />,     href: 'https://github.com/Sujitapatel11' },
  ];

  return (
    <div className="sections-wrapper">

      {/* ════════════════════════════════════════════════════════════
          SHEET 1 — HERO ("Figure 1")
          ════════════════════════════════════════════════════════════ */}
      <section id="hero" className="bp-section bp-hero bp-grid-bg">
        <RegistrationMarks />
        <div className="bp-section-inner">
          <div className="bp-hero-grid">

            {/* Left: headline + notes + CTAs */}
            <div className="bp-hero-text">
              <div className="bp-hero-fig-label">FIGURE 1 — SUBJECT</div>
              <h1 className="bp-hero-headline">
                I turn ideas into <span className="bp-italic">real</span> products.
              </h1>
              <p className="bp-hero-subline">BACKEND ENGINEER / APPLIED AI / FULL-STACK</p>

              <DrawingNotes
                notes={[
                  "I'm Sujita.",
                  "A Computer Science Engineering student.",
                  "I build backend systems.",
                  "I work with AI and machine learning.",
                  "I turn ideas into real products.",
                  "I want them to work.",
                ]}
                className="bp-hero-notes"
              />

              <div className="bp-hero-cta-row">
                <a href="#projects" className="bp-btn bp-btn-primary" onClick={(e) => { e.preventDefault(); document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  Explore what I build <ArrowRight size={16} />
                </a>
                <a href="#contact" className="bp-btn bp-btn-outline" onClick={(e) => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  Book a call <ArrowUpRight size={16} />
                </a>
              </div>
            </div>

            {/* Right: portrait figure with callouts */}
            <div className="bp-portrait-wrap">
              <div className="bp-portrait-frame">
                <div className="bp-portrait-photo">
                  <img src="/assets/suji-portrait.jpg" alt="Sujita Patel portrait" />
                </div>
                <div className="bp-portrait-wireframe" />
                <div className="bp-portrait-dither">
                  {[...Array(9)].map((_, i) => <span key={i} style={{ width: `${30 + Math.random() * 50}%` }} />)}
                </div>

                {/* Callout balloons positioned around portrait */}
                <CalloutBalloon number={1} label="Face → About" lineDir="left" lineLen={40}
                  style={{ top: '8%', left: '-8px' }} />
                <CalloutBalloon number={2} label="Head → AI/ML" lineDir="right" lineLen={40}
                  style={{ top: '16%', right: '-8px' }} />
                <CalloutBalloon number={3} label="Laptop → Projects" lineDir="right" lineLen={40}
                  style={{ top: '50%', right: '-8px' }} />
                <CalloutBalloon number={4} label="Side → Engineering" lineDir="right" lineLen={40}
                  style={{ bottom: '18%', right: '-8px' }} />
                <CalloutBalloon number={5} label="Background → Business" lineDir="left" lineLen={40}
                  style={{ bottom: '6%', left: '-8px' }} />
              </div>

              {/* Dimension lines */}
              <DimensionLine measurement="W 140" orientation="horizontal"
                className="bp-portrait-dim-h" style={{ position: 'absolute' }} />
              <DimensionLine measurement="H 180" orientation="vertical"
                className="bp-portrait-dim-v" style={{ position: 'absolute' }} />

              <span className="bp-portrait-legend">FIG. 1: SUBJECT, STATE 1/3</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SHEET 2 — ABOUT / REVISION TABLE
          ════════════════════════════════════════════════════════════ */}
      <section id="about" className="bp-section bp-grid-bg scroll-reveal">
        <RegistrationMarks />
        <div className="bp-section-inner">
          <SheetHeader index="01" title="About" italicWord="Sujita" marker="SHEET 2/8" />
          <SectionMarker label="SECTION A-A" />

          <div className="bp-about-grid">
            <div className="bp-about-bio">
              <h3>Backend engineer building products, not just <em className="bp-italic">studying theory</em>.</h3>
              <p>
                I'm a <strong>B.Tech Computer Science Engineering</strong> student at Parul University, currently
                in my 7th semester. My focus is backend systems and applied AI — the kind of engineering that
                ships a working product rather than a notebook full of theory.
              </p>
              <p>
                I've built and shipped two full platforms: <strong>SoulCare</strong>, a private journaling app
                with AI mood insights, and <strong>AIEC</strong>, an education consultancy system with admin
                panels, inquiry management and counsellor matching. Both are live, both solve real problems.
              </p>
              <p>
                What I care about is the last 20% — the part where the thing actually works for a real user.
                That's why I work across the stack: FastAPI backends, React frontends, and LangChain agents
                that call real tools and write to real databases.
              </p>
            </div>

            <div>
              <div className="bp-rev-table-title">REVISION TABLE</div>
              <div className="bp-rev-table">
                <div className="bp-rev-table-head">
                  <span>REV</span><span>DATE</span><span>DESCRIPTION</span>
                </div>
                {revisions.map((r) => (
                  <div className="bp-rev-table-row" key={r.rev}>
                    <span>{r.rev}</span><span>{r.date}</span><span>{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <TitleBlock drawingNo="SP-002" sheet="2/8" style={{ marginTop: '2.5rem' }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SHEET 3 — AI/ML SCHEMATIC
          ════════════════════════════════════════════════════════════ */}
      <section id="aiml" className="bp-section bp-grid-bg scroll-reveal">
        <RegistrationMarks />
        <div className="bp-section-inner">
          <SheetHeader index="02" title="Applied AI, not AI" italicWord="for its own sake" marker="SHEET 3/8" />
          <SectionMarker label="SECTION B-B" />

          <div className="bp-aiml-grid">
            {/* Schematic diagram */}
            <div className="bp-schematic">
              <HatchFill opacity={0.03} />
              <div className="bp-schematic-flow">
                {schematicNodes.map((node, i) => (
                  <React.Fragment key={i}>
                    <div className="bp-schematic-node">
                      <div className="bp-schematic-node-label">{node.label}</div>
                      <div className="bp-schematic-node-sub">{node.sub}</div>
                    </div>
                    {i < schematicNodes.length - 1 && <div className="bp-schematic-arrow" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Callout balloons above schematic */}
              {schematicNodes.map((node, i) => (
                <CalloutBalloon
                  key={i}
                  number={node.callout}
                  label={node.calloutLabel}
                  lineDir="down"
                  lineLen={28}
                  style={{ top: '12px', left: `${10 + i * 24}%` }}
                />
              ))}
            </div>

            {/* Specification rows */}
            <div className="bp-spec-list">
              {specs.map((s) => (
                <div className="bp-spec-row" key={s.num}>
                  <span className="bp-spec-num">{s.num}</span>
                  <span className="bp-spec-text">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
          <TitleBlock drawingNo="SP-003" sheet="3/8" style={{ marginTop: '2.5rem' }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SHEET 4 — PROJECTS / CASE FILES
          ════════════════════════════════════════════════════════════ */}
      <section id="projects" className="bp-section bp-grid-bg scroll-reveal">
        <RegistrationMarks />
        <div className="bp-section-inner">
          <SheetHeader index="03" title="Case" italicWord="files" marker="SHEET 4/8" />
          <SectionMarker label="SECTION C-C" />

          <div className="bp-projects-stack">

            {/* SoulCare */}
            <div className="bp-project-sheet">
              <div className="bp-project-visual">
                <RegistrationMarks />
                <HatchFill opacity={0.04} />
                <div className="bp-project-visual-inner">
                  <div className="bp-project-visual-placeholder">
                    SOULCARE<br/>SCREENSHOT<br/>— COMING —
                  </div>
                  <DimensionLine measurement="W 1280" orientation="horizontal"
                    style={{ position: 'absolute', bottom: '4px', left: 0, right: 0 }} />
                </div>
                <a href="#projects" className="bp-project-walkthrough-link" onClick={(e) => e.preventDefault()}>
                  View walkthrough <ArrowUpRight size={12} />
                </a>
              </div>
              <div className="bp-project-info">
                <div className="bp-project-num">CASE FILE 01</div>
                <h3 className="bp-project-title">SoulCare</h3>
                <p className="bp-project-line">
                  <strong>Problem:</strong> People need private space to journal, but public mental health
                  apps feel exposed. <strong>Solution:</strong> A private journaling platform with AI mood
                  insights and an anonymous community where identity is revealed only after trust is earned.
                </p>
                <div className="bp-project-tags">
                  <MonoTag>React</MonoTag><MonoTag>FastAPI</MonoTag><MonoTag>Python</MonoTag>
                  <MonoTag>AI / LLM</MonoTag><MonoTag>PostgreSQL</MonoTag>
                </div>
                <div className="bp-project-title-block">
                  <div className="bp-tb-field"><span className="bp-tb-label">DRAWING NO.</span><span className="bp-tb-value">SP-SC-01</span></div>
                  <div className="bp-tb-field"><span className="bp-tb-label">SHEET</span><span className="bp-tb-value">4/8</span></div>
                  <div className="bp-tb-field"><span className="bp-tb-label">SCALE</span><span className="bp-tb-value">1:1</span></div>
                  <div className="bp-tb-field"><span className="bp-tb-label">REV</span><span className="bp-tb-value">B</span></div>
                </div>
              </div>
            </div>

            {/* AIEC */}
            <div className="bp-project-sheet">
              <div className="bp-project-visual">
                <RegistrationMarks />
                <HatchFill opacity={0.04} />
                <div className="bp-project-visual-inner">
                  <div className="bp-project-visual-placeholder">
                    AIEC<br/>SCREENSHOT<br/>— COMING —
                  </div>
                  <DimensionLine measurement="W 1280" orientation="horizontal"
                    style={{ position: 'absolute', bottom: '4px', left: 0, right: 0 }} />
                </div>
                <a href="#projects" className="bp-project-walkthrough-link" onClick={(e) => e.preventDefault()}>
                  View walkthrough <ArrowUpRight size={12} />
                </a>
              </div>
              <div className="bp-project-info">
                <div className="bp-project-num">CASE FILE 02</div>
                <h3 className="bp-project-title">AIEC</h3>
                <p className="bp-project-line">
                  <strong>Problem:</strong> Education consultancies drown in spreadsheets tracking student
                  inquiries, documents and counsellor assignments. <strong>Solution:</strong> A platform with
                  an admin panel, student inquiry management, counsellor matching, document tracking and
                  course recommendations.
                </p>
                <div className="bp-project-tags">
                  <MonoTag>Python</MonoTag><MonoTag>FastAPI</MonoTag><MonoTag>React</MonoTag>
                  <MonoTag>SQLAlchemy</MonoTag><MonoTag>PostgreSQL</MonoTag>
                </div>
                <div className="bp-project-title-block">
                  <div className="bp-tb-field"><span className="bp-tb-label">DRAWING NO.</span><span className="bp-tb-value">SP-AE-02</span></div>
                  <div className="bp-tb-field"><span className="bp-tb-label">SHEET</span><span className="bp-tb-value">4/8</span></div>
                  <div className="bp-tb-field"><span className="bp-tb-label">SCALE</span><span className="bp-tb-value">1:1</span></div>
                  <div className="bp-tb-field"><span className="bp-tb-label">REV</span><span className="bp-tb-value">C</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SHEET 5 — ENGINEERING / BILL OF MATERIALS
          ════════════════════════════════════════════════════════════ */}
      <section id="engineering" className="bp-section bp-grid-bg scroll-reveal">
        <RegistrationMarks />
        <div className="bp-section-inner">
          <SheetHeader index="04" title="Engineering" italicWord="stack" marker="SHEET 5/8" />
          <SectionMarker label="SECTION D-D" />

          <div className="bp-bom-wrap">
            <table className="bp-bom">
              <thead>
                <tr><th>ITEM</th><th>COMPONENT</th><th>CATEGORY</th><th>STATUS</th></tr>
              </thead>
              <tbody className="bp-bom-tbody">
                {bom.map((row) => (
                  <tr key={row.item}>
                    <td className="bp-bom-item">{row.item}</td>
                    <td className="bp-bom-component">{row.component}</td>
                    <td className="bp-bom-category">{row.category}</td>
                    <td>
                      <span className={`bp-bom-status ${row.status === 'Active' ? 'bp-bom-status--active' : ''}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TitleBlock drawingNo="SP-005" sheet="5/8" style={{ marginTop: '2.5rem' }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SHEET 6 — SERVICES / PART DRAWINGS
          ════════════════════════════════════════════════════════════ */}
      <section id="services" className="bp-section bp-grid-bg scroll-reveal">
        <RegistrationMarks />
        <div className="bp-section-inner">
          <SheetHeader index="05" title="Bill of" italicWord="services" marker="SHEET 6/8" />
          <SectionMarker label="SECTION E-E" />

          <div className="bp-services-grid">
            {services.map((s) => (
              <div className="bp-service-part" key={s.num}>
                <span className="bp-service-item-num">ITEM {s.num}</span>
                <div className="bp-service-icon">{s.icon}</div>
                <h3 className="bp-service-title">{s.title}</h3>
                <p className="bp-service-liner">{s.liner}</p>
                <div className="bp-service-chips">
                  {s.chips.map((c) => <MonoTag key={c}>{c}</MonoTag>)}
                </div>
                <div className="bp-service-annotations">
                  {s.annotations.map((a, i) => <div key={i}><span>↳</span><span>{a.replace('→ ', '')}</span></div>)}
                </div>
              </div>
            ))}
          </div>

          {/* Process Flow */}
          <div className="bp-process-flow">
            <div className="bp-process-flow-title">PROCESS FLOW</div>
            <div className="bp-process-steps">
              {processSteps.map((step, i) => (
                <React.Fragment key={i}>
                  <div className="bp-process-step">
                    <div className="bp-process-step-num">STEP {String(i + 1).padStart(2, '0')}</div>
                    <div className="bp-process-step-label">{step}</div>
                  </div>
                  {i < processSteps.length - 1 && <div className="bp-process-arrow" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <TitleBlock drawingNo="SP-006" sheet="6/8" style={{ marginTop: '2.5rem' }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SHEET 7 — CONTACT (DARK BLUEPRINT)
          ════════════════════════════════════════════════════════════ */}
      <section id="contact" className="bp-section bp-contact bp-grid-bg scroll-reveal">
        <RegistrationMarks color="rgba(255,255,255,0.4)" />
        <div className="bp-section-inner">
          <SheetHeader index="06" title="Request a" italicWord="quotation" marker="SHEET 7/8" />

          <div className="bp-contact-grid">
            {/* Left: reassurance + contact rows */}
            <div className="bp-contact-left">
              <h3>Let's scope your build.</h3>
              <div className="bp-contact-reassure">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--bp-orange)' }} />
                I reply within 24 hours
              </div>

              <div className="bp-contact-rows">
                {contactRows.map((row) => (
                  <a key={row.label} href={row.href} target="_blank" rel="noreferrer" className="bp-contact-row">
                    <span className="bp-contact-row-label">{row.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {row.icon}
                      <span className="bp-contact-row-value">{row.value}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Right: RFQ form */}
            <div className="bp-rfq">
              <div className="bp-rfq-header">
                <span className="bp-rfq-title">REQUEST FOR QUOTATION</span>
                <span className="bp-rfq-sheet">FORM RFQ-01 / REV 2026.11</span>
              </div>

              {formStatus.success ? (
                <div className="bp-received-stamp">
                  <div className="bp-received-mark">RECEIVED</div>
                  <p className="bp-received-msg">Got it, I'll reply within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit}>
                  <div className="bp-rfq-row">
                    <div className="bp-rfq-field">
                      <label className="bp-rfq-label">Name</label>
                      <input className="bp-rfq-input" type="text" required
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="bp-rfq-field">
                      <label className="bp-rfq-label">Email</label>
                      <input className="bp-rfq-input" type="email" required
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="bp-rfq-row">
                    <div className="bp-rfq-field">
                      <label className="bp-rfq-label">Project type</label>
                      <select className="bp-rfq-select"
                        value={formData.project_type}
                        onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}>
                        <option>Full-Stack Web App</option>
                        <option>Backend/API Development</option>
                        <option>SaaS/MVP Building</option>
                        <option>AI/ML Integration</option>
                      </select>
                    </div>
                    <div className="bp-rfq-field">
                      <label className="bp-rfq-label">Budget</label>
                      <select className="bp-rfq-select"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}>
                        <option>$2,500 – $5,000</option>
                        <option>$5,000 – $10,000</option>
                        <option>$10,000+</option>
                      </select>
                    </div>
                  </div>
                  <div className="bp-rfq-field">
                    <label className="bp-rfq-label">Message</label>
                    <textarea className="bp-rfq-textarea" required rows={3}
                      placeholder="Describe your project goals, timeline and stack preferences."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
                  </div>
                  {formStatus.error && (
                    <p style={{ color: 'var(--bp-orange)', fontFamily: 'var(--bp-font-mono)', fontSize: '0.74rem', marginBottom: '1rem' }}>
                      {formStatus.error}
                    </p>
                  )}
                  <button type="submit" className="bp-rfq-submit" disabled={formStatus.loading}>
                    {formStatus.loading ? 'Sending…' : 'Send inquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
          <TitleBlock drawingNo="SP-007" sheet="7/8" dark style={{ marginTop: '2.5rem' }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SHEET 8 — FOOTER
          ════════════════════════════════════════════════════════════ */}
      <footer className="bp-footer">
        <div className="bp-footer-inner">
          <div className="bp-footer-top">
            <div>
              <div className="bp-footer-block-label">DRAWN BY</div>
              <div className="bp-footer-block-value">S. PATEL</div>
            </div>
            <div>
              <div className="bp-footer-block-label">REVISION</div>
              <div className="bp-footer-block-value">2026.11</div>
            </div>
            <div>
              <div className="bp-footer-block-label">CONTACT</div>
              <div className="bp-footer-socials">
                <a className="bp-footer-social" href="mailto:sujitapatel787@gmail.com">Email</a>
                <a className="bp-footer-social" href="https://wa.me/910000000000" target="_blank" rel="noreferrer">WhatsApp</a>
                <a className="bp-footer-social" href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
                <a className="bp-footer-social" href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
                <a className="bp-footer-social" href="https://github.com/Sujitapatel11" target="_blank" rel="noreferrer">GitHub</a>
              </div>
            </div>
          </div>
          <div className="bp-footer-bottom">
            <span>DRAWING NO. SP-001 / SHEET 8/8 / SCALE 1:1</span>
            <span>© {new Date().getFullYear()} SUJITA PATEL — ALL RIGHTS RESERVED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
