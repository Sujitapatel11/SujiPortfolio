import React, { useEffect, useRef, useState } from "react";
import { Mic, Search, Link2, Unlink, Loader2, AlertTriangle } from "lucide-react";

const BASE = "http://127.0.0.1:8765";
const TOKEN_KEY = "suji.local-companion.token";

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
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
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
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
    if (!token) { setMessage("Connect this computer once to enable the Personal Operator."); return; }
    request("/v1/status", { token }).then(() => setMessage("Connected. Your pairing is saved on this browser and Windows computer."))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); tokenRef.current = ""; setToken(""); setMessage("Pairing needs setup again."); });
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

  const execute = async (text = command) => {
    const value = text.trim();
    if (!value || !tokenRef.current || busy) return;
    let action, target;
    const search = value.match(/^(?:search|google search)\s+(?:google\s+for\s+)?(.+)$/i);
    const linkedin = value.match(/^(?:search|find)\s+(?:on\s+)?linkedin\s+(?:for\s+)?(.+)$/i);
    const open = value.match(/^(?:open|go to|visit)\s+(.+)$/i);
    if (linkedin) { action = "linkedin_search"; target = linkedin[1]; }
    else if (search) { action = "google_search"; target = search[1]; }
    else if (open) {
      const site = open[1].toLowerCase().replace(/^www\./, "");
      const urls = { google: "https://www.google.com", "google.com": "https://www.google.com", linkedin: "https://www.linkedin.com", "linkedin.com": "https://www.linkedin.com" };
      action = "open_url"; target = urls[site] || (site.startsWith("http://") || site.startsWith("https://") ? site : "https://" + site);
    } else { setError("Try “search Google for …”, “search LinkedIn for …”, or “open Google/LinkedIn”."); return; }
    setBusy(true); setError("");
    try {
      const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: { action, value: target } });
      setMessage("Opened in your default browser: " + result.url); setCommand("");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const listen = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setError("Speech recognition is not supported here. Use Chrome or type a command."); return; }
    const recognition = new Speech(); recognition.lang = "en-IN"; recognition.interimResults = false;
    recognition.onstart = () => setListening(true); recognition.onend = () => setListening(false);
    recognition.onerror = (event) => setError("Microphone error: " + event.error);
    recognition.onresult = (event) => { const spoken = event.results[0][0].transcript; setCommand(spoken); execute(spoken); };
    recognition.start();
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await request("/v1/disconnect", { token: tokenRef.current, method: "POST", body: {} });
      setMessage("Device disconnected. Pair again only if you want to reconnect.");
    } catch (e) { setError(e.message); }
    finally { localStorage.removeItem(TOKEN_KEY); tokenRef.current = ""; setToken(""); setBusy(false); }
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
    {busy && <p className="mt-2 flex items-center gap-2 text-xs text-violet-200"><Loader2 size={13} className="animate-spin"/> Working…</p>}
    <p role="status" className="mt-2 text-[11px] text-emerald-200">{message}</p>
    {error && <p role="alert" className="mt-2 flex gap-1.5 text-[11px] text-rose-200"><AlertTriangle size={13}/>{error}</p>}
    <p className="mt-2 text-[10px] text-slate-500">Allowed: Google and LinkedIn navigation/search only. No shell, messages, forms or payments.</p>
  </section>;
}
