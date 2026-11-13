import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Send, Sparkles, Volume2, LogIn, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../admin/AdminAuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function JobHunterOrb() {
  const { adminToken, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Ready when you are.");
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  }, []);

  const speak = (message) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice recognition is not supported in this browser. Use Chrome or type your search.");
      return;
    }
    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setStatus("Listening… speak your job search."); };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setQuery(transcript);
      setStatus("I heard: " + transcript);
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Microphone permission was blocked. Allow microphone access in your browser." : "Voice input failed: " + event.error);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const runCommand = async (event) => {
    event?.preventDefault();
    if (!query.trim()) return;
    if (!isAuthenticated || !adminToken) {
      setStatus("Private access is required. Sign in to your owner account first.");
      return;
    }
    setBusy(true);
    setError("");
    setJobs([]);
    setStatus("Searching configured job sources…");
    try {
      const response = await fetch(`${API_BASE}/admin/jobs/search-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ query: query.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Job search failed.");
      const jobsResponse = await fetch(`${API_BASE}/admin/jobs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const currentJobs = jobsResponse.ok ? await jobsResponse.json() : [];
      setJobs(Array.isArray(currentJobs) ? currentJobs.slice(0, 8) : []);
      const summary = `Search complete. Found ${payload.total_fetched || 0} listings and matched ${payload.total_matched || 0} jobs.`;
      setStatus(summary);
      speak(summary);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStatus("I couldn't complete that search.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70]">
      {open && (
        <section className="mb-4 w-[min(92vw,390px)] overflow-hidden rounded-3xl border border-violet-400/30 bg-slate-950/95 text-white shadow-2xl shadow-fuchsia-950/40 backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-violet-600/25 to-pink-500/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600"><Sparkles size={18} /></div>
              <div><p className="text-sm font-semibold">SUJI // JOB HUNTER</p><p className="text-[10px] tracking-[0.2em] text-violet-200">VOICE ASSISTANT</p></div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X size={17} /></button>
          </header>
          <div className="space-y-3 p-4">
            <p className="text-sm text-slate-300">{status}</p>
            {!isAuthenticated && (
              <button onClick={() => navigate("/admin/login")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2.5 text-sm text-violet-100 hover:bg-violet-500/25">
                <LogIn size={16} /> Owner sign-in required
              </button>
            )}
            <form onSubmit={runCommand} className="flex gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Say or type: Find Python jobs in Nepal…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400" />
              <button type="submit" disabled={busy || !query.trim()} aria-label="Run job search" className="rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 px-3 text-white disabled:opacity-40"><Send size={17} /></button>
            </form>
            <div className="flex items-center gap-2">
              <button onClick={listening ? () => recognitionRef.current?.stop() : startListening} disabled={busy} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${listening ? "border-pink-400 bg-pink-500/20 text-pink-200" : "border-violet-400/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"}`}>
                {listening ? <MicOff size={16} /> : <Mic size={16} />}{listening ? "Stop listening" : "Speak command"}
              </button>
              <button onClick={() => speak(status)} title="Read status aloud" className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/10"><Volume2 size={17} /></button>
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
            {jobs.length > 0 && <div className="max-h-64 space-y-2 overflow-y-auto border-t border-white/10 pt-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200"><Briefcase size={14} /> Recent matched workspace jobs</p>
              {jobs.map((job) => <article key={job.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-medium">{job.title || "Untitled role"}</p>
                <p className="mt-1 text-xs text-slate-400">{job.company || "Company not listed"} · {job.location || "Location not listed"}</p>
              </article>)}
            </div>}
            <p className="text-[10px] leading-relaxed text-slate-500">Private owner tool. Searches only; no applications, emails, or messages are sent.</p>
          </div>
        </section>
      )}
      <button onClick={() => setOpen((value) => !value)} aria-label="Open Job Hunter voice assistant" title="Job Hunter voice assistant" className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-fuchsia-200/50 bg-gradient-to-br from-pink-500 via-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-900/40 transition duration-300 hover:scale-110">
        <span className="absolute inset-[-5px] rounded-full border border-violet-300/30 animate-ping" />
        <span className="absolute inset-1 rounded-full border border-white/20" />
        {listening ? <Mic size={25} className="animate-pulse" /> : <Sparkles size={26} />}
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
      </button>
    </div>
  );
}
