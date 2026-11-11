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

/* Projects — verified implementation data */
export const projects = [
  {
    id: 'soulcare',
    number: '01',
    name: 'SoulCare',
    category: 'Social Creator Platform',
    description:
      'A social creator platform architected around an introspective journaling core, empowering creators to publish authentic long-form reflections, build trusted communities, and monetize content with real-time interactions.',
    tech: ['Django', 'PostgreSQL', 'Redis', 'React'],
    github: 'https://github.com/Sujitapatel11/aiDepressionProject',
    isPrivateRepo: true,
    liveDemo: 'https://ai-depression-project.vercel.app',
    status: 'shipped',
    features: [
      'Core journaling module with personal reflection workflows',
      'Creator publishing tools and subscriber community feeds',
      'Identity privacy controls and trust-based community mechanisms',
      'Real-time interactions, comments, and notification pipeline',
    ],
  },
  {
    id: 'urminexus',
    number: '02',
    name: 'UrmiNexus',
    category: 'Education Consultancy Platform',
    description:
      'A full-scale education consultancy management system connecting students and overseas advisors with structured intake workflows, document pipelines, and program recommendations.',
    tech: ['FastAPI', 'React', 'PostgreSQL', 'Matching Engine'],
    github: 'https://github.com/Sujitapatel11/aiec',
    isPrivateRepo: false,
    liveDemo: 'https://aiec-three.vercel.app',
    status: 'shipped',
    features: [
      'Student inquiry lifecycle management & tracking dashboard',
      'Administrative portal with counsellor-student matching engine',
      'Application progress tracking and document intake flows',
      'Course and university recommendation filtering system',
    ],
  },
  {
    id: 'sujiportfolio',
    number: '03',
    name: 'SujiPortfolio',
    category: 'Full-Stack Spatial Portfolio & Intake Platform',
    description:
      'Production engineering portfolio and autonomous client intake platform featuring a FastAPI backend, vector RAG AI agent ("Ask Suji"), private admin command hub, and midnight purple neon UI.',
    tech: ['FastAPI', 'React', 'PostgreSQL', 'LangChain', 'Tailwind CSS'],
    github: 'https://github.com/Sujitapatel11/SujiPortfolio',
    isPrivateRepo: false,
    liveDemo: null,
    status: 'shipped',
    features: [
      'Conversational LangChain RAG AI intake agent with tool execution',
      'Strict context isolation between public intake and private admin tools',
      'FastAPI backend with Alembic migrations and PostgreSQL persistence',
      'Modern midnight purple architecture with neon pink and violet accents',
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
    title: 'SoulCare — Social Creator Platform',
    org: 'Featured Engineering Project',
    period: '2025',
    description: 'Designed and built a social creator platform with journaling core, trusted community features, and creator monetization using Django, PostgreSQL, Redis, and React.',
    current: false,
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
