import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import "./admin.css";

const API_BASE = "http://localhost:8000";

export const Dashboard = () => {
  const { adminUser, adminToken, isAuthenticated, loading, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("jobs");
  const [inquiries, setInquiries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Filters & Search for Jobs
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("hide_rejected"); // Default: hide rejected/skipped jobs
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal State
  const [selectedJob, setSelectedJob] = useState(null);
  const [editedProposalText, setEditedProposalText] = useState("");
  const [isSavingProposal, setIsSavingProposal] = useState(false);

  // Paste Job Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteForm, setPasteForm] = useState({
    platform: "Upwork",
    title: "",
    description: "",
    url: "",
    budget: "",
  });
  const [isSubmittingPaste, setIsSubmittingPaste] = useState(false);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  // Open Job Detail Panel & populate proposal text
  const handleOpenJobDetail = (job) => {
    setSelectedJob(job);
    const linkedProposal = proposals.find((p) => p.job_id === job.id);
    if (linkedProposal) {
      setEditedProposalText(linkedProposal.edited_text || linkedProposal.draft_text || "");
    } else {
      setEditedProposalText("");
    }
  };

  // Handle Manual Paste Submission (POST /admin/jobs/paste)
  const handlePasteSubmit = async (e) => {
    e.preventDefault();
    if (!pasteForm.title.trim() || !pasteForm.description.trim()) {
      showToast("Please provide both job title and description.");
      return;
    }

    setIsSubmittingPaste(true);
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/paste`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(pasteForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to submit job paste.");
      }

      const data = await res.json();
      const newJob = data.job;
      const newProp = data.proposal;

      // Update state locally
      setJobs((prev) => [newJob, ...prev]);
      setProposals((prev) => [newProp, ...prev]);

      setShowPasteModal(false);
      setPasteForm({
        platform: "Upwork",
        title: "",
        description: "",
        url: "",
        budget: "",
      });

      showToast(`Job successfully scored (${newJob.match_score}) & proposal drafted!`);
      // Open new job in detail panel
      handleOpenJobDetail(newJob);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmittingPaste(false);
    }
  };

  // Save Proposal Edits (PATCH /admin/proposals/{id})
  const handleSaveProposalEdits = async () => {
    if (!selectedJob) return;
    const linkedProposal = proposals.find((p) => p.job_id === selectedJob.id);
    if (!linkedProposal) return;

    setIsSavingProposal(true);
    try {
      const res = await fetch(`${API_BASE}/admin/proposals/${linkedProposal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ edited_text: editedProposalText }),
      });

      if (!res.ok) throw new Error("Failed to save proposal edits.");

      const updatedProp = await res.json();
      setProposals((prev) =>
        prev.map((p) => (p.id === updatedProp.id ? updatedProp : p))
      );

      showToast("Proposal draft edits saved successfully!");
    } catch (err) {
      showToast(`Error saving proposal: ${err.message}`);
    } finally {
      setIsSavingProposal(false);
    }
  };

  // Copy Proposal Text to Clipboard
  const handleCopyProposal = () => {
    if (!editedProposalText) return;
    navigator.clipboard.writeText(editedProposalText);
    showToast("Proposal text copied to clipboard!");
  };

  // Update Job Status (PATCH /admin/jobs/{id}/status)
  // Action: Mark as Submitted (status="applied") or Skip (status="rejected")
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedJob) return;

    try {
      const res = await fetch(`${API_BASE}/admin/jobs/${selectedJob.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update job status.");

      const updatedJob = await res.json();

      // Update state locally
      setJobs((prev) =>
        prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
      );

      // Re-fetch proposals to synchronize status if applied
      if (newStatus === "applied") {
        fetchDashboardData();
      }

      setSelectedJob(updatedJob);
      const actionText = newStatus === "applied" ? "Marked as Submitted" : "Job Skipped";
      showToast(`${actionText}!`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Helper badge styles
  const getPlatformBadge = (platform) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("upwork")) return "admin-badge-upwork";
    if (p.includes("fiverr")) return "admin-badge-fiverr";
    if (p.includes("freelancer")) return "admin-badge-freelancer";
    return "admin-badge-default";
  };

  const getScoreBadge = (score) => {
    if (score >= 0.8) return "admin-score-high";
    if (score >= 0.6) return "admin-score-med";
    return "admin-score-low";
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "applied" || s === "submitted") return "admin-status-applied";
    if (s === "rejected") return "admin-status-rejected";
    if (s === "hired") return "admin-status-hired";
    return "admin-status-new";
  };

  // Filtered & Sorted Jobs List
  const filteredJobs = jobs
    .filter((job) => {
      // Platform Filter
      if (platformFilter !== "all" && job.platform.toLowerCase() !== platformFilter.toLowerCase()) {
        return false;
      }
      // Status Filter
      if (statusFilter === "hide_rejected" && job.status === "rejected") {
        return false;
      }
      if (statusFilter !== "all" && statusFilter !== "hide_rejected" && job.status !== statusFilter) {
        return false;
      }
      // Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (job.title || "").toLowerCase().includes(q);
        const matchDesc = (job.description || "").toLowerCase().includes(q);
        return matchTitle || matchDesc;
      }
      return true;
    })
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

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
          <div className="admin-brand">⚡ Suji Admin Hub</div>

          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${activeTab === "jobs" ? "active" : ""}`}
              onClick={() => setActiveTab("jobs")}
            >
              🎯 Job Opportunities ({jobs.length})
            </button>
            <button
              className={`admin-nav-item ${activeTab === "proposals" ? "active" : ""}`}
              onClick={() => setActiveTab("proposals")}
            >
              📝 Proposals ({proposals.length})
            </button>
            <button
              className={`admin-nav-item ${activeTab === "inquiries" ? "active" : ""}`}
              onClick={() => setActiveTab("inquiries")}
            >
              📥 Client Leads ({inquiries.length})
            </button>
            <button
              className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              ⚙️ System Settings
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          {/* Header */}
          <header className="admin-header">
            <h1 className="admin-header-title">
              {activeTab === "jobs" && "Job Target Search & Manual Submissions"}
              {activeTab === "proposals" && "AI Proposal Review Workspace"}
              {activeTab === "inquiries" && "Client Leads & Inquiries"}
              {activeTab === "settings" && "Admin Portal Settings"}
            </h1>

            <div className="admin-user-menu">
              {activeTab === "jobs" && (
                <button
                  className="admin-btn-primary"
                  onClick={() => setShowPasteModal(true)}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  📋 Paste New Job
                </button>
              )}
              <span className="admin-user-name">
                Logged in as <strong>{adminUser?.username || "Admin"}</strong>
              </span>
              <button className="admin-btn-logout" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </header>

          {/* Content Body */}
          <div className="admin-content">
            {/* Quick Metrics */}
            <div className="admin-card-grid">
              <div className="admin-card">
                <div className="admin-card-header">Active Job Targets</div>
                <div className="admin-card-value">
                  {jobs.filter((j) => j.status !== "rejected").length}
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">Proposals Generated</div>
                <div className="admin-card-value">{proposals.length}</div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">Proposals Submitted</div>
                <div className="admin-card-value">
                  {proposals.filter((p) => p.status === "submitted").length}
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">Client Inquiries</div>
                <div className="admin-card-value">{inquiries.length}</div>
              </div>
            </div>

            {dataLoading ? (
              <div className="admin-card" style={{ textAlign: "center", padding: "40px" }}>
                <p style={{ color: "#64748b" }}>Loading dashboard records...</p>
              </div>
            ) : (
              <>
                {/* JOBS TAB */}
                {activeTab === "jobs" && (
                  <div className="admin-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ margin: 0 }}>Target Jobs List ({filteredJobs.length})</h3>
                      <button className="admin-btn-primary" onClick={() => setShowPasteModal(true)}>
                        + Paste Job Listing
                      </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="admin-filter-bar">
                      <div className="admin-filter-group">
                        <label className="admin-label" style={{ margin: 0 }}>Platform:</label>
                        <select
                          className="admin-select"
                          value={platformFilter}
                          onChange={(e) => setPlatformFilter(e.target.value)}
                        >
                          <option value="all">All Platforms</option>
                          <option value="upwork">Upwork</option>
                          <option value="fiverr">Fiverr</option>
                          <option value="freelancer.com">Freelancer.com</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="admin-filter-group">
                        <label className="admin-label" style={{ margin: 0 }}>Status:</label>
                        <select
                          className="admin-select"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="hide_rejected">Hide Skipped / Rejected (Clean View)</option>
                          <option value="all">All Statuses (Show All)</option>
                          <option value="new">New</option>
                          <option value="applied">Applied / Submitted</option>
                          <option value="rejected">Skipped / Rejected</option>
                          <option value="hired">Hired</option>
                        </select>
                      </div>

                      <div className="admin-filter-group" style={{ flexGrow: 1 }}>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="Search jobs by keyword..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Jobs Table */}
                    {filteredJobs.length === 0 ? (
                      <p style={{ color: "#64748b", padding: "20px 0" }}>
                        No jobs match the active filters. Click "Paste New Job" to add a job manually from Upwork, Fiverr, or direct reachout.
                      </p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                            <th style={{ padding: "12px 10px" }}>Platform</th>
                            <th style={{ padding: "12px 10px" }}>Title</th>
                            <th style={{ padding: "12px 10px" }}>Match Score</th>
                            <th style={{ padding: "12px 10px" }}>Status</th>
                            <th style={{ padding: "12px 10px" }}>Budget</th>
                            <th style={{ padding: "12px 10px" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredJobs.map((j) => (
                            <tr
                              key={j.id}
                              className="admin-job-row"
                              style={{ borderBottom: "1px solid #f1f5f9" }}
                              onClick={() => handleOpenJobDetail(j)}
                            >
                              <td style={{ padding: "14px 10px" }}>
                                <span className={`admin-badge ${getPlatformBadge(j.platform)}`}>
                                  {j.platform}
                                </span>
                              </td>
                              <td style={{ padding: "14px 10px", fontWeight: "600", color: "#0f172a" }}>
                                {j.title}
                              </td>
                              <td style={{ padding: "14px 10px" }}>
                                <span className={`admin-score-badge ${getScoreBadge(j.match_score)}`}>
                                  {Math.round((j.match_score || 0) * 100)}% Match
                                </span>
                              </td>
                              <td style={{ padding: "14px 10px" }}>
                                <span className={`admin-badge ${getStatusBadge(j.status)}`}>
                                  {j.status}
                                </span>
                              </td>
                              <td style={{ padding: "14px 10px", color: "#475569" }}>
                                {j.budget || "TBD"}
                              </td>
                              <td style={{ padding: "14px 10px" }}>
                                <button
                                  className="admin-btn-secondary"
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenJobDetail(j);
                                  }}
                                >
                                  View / Edit Proposal
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* PROPOSALS TAB */}
                {activeTab === "proposals" && (
                  <div className="admin-card">
                    <h3 style={{ marginTop: 0 }}>Generated Proposals List ({proposals.length})</h3>
                    {proposals.length === 0 ? (
                      <p style={{ color: "#64748b" }}>No proposals generated yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {proposals.map((p) => {
                          const linkedJob = jobs.find((j) => j.id === p.job_id);
                          return (
                            <div key={p.id} style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ fontWeight: "700", fontSize: "15px" }}>
                                  Proposal #{p.id} for: {linkedJob ? linkedJob.title : `Job #${p.job_id}`}
                                </div>
                                <span className={`admin-badge ${p.status === "submitted" ? "admin-status-applied" : "admin-status-new"}`}>
                                  {p.status}
                                </span>
                              </div>
                              <div style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "14px", borderRadius: "6px", fontSize: "13px", border: "1px solid #e2e8f0" }}>
                                {p.edited_text || p.draft_text}
                              </div>
                              {linkedJob && (
                                <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
                                  <button
                                    className="admin-btn-primary"
                                    style={{ padding: "6px 12px", fontSize: "12px" }}
                                    onClick={() => {
                                      setActiveTab("jobs");
                                      handleOpenJobDetail(linkedJob);
                                    }}
                                  >
                                    Open in Review Workspace
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* INQUIRIES TAB */}
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
                                <span className="admin-badge admin-badge-default">{inq.source}</span>
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

                {/* SETTINGS TAB */}
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
                      Backend API Target: <code>{API_BASE}</code>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* PASTE JOB MODAL */}
      {showPasteModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: "600px" }}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0 }}>📋 Paste Job Listing (Upwork / Fiverr / Direct)</h3>
              <button
                style={{ border: "none", background: "none", fontSize: "18px", cursor: "pointer" }}
                onClick={() => setShowPasteModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePasteSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-label">Platform:</label>
                  <select
                    className="admin-select"
                    value={pasteForm.platform}
                    onChange={(e) => setPasteForm({ ...pasteForm, platform: e.target.value })}
                  >
                    <option value="Upwork">Upwork</option>
                    <option value="Fiverr">Fiverr</option>
                    <option value="Other">Other / Direct Client</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Job Title:</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Senior Python Developer for FastAPI & React Project"
                    value={pasteForm.title}
                    onChange={(e) => setPasteForm({ ...pasteForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Full Job Description:</label>
                  <textarea
                    className="admin-textarea"
                    rows={6}
                    placeholder="Paste the full job post details here..."
                    value={pasteForm.description}
                    onChange={(e) => setPasteForm({ ...pasteForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Original Job URL (Optional):</label>
                  <input
                    type="url"
                    className="admin-input"
                    placeholder="https://www.upwork.com/jobs/..."
                    value={pasteForm.url}
                    onChange={(e) => setPasteForm({ ...pasteForm, url: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Target Budget (Optional):</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. $5,000"
                    value={pasteForm.budget}
                    onChange={(e) => setPasteForm({ ...pasteForm, budget: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowPasteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isSubmittingPaste}
                >
                  {isSubmittingPaste ? "Scoring & Drafting Proposal..." : "Submit & Generate Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOB & PROPOSAL DETAIL MODAL / WORKSPACE */}
      {selectedJob && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: "900px" }}>
            <div className="admin-modal-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`admin-badge ${getPlatformBadge(selectedJob.platform)}`}>
                    {selectedJob.platform}
                  </span>
                  <span className={`admin-score-badge ${getScoreBadge(selectedJob.match_score)}`}>
                    {Math.round((selectedJob.match_score || 0) * 100)}% Relevance Match
                  </span>
                  <span className={`admin-badge ${getStatusBadge(selectedJob.status)}`}>
                    Status: {selectedJob.status}
                  </span>
                </div>
                <h2 style={{ margin: "8px 0 0 0", fontSize: "18px", color: "#0f172a" }}>
                  {selectedJob.title}
                </h2>
              </div>
              <button
                style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}
                onClick={() => setSelectedJob(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* LEFT: JOB SPECIFICATIONS */}
              <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "20px" }}>
                <h4 style={{ marginTop: 0, color: "#334155" }}>Job Specifications</h4>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                  Budget: <strong>{selectedJob.budget || "TBD"}</strong> | Posted: {new Date(selectedJob.posted_at || selectedJob.created_at).toLocaleDateString()}
                </div>

                {selectedJob.url && (
                  <div style={{ marginBottom: "16px" }}>
                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600", fontSize: "13px" }}
                    >
                      🔗 Open Original Job Listing ↗
                    </a>
                  </div>
                )}

                <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#1e293b", background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", maxHeight: "350px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
                  {selectedJob.description}
                </div>
              </div>

              {/* RIGHT: PROPOSAL EDITOR WORKSPACE */}
              <div>
                <h4 style={{ marginTop: 0, color: "#334155" }}>AI Proposal Draft Workspace</h4>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px", marginBottom: "12px" }}>
                  Review and customize your tailored application draft before sending to the client.
                </p>

                <textarea
                  className="admin-textarea"
                  rows={13}
                  value={editedProposalText}
                  onChange={(e) => setEditedProposalText(e.target.value)}
                  placeholder="Proposal text..."
                  style={{ fontFamily: "monospace", fontSize: "13px", lineHeight: "1.5" }}
                />

                {/* ACTION BUTTONS */}
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="admin-btn-primary"
                      style={{ flex: 1 }}
                      onClick={handleSaveProposalEdits}
                      disabled={isSavingProposal}
                    >
                      {isSavingProposal ? "Saving..." : "💾 Save Edits"}
                    </button>
                    <button
                      className="admin-btn-secondary"
                      style={{ flex: 1 }}
                      onClick={handleCopyProposal}
                    >
                      📋 Copy to Clipboard
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="admin-btn-success"
                      style={{ flex: 1 }}
                      onClick={() => handleUpdateStatus("applied")}
                    >
                      ✅ Mark as Submitted
                    </button>
                    <button
                      className="admin-btn-danger"
                      style={{ flex: 1 }}
                      onClick={() => handleUpdateStatus("rejected")}
                    >
                      ⏭️ Skip Job
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
    </div>
  );
};

export default Dashboard;
