import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import "./admin.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const Dashboard = () => {
  const { adminUser, adminToken, isAuthenticated, loading, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Admin AI Chat State
  const [adminChatMessages, setAdminChatMessages] = useState([
    {
      role: "assistant",
      content: "Hello Sujita! I'm your Admin AI Assistant. I can search for jobs, list inquiries, fetch proposals, or prepare WhatsApp messages. What do you need?",
    },
  ]);
  const [adminChatInput, setAdminChatInput] = useState("");
  const [adminChatLoading, setAdminChatLoading] = useState(false);
  const [adminConvId, setAdminConvId] = useState(null);

  // Filters for Jobs
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("hide_rejected");
  const [searchQuery, setSearchQuery] = useState("");

  // Job detail modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [editedProposalText, setEditedProposalText] = useState("");
  const [isSavingProposal, setIsSavingProposal] = useState(false);

  // Paste job modal
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteForm, setPasteForm] = useState({ platform: "Upwork", title: "", description: "", url: "", budget: "" });
  const [isSubmittingPaste, setIsSubmittingPaste] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/admin/login"); }, [loading, isAuthenticated, navigate]);

  useEffect(() => { if (isAuthenticated && adminToken) fetchDashboardData(); }, [isAuthenticated, adminToken]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const [inqRes, jobsRes, propRes, apptRes] = await Promise.all([
        fetch(`${API_BASE}/admin/inquiries`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/jobs`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/proposals`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/appointments`, { headers }).catch(() => null),
      ]);
      if (inqRes && inqRes.ok) setInquiries(await inqRes.json());
      if (jobsRes && jobsRes.ok) setJobs(await jobsRes.json());
      if (propRes && propRes.ok) setProposals(await propRes.json());
      if (apptRes && apptRes.ok) setAppointments(await apptRes.json());
    } catch (err) { console.error("Error fetching dashboard data:", err); }
    finally { setDataLoading(false); }
  };

  const handleLogout = () => { logout(); navigate("/admin/login"); };

  const handleOpenJobDetail = (job) => {
    setSelectedJob(job);
    const linkedProposal = proposals.find((p) => p.job_id === job.id);
    setEditedProposalText(linkedProposal ? (linkedProposal.edited_text || linkedProposal.draft_text || "") : "");
  };

  const handlePasteSubmit = async (e) => {
    e.preventDefault();
    if (!pasteForm.title.trim() || !pasteForm.description.trim()) { showToast("Please provide both job title and description."); return; }
    setIsSubmittingPaste(true);
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/paste`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(pasteForm),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed to submit job paste."); }
      const data = await res.json();
      setJobs((prev) => [data.job, ...prev]);
      setProposals((prev) => [data.proposal, ...prev]);
      setShowPasteModal(false);
      setPasteForm({ platform: "Upwork", title: "", description: "", url: "", budget: "" });
      showToast(`Job scored (${data.job.match_score}) & proposal drafted!`);
      handleOpenJobDetail(data.job);
    } catch (err) { showToast(`Error: ${err.message}`); }
    finally { setIsSubmittingPaste(false); }
  };

  const handleSaveProposalEdits = async () => {
    if (!selectedJob) return;
    const linkedProposal = proposals.find((p) => p.job_id === selectedJob.id);
    if (!linkedProposal) return;
    setIsSavingProposal(true);
    try {
      const res = await fetch(`${API_BASE}/admin/proposals/${linkedProposal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ edited_text: editedProposalText }),
      });
      if (!res.ok) throw new Error("Failed to save proposal edits.");
      const updatedProp = await res.json();
      setProposals((prev) => prev.map((p) => (p.id === updatedProp.id ? updatedProp : p)));
      showToast("Proposal edits saved.");
    } catch (err) { showToast(`Error: ${err.message}`); }
    finally { setIsSavingProposal(false); }
  };

  const handleCopyProposal = () => {
    if (!editedProposalText) return;
    navigator.clipboard.writeText(editedProposalText);
    showToast("Proposal text copied to clipboard!");
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedJob) return;
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/${selectedJob.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update job status.");
      const updatedJob = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
      if (newStatus === "applied") fetchDashboardData();
      setSelectedJob(updatedJob);
      showToast(newStatus === "applied" ? "Marked as submitted." : "Job skipped.");
    } catch (err) { showToast(`Error: ${err.message}`); }
  };

  const handleUpdateAppointmentStatus = async (apptId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/admin/appointments/${apptId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update appointment status.");
      const updated = await res.json();
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Appointment ${newStatus}.`);
    } catch (err) { showToast(`Error: ${err.message}`); }
  };

  const handleSendAdminChatMessage = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || adminChatInput;
    if (!promptToSend.trim() || adminChatLoading) return;
    const userMsg = promptToSend.trim();
    if (!customPrompt) setAdminChatInput("");
    setAdminChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setAdminChatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ message: userMsg, conversation_id: adminConvId, is_admin_context: true }),
      });
      if (!res.ok) throw new Error("Admin chat request failed.");
      const data = await res.json();
      setAdminConvId(data.conversation_id);
      setAdminChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      fetchDashboardData();
    } catch (err) {
      setAdminChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally { setAdminChatLoading(false); }
  };

  const renderChatMessageContent = (text) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts = [];
    let lastIndex = 0, match;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      parts.push(<a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]} ↗</a>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return <span style={{ whiteSpace: "pre-wrap" }}>{parts}</span>;
  };

  // Helpers
  const getPlatformBadge = (platform) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("linkedin")) return "admin-badge-default";
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
    if (s === "pending") return "admin-status-pending";
    if (s === "confirmed") return "admin-status-confirmed";
    if (s === "declined") return "admin-status-declined";
    if (s === "rescheduled") return "admin-status-rescheduled";
    return "admin-status-new";
  };

  const filteredJobs = jobs
    .filter((job) => {
      if (platformFilter !== "all" && job.platform.toLowerCase() !== platformFilter.toLowerCase()) return false;
      if (statusFilter === "hide_rejected" && job.status === "rejected") return false;
      if (statusFilter !== "all" && statusFilter !== "hide_rejected" && job.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (job.title || "").toLowerCase().includes(q) || (job.description || "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  // Recent activity for overview
  const recentActivity = [
    ...jobs.slice(0, 3).map((j) => ({ type: "Job", text: j.title, time: j.posted_at || j.created_at })),
    ...inquiries.slice(0, 2).map((i) => ({ type: "Inquiry", text: `${i.name} — ${i.project_type}`, time: i.created_at })),
    ...appointments.slice(0, 2).map((a) => ({ type: "Appointment", text: `${a.name} — ${a.preferred_time || "Flexible"}`, time: a.created_at })),
  ].slice(0, 6);

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "jobs", label: "Jobs", count: jobs.length },
    { id: "proposals", label: "Proposals", count: proposals.length },
    { id: "appointments", label: "Appointments", count: appointments.length },
    { id: "inquiries", label: "Inquiries", count: inquiries.length },
    { id: "admin_chat", label: "Ask Suji" },
    { id: "settings", label: "Settings" },
  ];

  if (loading || !isAuthenticated) {
    return <div className="admin-body"><div className="admin-login-container"><p style={{ color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.78rem" }}>Validating admin session…</p></div></div>;
  }

  const tabTitles = {
    overview: "Overview",
    jobs: "Jobs",
    proposals: "Proposals",
    appointments: "Appointments",
    inquiries: "Inquiries",
    admin_chat: "Ask Suji — Admin Chat",
    settings: "Settings",
  };

  return (
    <div className="admin-body">
      <div className="admin-layout">
        {/* Mobile overlay */}
        <div className={`admin-sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="admin-brand">
            <span className="admin-brand-dot" />
            SUJITA PATEL / ADMIN
          </div>
          <nav className="admin-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              >
                <span>{item.label}</span>
                {item.count !== undefined && <span className="admin-nav-item-count">{item.count}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="admin-main">
          <header className="admin-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <button className="admin-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
                <span /><span /><span />
              </button>
              <h1 className="admin-header-title">{tabTitles[activeTab]}</h1>
            </div>
            <div className="admin-user-menu">
              {activeTab === "jobs" && (
                <button className="admin-btn-primary" onClick={() => setShowPasteModal(true)}>+ Paste a job</button>
              )}
              <span className="admin-user-name"><strong>{adminUser?.username || "Admin"}</strong></span>
              <button className="admin-btn-logout" onClick={handleLogout}>Sign out</button>
            </div>
          </header>

          <div className="admin-content">
            {dataLoading ? (
              <div className="admin-data-panel" style={{ padding: "2rem", textAlign: "center" }}>
                <p style={{ color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.78rem" }}>Loading records…</p>
              </div>
            ) : (
              <>
                {/* ═══ OVERVIEW ═══ */}
                {activeTab === "overview" && (
                  <>
                    <div className="admin-card-grid">
                      <div className="admin-card">
                        <div className="admin-card-header">New Jobs</div>
                        <div className="admin-card-value admin-card-value--orange">{jobs.filter((j) => j.status === "new").length}</div>
                      </div>
                      <div className="admin-card">
                        <div className="admin-card-header">Proposals Drafted</div>
                        <div className="admin-card-value">{proposals.length}</div>
                      </div>
                      <div className="admin-card">
                        <div className="admin-card-header">Pending Appointments</div>
                        <div className="admin-card-value">{appointments.filter((a) => a.status === "pending").length}</div>
                      </div>
                      <div className="admin-card">
                        <div className="admin-card-header">New Inquiries</div>
                        <div className="admin-card-value admin-card-value--orange">{inquiries.length}</div>
                      </div>
                    </div>

                    <div className="admin-data-panel">
                      <div className="admin-data-panel-head">
                        <span className="admin-data-panel-title">Recent Activity</span>
                      </div>
                      <div className="admin-activity-list">
                        {recentActivity.length === 0 && <div style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.72rem" }}>No recent activity.</div>}
                        {recentActivity.map((act, i) => (
                          <div className="admin-activity-item" key={i}>
                            <span className="admin-activity-dot" />
                            <span style={{ color: "var(--bp-orange)", fontWeight: 600 }}>{act.type}</span>
                            <span>{act.text}</span>
                            <span className="admin-activity-time">{act.time ? new Date(act.time).toLocaleDateString() : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="admin-data-panel">
                      <div className="admin-data-panel-head">
                        <span className="admin-data-panel-title">Quick Actions</span>
                      </div>
                      <div style={{ padding: "1.4rem" }}>
                        <div className="admin-quick-actions">
                          <button className="admin-btn-primary" onClick={() => setShowPasteModal(true)}>Paste a job</button>
                          <button className="admin-btn-secondary" onClick={() => { setActiveTab("admin_chat"); handleSendAdminChatMessage(null, "search for new python and ai jobs"); }}>Run job search</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ═══ JOBS ═══ */}
                {activeTab === "jobs" && (
                  <>
                  <section style={{ background: "linear-gradient(135deg, rgba(151,71,255,.12), rgba(255,45,149,.07))", border: "1px solid var(--bp-grid-line)", borderRadius: "16px", padding: "1.2rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <div style={{ fontFamily: "var(--bp-font-mono)", fontSize: ".68rem", color: "var(--bp-orange)", letterSpacing: ".12em" }}>AUTONOMOUS OPPORTUNITY SCOUT</div>
                        <h2 style={{ margin: ".35rem 0", fontSize: "1.2rem" }}>Job Hunter Agent</h2>
                        <p style={{ margin: 0, color: "var(--bp-grey)", fontSize: ".82rem" }}>Discover jobs, score relevance and prepare proposal drafts. Applications are never submitted automatically.</p>
                      </div>
                      <span className="admin-badge" style={{ background: agentStatus?.enabled ? "rgba(16,185,129,.14)" : "rgba(148,163,184,.14)", color: agentStatus?.enabled ? "#10b981" : "var(--bp-grey)" }}>{agentStatus?.enabled ? "● SCHEDULER RUNNING" : "○ SCHEDULER STOPPED"}</span>
                    </div>
                    <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
                      <button className="admin-btn-primary" disabled={agentBusy} onClick={() => controlAgent("start")}>{agentBusy ? "Please wait…" : "Start scheduled agent"}</button>
                      <button className="admin-btn-secondary" disabled={agentBusy || !agentStatus?.enabled} onClick={() => controlAgent("stop")}>Stop agent</button>
                      <button className="admin-btn-secondary" disabled={agentSearchBusy} onClick={runAgentSearch}>{agentSearchBusy ? "Scanning…" : "↻ Scan now"}</button>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <label className="admin-label" htmlFor="job-agent-keywords">Search keywords (comma separated)</label>
                      <input id="job-agent-keywords" className="admin-input" style={{ width: "100%", marginTop: ".35rem" }} value={agentKeywords} onChange={(e) => setAgentKeywords(e.target.value)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: ".7rem", marginTop: "1rem" }}>
                      <div className="admin-card"><div className="admin-card-header">Scan interval</div><div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{agentStatus?.interval_hours || 6}h</div></div>
                      <div className="admin-card"><div className="admin-card-header">Last scan</div><div style={{ fontSize: ".78rem" }}>{agentStatus?.last_run_at ? new Date(agentStatus.last_run_at).toLocaleString() : "Not run yet"}</div></div>
                      <div className="admin-card"><div className="admin-card-header">Next scan</div><div style={{ fontSize: ".78rem" }}>{agentStatus?.next_run_at ? new Date(agentStatus.next_run_at).toLocaleString() : "Not scheduled"}</div></div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".9rem" }}>
                      {Object.entries(agentStatus?.providers || { freelancer_com: true, google_jobs_search: false, direct_linkedin_api: false, direct_upwork_api: false, direct_fiverr_api: false }).map(([key, enabled]) => (
                        <span key={key} className="admin-badge" style={{ color: enabled ? "#10b981" : "var(--bp-grey)" }}>{enabled ? "●" : "○"} {key.replaceAll("_", " ")}</span>
                      ))}
                    </div>
                    {agentStatus?.last_error && <p style={{ color: "#ef4444", fontSize: ".78rem" }}>Last error: {agentStatus.last_error}</p>}
                    <p style={{ color: "var(--bp-grey)", fontSize: ".72rem", margin: ".8rem 0 0" }}>{agentStatus?.note || "Scheduler runs only while this API process is alive. Configure SERPAPI_API_KEY for Google Jobs results."}</p>
                  </section>
                  <div className="admin-data-panel">
                    <div className="admin-filter-bar">
                      <div className="admin-filter-group">
                        <label className="admin-label">Platform</label>
                        <select className="admin-select" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                          <option value="all">All</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="upwork">Upwork</option>
                          <option value="fiverr">Fiverr</option>
                          <option value="freelancer.com">Freelancer.com</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="admin-filter-group">
                        <label className="admin-label">Status</label>
                        <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                          <option value="hide_rejected">Hide Skipped</option>
                          <option value="all">All</option>
                          <option value="new">New</option>
                          <option value="applied">Applied</option>
                          <option value="rejected">Skipped</option>
                          <option value="hired">Hired</option>
                        </select>
                      </div>
                      <div className="admin-filter-group" style={{ flexGrow: 1 }}>
                        <input type="text" className="admin-input" placeholder="Search jobs…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      </div>
                    </div>
                    <div className="admin-table-wrap">
                      {filteredJobs.length === 0 ? (
                        <p style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.72rem" }}>No jobs match the active filters.</p>
                      ) : (
                        <table className="admin-table">
                          <thead>
                            <tr><th>Platform</th><th>Title</th><th>Match</th><th>Status</th><th>Budget</th><th>Date</th></tr>
                          </thead>
                          <tbody className="admin-table-tbody">
                            {filteredJobs.map((j) => (
                              <tr key={j.id} onClick={() => handleOpenJobDetail(j)}>
                                <td><span className={`admin-badge ${getPlatformBadge(j.platform)}`}>{j.platform}</span></td>
                                <td>{j.title}</td>
                                <td><span className={`admin-score-badge ${getScoreBadge(j.match_score)}`}>{Math.round((j.match_score || 0) * 100)}</span></td>
                                <td><span className={`admin-badge ${getStatusBadge(j.status)}`}>{j.status}</span></td>
                                <td style={{ color: "var(--bp-grey)" }}>{j.budget || "TBD"}</td>
                                <td style={{ color: "var(--bp-grey)" }}>{new Date(j.posted_at || j.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                  </>
                )}

                {/* ═══ PROPOSALS ═══ */}
                {activeTab === "proposals" && (
                  <div className="admin-data-panel">
                    <div className="admin-data-panel-head">
                      <span className="admin-data-panel-title">Proposals ({proposals.length})</span>
                    </div>
                    {proposals.length === 0 ? (
                      <p style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.72rem" }}>No proposals generated yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {proposals.map((p) => {
                          const linkedJob = jobs.find((j) => j.id === p.job_id);
                          return (
                            <div key={p.id} style={{ padding: "1.2rem 1.4rem", borderTop: "1px solid var(--bp-grid-line)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                                <span style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.78rem", fontWeight: 600 }}>
                                  #{p.id} — {linkedJob ? linkedJob.title : `Job #${p.job_id}`}
                                </span>
                                <span className={`admin-badge ${p.status === "submitted" ? "admin-status-applied" : "admin-status-new"}`}>{p.status}</span>
                              </div>
                              <div style={{ whiteSpace: "pre-wrap", fontFamily: "var(--bp-font-mono)", fontSize: "0.74rem", color: "var(--bp-ink)", background: "rgba(151,71,255,0.03)", padding: "0.8rem", border: "1px solid var(--bp-grid-line)", maxHeight: "120px", overflow: "hidden" }}>
                                {p.edited_text || p.draft_text}
                              </div>
                              {linkedJob && (
                                <button className="admin-btn-secondary" style={{ marginTop: "0.6rem", fontSize: "0.62rem", padding: "4px 10px" }}
                                  onClick={() => { setActiveTab("jobs"); handleOpenJobDetail(linkedJob); }}>
                                  Open in editor
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ APPOINTMENTS ═══ */}
                {activeTab === "appointments" && (
                  <div className="admin-data-panel">
                    <div className="admin-data-panel-head">
                      <span className="admin-data-panel-title">Appointment Requests ({appointments.length})</span>
                    </div>
                    {appointments.length === 0 ? (
                      <p style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.72rem" }}>No appointment requests yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {appointments.map((appt) => (
                          <div key={appt.id} style={{ padding: "1.2rem 1.4rem", borderTop: "1px solid var(--bp-grid-line)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.8rem" }}>
                              <div>
                                <div style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem" }}>{appt.name}</div>
                                <div style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.68rem", color: "var(--bp-grey)", lineHeight: 1.8 }}>
                                  <div><span style={{ color: "var(--bp-orange)" }}>EMAIL</span> {appt.email}</div>
                                  <div><span style={{ color: "var(--bp-orange)" }}>TIME</span> {appt.preferred_time || "Flexible"}</div>
                                  <div><span style={{ color: "var(--bp-orange)" }}>PURP</span> {appt.purpose || "N/A"}</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.6rem" }}>
                                <span className={`admin-badge ${getStatusBadge(appt.status)}`}>STATUS: {appt.status}</span>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                  <button className="admin-btn-success" style={{ padding: "3px 8px", fontSize: "0.56rem" }} onClick={() => handleUpdateAppointmentStatus(appt.id, "confirmed")}>Confirm</button>
                                  <button className="admin-btn-secondary" style={{ padding: "3px 8px", fontSize: "0.56rem" }} onClick={() => handleUpdateAppointmentStatus(appt.id, "rescheduled")}>Reschedule</button>
                                  <button className="admin-btn-danger" style={{ padding: "3px 8px", fontSize: "0.56rem" }} onClick={() => handleUpdateAppointmentStatus(appt.id, "declined")}>Decline</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ INQUIRIES ═══ */}
                {activeTab === "inquiries" && (
                  <div className="admin-data-panel">
                    <div className="admin-data-panel-head">
                      <span className="admin-data-panel-title">Client Leads ({inquiries.length})</span>
                    </div>
                    <div className="admin-table-wrap">
                      {inquiries.length === 0 ? (
                        <p style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.72rem" }}>No inquiries yet.</p>
                      ) : (
                        <table className="admin-table">
                          <thead>
                            <tr><th>Name</th><th>Email</th><th>Source</th><th>Project Type</th><th>Budget</th><th>Message</th><th>Received</th></tr>
                          </thead>
                          <tbody className="admin-table-tbody">
                            {inquiries.map((inq) => (
                              <tr key={inq.id}>
                                <td style={{ fontWeight: 600 }}>{inq.name}</td>
                                <td>{inq.email}</td>
                                <td><span className="admin-badge admin-badge-default">{inq.source}</span></td>
                                <td>{inq.project_type}</td>
                                <td style={{ color: "var(--bp-grey)" }}>{inq.budget || "N/A"}</td>
                                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--bp-grey)" }}>{inq.message}</td>
                                <td style={{ color: "var(--bp-grey)" }}>{new Date(inq.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ═══ ADMIN CHAT ═══ */}
                {activeTab === "admin_chat" && (
                  <div className="admin-chat-wrap">
                    <div className="admin-chat-head">
                      <h3>ASK SUJI — ADMIN COMMAND PANEL</h3>
                      <p>Tools enabled: trigger_job_search · list_recent_inquiries · get_proposal · send_whatsapp_message</p>
                    </div>
                    <div className="admin-chat-chips">
                      <button className="admin-btn-secondary" style={{ whiteSpace: "nowrap", padding: "4px 10px", fontSize: "0.6rem" }} onClick={() => handleSendAdminChatMessage(null, "search for new python and ai jobs")}>Run a job search</button>
                      <button className="admin-btn-secondary" style={{ whiteSpace: "nowrap", padding: "4px 10px", fontSize: "0.6rem" }} onClick={() => handleSendAdminChatMessage(null, "list recent client inquiries")}>Show recent inquiries</button>
                      <button className="admin-btn-secondary" style={{ whiteSpace: "nowrap", padding: "4px 10px", fontSize: "0.6rem" }} onClick={() => handleSendAdminChatMessage(null, "get proposal for job #1")}>Get proposal draft</button>
                      <button className="admin-btn-secondary" style={{ whiteSpace: "nowrap", padding: "4px 10px", fontSize: "0.6rem" }} onClick={() => handleSendAdminChatMessage(null, "send a whatsapp message to +1234567890 saying Hi Sujita")}>Prepare a WhatsApp message</button>
                    </div>
                    <div className="admin-chat-messages">
                      {adminChatMessages.map((msg, idx) => (
                        <div key={idx} className={`admin-chat-msg admin-chat-msg--${msg.role}`}>
                          {msg.role === "assistant" ? renderChatMessageContent(msg.content) : msg.content}
                        </div>
                      ))}
                      {adminChatLoading && <div className="admin-chat-loading">Executing command…</div>}
                    </div>
                    <form className="admin-chat-form" onSubmit={(e) => handleSendAdminChatMessage(e)}>
                      <input type="text" className="admin-input" placeholder="Type a command…" value={adminChatInput} onChange={(e) => setAdminChatInput(e.target.value)} disabled={adminChatLoading} />
                      <button type="submit" className="admin-btn-primary" disabled={adminChatLoading || !adminChatInput.trim()}>Send</button>
                    </form>
                  </div>
                )}

                {/* ═══ SETTINGS ═══ */}
                {activeTab === "settings" && (
                  <div className="admin-data-panel">
                    <div className="admin-data-panel-head">
                      <span className="admin-data-panel-title">System Configuration</span>
                    </div>
                    <div style={{ padding: "1.4rem" }}>
                      <div className="admin-settings-row"><span>Admin</span><strong>{adminUser?.username}</strong></div>
                      <div className="admin-settings-row"><span>Auth Mode</span><strong>JWT Bearer Token</strong></div>
                      <div className="admin-settings-row"><span>API Target</span><code>{API_BASE}</code></div>
                      <div className="admin-settings-row"><span>Revision</span><strong>2026.11</strong></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ═══ PASTE JOB MODAL ═══ */}
      {showPasteModal && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasteModal(false); }}>
          <div className="admin-modal-content" style={{ maxWidth: "580px" }}>
            <div className="admin-modal-header">
              <h3>PASTE A JOB LISTING</h3>
              <button className="admin-modal-close" onClick={() => setShowPasteModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePasteSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-label">Platform</label>
                  <select className="admin-select" value={pasteForm.platform} onChange={(e) => setPasteForm({ ...pasteForm, platform: e.target.value })}>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Upwork">Upwork</option>
                    <option value="Fiverr">Fiverr</option>
                    <option value="Other">Other / Direct</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Job Title</label>
                  <input type="text" className="admin-input" placeholder="e.g. Senior Python Developer for FastAPI & React" value={pasteForm.title} onChange={(e) => setPasteForm({ ...pasteForm, title: e.target.value })} required />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Full Job Description</label>
                  <textarea className="admin-textarea" rows={6} placeholder="Paste the full job post…" value={pasteForm.description} onChange={(e) => setPasteForm({ ...pasteForm, description: e.target.value })} required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label className="admin-label">Job URL (optional)</label>
                    <input type="url" className="admin-input" placeholder="https://…" value={pasteForm.url} onChange={(e) => setPasteForm({ ...pasteForm, url: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Budget (optional)</label>
                    <input type="text" className="admin-input" placeholder="e.g. $5,000" value={pasteForm.budget} onChange={(e) => setPasteForm({ ...pasteForm, budget: e.target.value })} />
                  </div>
                </div>
              </div>
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--bp-ink)", display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button type="button" className="admin-btn-secondary" onClick={() => setShowPasteModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary" disabled={isSubmittingPaste}>{isSubmittingPaste ? "Scoring…" : "Submit & Generate Proposal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ JOB DETAIL + PROPOSAL EDITOR ═══ */}
      {selectedJob && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedJob(null); }}>
          <div className="admin-modal-content" style={{ maxWidth: "900px" }}>
            <div className="admin-modal-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span className={`admin-badge ${getPlatformBadge(selectedJob.platform)}`}>{selectedJob.platform}</span>
                  <span className={`admin-score-badge ${getScoreBadge(selectedJob.match_score)}`}>{Math.round((selectedJob.match_score || 0) * 100)} MATCH</span>
                  <span className={`admin-badge ${getStatusBadge(selectedJob.status)}`}>{selectedJob.status}</span>
                </div>
                <h3 style={{ margin: "0.5rem 0 0", fontFamily: "var(--bp-font-serif)", fontSize: "1.2rem", fontWeight: 400 }}>{selectedJob.title}</h3>
              </div>
              <button className="admin-modal-close" onClick={() => setSelectedJob(null)}>✕</button>
            </div>
            <div className="admin-modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Left: Job spec */}
              <div style={{ paddingRight: "1.2rem", borderRight: "1px solid var(--bp-grid-line)" }}>
                <div className="admin-label" style={{ marginBottom: "0.5rem" }}>JOB SPECIFICATIONS</div>
                <div style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.68rem", color: "var(--bp-grey)", marginBottom: "0.8rem" }}>
                  Budget: <strong style={{ color: "var(--bp-ink)" }}>{selectedJob.budget || "TBD"}</strong> &nbsp;|&nbsp; Posted: {new Date(selectedJob.posted_at || selectedJob.created_at).toLocaleDateString()}
                </div>
                {selectedJob.url && (
                  <div style={{ marginBottom: "0.8rem" }}>
                    <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.66rem", color: "var(--bp-orange)", textDecoration: "underline" }}>Open original listing ↗</a>
                  </div>
                )}
                <div style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "var(--bp-ink)", background: "rgba(151,71,255,0.03)", padding: "0.8rem", border: "1px solid var(--bp-grid-line)", maxHeight: "340px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
                  {selectedJob.description}
                </div>
              </div>
              {/* Right: Proposal editor */}
              <div>
                <div className="admin-label" style={{ marginBottom: "0.3rem" }}>PROPOSAL DRAFT</div>
                <p style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.58rem", color: "var(--bp-grey)", marginBottom: "0.6rem" }}>Review and customise before sending.</p>
                <textarea className="admin-textarea" rows={13} value={editedProposalText} onChange={(e) => setEditedProposalText(e.target.value)} placeholder="Proposal text…" />
                <div style={{ marginTop: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="admin-btn-primary" style={{ flex: 1 }} onClick={handleSaveProposalEdits} disabled={isSavingProposal}>{isSavingProposal ? "Saving…" : "Save edits"}</button>
                    <button className="admin-btn-secondary" style={{ flex: 1 }} onClick={handleCopyProposal}>Copy to clipboard</button>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="admin-btn-success" style={{ flex: 1 }} onClick={() => handleUpdateStatus("applied")}>Mark as submitted</button>
                    <button className="admin-btn-danger" style={{ flex: 1 }} onClick={() => handleUpdateStatus("rejected")}>Skip</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST ═══ */}
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
    </div>
  );
};

export default Dashboard;
