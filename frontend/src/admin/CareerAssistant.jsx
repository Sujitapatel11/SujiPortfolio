import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, Bookmark, Globe2, MapPin, RefreshCw, Save, ShieldCheck, Plus, ExternalLink } from "lucide-react";
import { useAdminAuth } from "./AdminAuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const emptyProfile = { full_name: "", headline: "", target_roles: [], skills: [], preferred_countries: ["Nepal", "India"], preferred_work_modes: ["remote", "hybrid", "onsite"], experience_summary: "" };

export default function CareerAssistant() {
  const { adminToken, isAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(emptyProfile);
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", company: "", source_url: "", source_key: "", country: "Nepal", location: "", work_mode: "unknown", applicant_eligibility: "unknown", description: "" });

  const headers = useMemo(() => ({ Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" }), [adminToken]);
  useEffect(() => { if (!loading && !isAuthenticated) navigate("/admin/login"); }, [loading, isAuthenticated, navigate]);

  const refresh = async () => {
    if (!adminToken) return;
    setBusy(true); setError("");
    try {
      const [p, j] = await Promise.all([
        fetch(`${API_BASE}/api/v1/career/profile`, { headers }),
        fetch(`${API_BASE}/api/v1/career/jobs`, { headers }),
      ]);
      if (!p.ok || !j.ok) throw new Error("Could not load Career Assistant data. Check the API and database migration.");
      const profileData = await p.json();
      setProfile({ ...emptyProfile, ...(profileData.profile || {}) });
      setJobs(await j.json());
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, [adminToken]);

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true); setNotice(""); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/career/profile`, { method: "PUT", headers, body: JSON.stringify({ profile }) });
      if (!res.ok) throw new Error("Profile could not be saved.");
      setNotice("Career profile saved.");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const addJob = async (e) => {
    e.preventDefault(); setError(""); setNotice("");
    const key = draft.source_key.trim() || draft.source_url.trim();
    if (!key) { setError("Add a source URL or a unique source key."); return; }
    try {
      const res = await fetch(`${API_BASE}/api/v1/career/jobs`, { method: "POST", headers, body: JSON.stringify({ ...draft, source_key: key, source_name: "Manual" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not add opportunity.");
      setJobs((prev) => [data, ...prev]); setShowAdd(false);
      setDraft({ title: "", company: "", source_url: "", source_key: "", country: "Nepal", location: "", work_mode: "unknown", applicant_eligibility: "unknown", description: "" });
      setNotice("Opportunity added. Eligibility remains unverified until evidence is checked.");
    } catch (e) { setError(e.message); }
  };

  const updateField = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const field = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-400";
  if (loading || !isAuthenticated) return <div className="min-h-screen grid place-items-center bg-[#090713] text-white">Checking private access…</div>;

  return <div className="min-h-screen bg-[#090713] text-slate-100">
    <header className="border-b border-white/10 bg-[#100b1d]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3"><button onClick={() => navigate("/admin/dashboard")} className="rounded-lg p-2 hover:bg-white/10" aria-label="Back to admin"><ArrowLeft size={18}/></button><div><p className="text-xs uppercase tracking-[.25em] text-fuchsia-300">Private workspace</p><h1 className="text-xl font-semibold">Career Intelligence</h1></div></div>
        <div className="flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck size={16}/> Admin protected</div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl space-y-6 px-5 py-7">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-950/70 to-violet-950/40 p-5 md:col-span-2"><p className="text-sm text-fuchsia-200">Your personal job intelligence workspace</p><h2 className="mt-2 text-2xl font-semibold">Find roles you can actually apply for.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Nepal first, India second, then verified global opportunities. Work mode and applicant eligibility are tracked separately; unknown means unknown, not eligible.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><div className="flex items-center gap-2 text-sm text-slate-300"><BriefcaseBusiness size={17}/> Opportunities saved</div><p className="mt-3 text-3xl font-semibold">{jobs.length}</p><p className="mt-1 text-xs text-slate-400">Manually added records so far</p><button onClick={() => setShowAdd((v) => !v)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-3 py-2 text-sm font-medium hover:bg-fuchsia-500"><Plus size={16}/> Add opportunity</button></div>
      </section>
      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {showAdd && <form onSubmit={addJob} className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><h3 className="mb-4 font-semibold">Add a job opportunity</h3><div className="grid gap-3 md:grid-cols-2">
        <input className={field} placeholder="Job title *" required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/>
        <input className={field} placeholder="Company" value={draft.company} onChange={e=>setDraft({...draft,company:e.target.value})}/>
        <input className={field} placeholder="Official job URL" type="url" value={draft.source_url} onChange={e=>setDraft({...draft,source_url:e.target.value})}/>
        <input className={field} placeholder="Country" value={draft.country} onChange={e=>setDraft({...draft,country:e.target.value})}/>
        <input className={field} placeholder="City / location" value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/>
        <select className={field} value={draft.work_mode} onChange={e=>setDraft({...draft,work_mode:e.target.value})}><option value="unknown">Work mode unknown</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select>
        <select className={field} value={draft.applicant_eligibility} onChange={e=>setDraft({...draft,applicant_eligibility:e.target.value})}><option value="unknown">Applicant eligibility unknown</option><option value="eligible">Confirmed eligible</option><option value="ineligible">Confirmed ineligible</option></select>
        <textarea className={field+" md:col-span-2"} rows="3" placeholder="Job description / eligibility evidence" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/>
      </div><div className="mt-4 flex gap-2"><button className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm">Save opportunity</button><button type="button" onClick={()=>setShowAdd(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Cancel</button></div></form>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <form onSubmit={saveProfile} className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Candidate profile</h3><p className="mt-1 text-xs text-slate-400">This powers future job matching.</p></div><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm disabled:opacity-50"><Save size={15}/>{saving?"Saving…":"Save profile"}</button></div>
          <div className="space-y-3">
            <label className="block text-xs text-slate-400">Full name<input className={field+" mt-1"} value={profile.full_name} onChange={e=>updateField("full_name",e.target.value)}/></label>
            <label className="block text-xs text-slate-400">Professional headline<input className={field+" mt-1"} placeholder="e.g. B.Tech CSE | Backend / AI Engineering" value={profile.headline} onChange={e=>updateField("headline",e.target.value)}/></label>
            <label className="block text-xs text-slate-400">Target roles (comma separated)<input className={field+" mt-1"} value={(profile.target_roles||[]).join(", ")} onChange={e=>updateField("target_roles",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label>
            <label className="block text-xs text-slate-400">Skills (comma separated)<textarea className={field+" mt-1"} rows="3" value={(profile.skills||[]).join(", ")} onChange={e=>updateField("skills",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label>
            <label className="block text-xs text-slate-400">Experience / projects summary<textarea className={field+" mt-1"} rows="3" value={profile.experience_summary||""} onChange={e=>updateField("experience_summary",e.target.value)}/></label>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300"><span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1"><MapPin size={13}/> Nepal first</span><span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1"><Globe2 size={13}/> India + global remote</span></div>
          </div>
        </form>
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Opportunity inbox</h3><p className="mt-1 text-xs text-slate-400">No scraped jobs are presented as verified yet.</p></div><button onClick={refresh} disabled={busy} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" title="Refresh"><RefreshCw size={16} className={busy?"animate-spin":""}/></button></div>
          {busy ? <p className="py-10 text-center text-sm text-slate-400">Loading workspace…</p> : jobs.length===0 ? <div className="rounded-xl border border-dashed border-white/15 py-12 text-center"><Bookmark className="mx-auto mb-3 text-slate-500"/><p className="text-sm text-slate-300">No opportunities yet</p><p className="mt-1 text-xs text-slate-500">Add a role manually while source discovery is being built.</p></div> : <div className="space-y-3">{jobs.map(job=><article key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-medium">{job.title}</h4><p className="mt-1 text-sm text-slate-400">{job.company||"Company not listed"} · {job.location||job.country||"Location unknown"}</p></div>{job.source_url&&<a href={job.source_url} target="_blank" rel="noreferrer" className="text-fuchsia-300 hover:text-fuchsia-200" aria-label="Open source job"><ExternalLink size={16}/></a>}</div><div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-white/10 px-2 py-1">{job.work_mode}</span><span className="rounded-full bg-amber-400/10 px-2 py-1 text-amber-200">Eligibility: {job.applicant_eligibility}</span><span className="rounded-full bg-white/10 px-2 py-1">{job.job_status}</span></div></article>)}</div>}
        </section>
      </div>
      <p className="text-center text-xs text-slate-500">Private single-owner workspace · No applications or messages are sent automatically.</p>
    </main>
  </div>;
}
