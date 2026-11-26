/**
 * SUJI — Portfolio Data
 * Single source of truth for all portfolio content.
 * Derived from actual repository data and backend profile.py.
 * No fabricated metrics, projects, or experience.
 */

export const personalInfo = {
  name: 'Suji',
  fullName: 'Sujita Patel',
  brand: 'SUJI',
  greeting: "> Hello, I'm SUJI_",
  headline: 'Engineering Ideas into Experiences.',
  roles: ['Software Engineer', 'Backend Developer', 'Applied AI Engineer'],
  description:
    'I build full-stack products with a backend-first mindset — from API design and data modelling to practical AI features and thoughtful user experiences.',
  availability: 'Open to selected opportunities',
  email: 'sujitapatel787@gmail.com',
  github: 'https://github.com/Sujitapatel11',
  githubUser: 'Sujitapatel11',
  linkedin: null,
  whatsapp: 'https://wa.me/9779815280946',
  phone: '+9779815280946',
  phoneDisplay: '+977 9815280946',
  phoneCall: 'tel:+9779815280946',
  resume: '/resume.pdf',
};

export const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Engineering Lab', href: '#engineering-lab' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
];

/* Portfolio highlights — kept intentionally factual and modest */
export const stats = [
  { label: 'Featured Projects', value: '03', icon: 'projects' },
  { label: 'Technology Areas', value: '06', icon: 'tech' },
  { label: 'Education', value: 'B.Tech CSE', icon: 'status' },
];

/* Projects — descriptions distinguish implementation from release readiness */
export const projects = [
  {
    id: 'soulcare',
    number: '01',
    group: 'social',
    name: 'SoulCare',
    contextLabel: 'Social entertainment & creator ecosystem',
    category: 'Social & Creator Platform',
    description:
      'A social entertainment and creator platform with a community and peer-support foundation. Its product direction brings together creator profiles and publishing, community feeds, peer connections, direct chat, synchronized SoulTube rooms, creator live sessions, and SoulWorld progression. Built as a React application on Django REST Framework, Channels, PostgreSQL, and Redis.',
    tech: ['React', 'Django', 'Django REST Framework', 'PostgreSQL', 'Redis', 'Django Channels'],
    github: 'https://github.com/Sujitapatel11/aiDepressionProject',
    isPrivateRepo: true,
    liveDemo: 'https://soul-care-one.vercel.app',
    status: 'in-development',
    statusLabel: 'Active development',
    featureGroups: [
      {
        title: 'Implemented in the repository',
        status: 'implemented',
        items: [
          'User identity, public profiles, creator profiles, publishing, and discovery foundations.',
          'Community feed, peer connections, direct messaging, and notification domains.',
          'SoulTube synchronized watch rooms with room chat and shared playback architecture.',
          'SoulWorld profile and progression endpoints, plus a sleep-tracking domain.',
        ],
      },
      {
        title: 'Partially implemented · release validation required',
        status: 'partial',
        items: [
          'Media upload and durable storage need complete end-to-end validation.',
          'Creator Live has backend and LiveKit components; production configuration and web experience still need verification.',
          'Creator revenue attribution, ledger, settlement, and withdrawal structures exist, but the revenue provider is not configured and payouts are not live.',
          'The source-audited documentation records a SoulTube queue-consistency test failure and outstanding production-readiness work.',
        ],
      },
      {
        title: 'Product boundary',
        status: 'retired',
        items: [
          'Journal and Insights APIs are retired in the audited main branch. Legacy code is not an active product capability; SoulCare is presented here as a social and creator platform, not a journaling app.',
        ],
      },
    ],
  },
  {
    id: 'urminexus',
    number: '02',
    group: 'education',
    name: 'UrmiNexus',
    contextLabel: 'AIEC · Initial consultancy tenant · Birgunj, Nepal',
    category: 'Multi-Tenant Study Abroad SaaS',
    description:
      'A multi-tenant study-abroad consultancy platform. AIEC (Aradhya International Education Consultancy) is the first tenant on UrmiNexus—not a separate product. The platform brings student intake, AI-assisted country and course recommendations, lead CRM, counselling operations, enrolment, applications, offers, and document workflows into one system.',
    tech: ['React', 'Tailwind CSS', 'Django', 'Django REST Framework', 'PostgreSQL', 'OpenAI API'],
    github: 'https://github.com/Sujitapatel11/aiec',
    isPrivateRepo: false,
    liveDemo: 'https://aiec-three.vercel.app',
    status: 'live-preview',
    statusLabel: 'AIEC tenant preview',
    featureGroups: [
      {
        title: 'Platform foundation',
        status: 'implemented',
        items: [
          'UrmiNexus is the multi-tenant SaaS layer; AIEC is its initial consultancy tenant.',
          'Consultancy and membership models establish tenant ownership and staff roles.',
          'React and Tailwind frontend with a Django REST Framework and PostgreSQL backend.',
        ],
      },
      {
        title: 'Repository-backed workflows',
        status: 'implemented',
        items: [
          'Multi-step student questionnaire and AI country/course recommendations with a rule-based fallback.',
          'Lead CRM with assignment, status tracking, and activity history.',
          'Student enrolment, student portal, and lead-to-student conversion.',
          'University applications, country workflows, offers, timelines, and document checklists.',
          'Counselling notes, follow-ups, tasks, appointments, and WhatsApp inquiry entry points.',
        ],
      },
      {
        title: 'Release note',
        status: 'partial',
        items: [
          'The linked site is a live preview. A preview URL alone does not prove every tenant workflow, permission boundary, or production integration has passed end-to-end verification.',
        ],
      },
    ],
  },
  {
    id: 'sujiportfolio',
    number: '03',
    group: 'engineering',
    name: 'SujiPortfolio',
    contextLabel: 'Personal engineering portfolio',
    category: 'Full-Stack Portfolio & AI Intake',
    description:
      'A backend-first engineering portfolio with a FastAPI service, AI-assisted client intake, a private admin workspace, and a responsive design system. The public site separates visitor-facing project information from owner-only operational tools.',
    tech: ['React', 'FastAPI', 'PostgreSQL', 'LangChain', 'Tailwind CSS'],
    github: 'https://github.com/Sujitapatel11/SujiPortfolio',
    isPrivateRepo: false,
    liveDemo: 'https://suji-portfolio-local-preview.vercel.app',
    status: 'shipped',
    statusLabel: 'Live portfolio',
    featureGroups: [
      {
        title: 'Implemented in the repository',
        status: 'implemented',
        items: [
          'Conversational AI intake with profile-grounded retrieval and inquiry capture.',
          'Separate public and authenticated admin tool contexts.',
          'FastAPI backend, PostgreSQL persistence, and Alembic migrations.',
          'Responsive React portfolio with an accessible muted-purple design system.',
        ],
      },
    ],
  },
];

