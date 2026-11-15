import React, { useEffect, useRef, useState } from "react";
import { Mic, Search, Link2, Unlink, Loader2, AlertTriangle } from "lucide-react";

const BASE = "http://127.0.0.1:8765";
const TOKEN_KEY = "suji.local-companion.token";
const ADMIN_API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

async function request(path, { token, method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(BASE + path, {
      method, mode: "cors", credentials: "omit", cache: "no-store",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Local companion is not reachable. Start companion.py on this computer.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.detail || `Request failed (${response.status})`); error.status = response.status; throw error; }
  return data;
}

export default function CompanionPairingPanel() {
  const [challenge, setChallenge] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("Checking your saved device connection…");
  const [error, setError] = useState("");
  const [assistantSession, setAssistantSession] = useState("");
  const [proposal, setProposal] = useState(null);
  const [plannerReply, setPlannerReply] = useState("");
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
    if (!token) { setMessage("Connect this computer once to enable the Personal Operator."); return; }
    request("/v1/status", { token }).then(() => setMessage("Connected. Your pairing is saved on this browser and Windows computer."))
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem(TOKEN_KEY); tokenRef.current = ""; setToken("");
          setMessage("Pairing is no longer valid. Connect this computer again.");
        } else {
          setMessage("Companion is temporarily unavailable. Your saved pairing was kept; start the companion and retry.");
        }
      });
  }, []);

  const pair = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await request("/v1/pair", { method: "POST", body: { challenge: challenge.trim() } });
      localStorage.setItem(TOKEN_KEY, result.token);
      tokenRef.current = result.token; setToken(result.token); setChallenge("");
      setMessage("Connected and saved. You will not need to pair again on this browser.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const planWithAI = async (text, inputMode = "text") => {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) {
      setError("AI planning requires an authenticated admin session. Sign in to the portfolio admin first.");
      return;
    }
    setBusy(true); setError(""); setProposal(null);
    try {
      let sessionId = assistantSession;
      if (!sessionId) {
        const created = await fetch(ADMIN_API + "/api/assistant/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
          body: JSON.stringify({ input_mode: inputMode }),
        });
        const sessionData = await created.json().catch(() => ({}));
        if (!created.ok) throw new Error(sessionData.detail || "Could not start an AI assistant session");
        sessionId = sessionData.session_id;
        setAssistantSession(sessionId);
      }
      const response = await fetch(ADMIN_API + "/api/assistant/sessions/" + sessionId + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
        body: JSON.stringify({ text, input_mode: inputMode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "AI planner request failed");
      setPlannerReply(data.message || "No response from planner.");
      setProposal(data.proposal || null);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const decideProposal = async (decision) => {
    if (!proposal || !assistantSession) return;
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) { setError("Admin session expired. Sign in again."); return; }
    if (decision === "approve" && !tokenRef.current) { setError("Pair this computer before approving a local action."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(ADMIN_API + "/api/assistant/actions/" + proposal.action_id + "/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not record your decision");
      if (decision === "reject") {
        setPlannerReply("Action rejected. Nothing was executed.");
        setProposal(null);
        return;
      }
      const action = proposal.tool === "browser.open_url"
        ? { action: "open_url", value: proposal.arguments.url }
        : { action: "open_application", value: proposal.arguments.app_id };
      try {
        const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: action });
        const outcome = result.app_id ? { app_id: result.app_id } : { url: result.url };
        const saved = await fetch(ADMIN_API + "/api/assistant/actions/" + proposal.action_id + "/result", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
          body: JSON.stringify({ status: "completed", result: outcome }),
        });
        const savedData = await saved.json().catch(() => ({}));
        const label = result.app_id ? "Opened the " + result.app_id.replace("_", " ") + " application." : "Opened " + result.url;
        setPlannerReply(saved.ok ? label + " Execution recorded." : label + " Completion record could not be synced.");
        setProposal(null);
      } catch (executionError) {
        await fetch(ADMIN_API + "/api/assistant/actions/" + proposal.action_id + "/result", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
          body: JSON.stringify({ status: "failed", error_code: "LOCAL_EXECUTOR_FAILED", result: {} }),
        }).catch(() => null);
        setPlannerReply("Approval was recorded, but local execution failed: " + executionError.message);
        setProposal(null);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const execute = async (text = command, inputMode = "text") => {
    const value = text.trim();
    if (!value || busy) return;
    let action, target;
    const search = value.match(/^(?:search|google search)\s+(?:google\s+for\s+)?(.+)$/i);
    const linkedin = value.match(/^(?:search|find)\s+(?:on\s+)?linkedin\s+(?:for\s+)?(.+)$/i);
    const openPrefix = ["open ", "go to ", "visit ", "launch ", "start "].find(prefix => value.toLowerCase().startsWith(prefix));
    const open = openPrefix ? value.slice(openPrefix.length).trim() : "";
    if (linkedin) { action = "linkedin_search"; target = linkedin[1]; }
    else if (search) { action = "google_search"; target = search[1]; }
    else if (openPrefix && open) {
      const site = open.toLowerCase().trim().startsWith("www.") ? open.toLowerCase().trim().slice(4) : open.toLowerCase().trim();
      const apps = { calculator: "calculator", calc: "calculator", notepad: "text_editor", "text editor": "text_editor", browser: "browser", chrome: "browser" };
      const urls = { google: "https://www.google.com", "google.com": "https://www.google.com", linkedin: "https://www.linkedin.com", "linkedin.com": "https://www.linkedin.com", instagram: "https://www.instagram.com", "instagram.com": "https://www.instagram.com", whatsapp: "https://web.whatsapp.com", "whatsapp web": "https://web.whatsapp.com", "web.whatsapp.com": "https://web.whatsapp.com", github: "https://github.com", "github.com": "https://github.com" };
      if (apps[site]) { action = "open_application"; target = apps[site]; }
      else if (urls[site]) { action = "open_url"; target = urls[site]; }
      else { setError("Supported: open Google, LinkedIn, Instagram, WhatsApp, GitHub, Calculator, Notepad or Browser. Arbitrary websites and apps are blocked."); return; }
    } else { await planWithAI(value, inputMode); return; }
    if (!tokenRef.current) { setError("Pair this computer before running local browser or desktop commands."); return; }
    setBusy(true); setError("");
    try {
      const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: { action, value: target } });
      if (result.app_id) setMessage("Opened the " + result.app_id.replace("_", " ") + " application on this computer.");
      else setMessage("Opened in your default browser: " + result.url);
      setCommand("");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const listen = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setError("Speech recognition is not supported here. Use Chrome or type a command."); return; }
    const recognition = new Speech(); recognition.lang = "en-IN"; recognition.interimResults = false;
    recognition.onstart = () => setListening(true); recognition.onend = () => setListening(false);
    recognition.onerror = (event) => setError("Microphone error: " + event.error);
    recognition.onresult = (event) => { const spoken = event.results[0][0].transcript; setCommand(spoken); execute(spoken, "voice"); };
    recognition.start();
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await request("/v1/disconnect", { token: tokenRef.current, method: "POST", body: {} });
      localStorage.removeItem(TOKEN_KEY);
      tokenRef.current = "";
      setToken("");
      setMessage("Device disconnected. Pair again only if you want to reconnect.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <section className="mt-3 rounded-2xl border border-violet-300/20 bg-violet-400/5 p-3">
    <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-xs font-semibold text-violet-100"><Link2 size={14}/> SUJI · DEVICE OPERATOR</p><span className="text-[10px] text-slate-400">{token ? "CONNECTED" : "NOT CONNECTED"}</span></div>
    {!token ? <form onSubmit={pair} className="mt-3 space-y-2">
      <p className="text-xs text-slate-400">Start the Windows companion and paste its one-time pairing challenge. This is a one-time step.</p>
      <input value={challenge} onChange={e=>setChallenge(e.target.value)} placeholder="One-time pairing challenge" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"/>
      <button disabled={busy || challenge.trim().length < 30} className="w-full rounded-lg bg-violet-500/30 px-3 py-2 text-xs text-white disabled:opacity-40">{busy ? "Connecting…" : "Connect this computer"}</button>
    </form> : <>
      <form onSubmit={e=>{e.preventDefault();execute();}} className="mt-3 flex gap-2">
        <input value={command} onChange={e=>setCommand(e.target.value)} placeholder="Say or type a command…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-white"/>
        <button disabled={busy || !command.trim()} className="rounded-lg bg-violet-500/30 px-3 text-white"><Search size={16}/></button>
      </form>
      <div className="mt-2 flex gap-2">
        <button onClick={listen} disabled={busy || listening} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-violet-300/20 px-3 py-2 text-xs text-violet-100"><Mic size={14}/> Voice command</button>
        <button onClick={disconnect} disabled={busy} className="flex items-center gap-2 rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-100"><Unlink size={14}/> Disconnect</button>
      </div>
    </>}
    {plannerReply && <div className="mt-3 rounded-lg border border-violet-300/20 bg-black/20 p-3 text-xs text-violet-100">{plannerReply}</div>}
    {proposal && <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3">
      <p className="text-xs font-semibold text-amber-100">Review proposed action</p>
      <p className="mt-1 text-xs text-slate-200">{proposal.summary}</p>
      <p className="mt-1 break-all text-[10px] text-slate-400">{JSON.stringify(proposal.arguments)}</p>
      <p className="mt-1 text-[10px] text-slate-400">This action expires soon. Nothing runs until you approve it.</p>
      <div className="mt-2 flex gap-2">
        <button disabled={busy} onClick={()=>decideProposal("approve")} className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100">Approve & run</button>
        <button disabled={busy} onClick={()=>decideProposal("reject")} className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-100">Reject</button>
      </div>
    </div>}
    {busy && <p className="mt-2 flex items-center gap-2 text-xs text-violet-200"><Loader2 size={13} className="animate-spin"/> Working…</p>}
    <p role="status" className="mt-2 text-[11px] text-emerald-200">{message}</p>
    {error && <p role="alert" className="mt-2 flex gap-1.5 text-[11px] text-rose-200"><AlertTriangle size={13}/>{error}</p>}
    <p className="mt-2 text-[10px] text-slate-500">Allowlisted: Google/LinkedIn search; Google, LinkedIn, Instagram, WhatsApp Web and GitHub navigation; Calculator, Notepad and default browser launch. No shell, messages, forms or payments.</p>
  </section>;
}
