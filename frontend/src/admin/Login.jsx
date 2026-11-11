import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import "./admin.css";

export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-body">
      <div className="admin-login-container">
        <div className="admin-login-card">
          {/* Header */}
          <div className="admin-login-header">
            <h2 className="admin-login-title">Suji.dev</h2>
            <p className="admin-login-subtitle">ADMIN PORTAL / SECURE ACCESS</p>
          </div>

          <form onSubmit={handleSubmit} className="admin-login-form">
            {error && <div className="admin-error-banner">{error}</div>}

            <div className="admin-form-group">
              <label className="admin-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="admin-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter admin username"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="admin-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter admin password"
              />
            </div>

            <button type="submit" className="admin-btn-primary" disabled={submitting} style={{ width: '100%', marginTop: '0.5rem' }}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <div className="admin-login-tb">
            <div className="bp-tb-field">
              <span className="bp-tb-label">USER</span>
              <span className="bp-tb-value">S. PATEL</span>
            </div>
            <div className="bp-tb-field">
              <span className="bp-tb-label">VERSION</span>
              <span className="bp-tb-value">v1.0</span>
            </div>
            <div className="bp-tb-field">
              <span className="bp-tb-label">YEAR</span>
              <span className="bp-tb-value">2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