/* Engineering Lab topics */
export const engineeringTopics = [
  { title: 'System Architecture', description: 'Microservices, event-driven patterns, and scalable system design for production workloads.', icon: 'architecture' },
  { title: 'Backend Engineering', description: 'Django and FastAPI backends with async support, ORM layers, and clean service separation.', icon: 'backend' },
  { title: 'API Development', description: 'RESTful API design with OpenAPI docs, versioning, rate limiting, and Pydantic validation.', icon: 'api' },
  { title: 'Database Design', description: 'Relational schema design, indexing strategies, migrations with Alembic, and query optimization.', icon: 'database' },
  { title: 'Authentication', description: 'JWT-based auth flows, OAuth2, session management, and role-based access control.', icon: 'auth' },
  { title: 'Performance Optimization', description: 'Query profiling, N+1 elimination, connection pooling, and async I/O for throughput.', icon: 'performance' },
  { title: 'Caching', description: 'Redis caching layers, cache invalidation strategies, and session storage for stateless APIs.', icon: 'cache' },
  { title: 'Real-Time Systems', description: 'WebSocket connections, event streaming, and push notifications for live user experiences.', icon: 'realtime' },
  { title: 'Docker & Deployment', description: 'Containerized services with Docker Compose, CI/CD pipelines, and Railway/Vercel deploys.', icon: 'docker' },
  { title: 'AI Integration', description: 'LangChain agent orchestration, RAG pipelines, tool-calling, and LLM API integration with fallback.', icon: 'ai' },
];

/* Skills — verified technical proficiencies */
export const skillCategories = [
  {
    category: 'Programming',
    skills: ['Python', 'Java', 'JavaScript', 'C++', 'C'],
    icon: 'code',
  },
  {
    category: 'Backend',
    skills: ['Django', 'FastAPI', 'Node.js', 'REST APIs'],
    icon: 'server',
  },
  {
    category: 'Frontend',
    skills: ['React', 'HTML5', 'CSS3', 'Tailwind CSS'],
    icon: 'layout',
  },
  {
    category: 'Databases',
    skills: ['PostgreSQL', 'MongoDB', 'Redis'],
    icon: 'database',
  },
  {
    category: 'AI / ML',
    skills: ['Machine Learning', 'NLP', 'Scikit-learn', 'TensorFlow', 'LLM Integration'],
    icon: 'cpu',
  },
  {
    category: 'DevOps',
    skills: ['Git', 'GitHub', 'Docker', 'Vercel', 'Railway'],
    icon: 'git',
  },
];

/* Experience / Timeline — only verifiable information */
export const experience = [
  {
    type: 'education',
    title: 'B.Tech Computer Science and Engineering',
    org: 'Parul University',
    period: '2023 — Present',
    description: 'Pursuing Computer Science and Engineering with focus on backend systems, applied AI, and full-stack product development.',
    current: true,
  },
  {
    type: 'project',
    title: 'SoulCare — Social & Creator Platform',
    org: 'Featured Engineering Project',
    period: '2025 — Present',
    description: 'Building a React and Django platform with PostgreSQL persistence, creator/community modules, private journaling workflows, and Redis-backed real-time infrastructure. The product remains under active development and feature validation.',
    current: true,
  },
  {
    type: 'project',
    title: 'UrmiNexus (AIEC) — Consultancy Platform',
    org: 'Featured Engineering Project',
    period: '2025',
    description: 'Engineered an overseas education platform with an administrative dashboard, counsellor-student matching, and university recommendation pipeline using FastAPI, PostgreSQL, and React.',
    current: false,
  },
  {
    type: 'project',
    title: 'SujiPortfolio — Spatial Intake Platform',
    org: 'Production Engineering Project',
    period: '2026',
    description: 'Architected and built an automated AI client intake platform and engineering showcase using FastAPI, PostgreSQL pgvector RAG agent, and responsive React frontend.',
    current: true,
  },
];
