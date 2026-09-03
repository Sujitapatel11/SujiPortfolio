import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JourneyProvider } from './lib/JourneyController';
import SceneCanvas from './components/SceneCanvas';
import UIOverlay from './components/UIOverlay';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';

function PublicPortfolio() {
  return (
    <JourneyProvider>
      <main className="app-container">
        <SceneCanvas />
        <UIOverlay />
      </main>
    </JourneyProvider>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public 3D Interactive Portfolio */}
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
