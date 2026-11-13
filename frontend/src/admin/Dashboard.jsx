import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import "./admin.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const QUICK_PROMPTS = [
  "Find remote Python Developer jobs in Germany posted within the last 7 days, with salary above €40,000.",
  "Find internships in India.",
  "Find AI Engineer jobs requiring less than two years of experience.",
  "Find freelance React projects.",
  "Find jobs offering visa sponsorship.",
];

export const Dashboard = () => {
  const { adminUser, adminToken, isAuthenticated, loading, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("jobs");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [providerHealth, setProviderHealth] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [agentStatus, setAgentStatus] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Natural Language Search State
  const [nlQuery, setNlQuery] = useState("Find remote Python Developer jobs in Germany posted within the last 7 days, with salary above €40,000.");
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgressStep, setSearchProgressStep] = useState("");
  const [parsedFilters, setParsedFilters] = useState(null);
  const [unsupportedExplanations, setUnsupportedExplanations] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Advanced Manual Filters
  const [filterLocation, setFilterLocation] = useState("");
  const [filterIsRemote, setFilterIsRemote] = useState("all");
  const [filterMinSalary, setFilterMinSalary] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("EUR");
  const [filterJobType, setFilterJobType] = useState("all");
  const [filterFreshness, setFilterFreshness] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("hide_rejected");
  const [searchQuery, setSearchQuery] = useState("");

  // Job Detail & Application Assistance Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeAssistanceTab, setActiveAssistanceTab] = useState("proposal");
  const [editedProposalText, setEditedProposalText] = useState("");
  const [editedCoverLetterText, setEditedCoverLetterText] = useState("");
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [isRegeneratingAssistance, setIsRegeneratingAssistance] = useState(false);

  // Scheduler Controls
  const [schedulerInterval, setSchedulerInterval] = useState(6);
  const [isUpdatingScheduler, setIsUpdatingScheduler] = useState(false);

  // Paste job modal
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteForm, setPasteForm] = useState({ platform: "Upwork", title: "", company: "", location: "Remote", description: "", url: "", budget: "" });
  const [isSubmittingPaste, setIsSubmittingPaste] = useState(false);

  // Admin AI Chat State
  const [adminChatMessages, setAdminChatMessages] = useState([
    {
      role: "assistant",
      content: "Hello Sujita! I'm your Autonomous Job Hunter Assistant. You can tell me what opportunities you are scouting (e.g. 'Find remote Python jobs in Germany with salary above €40k'), review match explanations, or prepare custom proposals.",
    },
  ]);
  const [adminChatInput, setAdminChatInput] = useState("");
  const [adminChatLoading, setAdminChatLoading] = useState(false);
  const [adminConvId, setAdminConvId] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3500); };

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/admin/login"); }, [loading, isAuthenticated, navigate]);
  useEffect(() => { if (isAuthenticated && adminToken) fetchDashboardData(); }, [isAuthenticated, adminToken]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const [inqRes, jobsRes, propRes, apptRes, healthRes, logsRes, agentRes] = await Promise.all([
        fetch(`${API_BASE}/admin/inquiries`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/jobs`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/proposals`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/appointments`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/providers/health`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/audit-logs`, { headers }).catch(() => null),
        fetch(`${API_BASE}/admin/jobs/agent/status`, { headers }).catch(() => null),
      ]);
      if (inqRes && inqRes.ok) setInquiries(await inqRes.json());
      if (jobsRes && jobsRes.ok) setJobs(await jobsRes.json());
      if (propRes && propRes.ok) setProposals(await propRes.json());
      if (apptRes && apptRes.ok) setAppointments(await apptRes.json());
      if (healthRes && healthRes.ok) setProviderHealth(await healthRes.json());
      if (logsRes && logsRes.ok) setAuditLogs(await logsRes.json());
      if (agentRes && agentRes.ok) {
        const ag = await agentRes.json();
        setAgentStatus(ag);
        if (ag.interval_hours) setSchedulerInterval(ag.interval_hours);
      }
    } catch (err) { console.error("Error fetching dashboard data:", err); }
    finally { setDataLoading(false); }
  };

  const handleLogout = () => { logout(); navigate("/admin/login"); };

  // Parse natural language query to preview filters
  const handleAnalyzeQuery = async () => {
    if (!nlQuery.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/nl-parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ query: nlQuery }),
      });
      if (!res.ok) throw new Error("Failed to parse query");
      const data = await res.json();
      setParsedFilters(data.parsed_filters);
      setUnsupportedExplanations(data.unsupported_explanations || []);
      showToast("Query analyzed: Structured filters extracted.");
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Run autonomous multi-provider discovery
  const handleExecuteNLSearch = async (e) => {
    if (e) e.preventDefault();
    if (!nlQuery.trim()) { showToast("Please enter a job search prompt."); return; }
    setIsSearching(true);
    setSearchProgressStep("Parsing natural-language filters & querying configured providers…");

    try {
      const res = await fetch(`${API_BASE}/admin/jobs/search-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ query: nlQuery }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Search execution failed");
      }
      const data = await res.json();
      setParsedFilters(data.parsed_filters);
      setUnsupportedExplanations(data.unsupported_explanations || []);

      setSearchProgressStep("Refreshing matched opportunities and application drafts…");
      await fetchDashboardData();
      showToast(`Scout complete! Found ${data.total_fetched || 0} listings, matched ${data.total_matched || 0} targets.`);
    } catch (err) {
      showToast(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
      setSearchProgressStep("");
    }
  };

  const handleOpenJobDetail = (job) => {
    setSelectedJob(job);
    const linkedProposal = proposals.find((p) => p.job_id === job.id);
    setEditedProposalText(linkedProposal ? (linkedProposal.edited_text || linkedProposal.draft_text || "") : "");
    setEditedCoverLetterText(linkedProposal ? (linkedProposal.cover_letter || "") : "");
    setActiveAssistanceTab("proposal");
  };

  const handleSaveProposalEdits = async () => {
    if (!selectedJob) return;
    const linkedProposal = proposals.find((p) => p.job_id === selectedJob.id);
    if (!linkedProposal) return;
    setIsSavingProposal(true);
    try {
      const res = await fetch(`${API_BASE}/admin/proposals/${linkedProposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          edited_text: editedProposalText,
          cover_letter: editedCoverLetterText,
        }),
      });
      if (!res.ok) throw new Error("Failed to save proposal edits.");
      const updatedProp = await res.json();
      setProposals((prev) => prev.map((p) => (p.id === updatedProp.id ? updatedProp : p)));
      showToast("Application edits saved successfully.");
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSavingProposal(false);
    }
  };

  const handleRegenerateAssistance = async () => {
    if (!selectedJob) return;
    setIsRegeneratingAssistance(true);
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/${selectedJob.id}/generate-assistance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error("Failed to regenerate assistance.");
      const data = await res.json();
      const updatedProp = data.proposal;
      setProposals((prev) => prev.map((p) => (p.id === updatedProp.id ? updatedProp : p)));
      setEditedProposalText(updatedProp.edited_text || updatedProp.draft_text || "");
      setEditedCoverLetterText(updatedProp.cover_letter || "");
      showToast("AI Application drafts refreshed.");
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsRegeneratingAssistance(false);
    }
  };

  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status.");
      const updatedJob = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(updatedJob);
      }
      showToast(`Job status updated to ${updatedJob.status}`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job listing?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete job.");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (selectedJob && selectedJob.id === jobId) setSelectedJob(null);
      showToast("Job removed from workspace.");
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(pasteForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to submit job paste.");
      }
      const data = await res.json();
      setJobs((prev) => [data.job, ...prev]);
      setProposals((prev) => [data.proposal, ...prev]);
      setShowPasteModal(false);
      setPasteForm({ platform: "Upwork", title: "", company: "", location: "Remote", description: "", url: "", budget: "" });
      showToast(`Job analyzed (${Math.round((data.job.match_score || 0) * 100)}% Match) & drafts generated!`);
      handleOpenJobDetail(data.job);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmittingPaste(false);
    }
  };

  const controlScheduler = async (action) => {
    setIsUpdatingScheduler(true);
    try {
      const endpoint = action === "start" ? "/admin/jobs/agent/start" : "/admin/jobs/agent/stop";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Failed to ${action} scheduler`);
      const status = await res.json();
      setAgentStatus(status);
      showToast(action === "start" ? "Autonomous scheduler started." : "Scheduler stopped.");
    } catch (err) {
      showToast(`Scheduler error: ${err.message}`);
    } finally {
      setIsUpdatingScheduler(false);
    }
  };

  const handleSaveSchedulerInterval = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/agent/interval`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ interval_hours: parseInt(schedulerInterval) }),
      });
      if (!res.ok) throw new Error("Failed to update interval");
      const status = await res.json();
      setAgentStatus(status);
      showToast(`Scan frequency set to every ${schedulerInterval} hours.`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
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
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ message: userMsg, conversation_id: adminConvId, is_admin_context: true }),
      });
      if (!res.ok) throw new Error("Admin chat request failed.");
      const data = await res.json();
      setAdminConvId(data.conversation_id);
      setAdminChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      fetchDashboardData();
    } catch (err) {
      setAdminChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setAdminChatLoading(false);
    }
  };

  // Helper Badge Renderers
  const getPlatformBadge = (platform) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("adzuna")) return "admin-badge-adzuna";
    if (p.includes("jooble")) return "admin-badge-jooble";
    if (p.includes("remotive")) return "admin-badge-remotive";
    if (p.includes("usajobs")) return "admin-badge-usajobs";
    if (p.includes("google")) return "admin-badge-google";
    if (p.includes("freelancer")) return "admin-badge-freelancer";
    if (p.includes("upwork")) return "admin-badge-upwork";
    if (p.includes("fiverr")) return "admin-badge-fiverr";
    return "admin-badge-default";
  };

  const getScoreBadge = (score) => {
    if (score >= 0.8) return "admin-score-high";
    if (score >= 0.6) return "admin-score-med";
    return "admin-score-low";
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "SUBMITTED" || s === "APPLIED") return "admin-status-applied";
    if (s === "APPROVED") return "admin-status-approved";
    if (s === "PENDING_APPROVAL") return "admin-status-pending";
    if (s === "DRAFTED") return "admin-status-drafted";
    if (s === "SAVED") return "admin-status-saved";
    if (s === "MATCHED") return "admin-status-matched";
    if (s === "REJECTED" || s === "SKIPPED") return "admin-status-rejected";
    if (s === "EXPIRED") return "admin-status-declined";
    return "admin-status-new";
  };

  // Filtered Job Opportunities
  const filteredJobs = jobs
    .filter((job) => {
      // Platform filter
      if (platformFilter !== "all" && !job.platform.toLowerCase().includes(platformFilter.toLowerCase())) return false;
      // Status filter
      if (statusFilter === "hide_rejected" && (job.status === "REJECTED" || job.status === "rejected")) return false;
      if (statusFilter !== "all" && statusFilter !== "hide_rejected") {
        if (job.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
      }
      // Remote filter
      if (filterIsRemote === "remote_only" && !job.is_remote) return false;
      if (filterIsRemote === "onsite_only" && job.is_remote) return false;
      // Location filter
      if (filterLocation.trim()) {
        const lq = filterLocation.toLowerCase();
        if (!(job.location || "").toLowerCase().includes(lq)) return false;
      }
      // Minimum salary filter
      if (filterMinSalary && job.salary_min) {
        if (job.salary_min < parseFloat(filterMinSalary)) return false;
      }
      // Text Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (job.title || "").toLowerCase().includes(q) ||
          (job.company || "").toLowerCase().includes(q) ||
          (job.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  const navItems = [
    { id: "jobs", label: "Job Hunter", count: jobs.length },
    { id: "proposals", label: "Proposals & Drafts", count: proposals.length },
    { id: "providers", label: "Provider Health", count: providerHealth.length },
    { id: "audit_logs", label: "Search History", count: auditLogs.length },
    { id: "appointments", label: "Appointments", count: appointments.length },
    { id: "inquiries", label: "Inquiries", count: inquiries.length },
    { id: "admin_chat", label: "Ask Suji AI" },
    { id: "settings", label: "Settings" },
  ];

  if (loading || !isAuthenticated) {
    return (
      <div className="admin-body">
        <div className="admin-login-container">
          <p style={{ color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.78rem" }}>
            Validating Job Hunter admin session…
          </p>
        </div>
      </div>
    );
  }

  const selectedJobProposal = selectedJob ? proposals.find((p) => p.job_id === selectedJob.id) : null;

  return (
    <div className="admin-body">
      <div className="admin-layout">
        {/* ═══ SIDEBAR ═══ */}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="admin-brand">
            <span className="admin-brand-dot" />
            JOB HUNTER OS
          </div>
          <nav className="admin-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              >
                <span>{item.label}</span>
                {item.count !== undefined && <span className="admin-nav-badge">{item.count}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: "1rem 1.2rem", borderTop: "1px solid rgba(151,71,255,0.1)" }}>
            <div style={{ fontSize: "0.68rem", fontFamily: "var(--bp-font-mono)", color: "var(--bp-grey)", marginBottom: "0.5rem" }}>
              USER: <strong>{adminUser?.username || "suji"}</strong>
            </div>
            <button className="admin-btn-logout" onClick={handleLogout} style={{ width: "100%" }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="admin-main">
          {/* Top Header */}
          <header className="admin-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <button className="admin-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
              <div>
                <h1 className="admin-header-title">
                  {activeTab === "jobs" && "Job Hunter Autonomous Discovery & Application Suite"}
                  {activeTab === "proposals" && "Application Drafts & Proposals"}
                  {activeTab === "providers" && "API Providers Health & Connectivity"}
                  {activeTab === "audit_logs" && "Search History & Audit Logs"}
                  {activeTab === "appointments" && "Visitor Appointment Requests"}
                  {activeTab === "inquiries" && "Client Leads & Inquiries"}
                  {activeTab === "admin_chat" && "Ask Suji AI Command Terminal"}
                  {activeTab === "settings" && "System Configuration"}
                </h1>
                <p className="admin-header-subtitle">
                  Autonomous opportunity scout · Multi-provider aggregator · Human-in-the-loop review
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <button className="admin-btn-secondary" onClick={() => setShowPasteModal(true)}>+ Paste Job</button>
              <button className="admin-btn-secondary" onClick={fetchDashboardData} disabled={dataLoading}>
                {dataLoading ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>
          </header>

          <div className="admin-content">
            {/* ═══ JOBS TAB (PRIMARY OBJECTIVE) ═══ */}
            {activeTab === "jobs" && (
              <>
                {/* Autonomous Scout NL Search Hero */}
                <section style={{
                  background: "linear-gradient(135deg, rgba(151,71,255,0.12), rgba(255,46,147,0.08))",
                  border: "1px solid rgba(151,71,255,0.22)",
                  borderRadius: "20px",
                  padding: "1.4rem",
                  marginBottom: "1.2rem",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.37)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <div style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.66rem", color: "#C77DFF", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        AUTONOMOUS JOB DISCOVERY & APPLICATION WORKSPACE
                      </div>
                      <h2 style={{ margin: "0.3rem 0", fontSize: "1.35rem", fontWeight: 700 }}>
                        Natural-Language Opportunity Scout
                      </h2>
                      <p style={{ margin: 0, color: "var(--bp-grey)", fontSize: "0.82rem" }}>
                        Searches configured providers (Adzuna, Jooble, SerpApi Google Jobs, Remotive, USAJOBS, Freelancer.com), deduplicates listings, computes match scores, and prepares tailored application drafts.
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span className="admin-badge" style={{
                        background: agentStatus?.enabled ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.15)",
                        color: agentStatus?.enabled ? "#10b981" : "var(--bp-grey)"
                      }}>
                        {agentStatus?.enabled ? "● SCHEDULER ACTIVE" : "○ SCHEDULER PAUSED"}
                      </span>
                      {agentStatus?.enabled ? (
                        <button className="admin-btn-secondary" style={{ padding: "4px 10px", fontSize: "0.65rem" }} onClick={() => controlScheduler("stop")} disabled={isUpdatingScheduler}>
                          Pause
                        </button>
                      ) : (
                        <button className="admin-btn-primary" style={{ padding: "4px 10px", fontSize: "0.65rem" }} onClick={() => controlScheduler("start")} disabled={isUpdatingScheduler}>
                          Activate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* NL Search Input Form */}
                  <form onSubmit={handleExecuteNLSearch}>
                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: "280px" }}>
                        <input
                          type="text"
                          className="admin-input"
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            fontSize: "0.92rem",
                            borderRadius: "12px",
                            background: "rgba(18,16,32,0.85)",
                            border: "1px solid rgba(151,71,255,0.3)"
                          }}
                          placeholder="e.g. Find remote Python Developer jobs in Germany posted within the last 7 days, with salary above €40,000."
                          value={nlQuery}
                          onChange={(e) => setNlQuery(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="admin-btn-primary" disabled={isSearching} style={{ padding: "10px 20px" }}>
                        {isSearching ? "Scouting Providers…" : "⚡ Scout Now"}
                      </button>
                      <button type="button" className="admin-btn-secondary" onClick={handleAnalyzeQuery}>
                        Analyze Filters
                      </button>
                      <button type="button" className="admin-btn-secondary" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                        {showAdvancedFilters ? "Hide Filters ▲" : "Manual Filters ▼"}
                      </button>
                    </div>
                  </form>

                  {/* Sample Query Chips */}
                  <div style={{ marginTop: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.64rem", color: "var(--bp-grey)" }}>Try sample:</span>
                    {QUICK_PROMPTS.map((q, idx) => (
                      <button
                        key={idx}
                        className="admin-btn-secondary"
                        style={{ padding: "3px 8px", fontSize: "0.6rem", borderRadius: "8px" }}
                        onClick={() => { setNlQuery(q); }}
                      >
                        {q.length > 40 ? q.slice(0, 38) + "…" : q}
                      </button>
                    ))}
                  </div>

                  {/* Search Progress State */}
                  {isSearching && (
                    <div style={{
                      marginTop: "1rem",
                      padding: "0.8rem 1rem",
                      background: "rgba(151,71,255,0.1)",
                      border: "1px solid rgba(151,71,255,0.25)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem"
                    }}>
                      <div className="admin-brand-dot" style={{ animation: "pulse 1.2s infinite" }} />
                      <span style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.78rem", color: "#C77DFF" }}>
                        {searchProgressStep}
                      </span>
                    </div>
                  )}

                  {/* Parsed Filters Display */}
                  {parsedFilters && (
                    <div style={{
                      marginTop: "1rem",
                      padding: "0.9rem",
                      background: "rgba(18,16,32,0.7)",
                      border: "1px solid rgba(151,71,255,0.18)",
                      borderRadius: "12px"
                    }}>
                      <div style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.65rem", color: "#C77DFF", marginBottom: "0.5rem" }}>
                        STRUCTURED FILTERS EXTRACTED:
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {parsedFilters.keywords && (
                          <span className="admin-badge admin-badge-default">Keywords: {parsedFilters.keywords.join(", ")}</span>
                        )}
                        {parsedFilters.location && (
                          <span className="admin-badge admin-badge-default">Location: {parsedFilters.location} ({parsedFilters.country_code || "intl"})</span>
                        )}
                        {parsedFilters.is_remote !== null && parsedFilters.is_remote !== undefined && (
                          <span className="admin-badge admin-badge-remotive">Remote: {parsedFilters.is_remote ? "Yes" : "On-site/Hybrid"}</span>
                        )}
                        {parsedFilters.salary_min && (
                          <span className="admin-badge admin-badge-adzuna">Min Salary: {parsedFilters.salary_currency || "EUR"} {Number(parsedFilters.salary_min).toLocaleString()}</span>
                        )}
                        {parsedFilters.max_days_old && (
                          <span className="admin-badge admin-badge-default">Freshness: ≤ {parsedFilters.max_days_old} days</span>
                        )}
                        {parsedFilters.experience_level && (
                          <span className="admin-badge admin-badge-default">Experience: {parsedFilters.experience_level}</span>
                        )}
                        {parsedFilters.visa_sponsorship && (
                          <span className="admin-badge admin-badge-default">Visa: Preferred</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Unsupported Filters Explanation Alert */}
                  {unsupportedExplanations && unsupportedExplanations.length > 0 && (
                    <div style={{
                      marginTop: "0.8rem",
                      padding: "0.8rem 1rem",
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      borderRadius: "10px",
                      fontSize: "0.75rem",
                      color: "#fbbf24"
                    }}>
                      <strong style={{ display: "block", marginBottom: "0.3rem" }}>Provider Filter Translation Notes:</strong>
                      <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                        {unsupportedExplanations.map((note, i) => (
                          <li key={i} style={{ marginBottom: "0.2rem" }}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Advanced Manual Filters Drawer */}
                  {showAdvancedFilters && (
                    <div style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "rgba(18,16,32,0.9)",
                      border: "1px solid rgba(151,71,255,0.2)",
                      borderRadius: "12px",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.8rem"
                    }}>
                      <div>
                        <label className="admin-label">Location</label>
                        <input className="admin-input" style={{ width: "100%" }} placeholder="e.g. Germany, Berlin" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
                      </div>
                      <div>
                        <label className="admin-label">Workplace</label>
                        <select className="admin-select" value={filterIsRemote} onChange={(e) => setFilterIsRemote(e.target.value)}>
                          <option value="all">All (Remote + On-site)</option>
                          <option value="remote_only">Remote Only</option>
                          <option value="onsite_only">On-site Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="admin-label">Min Salary</label>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <input className="admin-input" style={{ width: "65%" }} type="number" placeholder="40000" value={filterMinSalary} onChange={(e) => setFilterMinSalary(e.target.value)} />
                          <select className="admin-select" style={{ width: "35%" }} value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)}>
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="INR">INR (₹)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="admin-label">Employment Type</label>
                        <select className="admin-select" value={filterJobType} onChange={(e) => setFilterJobType(e.target.value)}>
                          <option value="all">All Types</option>
                          <option value="full-time">Full-Time</option>
                          <option value="freelance">Freelance / Contract</option>
                          <option value="internship">Internship</option>
                          <option value="part-time">Part-Time</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Provider Connectivity Quick Strip */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.64rem", color: "var(--bp-grey)" }}>Providers:</span>
                    {providerHealth.map((p) => {
                      const hasKey = p.is_enabled;
                      return (
                        <span
                          key={p.platform}
                          className={`admin-badge ${getPlatformBadge(p.platform)}`}
                          style={{
                            opacity: hasKey ? 1 : 0.65,
                            border: hasKey ? "1px solid rgba(16,185,129,0.3)" : "1px dashed rgba(245,158,11,0.4)"
                          }}
                          title={hasKey ? "Connected & Healthy" : `Missing: ${(p.missing_credentials || []).join(", ")}`}
                        >
                          <span style={{ color: hasKey ? "#10b981" : "#f59e0b", marginRight: "4px" }}>
                            {hasKey ? "●" : "○"}
                          </span>
                          {p.platform} {hasKey ? "" : "(Needs Key)"}
                        </span>
                      );
                    })}
                  </div>
                </section>

                {/* Job Opportunities Panel */}
                <div className="admin-data-panel">
                  {/* Filter Toolbar */}
                  <div className="admin-filter-bar">
                    <div className="admin-filter-group">
                      <label className="admin-label">Platform</label>
                      <select className="admin-select" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                        <option value="all">All Platforms</option>
                        <option value="adzuna">Adzuna</option>
                        <option value="jooble">Jooble</option>
                        <option value="google">Google Jobs</option>
                        <option value="remotive">Remotive</option>
                        <option value="usajobs">USAJOBS</option>
                        <option value="freelancer">Freelancer.com</option>
                        <option value="upwork">Upwork</option>
                        <option value="fiverr">Fiverr</option>
                      </select>
                    </div>

                    <div className="admin-filter-group">
                      <label className="admin-label">Status</label>
                      <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="hide_rejected">Active (Hide Skipped)</option>
                        <option value="all">All Statuses</option>
                        <option value="DISCOVERED">Discovered</option>
                        <option value="MATCHED">Matched (High Fit)</option>
                        <option value="SAVED">Saved / Shortlisted</option>
                        <option value="DRAFTED">Drafted</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="APPROVED">Approved for Apply</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="REJECTED">Skipped / Rejected</option>
                      </select>
                    </div>

                    <div className="admin-filter-group" style={{ flexGrow: 1 }}>
                      <label className="admin-label">Search in Results</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="Filter by title, company, or keywords…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Jobs Table */}
                  <div className="admin-table-wrap">
                    {filteredJobs.length === 0 ? (
                      <div style={{ padding: "3rem 1.4rem", textAlign: "center", color: "var(--bp-grey)" }}>
                        <p style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                          No job opportunities match active filters.
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--bp-grey)", maxWidth: "450px", margin: "0 auto 1.2rem" }}>
                          Run a natural-language search query above (e.g. "Find remote Python Developer jobs in Germany") or paste a listing manually.
                        </p>
                        <button className="admin-btn-primary" onClick={handleExecuteNLSearch}>
                          Run Default Scout
                        </button>
                      </div>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Platform</th>
                            <th>Role & Company</th>
                            <th>Fit Score</th>
                            <th>Status</th>
                            <th>Location / Salary</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="admin-table-tbody">
                          {filteredJobs.map((j) => (
                            <tr key={j.id}>
                              <td>
                                <span className={`admin-badge ${getPlatformBadge(j.platform)}`}>
                                  {j.platform}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: "#FFFFFF", cursor: "pointer" }} onClick={() => handleOpenJobDetail(j)}>
                                  {j.title}
                                </div>
                                <div style={{ fontSize: "0.68rem", color: "var(--bp-grey)", display: "flex", gap: "0.5rem", marginTop: "2px" }}>
                                  {j.company && <span>🏢 {j.company}</span>}
                                  {j.is_remote && <span style={{ color: "#38bdf8" }}>🌐 Remote</span>}
                                  {j.job_type && <span>💼 {j.job_type}</span>}
                                </div>
                              </td>
                              <td>
                                <span className={`admin-score-badge ${getScoreBadge(j.match_score)}`}>
                                  {Math.round((j.match_score || 0) * 100)}%
                                </span>
                              </td>
                              <td>
                                <span className={`admin-badge ${getStatusBadge(j.status)}`}>
                                  {j.status}
                                </span>
                              </td>
                              <td style={{ fontSize: "0.72rem", color: "var(--bp-grey)" }}>
                                <div>{j.budget || (j.salary_min ? `${j.salary_currency || "EUR"} ${Number(j.salary_min).toLocaleString()}` : "TBD")}</div>
                                <div style={{ fontSize: "0.64rem" }}>{j.location || "Remote / Unspecified"}</div>
                              </td>
                              <td style={{ color: "var(--bp-grey)", fontSize: "0.7rem" }}>
                                {new Date(j.posted_at || j.created_at).toLocaleDateString()}
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "0.3rem" }}>
                                  <button
                                    className="admin-btn-secondary"
                                    style={{ padding: "3px 7px", fontSize: "0.58rem" }}
                                    onClick={() => handleOpenJobDetail(j)}
                                    title="Open application draft & explainable fit"
                                  >
                                    View Fit & Draft
                                  </button>
                                  {j.status !== "APPROVED" && j.status !== "SUBMITTED" && (
                                    <button
                                      className="admin-btn-success"
                                      style={{ padding: "3px 7px", fontSize: "0.58rem" }}
                                      onClick={() => handleUpdateJobStatus(j.id, "APPROVED")}
                                      title="Approve for submission"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  {j.status !== "REJECTED" && (
                                    <button
                                      className="admin-btn-danger"
                                      style={{ padding: "3px 7px", fontSize: "0.58rem" }}
                                      onClick={() => handleUpdateJobStatus(j.id, "REJECTED")}
                                      title="Skip / Reject"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ═══ PROVIDER HEALTH TAB ═══ */}
            {activeTab === "providers" && (
              <div className="admin-data-panel">
                <div className="admin-data-panel-head">
                  <span className="admin-data-panel-title">Provider Health & Integration Matrix</span>
                  <button className="admin-btn-secondary" onClick={fetchDashboardData}>Recheck Health</button>
                </div>
                <div style={{ padding: "1.4rem" }}>
                  <p style={{ color: "var(--bp-grey)", fontSize: "0.82rem", margin: "0 0 1.2rem" }}>
                    Job Hunter queries all enabled providers. When API credentials are not provided, the provider is cleanly disabled without crashing the service.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
                    {providerHealth.map((p) => {
                      const enabled = p.is_enabled;
                      const missing = p.missing_credentials || [];
                      return (
                        <div
                          key={p.platform}
                          style={{
                            background: "rgba(18,16,32,0.8)",
                            border: `1px solid ${enabled ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                            borderRadius: "14px",
                            padding: "1.2rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{p.platform}</span>
                            <span className="admin-badge" style={{
                              background: enabled ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                              color: enabled ? "#10b981" : "#f59e0b"
                            }}>
                              {enabled ? "● READY" : "○ DISABLED"}
                            </span>
                          </div>

                          <div style={{ fontSize: "0.72rem", color: "var(--bp-grey)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
                            <div>Sync: <strong>{p.last_sync_at ? new Date(p.last_sync_at).toLocaleString() : "Awaiting first query"}</strong></div>
                            {p.last_error && <div style={{ color: "#ef4444" }}>Error: {p.last_error}</div>}
                          </div>

                          {missing.length > 0 ? (
                            <div style={{ padding: "0.6rem", background: "rgba(245,158,11,0.06)", borderRadius: "8px", border: "1px dashed rgba(245,158,11,0.3)" }}>
                              <span style={{ fontSize: "0.65rem", color: "#f59e0b", display: "block", marginBottom: "0.2rem", fontWeight: 600 }}>
                                Required environment variables:
                              </span>
                              {missing.map((key) => (
                                <code key={key} style={{ display: "inline-block", background: "rgba(0,0,0,0.4)", color: "#f59e0b", padding: "2px 6px", borderRadius: "4px", fontSize: "0.68rem", marginRight: "4px" }}>
                                  {key}
                                </code>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.68rem", color: "#10b981" }}>
                              ✓ Configured and ready for queries.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ AUDIT LOGS TAB ═══ */}
            {activeTab === "audit_logs" && (
              <div className="admin-data-panel">
                <div className="admin-data-panel-head">
                  <span className="admin-data-panel-title">Search History & Audit Logs</span>
                </div>
                <div className="admin-table-wrap">
                  {auditLogs.length === 0 ? (
                    <p style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.75rem" }}>
                      No search audit logs recorded yet.
                    </p>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr><th>Timestamp</th><th>Query Text</th><th>Parsed Filters</th><th>Found / Matched</th></tr>
                      </thead>
                      <tbody className="admin-table-tbody">
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td style={{ color: "var(--bp-grey)", fontSize: "0.72rem" }}>
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 600 }}>{log.query_text}</td>
                            <td style={{ fontSize: "0.68rem", color: "var(--bp-grey)" }}>
                              {log.parsed_filters ? Object.entries(log.parsed_filters).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" | ") : "Default"}
                            </td>
                            <td>
                              <span className="admin-badge admin-badge-default">
                                {log.total_found} found · {log.total_matched} matched
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ═══ PROPOSALS TAB ═══ */}
            {activeTab === "proposals" && (
              <div className="admin-data-panel">
                <div className="admin-data-panel-head">
                  <span className="admin-data-panel-title">Application Drafts & Proposals ({proposals.length})</span>
                </div>
                {proposals.length === 0 ? (
                  <p style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.75rem" }}>
                    No proposals generated yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {proposals.map((p) => {
                      const linkedJob = jobs.find((j) => j.id === p.job_id);
                      return (
                        <div key={p.id} style={{ padding: "1.2rem 1.4rem", borderTop: "1px solid var(--bp-grid-line)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                            <div>
                              <span style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.82rem", fontWeight: 600 }}>
                                #{p.id} — {linkedJob ? linkedJob.title : `Job #${p.job_id}`}
                              </span>
                              {linkedJob?.company && (
                                <span style={{ fontSize: "0.72rem", color: "var(--bp-grey)", marginLeft: "0.6rem" }}>
                                  🏢 {linkedJob.company}
                                </span>
                              )}
                            </div>
                            <span className={`admin-badge ${getStatusBadge(p.status)}`}>{p.status}</span>
                          </div>

                          <div style={{
                            whiteSpace: "pre-wrap",
                            fontFamily: "var(--bp-font-mono)",
                            fontSize: "0.74rem",
                            color: "var(--bp-ink)",
                            background: "rgba(151,71,255,0.03)",
                            padding: "0.8rem",
                            border: "1px solid var(--bp-grid-line)",
                            maxHeight: "120px",
                            overflow: "hidden",
                            borderRadius: "8px"
                          }}>
                            {p.edited_text || p.draft_text}
                          </div>

                          {linkedJob && (
                            <button
                              className="admin-btn-secondary"
                              style={{ marginTop: "0.6rem", fontSize: "0.65rem", padding: "4px 12px" }}
                              onClick={() => { setActiveTab("jobs"); handleOpenJobDetail(linkedJob); }}
                            >
                              Open in Application Suite ↗
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ APPOINTMENTS TAB ═══ */}
            {activeTab === "appointments" && (
              <div className="admin-data-panel">
                <div className="admin-data-panel-head">
                  <span className="admin-data-panel-title">Appointment Requests ({appointments.length})</span>
                </div>
                <div style={{ padding: "1.4rem" }}>
                  {appointments.length === 0 ? (
                    <p style={{ color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.75rem" }}>
                      No appointment requests yet.
                    </p>
                  ) : (
                    appointments.map((appt) => (
                      <div key={appt.id} style={{ padding: "1rem", borderBottom: "1px solid var(--bp-grid-line)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{appt.name}</strong>
                          <span className="admin-badge admin-badge-default">{appt.status}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--bp-grey)", marginTop: "0.3rem" }}>
                          {appt.email} · {appt.preferred_time || "Flexible"} · {appt.purpose}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ═══ INQUIRIES TAB ═══ */}
            {activeTab === "inquiries" && (
              <div className="admin-data-panel">
                <div className="admin-data-panel-head">
                  <span className="admin-data-panel-title">Client Leads ({inquiries.length})</span>
                </div>
                <div className="admin-table-wrap">
                  {inquiries.length === 0 ? (
                    <p style={{ padding: "1.4rem", color: "var(--bp-grey)", fontFamily: "var(--bp-font-mono)", fontSize: "0.75rem" }}>No inquiries yet.</p>
                  ) : (
                    <table className="admin-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Budget</th><th>Message</th></tr></thead>
                      <tbody className="admin-table-tbody">
                        {inquiries.map((inq) => (
                          <tr key={inq.id}>
                            <td style={{ fontWeight: 600 }}>{inq.name}</td>
                            <td>{inq.email}</td>
                            <td>{inq.project_type}</td>
                            <td>{inq.budget || "N/A"}</td>
                            <td>{inq.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ═══ ADMIN CHAT TAB ═══ */}
            {activeTab === "admin_chat" && (
              <div className="admin-chat-wrap">
                <div className="admin-chat-head">
                  <h3>ASK SUJI — AUTONOMOUS OPPORTUNITY AGENT</h3>
                  <p>Tools: trigger_job_search · list_recent_inquiries · get_proposal · send_whatsapp_message</p>
                </div>
                <div className="admin-chat-chips">
                  <button className="admin-btn-secondary" style={{ padding: "4px 10px", fontSize: "0.62rem" }} onClick={() => handleSendAdminChatMessage(null, "Find remote Python Developer jobs in Germany with salary above €40,000")}>
                    Scout remote Python jobs in Germany
                  </button>
                  <button className="admin-btn-secondary" style={{ padding: "4px 10px", fontSize: "0.62rem" }} onClick={() => handleSendAdminChatMessage(null, "list recent client inquiries")}>
                    Show client inquiries
                  </button>
                  <button className="admin-btn-secondary" style={{ padding: "4px 10px", fontSize: "0.62rem" }} onClick={() => handleSendAdminChatMessage(null, "get proposal for job #1")}>
                    Get proposal draft
                  </button>
                </div>
                <div className="admin-chat-messages">
                  {adminChatMessages.map((msg, idx) => (
                    <div key={idx} className={`admin-chat-msg admin-chat-msg--${msg.role}`}>
                      <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                    </div>
                  ))}
                  {adminChatLoading && <div className="admin-chat-loading">Executing command…</div>}
                </div>
                <form className="admin-chat-form" onSubmit={(e) => handleSendAdminChatMessage(e)}>
                  <input type="text" className="admin-input" placeholder="Enter a natural-language search instruction or command…" value={adminChatInput} onChange={(e) => setAdminChatInput(e.target.value)} disabled={adminChatLoading} />
                  <button type="submit" className="admin-btn-primary" disabled={adminChatLoading || !adminChatInput.trim()}>Send</button>
                </form>
              </div>
            )}

            {/* ═══ SETTINGS TAB ═══ */}
            {activeTab === "settings" && (
              <div className="admin-data-panel">
                <div className="admin-data-panel-head">
                  <span className="admin-data-panel-title">System & Scheduler Settings</span>
                </div>
                <div style={{ padding: "1.4rem" }}>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>Autonomous Scheduler Configuration</h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--bp-grey)", marginBottom: "0.8rem" }}>
                      Configures the autonomous background job search interval. Scheduled discovery runs safely without duplicate worker execution.
                    </p>
                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                      <label className="admin-label" style={{ margin: 0 }}>Scan Frequency:</label>
                      <select className="admin-select" value={schedulerInterval} onChange={(e) => setSchedulerInterval(e.target.value)} style={{ width: "160px" }}>
                        <option value={1}>Every 1 hour</option>
                        <option value={3}>Every 3 hours</option>
                        <option value={6}>Every 6 hours</option>
                        <option value={12}>Every 12 hours</option>
                        <option value={24}>Every 24 hours</option>
                      </select>
                      <button className="admin-btn-primary" onClick={handleSaveSchedulerInterval}>Save Interval</button>
                    </div>
                  </div>

                  <div className="admin-settings-row"><span>Admin User</span><strong>{adminUser?.username}</strong></div>
                  <div className="admin-settings-row"><span>Auth Mode</span><strong>JWT Bearer Token</strong></div>
                  <div className="admin-settings-row"><span>API Target</span><code>{API_BASE}</code></div>
                  <div className="admin-settings-row"><span>Active Service</span><strong>Job Hunter 2026.11</strong></div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══ PASTE JOB MODAL ═══ */}
      {showPasteModal && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasteModal(false); }}>
          <div className="admin-modal-content" style={{ maxWidth: "600px" }}>
            <div className="admin-modal-header">
              <h3>MANUAL JOB PASTE SUBMISSION</h3>
              <button className="admin-modal-close" onClick={() => setShowPasteModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePasteSubmit}>
              <div className="admin-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label className="admin-label">Platform</label>
                    <select className="admin-select" value={pasteForm.platform} onChange={(e) => setPasteForm({ ...pasteForm, platform: e.target.value })}>
                      <option value="Upwork">Upwork</option>
                      <option value="Fiverr">Fiverr</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Direct">Direct / Other</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Company Name (optional)</label>
                    <input type="text" className="admin-input" placeholder="e.g. Acme Tech" value={pasteForm.company} onChange={(e) => setPasteForm({ ...pasteForm, company: e.target.value })} />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Job Title</label>
                  <input type="text" className="admin-input" placeholder="e.g. Senior Python & FastAPI Developer" value={pasteForm.title} onChange={(e) => setPasteForm({ ...pasteForm, title: e.target.value })} required />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Full Job Description</label>
                  <textarea className="admin-textarea" rows={6} placeholder="Paste the job specifications here…" value={pasteForm.description} onChange={(e) => setPasteForm({ ...pasteForm, description: e.target.value })} required />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label className="admin-label">Job URL (optional)</label>
                    <input type="url" className="admin-input" placeholder="https://…" value={pasteForm.url} onChange={(e) => setPasteForm({ ...pasteForm, url: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Budget / Salary (optional)</label>
                    <input type="text" className="admin-input" placeholder="e.g. €50,000 or $3,000" value={pasteForm.budget} onChange={(e) => setPasteForm({ ...pasteForm, budget: e.target.value })} />
                  </div>
                </div>
              </div>

              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--bp-grid-line)", display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button type="button" className="admin-btn-secondary" onClick={() => setShowPasteModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary" disabled={isSubmittingPaste}>
                  {isSubmittingPaste ? "Analyzing & Drafting…" : "Submit & Generate Application Suite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ JOB DETAIL + APPLICATION ASSISTANCE SUITE MODAL ═══ */}
      {selectedJob && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedJob(null); }}>
          <div className="admin-modal-content" style={{ maxWidth: "980px" }}>
            {/* Modal Header */}
            <div className="admin-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                  <span className={`admin-badge ${getPlatformBadge(selectedJob.platform)}`}>{selectedJob.platform}</span>
                  <span className={`admin-score-badge ${getScoreBadge(selectedJob.match_score)}`}>
                    {Math.round((selectedJob.match_score || 0) * 100)}% RELEVANCE
                  </span>
                  <span className={`admin-badge ${getStatusBadge(selectedJob.status)}`}>{selectedJob.status}</span>
                </div>
                <h3 style={{ margin: "0.2rem 0", fontSize: "1.25rem", fontWeight: 700 }}>{selectedJob.title}</h3>
                <div style={{ fontSize: "0.78rem", color: "var(--bp-grey)" }}>
                  {selectedJob.company && <span>🏢 {selectedJob.company} &nbsp;|&nbsp; </span>}
                  <span>📍 {selectedJob.location || "Remote"} &nbsp;|&nbsp; </span>
                  <span>💰 {selectedJob.budget || (selectedJob.salary_min ? `${selectedJob.salary_currency || "EUR"} ${Number(selectedJob.salary_min).toLocaleString()}` : "Negotiable")}</span>
                </div>
              </div>
              <button className="admin-modal-close" onClick={() => setSelectedJob(null)}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="admin-modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: "1.5rem" }}>
              {/* Left Column: Job Spec + Match Explanation */}
              <div style={{ paddingRight: "1rem", borderRight: "1px solid var(--bp-grid-line)", overflowY: "auto", maxHeight: "600px" }}>
                {/* Match Criteria Breakdown */}
                <div style={{ marginBottom: "1.2rem", padding: "1rem", background: "rgba(151,71,255,0.06)", borderRadius: "12px", border: "1px solid rgba(151,71,255,0.18)" }}>
                  <div className="admin-label" style={{ marginBottom: "0.4rem", color: "#C77DFF" }}>
                    EXPLAINABLE MATCH CRITERIA
                  </div>
                  {selectedJob.match_explanation?.match_reason && (
                    <p style={{ fontSize: "0.78rem", color: "#FFFFFF", marginBottom: "0.8rem", lineHeight: 1.5 }}>
                      {selectedJob.match_explanation.match_reason}
                    </p>
                  )}

                  {/* Criteria Gauges */}
                  {selectedJob.match_explanation?.criteria_breakdown && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.8rem" }}>
                      {Object.entries(selectedJob.match_explanation.criteria_breakdown).map(([crit, val]) => (
                        <div key={crit} style={{ fontSize: "0.68rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--bp-grey)" }}>
                            <span>{crit.replaceAll("_", " ")}</span>
                            <span>{Math.round(val * 100)}%</span>
                          </div>
                          <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "3px" }}>
                            <div style={{ width: `${Math.round(val * 100)}%`, height: "100%", background: "#9747FF", borderRadius: "2px" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills Alignment & Gap */}
                  {selectedJob.match_explanation?.matching_skills && selectedJob.match_explanation.matching_skills.length > 0 && (
                    <div style={{ marginBottom: "0.6rem" }}>
                      <span style={{ fontSize: "0.65rem", color: "#10b981", display: "block", marginBottom: "0.2rem" }}>MATCHING SKILLS:</span>
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {selectedJob.match_explanation.matching_skills.map((s) => (
                          <span key={s} className="admin-badge admin-badge-freelancer" style={{ fontSize: "0.6rem", padding: "2px 6px" }}>✓ {s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedJob.match_explanation?.missing_skills && selectedJob.match_explanation.missing_skills.length > 0 && (
                    <div>
                      <span style={{ fontSize: "0.65rem", color: "#f59e0b", display: "block", marginBottom: "0.2rem" }}>SKILLS GAP / SECONDARY:</span>
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {selectedJob.match_explanation.missing_skills.map((s) => (
                          <span key={s} className="admin-badge" style={{ fontSize: "0.6rem", padding: "2px 6px", color: "#f59e0b", border: "1px dashed rgba(245,158,11,0.4)" }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Job Link */}
                {selectedJob.url && (
                  <div style={{ marginBottom: "0.8rem" }}>
                    <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--bp-font-mono)", fontSize: "0.72rem", color: "#C77DFF", textDecoration: "underline" }}>
                      View original listing on {selectedJob.platform} ↗
                    </a>
                  </div>
                )}

                {/* Full Description */}
                <div className="admin-label" style={{ marginBottom: "0.4rem" }}>JOB DESCRIPTION</div>
                <div style={{
                  fontSize: "0.8rem",
                  lineHeight: 1.6,
                  color: "var(--bp-ink)",
                  background: "rgba(18,16,32,0.6)",
                  padding: "0.9rem",
                  borderRadius: "10px",
                  border: "1px solid var(--bp-grid-line)",
                  whiteSpace: "pre-wrap"
                }}>
                  {selectedJob.description}
                </div>
              </div>

              {/* Right Column: Multi-tab Application Assistance Suite */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Assistance Tabs */}
                <div style={{ display: "flex", gap: "0.4rem", borderBottom: "1px solid var(--bp-grid-line)", paddingBottom: "0.6rem", marginBottom: "0.8rem" }}>
                  <button
                    className={`admin-btn-secondary ${activeAssistanceTab === "proposal" ? "admin-btn-primary" : ""}`}
                    style={{ fontSize: "0.68rem", padding: "4px 10px" }}
                    onClick={() => setActiveAssistanceTab("proposal")}
                  >
                    Proposal Draft
                  </button>
                  <button
                    className={`admin-btn-secondary ${activeAssistanceTab === "cover_letter" ? "admin-btn-primary" : ""}`}
                    style={{ fontSize: "0.68rem", padding: "4px 10px" }}
                    onClick={() => setActiveAssistanceTab("cover_letter")}
                  >
                    Cover Letter
                  </button>
                  <button
                    className={`admin-btn-secondary ${activeAssistanceTab === "resume_suggestions" ? "admin-btn-primary" : ""}`}
                    style={{ fontSize: "0.68rem", padding: "4px 10px" }}
                    onClick={() => setActiveAssistanceTab("resume_suggestions")}
                  >
                    Resume Focus
                  </button>
                  <button
                    className={`admin-btn-secondary ${activeAssistanceTab === "interview_questions" ? "admin-btn-primary" : ""}`}
                    style={{ fontSize: "0.68rem", padding: "4px 10px" }}
                    onClick={() => setActiveAssistanceTab("interview_questions")}
                  >
                    Interview Q&A
                  </button>
                </div>

                {/* Tab 1: Proposal Draft */}
                {activeAssistanceTab === "proposal" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span className="admin-label">TAILORED FREELANCE PROPOSAL</span>
                      <button className="admin-btn-secondary" style={{ padding: "2px 8px", fontSize: "0.6rem" }} onClick={() => handleCopyText(editedProposalText, "Proposal")}>
                        Copy Draft
                      </button>
                    </div>
                    <textarea
                      className="admin-textarea"
                      rows={14}
                      value={editedProposalText}
                      onChange={(e) => setEditedProposalText(e.target.value)}
                      placeholder="Tailored proposal draft text…"
                    />
                  </div>
                )}

                {/* Tab 2: Cover Letter */}
                {activeAssistanceTab === "cover_letter" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span className="admin-label">CUSTOM COVER LETTER</span>
                      <button className="admin-btn-secondary" style={{ padding: "2px 8px", fontSize: "0.6rem" }} onClick={() => handleCopyText(editedCoverLetterText, "Cover Letter")}>
                        Copy Letter
                      </button>
                    </div>
                    <textarea
                      className="admin-textarea"
                      rows={14}
                      value={editedCoverLetterText}
                      onChange={(e) => setEditedCoverLetterText(e.target.value)}
                      placeholder="Custom tailored cover letter…"
                    />
                  </div>
                )}

                {/* Tab 3: Truthful Resume Suggestions */}
                {activeAssistanceTab === "resume_suggestions" && (
                  <div style={{ overflowY: "auto", maxHeight: "360px", paddingRight: "0.4rem" }}>
                    <div className="admin-label" style={{ marginBottom: "0.5rem" }}>
                      TRUTHFUL RESUME ALIGNMENT SUGGESTIONS
                    </div>
                    <p style={{ fontSize: "0.72rem", color: "var(--bp-grey)", marginBottom: "0.8rem" }}>
                      Emphasize existing authentic achievements from portfolio projects (SoulCare, ResumeRoast, UrmiNexus). Never fabricates credentials.
                    </p>
                    {(selectedJobProposal?.tailored_resume_suggestions || [
                      { section: "Professional Summary", recommendation: "Highlight Python, FastAPI, and responsive React frontend development experience." },
                      { section: "Project Focus: SoulCare", recommendation: "Highlight PostgreSQL architecture and Django creator platform workflows." },
                      { section: "Project Focus: UrmiNexus", recommendation: "Highlight the counselor matching engine and structured data intake." }
                    ]).map((sug, i) => (
                      <div key={i} style={{ marginBottom: "0.8rem", padding: "0.8rem", background: "rgba(18,16,32,0.7)", borderRadius: "8px", border: "1px solid var(--bp-grid-line)" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.76rem", color: "#C77DFF", marginBottom: "0.2rem" }}>{sug.section}</div>
                        <div style={{ fontSize: "0.74rem", color: "var(--bp-ink)", lineHeight: 1.5 }}>{sug.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 4: Interview Preparation */}
                {activeAssistanceTab === "interview_questions" && (
                  <div style={{ overflowY: "auto", maxHeight: "360px", paddingRight: "0.4rem" }}>
                    <div className="admin-label" style={{ marginBottom: "0.5rem" }}>
                      TAILORED INTERVIEW QUESTIONS & TALKING POINTS
                    </div>
                    {(selectedJobProposal?.interview_questions || [
                      { topic: "System Architecture", question: "How would you design a scalable backend API in FastAPI for this system?", talking_points: ["FastAPI async endpoints", "SQLAlchemy pooling", "Docker containerization"] },
                      { topic: "Database Engineering", question: "How do you manage schema migrations and relational indexing in PostgreSQL?", talking_points: ["Alembic reversible migrations", "Foreign key index optimization"] }
                    ]).map((q, i) => (
                      <div key={i} style={{ marginBottom: "0.8rem", padding: "0.8rem", background: "rgba(18,16,32,0.7)", borderRadius: "8px", border: "1px solid var(--bp-grid-line)" }}>
                        <div style={{ fontSize: "0.64rem", color: "#38bdf8", textTransform: "uppercase", marginBottom: "0.2rem" }}>TOPIC: {q.topic}</div>
                        <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#FFFFFF", marginBottom: "0.4rem" }}>{q.question}</div>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.72rem", color: "var(--bp-grey)" }}>
                          {q.talking_points.map((pt, pIdx) => <li key={pIdx}>{pt}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Application Actions */}
                <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid var(--bp-grid-line)", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="admin-btn-primary" style={{ flex: 1 }} onClick={handleSaveProposalEdits} disabled={isSavingProposal}>
                      {isSavingProposal ? "Saving Edits…" : "Save Custom Edits"}
                    </button>
                    <button className="admin-btn-secondary" style={{ flex: 1 }} onClick={handleRegenerateAssistance} disabled={isRegeneratingAssistance}>
                      {isRegeneratingAssistance ? "Regenerating…" : "↻ Regenerate Drafts"}
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="admin-btn-success" style={{ flex: 1 }} onClick={() => handleUpdateJobStatus(selectedJob.id, "APPROVED")}>
                      ✓ Approve for Apply
                    </button>
                    <button className="admin-btn-primary" style={{ flex: 1 }} onClick={() => handleUpdateJobStatus(selectedJob.id, "SUBMITTED")}>
                      Mark as Submitted
                    </button>
                    <button className="admin-btn-danger" style={{ flex: 0.8 }} onClick={() => handleUpdateJobStatus(selectedJob.id, "REJECTED")}>
                      Skip Job
                    </button>
                  </div>

                  <p style={{ margin: "0.4rem 0 0", fontSize: "0.68rem", color: "var(--bp-grey)", textAlign: "center" }}>
                    🛡 Human in the loop: Applications are never submitted automatically. Review and apply via official channel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST NOTIFICATION ═══ */}
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
    </div>
  );
};

export default Dashboard;
