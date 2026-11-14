import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Stats from './components/Stats';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import EngineeringLab from './components/EngineeringLab';
import Experience from './components/Experience';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ChatDrawer from './components/ChatDrawer';
import PersonalAssistantOrb from './components/PersonalAssistantOrb';
import { AdminAuthProvider } from './admin/AdminAuthContext';

// Lazy-load private admin modules for code-splitting
const Login = lazy(() => import('./admin/Login'));
const Dashboard = lazy(() => import('./admin/Dashboard'));

function AdminLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary font-mono text-sm">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-brand-purple animate-ping" />
        Loading Admin Module...
      </div>
    </div>
  );
}

function PublicPortfolio() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-main transition-colors duration-200">
      <div className="ambient-glow" />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <About />
        <Skills />
        <Projects />
        <EngineeringLab />
        <Experience />
        <Contact />
      </main>
      <Footer />
      <PersonalAssistantOrb />
      <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 shadow-xl cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #FF2E93 0%, #A855F7 100%)',
            boxShadow: '0 4px 20px rgba(255, 46, 147, 0.45)',
            width: '3.5rem',
            height: '3.5rem',
          }}
          aria-label="Open Ask Suji AI Chat"
          title="Ask Suji AI"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicPortfolio />} />
            <Route
              path="/admin/login"
              element={
                <Suspense fallback={<AdminLoadingFallback />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <Suspense fallback={<AdminLoadingFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
