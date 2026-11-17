import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Sparkles, Mic, Send, ShieldCheck, Check, XCircle, Monitor, Loader2 } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const SpeechRecognition = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function PersonalAssistantOrb() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") || "");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi Suji. I'm ready. Tell me what you'd like me to do." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [execution, setExecution] = useState("");
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
    return data;
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending, execution]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const loadDevices = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await request("/api/assistant/devices");
      setDevices(rows.filter((item) => item.is_active));
      setDeviceId((current) => current || rows.find((item) => item.is_active)?.device_id || "");
    } catch (err) {
      setError(err.message);
    }
  }, [request, token]);

  useEffect(() => {
    if (open && token) loadDevices();
  }, [open, token, loadDevices]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const created = await request("/api/assistant/sessions", {
      method: "POST",
      body: JSON.stringify({ input_mode: "text", device_id: deviceId || null }),
    });
    setSessionId(created.session_id);
    return created.session_id;
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    if (!token) {
      setError("This browser isn't connected to your owner account yet. Sign in once to the private operator on this browser; your saved session will then be reused.");
      return;
    }
    setInput("");
    setError("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setBusy(true);
    try {
      const id = await ensureSession();
      const result = await request(`/api/assistant/sessions/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text, input_mode: SpeechRecognition ? "voice" : "text" }),
      });
      setMessages((current) => [...current, { role: "assistant", content: result.message }]);
      setPending(result.proposal || null);
      setExecution("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision) => {
    if (!pending?.action_id || !sessionId) return;
    setBusy(true);
    setError("");
    try {
      const result = await request(`/api/assistant/actions/${pending.action_id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setPending(null);
      if (decision === "approve") {
        setExecution("Approved and queued. Waiting for your paired Windows companion to execute and report the result…");
        const started = Date.now();
        const poll = async () => {
          try {
            const actions = await request(`/api/assistant/sessions/${sessionId}/actions`);
            const action = actions.find((item) => item.action_id === pending.action_id);
            if (action && ["completed", "failed", "expired"].includes(action.status)) {
              setExecution(action.result?.message || `Action ${action.status}.`);
              return;
            }
            if (Date.now() - started < 30000) window.setTimeout(poll, 2000);
            else setExecution("Still queued. Check that your paired Windows companion is running.");
          } catch (err) {
            setExecution(err.message);
          }
        };
        window.setTimeout(poll, 1500);
      } else {
        setExecution("Action rejected. Nothing was executed.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startVoice = () => {
    if (!SpeechRecognition) {
      setError("Voice input isn't supported in this browser. You can type your command instead.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => setInput((current) => `${current}${current ? " " : ""}${event.results[0][0].transcript}`);
    recognition.onerror = (event) => setError(`Microphone: ${event.error}`);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError("");
    setListening(true);
    recognition.start();
  };

  const openPanel = () => {
    setOpen((value) => !value);
    setToken(localStorage.getItem("admin_token") || "");
  };

  return (
    <div className="fixed bottom-6 left-6 z-[71]">
      {open && (
        <section className="mb-4 flex h-[min(70vh,560px)] w-[min(94vw,390px)] flex-col overflow-hidden rounded-3xl border border-violet-400/30 bg-slate-950 text-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot size={21} className="text-violet-300" />
              <div><p className="text-sm font-semibold">Hey Suji</p><p className="text-[10px] text-violet-200">PERSONAL AI OPERATOR · DEVICE-BOUND</p></div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close Hey Suji" className="rounded-lg p-1 hover:bg-white/10"><X size={19}/></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {!token ? (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                This browser isn't connected to your owner account yet. Sign in once to the private operator on this browser; Hey Suji will reuse the saved session. Computer actions remain restricted to your paired device and require approval.
                <button onClick={() => window.location.assign("/admin/login")} className="mt-3 block rounded-lg bg-violet-600 px-3 py-2 font-semibold text-white">Connect owner account</button>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-200">Hi Suji. You can type or use the microphone. I'll show you the exact action before it runs.</div>
                {devices.length > 0 && (
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-[11px] text-slate-300">
                    <Monitor size={14}/>
                    <select value={deviceId} onChange={(event) => { setDeviceId(event.target.value); setSessionId(""); }} className="min-w-0 flex-1 bg-transparent text-white outline-none">
                      {devices.map((device) => <option key={device.device_id} value={device.device_id} className="bg-slate-900">{device.name}</option>)}
                    </select>
                  </label>
                )}
                {devices.length === 0 && <p className="rounded-lg bg-amber-300/10 p-2 text-xs text-amber-100">No paired Windows device found. Pair this computer in Personal Operator setup before requesting desktop actions.</p>}
                {messages.map((message, index) => (
                  <div key={index} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "ml-auto bg-violet-600 text-white" : "mr-auto bg-white/10 text-slate-100"}`}>{message.content}</div>
                ))}
                {pending && (
                  <div className="rounded-xl border border-violet-300/30 bg-violet-400/10 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">Action needs your approval</p>
                    <p className="mt-1 text-sm">{pending.summary}</p>
                    <p className="mt-1 break-all text-[10px] text-slate-400">{pending.tool}</p>
                    <div className="mt-3 flex gap-2">
                      <button disabled={busy} onClick={() => decide("approve")} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-50"><Check size={14}/> Approve</button>
                      <button disabled={busy} onClick={() => decide("reject")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-50"><XCircle size={14}/> Reject</button>
                    </div>
                  </div>
                )}
                {execution && <p className="rounded-lg bg-white/5 p-2 text-xs text-violet-100">{execution}</p>}
                {busy && <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={13} className="animate-spin"/> Working…</p>}
                <div ref={bottomRef}/>
              </>
            )}
            {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-200">{error}</p>}
          </div>

          {token && (
            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/10 p-3">
              <button type="button" onClick={startVoice} disabled={listening || busy} aria-label="Use microphone" className={`rounded-full p-3 ${listening ? "bg-rose-600" : "bg-white/10"} disabled:opacity-50`}><Mic size={17}/></button>
              <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Hey Suji what to do…" maxLength={4000} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400"/>
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send command" className="rounded-full bg-violet-600 p-3 disabled:opacity-40"><Send size={17}/></button>
            </form>
          )}
        </section>
      )}
      <button onClick={openPanel} aria-label="Open Hey Suji personal AI assistant" title="Hey Suji" className="flex h-14 w-14 items-center justify-center rounded-full border border-violet-200/50 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-xl transition-transform hover:scale-105">
        {open ? <X size={22}/> : <Sparkles size={24}/>}
      </button>
    </div>
  );
}
