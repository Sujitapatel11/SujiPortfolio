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
  const [listedFiles, setListedFiles] = useState([]);
  const [listedFolder, setListedFolder] = useState("");
  const [preview, setPreview] = useState(null);
  const [browserPage, setBrowserPage] = useState(null);
  const tokenRef = useRef(token);
  const taskRunRef = useRef(null);
  const [taskProgress, setTaskProgress] = useState(null);

  const speak = (text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  };

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
      speak(data.message || "No response from planner.");
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
        speak("Action rejected. Nothing was executed.");
        setProposal(null);
        return;
      }
      const action = proposal.tool === "browser.open_url"
        ? { action: "open_url", value: proposal.arguments.url }
        : proposal.tool === "desktop.open_application"
          ? { action: "open_application", value: proposal.arguments.app_id }
          : proposal.tool === "desktop.open_folder"
          ? { action: "open_folder", value: proposal.arguments.folder_id }
          : { action: "open_file", folder_id: proposal.arguments.folder_id, file_name: proposal.arguments.file_name };
      try {
        const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: action });
        const outcome = result.app_id ? { app_id: result.app_id } : result.file_name ? { folder_id: result.folder_id, file_name: result.file_name } : result.folder_id ? { folder_id: result.folder_id } : { url: result.url };
        const saved = await fetch(ADMIN_API + "/api/assistant/actions/" + proposal.action_id + "/result", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
          body: JSON.stringify({ status: "completed", result: outcome }),
        });
        const savedData = await saved.json().catch(() => ({}));
        const label = result.app_id ? "Opened the " + result.app_id.replace("_", " ") + " application." : result.file_name ? "Opened " + result.file_name : result.folder_id ? "Opened the " + result.folder_id + " folder." : "Opened " + result.url;
        setPlannerReply(saved.ok ? label + " Execution recorded." : label + " Completion record could not be synced.");
        speak(label);
        setProposal(null);
      } catch (executionError) {
        await fetch(ADMIN_API + "/api/assistant/actions/" + proposal.action_id + "/result", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
          body: JSON.stringify({ status: "failed", error_code: "LOCAL_EXECUTOR_FAILED", result: {} }),
        }).catch(() => null);
        setPlannerReply("Approval was recorded, but local execution failed: " + executionError.message);
        speak("The action was approved, but I could not complete it.");
        setProposal(null);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const execute = async (text = command, inputMode = "text") => {
    const value = text.trim();
    if (!value || busy) return;
    if (!taskRunRef.current && /\\s+(?:and then|then)\\s+/i.test(value)) {
      const steps = value.split(/\\s+(?:and then|then)\\s+/i).map(step => step.trim()).filter(Boolean);
      const isSafeStep = step =>
        /^(?:inspect|read)\\s+(?:the\\s+)?page$/i.test(step) ||
        /^click\\s+(?:the\\s+)?link\\s+.{1,120}$/i.test(step) ||
        /^(?:fill|type)\\s+(?:in\\s+)?(?:the\\s+)?search(?:\\s+box)?\\s+(?:with\\s+)?\\S.{0,299}$/i.test(step) ||
        /^(?:browse)\\s+(?:google|linkedin|instagram|whatsapp|github)$/i.test(step) ||
        /^(?:list|show)\\s+(?:the\\s+)?files\\s+(?:in|inside|from)\\s+(desktop|documents|downloads|pictures)$/i.test(step) ||
        /^(?:search|google search)\\s+(?:google\\s+for\\s+)?\\S.{0,299}$/i.test(step) ||
        /^(?:search|find)\\s+(?:on\\s+)?linkedin\\s+(?:for\\s+)?\\S.{0,299}$/i.test(step) ||
        /^(?:open|go to|visit|launch|start)\\s+(?:google|google\\.com|linkedin|linkedin\\.com|instagram|instagram\\.com|whatsapp|whatsapp web|github|github\\.com|calculator|calc|notepad|text editor|browser|chrome|desktop|documents|downloads|pictures)$/i.test(step);
      if (steps.length < 2 || steps.length > 4 || !steps.every(isSafeStep)) {
        setError("Multi-step tasks support 2–4 simple allowlisted commands. Separate each step with ‘then’. No messages, form submissions or payments.");
        return;
      }
      if (!tokenRef.current) { setError("Pair this computer before running local tasks."); return; }
      const run = { cancelled: false };
      taskRunRef.current = run;
      setTaskProgress({ current: 0, total: steps.length, label: steps[0], status: "running" });
      setError("");
      try {
        for (let index = 0; index < steps.length; index += 1) {
          if (run.cancelled) break;
          setTaskProgress({ current: index + 1, total: steps.length, label: steps[index], status: "running" });
          const completed = await execute(steps[index], inputMode);
          if (!completed) {
            setTaskProgress({ current: index + 1, total: steps.length, label: steps[index], status: "stopped" });
            return;
          }
        }
        setTaskProgress(current => current ? {
          ...current,
          status: run.cancelled ? "cancelled" : "completed",
          label: run.cancelled ? "Cancelled after current step" : "All steps completed",
        } : current);
        if (run.cancelled) speak("Task cancelled after the current step.");
        else speak("All task steps completed.");
      } finally {
        taskRunRef.current = null;
      }
      return;
    }
    let action, target;
    const listMatch = value.match(/^(?:list|show)\s+(?:the\s+)?files\s+(?:in|inside|from)\s+(desktop|documents|downloads|pictures)$/i);
    const inspectMatch = value.match(/^(?:inspect|read)\s+(?:the\s+)?page$/i);
    const clickMatch = value.match(/^click\s+(?:the\s+)?link\s+(.+)$/i);
    const fillSearchMatch = value.match(/^(?:fill|type)\s+(?:in\s+)?(?:the\s+)?search(?:\s+box)?\s+(?:with\s+)?(.+)$/i);
    const browseMatch = value.match(/^browse\s+(.+)$/i);
    const search = value.match(/^(?:search|google search)\s+(?:google\s+for\s+)?(.+)$/i);
    const linkedin = value.match(/^(?:search|find)\s+(?:on\s+)?linkedin\s+(?:for\s+)?(.+)$/i);
    const openPrefix = ["open ", "go to ", "visit ", "launch ", "start "].find(prefix => value.toLowerCase().startsWith(prefix));
    const open = openPrefix ? value.slice(openPrefix.length).trim() : "";
    if (inspectMatch) { action = "browser_inspect"; target = ""; }
    else if (clickMatch) { action = "browser_click_link"; target = clickMatch[1].trim(); }
    else if (fillSearchMatch) { action = "browser_fill_search"; target = fillSearchMatch[1].trim(); }
    else if (browseMatch) {
      const name = browseMatch[1].toLowerCase().trim();
      const browseUrls = { google: "https://www.google.com", linkedin: "https://www.linkedin.com", instagram: "https://www.instagram.com", whatsapp: "https://web.whatsapp.com", github: "https://github.com" };
      if (!browseUrls[name]) { setError("Managed browser supports Google, LinkedIn, Instagram, WhatsApp Web and GitHub only."); return; }
      action = "browser_navigate"; target = browseUrls[name];
    }
    else if (listMatch) { action = "list_folder"; target = listMatch[1].toLowerCase(); }
    else if (linkedin) { action = "linkedin_search"; target = linkedin[1]; }
    else if (search) { action = "google_search"; target = search[1]; }
    else if (openPrefix && open) {
      const site = open.toLowerCase().trim().startsWith("www.") ? open.toLowerCase().trim().slice(4) : open.toLowerCase().trim();
      const apps = { calculator: "calculator", calc: "calculator", notepad: "text_editor", "text editor": "text_editor", browser: "browser", chrome: "browser" };
      const folders = { desktop: "desktop", documents: "documents", downloads: "downloads", pictures: "pictures", "my downloads": "downloads", "my documents": "documents", "my desktop": "desktop", "my pictures": "pictures" };
      const urls = { google: "https://www.google.com", "google.com": "https://www.google.com", linkedin: "https://www.linkedin.com", "linkedin.com": "https://www.linkedin.com", instagram: "https://www.instagram.com", "instagram.com": "https://www.instagram.com", whatsapp: "https://web.whatsapp.com", "whatsapp web": "https://web.whatsapp.com", "web.whatsapp.com": "https://web.whatsapp.com", github: "https://github.com", "github.com": "https://github.com" };
      if (apps[site]) { action = "open_application"; target = apps[site]; }
      else if (folders[site]) { action = "open_folder"; target = folders[site]; }
      else if (urls[site]) { action = "open_url"; target = urls[site]; }
      else { setError("Supported: open Google, LinkedIn, Instagram, WhatsApp, GitHub, Calculator, Notepad or Browser. Arbitrary websites and apps are blocked."); return; }
    } else { await planWithAI(value, inputMode); return; }
    if (!tokenRef.current) { setError("Pair this computer before running local browser or desktop commands."); return; }
    setBusy(true); setError("");
    try {
      const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: { action, value: target } });
      if (action === "browser_inspect") {
        setBrowserPage(result);
        setMessage("Inspected " + result.title);
        speak("Page title: " + result.title);
      }
      else if (action === "browser_navigate" || action === "browser_click_link") {
        setBrowserPage(null);
        setMessage("Managed browser: " + result.title);
        speak("Opened " + result.title);
      }
      else if (action === "browser_fill_search") {
        setMessage("Entered search text. It has NOT been submitted.");
        speak("Search text entered. Not submitted.");
      }
      else if (action === "list_folder") {
        setListedFolder(result.folder_id);
        setListedFiles(result.files || []);
        setMessage("Found " + (result.files || []).length + " supported files in " + result.folder_id + ".");
        speak("Found " + (result.files || []).length + " files in " + result.folder_id);
      }
      else if (result.app_id) { setMessage("Opened the " + result.app_id.replace("_", " ") + " application on this computer."); speak("Opening " + result.app_id.replace("_", " ")); }
      else if (result.folder_id) { setMessage("Opened the " + result.folder_id + " folder."); speak("Opening " + result.folder_id + " folder"); }
      else { setMessage("Opened in your default browser: " + result.url); speak("Opening website"); }
      setCommand("");
      return true;
    } catch (e) { setError(e.message); return false; }
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
      {taskProgress && <div className="mt-2 rounded-lg border border-sky-300/20 bg-sky-300/5 p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-sky-100">Task · {taskProgress.current}/{taskProgress.total} · {taskProgress.status}</p>
          {taskRunRef.current && <button onClick={() => { taskRunRef.current.cancelled = true; setTaskProgress(current => current ? { ...current, label: "Cancellation requested…" } : current); }} className="rounded-md border border-rose-300/20 px-2 py-1 text-[10px] text-rose-100">Cancel</button>}
        </div>
        <p className="mt-1 truncate text-[10px] text-slate-300">{taskProgress.label}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300 transition-all" style={{ width: (taskProgress.current / taskProgress.total * 100) + "%" }}/></div>
      </div>}
      <div className="mt-2 flex gap-2">
        <button onClick={listen} disabled={busy || listening} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-violet-300/20 px-3 py-2 text-xs text-violet-100"><Mic size={14}/> Voice command</button>
        <button onClick={disconnect} disabled={busy} className="flex items-center gap-2 rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-100"><Unlink size={14}/> Disconnect</button>
      </div>
    </>}
    {listedFolder && <div className="mt-3 rounded-xl border border-violet-300/20 bg-black/20 p-3">
      <p className="text-xs font-semibold text-violet-100">Supported files in {listedFolder}</p>
      {listedFiles.length ? <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {listedFiles.map(file => <div key={file.name} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-200 hover:bg-white/5">
          <span className="min-w-0 flex-1 truncate">{file.name}</span><span className="text-[10px] text-slate-500">{file.type}</span>
          {["txt", "md", "csv", "json"].includes(file.type) && <button disabled={busy} onClick={async () => {
            setBusy(true); setError(""); setPreview(null);
            try {
              const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: { action: "preview_file", folder_id: listedFolder, file_name: file.name } });
              setPreview(result); setMessage("Previewing " + result.file_name);
            } catch (e) { setError(e.message); }
            finally { setBusy(false); }
          }} className="rounded-md border border-violet-300/20 px-2 py-1 text-[10px] text-violet-200">Preview</button>}
          <button disabled={busy} onClick={async () => {
            setBusy(true); setError("");
            try {
              const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: { action: "open_file", folder_id: listedFolder, file_name: file.name } });
              setMessage("Opened " + result.file_name); speak("Opening " + result.file_name);
            } catch (e) { setError(e.message); }
            finally { setBusy(false); }
          }} className="rounded-md border border-white/10 px-2 py-1 text-[10px]">Open</button>
        </div>)}
      </div> : <p className="mt-2 text-xs text-slate-400">No supported files found.</p>}
    </div>}
    {browserPage && <div className="mt-3 rounded-xl border border-sky-300/20 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-sky-100">{browserPage.title || "Current page"}</p>
        <button onClick={() => setBrowserPage(null)} className="text-xs text-slate-400">Close</button>
      </div>
      <p className="mt-1 break-all text-[10px] text-slate-500">{browserPage.url}</p>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 text-[11px] leading-relaxed text-slate-200">{browserPage.text}</pre>
      <p className="mt-2 text-[10px] text-slate-500">Read-only page text. Up to 5,000 characters.</p>
    </div>}
    {preview && <div className="mt-3 rounded-xl border border-violet-300/20 bg-black/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-violet-100">{preview.file_name} · Read-only preview</p>
        <button onClick={() => setPreview(null)} className="text-xs text-slate-400">Close</button>
      </div>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 text-[11px] leading-relaxed text-slate-200">{preview.content}</pre>
      <p className="mt-2 text-[10px] text-slate-500">Preview is read-only. Maximum file size: 128 KB.</p>
    </div>}
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
    <p className="mt-2 text-[10px] text-slate-500">Allowlisted: Google/LinkedIn search; Google, LinkedIn, Instagram, WhatsApp Web and GitHub navigation; Calculator, Notepad, default browser and known Windows folders (Desktop/Documents/Downloads/Pictures) and read-only supported-file listing; managed browser with allowlisted navigation, page text inspection, unique link navigation and search-field filling without submission. AI planning needs admin sign-in and backend OPENAI_API_KEY. No shell, messages, forms or payments.</p>
  </section>;
}
