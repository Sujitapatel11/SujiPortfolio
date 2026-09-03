export const ZONES = {
  origin: {
    id: 'origin',
    name: 'Origin',
    subtitle: 'The Journey Begins',
    description: 'Welcome to Suji\'s World — a 3D spatial universe powered by AI.',
    cameraPosition: [0, 2, 8],
    cameraTarget: [0, 0.2, 0],
    color: '#00f2fe',
    mood: {
      ambientIntensity: 0.3,
      fogColor: '#0B0F14',
      lightColor: '#00f2fe',
      lightIntensity: 1.2
    }
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    subtitle: 'Crafted Digital Engineering',
    description: 'Explore featured client platforms: SoulCare & AIEC.',
    cameraPosition: [-8, 2.5, 6],
    cameraTarget: [-6, 0.5, 0],
    color: '#f59e0b',
    mood: {
      ambientIntensity: 0.5,
      fogColor: '#120d06',
      lightColor: '#fbbf24',
      lightIntensity: 1.8
    }
  },
  ailab: {
    id: 'ailab',
    name: 'AI Lab',
    subtitle: 'Intelligent Systems & Agents',
    description: 'Discover "Ask Suji", LangChain intake agent & custom tool calling.',
    cameraPosition: [0, 4, -4],
    cameraTarget: [0, 1, -8],
    color: '#8b5cf6',
    mood: {
      ambientIntensity: 0.4,
      fogColor: '#090814',
      lightColor: '#a855f7',
      lightIntensity: 2.2
    }
  },
  gallery: {
    id: 'gallery',
    name: 'Gallery',
    subtitle: 'Interactive 3D Art & Shaders',
    description: 'Experience procedural WebGL graphics, materials & visual motion.',
    cameraPosition: [8, 3, 4],
    cameraTarget: [6, 0.5, 0],
    color: '#60a5fa',
    mood: {
      ambientIntensity: 0.7,
      fogColor: '#08101e',
      lightColor: '#ffffff',
      lightIntensity: 2.5
    }
  },
  office: {
    id: 'office',
    name: 'Office',
    subtitle: 'Services & Architecture',
    description: 'Full-Stack Apps, Backend APIs, MVP Building & AI/ML Integrations.',
    cameraPosition: [5, 2.5, -10],
    cameraTarget: [4, 0.5, -14],
    color: '#10b981',
    mood: {
      ambientIntensity: 0.5,
      fogColor: '#06130e',
      lightColor: '#34d399',
      lightIntensity: 1.5
    }
  },
  contact: {
    id: 'contact',
    name: 'Contact',
    subtitle: 'Client Intake Terminal',
    description: 'Start a project or technical consultation with Sujita Patel.',
    cameraPosition: [0, 2.5, -18],
    cameraTarget: [0, 0.5, -22],
    color: '#ec4899',
    mood: {
      ambientIntensity: 0.4,
      fogColor: '#120710',
      lightColor: '#f43f5e',
      lightIntensity: 2.0
    }
  }
};

export const ZONE_KEYS = Object.keys(ZONES);
