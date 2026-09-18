import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sections from './components/Sections';
import ChatDrawer from './components/ChatDrawer';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';

function PublicPortfolio() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="single-page-layout">
      <Navbar onOpenChat={() => setChatOpen(true)} />
      <Sections onOpenChat={() => setChatOpen(true)} />
      <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Single-Page Continuous-Scroll Portfolio */}
          <Route path="/" element={<PublicPortfolio />} />

          {/* Private Admin Module */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
