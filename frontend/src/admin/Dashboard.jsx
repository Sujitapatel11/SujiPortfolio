import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import "./admin.css";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export const Dashboard = () => {
  const { adminUser, adminToken, isAuthenticated, loading, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("inquiries");
  const [inquiries, setInquiries] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!adminToken) return;
    setBusy(true); setError("");
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const [inq, appt] = await Promise.all([
        fetch(`${API_BASE}/admin/inquiries`, { headers }),
        fetch(`${API_BASE}/admin/appointments`, { headers }),
      ]);
      if (!inq.ok || !appt.ok) throw new Error("Could not load client records.");
      setInquiries(await inq.json());
      setAppointments(await appt.json());
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/admin/login");
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => { if (isAuthenticated && adminToken) load(); }, [isAuthenticated, adminToken]);

  const updateAppointment = async (id, status) => {
    setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Could not update appointment.");
      const updated = await response.json();
      setAppointments(items => items.map(item => item.id === id ? updated : item));
      setNotice("Appointment updated.");
    } catch (e) { setError(e.message); }
  };

  const ingestKnowledge = async () => {
    setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/admin/knowledge/ingest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok) throw new Error("Knowledge refresh failed.");
      setNotice("Ask Suji knowledge refreshed.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (loading || !isAuthenticated) {
    return <div className="admin-body"><div className="admin-login-container"><p>Validating admin session…</p></div></div>;
  }

  return <div className="admin-body">
    <div className="admin-dashboard-container">
      <header className="admin-dashboard-header">
        <div><p className="admin-label">SUJI'S WORLD · CONTROL PANEL</p><h1>Client Management</h1><p>Signed in as {adminUser?.username || "admin"}</p></div>
        <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
          <button className="admin-btn-secondary" onClick={load} disabled={busy}>Refresh</button>
          <button className="admin-btn-secondary" onClick={ingestKnowledge} disabled={busy}>Refresh Ask Suji Knowledge</button>
          <button className="admin-btn-danger" onClick={() => { logout(); navigate("/admin/login"); }}>Log out</button>
        </div>
      </header>

      <nav style={{display:"flex",gap:".6rem",margin:"1.25rem 0",flexWrap:"wrap"}}>
        <button className={tab === "inquiries" ? "admin-btn-primary" : "admin-btn-secondary"} onClick={() => setTab("inquiries")}>Inquiries ({inquiries.length})</button>
        <button className={tab === "appointments" ? "admin-btn-primary" : "admin-btn-secondary"} onClick={() => setTab("appointments")}>Appointments ({appointments.length})</button>
      </nav>

      {notice && <p role="status" style={{color:"#86efac"}}>{notice}</p>}
      {error && <p role="alert" style={{color:"#fca5a5"}}>{error}</p>}
      {busy && <p>Loading…</p>}

      {tab === "inquiries" && <section className="admin-card">
        <h2>Client inquiries</h2>
        {inquiries.length === 0 ? <p>No inquiries yet.</p> : <div style={{display:"grid",gap:".8rem"}}>
          {inquiries.map(item => <article key={item.id} style={{padding:"1rem",border:"1px solid var(--bp-grid-line)",borderRadius:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:"1rem",flexWrap:"wrap"}}><strong>{item.name}</strong><span>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</span></div>
            <p>{item.email}</p><p><strong>{item.project_type}</strong>{item.budget ? ` · ${item.budget}` : ""}</p><p style={{whiteSpace:"pre-wrap"}}>{item.message}</p><small>Source: {item.source}</small>
          </article>)}
        </div>}
      </section>}

      {tab === "appointments" && <section className="admin-card">
        <h2>Appointment requests</h2>
        {appointments.length === 0 ? <p>No appointment requests yet.</p> : <div style={{display:"grid",gap:".8rem"}}>
          {appointments.map(item => <article key={item.id} style={{padding:"1rem",border:"1px solid var(--bp-grid-line)",borderRadius:"10px"}}>
            <strong>{item.name}</strong><p>{item.email}</p><p>{item.preferred_time || "Time not specified"}</p><p>{item.purpose || "No purpose supplied"}</p>
            <div style={{display:"flex",alignItems:"center",gap:".6rem",flexWrap:"wrap"}}><span>Status: {item.status}</span>
              <button className="admin-btn-secondary" onClick={() => updateAppointment(item.id,"confirmed")}>Confirm</button>
              <button className="admin-btn-secondary" onClick={() => updateAppointment(item.id,"rescheduled")}>Reschedule</button>
              <button className="admin-btn-danger" onClick={() => updateAppointment(item.id,"declined")}>Decline</button>
            </div>
          </article>)}
        </div>}
      </section>}
    </div>
  </div>;
};

export default Dashboard;
