import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import "./admin.css";

const API_BASE = "http://localhost:8000";

export const Dashboard = () => {
  const { adminUser, adminToken, isAuthenticated, loading, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("inquiries");
  const [inquiries, setInquiries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/admin/login");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && adminToken) {
      fetchDashboardData();
    }
  }, [isAuthenticated, adminToken]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [inqRes, jobsRes, propRes] = await Promise.all([
        fetch(`${API_BASE}/admin/inquiries`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/jobs`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/proposals`, { headers }).catch(() => null),
      ]);

      if (inqRes && inqRes.ok) setInquiries(await inqRes.json());
      if (jobsRes && jobsRes.ok) setJobs(await jobsRes.json());
      if (propRes && propRes.ok) setProposals(await propRes.json());
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="admin-body">
        <div className="admin-login-container">
          <p style={{ color: "#64748b" }}>Validating admin session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-body">
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-brand">
            ⚡ Suji Admin Hub
          </div>

          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${activeTab === "inquiries" ? "active" : ""}`}
              onClick={() => setActiveTab("inquiries")}
            >
              📥 Client Inquiries ({inquiries.length})
            </button>
            <button
              className={`admin-nav-item ${activeTab === "jobs" ? "active" : ""}`}
              onClick={() => setActiveTab("jobs")}
            >
              🎯 Tracked Jobs ({jobs.length})
            </button>
            <button
              className={`admin-nav-item ${activeTab === "proposals" ? "active" : ""}`}
              onClick={() => setActiveTab("proposals")}
            >
              📝 Draft Proposals ({proposals.length})
            </button>
            <button
              className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              ⚙️ Settings
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          {/* Header */}
          <header className="admin-header">
            <h1 className="admin-header-title">
              {activeTab === "inquiries" && "Client Inquiries"}
              {activeTab === "jobs" && "Job Search & Opportunities"}
              {activeTab === "proposals" && "AI Proposal Generator"}
              {activeTab === "settings" && "Admin Portal Settings"}
            </h1>

            <div className="admin-user-menu">
              <span className="admin-user-name">
                Logged in as <strong>{adminUser?.username || "Admin"}</strong>
              </span>
              <button className="admin-btn-logout" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </header>

          {/* Body Content */}
          <div className="admin-content">
            {/* Quick Metrics */}
            <div className="admin-card-grid">
              <div className="admin-card">
                <div className="admin-card-header">Total Inquiries Received</div>
                <div className="admin-card-value">{inquiries.length}</div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">Active Job Targets</div>
                <div className="admin-card-value">{jobs.length}</div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">Proposals Generated</div>
                <div className="admin-card-value">{proposals.length}</div>
              </div>
            </div>

            {/* Main Tab Views */}
            {dataLoading ? (
              <div className="admin-card" style={{ textAlign: "center", padding: "40px" }}>
                <p style={{ color: "#64748b" }}>Loading dashboard records...</p>
              </div>
            ) : (
              <>
                {activeTab === "inquiries" && (
                  <div className="admin-card">
                    <h3 style={{ marginTop: 0 }}>Recent Client Leads</h3>
                    {inquiries.length === 0 ? (
                      <p style={{ color: "#64748b" }}>No client inquiries submitted yet.</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                            <th style={{ padding: "10px" }}>Name</th>
                            <th style={{ padding: "10px" }}>Email</th>
                            <th style={{ padding: "10px" }}>Project Type</th>
                            <th style={{ padding: "10px" }}>Budget</th>
                            <th style={{ padding: "10px" }}>Source</th>
                            <th style={{ padding: "10px" }}>Received</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inquiries.map((inq) => (
                            <tr key={inq.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "12px 10px", fontWeight: "600" }}>{inq.name}</td>
                              <td style={{ padding: "12px 10px" }}>{inq.email}</td>
                              <td style={{ padding: "12px 10px" }}>{inq.project_type}</td>
                              <td style={{ padding: "12px 10px" }}>{inq.budget || "N/A"}</td>
                              <td style={{ padding: "12px 10px" }}>
                                <span className="admin-badge">{inq.source}</span>
                              </td>
                              <td style={{ padding: "12px 10px", color: "#64748b", fontSize: "13px" }}>
                                {new Date(inq.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === "jobs" && (
                  <div className="admin-card">
                    <h3 style={{ marginTop: 0 }}>Target Job List</h3>
                    {jobs.length === 0 ? (
                      <p style={{ color: "#64748b" }}>No tracked job targets yet. Future automated crawlers will populate records here.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {jobs.map((j) => (
                          <div key={j.id} style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                            <div style={{ fontWeight: "700", fontSize: "16px" }}>{j.title}</div>
                            <div style={{ color: "#64748b", fontSize: "13px", margin: "4px 0" }}>
                              Platform: {j.platform} | Budget: {j.budget || "TBD"} | Score: {j.match_score}
                            </div>
                            <p style={{ margin: "8px 0", fontSize: "14px" }}>{j.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "proposals" && (
                  <div className="admin-card">
                    <h3 style={{ marginTop: 0 }}>Generated Proposals</h3>
                    {proposals.length === 0 ? (
                      <p style={{ color: "#64748b" }}>No proposal drafts generated yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {proposals.map((p) => (
                          <div key={p.id} style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                            <div style={{ fontWeight: "600" }}>Proposal #{p.id} (Job ID: {p.job_id})</div>
                            <div style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "12px", borderRadius: "6px", marginTop: "8px", fontSize: "13px" }}>
                              {p.edited_text || p.draft_text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "settings" && (
                  <div className="admin-card">
                    <h3 style={{ marginTop: 0 }}>Private Admin System Configuration</h3>
                    <p style={{ color: "#64748b" }}>
                      Authenticated Admin: <strong>{adminUser?.username}</strong>
                    </p>
                    <p style={{ color: "#64748b" }}>
                      Authentication Mode: <strong>JWT Bearer Token (Local Storage)</strong>
                    </p>
                    <p style={{ color: "#64748b" }}>
                      Backend API Target: <code>http://localhost:8000</code>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
