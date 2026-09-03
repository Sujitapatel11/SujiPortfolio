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
          <h2 className="admin-login-title">Suji's World Admin</h2>
          <p className="admin-login-subtitle">Private Management Portal</p>

          {error && <div className="admin-error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
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

            <button
              type="submit"
              className="admin-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign In to Admin Portal"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
