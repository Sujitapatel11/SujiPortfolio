import React, { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, X, Send, Sparkles, Volume2, ShieldCheck,
  CheckCircle2, XCircle, Loader2, LockKeyhole, Bot,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../admin/AdminAuthContext";
import {
  createAssistantSession,
  sendAssistantMessage,
  decideAssistantAction,
} from "../api/personalAssistant";

export default function PersonalAssistantOrb() {
  const { adminToken, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Voice-first personal assistant · approval required");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const recognitionRef = useRef(null);
  const inputModeRef = useRef("voice");

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = (text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is unavailable in this browser. Use Chrome or type your command.");
      return;
    }
    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setStatus("Listening… speak your command.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setQuery(transcript);
      inputModeRef.current = "voice";
      setStatus(transcript ? "Voice captured. Review and send it." : "No speech was captured.");
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed"
        ? "Microphone permission denied. Allow microphone access in browser settings."
        : `Voice input failed: ${event.error}`);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const submit = async (event) => {
    event?.preventDefault();
    const text = query.trim();
    if (!text || busy) return;
    if (!isAuthenticated || !adminToken) {
      setError("Owner sign-in is required to use this private assistant.");
      return;
    }

    setBusy(true);
    setError("");
    setConversation((items) => [...items, { role: "user", content: text }]);
    setQuery("");
    try {
      let activeSession = sessionId;
      if (!activeSession) {
        const created = await createAssistantSession(adminToken, inputModeRef.current);
        activeSession = created.session_id;
        setSessionId(activeSession);
      }
      const result = await sendAssistantMessage(
        adminToken, activeSession, text, inputModeRef.current
      );
      setConversation((items) => [...items, {
        role: "assistant",
        content: result.message,
        status: result.status,
        proposal: result.proposal || null,
      }]);
      setStatus(result.status === "awaiting_approval"
        ? "Action prepared · waiting for your approval"
        : "Response received");
      speak(result.message);
    } catch (err) {
      setError(err.message || "Assistant request failed.");
      setStatus("Could not complete the request.");
    } finally {
      setBusy(false);
      inputModeRef.current = "text";
    }
  };

  const decide = async (actionId, decision, messageIndex) => {
    if (!adminToken || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await decideAssistantAction(adminToken, actionId, decision);
      setConversation((items) => items.map((item, index) => index === messageIndex
        ? { ...item, decision: result.status }
        : item));
      setStatus(decision === "approve"
        ? "Approval recorded. Execution is not enabled yet."
        : "Action rejected.");
    } catch (err) {
      setError(err.message || "Could not save your decision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[71]">
      {open && (
        <section className="mb-4 flex max-h-[min(76vh,680px)] w-[min(94vw,410px)] flex-col overflow-hidden rounded-3xl border border-violet-400/30 bg-slate-950/95 text-white shadow-2xl shadow-violet-950/50 backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-violet-600/25 to-pink-500/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide">SUJI // PERSONAL AI</p>
                <p className="text-[10px] tracking-[0.18em] text-violet-200">VOICE-FIRST · APPROVAL MODE</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close personal assistant" className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X size={17} /></button>
          </header>

          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-violet-200">
            <ShieldCheck size={14} />
            <span>{status}</span>
          </div>

          {!isAuthenticated && (
            <div className="m-4 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3">
              <p className="flex items-center gap-2 text-sm text-amber-100"><LockKeyhole size={15} /> Private owner sign-in required</p>
              <button onClick={() => navigate("/admin/login")} className="mt-2 rounded-lg bg-amber-300/15 px-3 py-2 text-xs text-amber-100 hover:bg-amber-300/25">Go to sign in</button>
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {conversation.length === 0 && (
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-violet-100"><Sparkles size={16} /> What should I help you do?</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">Try “Open GitHub” or “Open calculator”. I will show the exact proposed action before asking for approval.</p>
              </div>
            )}
            {conversation.map((item, index) => (
              <article key={index} className={`rounded-2xl border p-3 ${item.role === "user" ? "ml-8 border-pink-400/20 bg-pink-500/10" : "mr-3 border-violet-400/20 bg-violet-500/10"}`}>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">{item.role === "user" ? "You" : "Assistant"}</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">{item.content}</p>
                {item.proposal && (
                  <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3">
                    <p className="text-xs font-semibold text-amber-100">Approval required · {item.proposal.risk} risk</p>
                    <p className="mt-1 text-xs text-slate-200">{item.proposal.summary}</p>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-black/20 p-2 text-[10px] text-slate-300">{JSON.stringify(item.proposal.arguments, null, 2)}</pre>
                    {item.decision ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-200">
                        <CheckCircle2 size={14} /> Decision saved: {item.decision}
                      </p>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy} onClick={() => decide(item.proposal.action_id, "approve", index)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 px-2 py-2 text-xs text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"><CheckCircle2 size={14} /> Approve</button>
                        <button disabled={busy} onClick={() => decide(item.proposal.action_id, "reject", index)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500/20 px-2 py-2 text-xs text-rose-100 hover:bg-rose-500/30 disabled:opacity-50"><XCircle size={14} /> Reject</button>
                      </div>
                    )}
                    <p className="mt-2 text-[10px] leading-relaxed text-amber-100/70">Approval only records your decision. This version does not execute browser or desktop actions.</p>
                  </div>
                )}
              </article>
            ))}
            {busy && <p className="flex items-center gap-2 text-xs text-violet-200"><Loader2 size={14} className="animate-spin" /> Working…</p>}
          </div>

          <div className="border-t border-white/10 p-3">
            <form onSubmit={submit} className="flex gap-2">
              <input value={query} onChange={(event) => { setQuery(event.target.value); inputModeRef.current = "text"; }} disabled={!isAuthenticated || busy} placeholder="Type a command…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400 disabled:opacity-50" />
              <button type="submit" disabled={!isAuthenticated || busy || !query.trim()} aria-label="Send command" className="rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 px-3 text-white disabled:opacity-40"><Send size={17} /></button>
            </form>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={listening ? () => recognitionRef.current?.stop() : startListening} disabled={!isAuthenticated || busy} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${listening ? "border-pink-400 bg-pink-500/20 text-pink-100" : "border-violet-400/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"} disabled:opacity-50`}>
                {listening ? <MicOff size={16} /> : <Mic size={16} />}{listening ? "Stop listening" : "Speak command"}
              </button>
              <button onClick={() => speak(conversation.at(-1)?.content || status)} title="Read response aloud" className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/10"><Volume2 size={17} /></button>
            </div>
            {error && <p role="alert" className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">No shell commands, payments, messages, form submissions or destructive actions. Voice recognition depends on browser support.</p>
          </div>
        </section>
      )}

      <button onClick={() => setOpen((value) => !value)} aria-label="Open personal AI assistant" title="Personal AI assistant" className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-violet-200/50 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-xl shadow-fuchsia-900/40 transition duration-300 hover:scale-110">
        <span className="absolute inset-[-4px] rounded-full border border-violet-300/30" />
        {listening ? <Mic size={23} className="animate-pulse" /> : <Sparkles size={24} />}
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
      </button>
    </div>
  );
}
