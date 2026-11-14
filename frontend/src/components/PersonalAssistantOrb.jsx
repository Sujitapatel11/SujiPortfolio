import React, { useCallback, useRef, useState } from "react";
import { Bot, X, Sparkles, Mic, MicOff, Send, ShieldCheck, Loader2, LogIn } from "lucide-react";
import { createAssistantSession, sendAssistantMessage, decideAssistantAction } from "../api/personalAssistant";

export default function PersonalAssistantOrb() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Ready. Click the orb and speak or type a task.");
  const [proposal, setProposal] = useState(null);
  const [reply, setReply] = useState("");
  const recognitionRef = useRef(null);
  const sessionRef = useRef(null);

  const token = () => localStorage.getItem("admin_token") || "";

  const submitTask = useCallback(async (raw) => {
    const text = raw.trim();
    if (!text || busy) return;
    const auth = token();
    if (!auth) {
      setStatus("Sign in as the owner first. Your private assistant is not available to public visitors.");
      return;
    }
    setBusy(true);
    setProposal(null);
    setReply("");
    setStatus("Planning your task…");
    try {
      if (!sessionRef.current) {
        const session = await createAssistantSession(auth, "voice");
        sessionRef.current = session.session_id;
      }
      const result = await sendAssistantMessage(auth, sessionRef.current, text, "voice");
      setReply(result.message || "Task request received.");
      setProposal(result.proposal || null);
      setStatus(result.status === "awaiting_approval" ? "Review required before execution." :
        result.status === "unsupported" ? "This task is not currently supported." :
        result.status === "needs_clarification" ? "I need one clarification." : "Response received.");
      setInput("");
    } catch (error) {
      sessionRef.current = null;
      setStatus(error.message || "Assistant request failed.");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Voice recognition is unavailable in this browser. You can type your request instead.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setStatus("Listening… बोलिए"); };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      setStatus(event.error === "not-allowed" ? "Microphone permission denied. Allow microphone access and try again." : `Voice input failed: ${event.error}`);
    };
    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript || "";
      setInput(spoken);
      void submitTask(spoken);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setStatus("Could not start voice recognition. Try again."); }
  };

  const activate = () => {
    setOpen(value => !value);
    if (!open) {
      const auth = token();
      setStatus(auth ? "Assistant ready. Tap the microphone or type a task." : "Owner sign-in required to use private assistant controls.");
    }
  };

  const decide = async (decision) => {
    if (!proposal || busy) return;
    const auth = token();
    setBusy(true);
    try {
      const result = await decideAssistantAction(auth, proposal.action_id, decision);
      setProposal(null);
      setReply(result.message || (decision === "approve" ? "Approval recorded. Waiting for the paired device result." : "Action rejected."));
      setStatus(result.status || "Decision recorded.");
    } catch (error) {
      setStatus(error.message || "Could not record your decision.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed bottom-6 left-6 z-[71]">
    {open && <section className="mb-4 w-[min(94vw,380px)] rounded-3xl border border-violet-400/30 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl" aria-label="Hey Suji assistant">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Bot size={20}/><div><p className="text-sm font-semibold">HEY SUJI</p><p className="text-[10px] text-violet-200">PERSONAL AI OPERATOR · OWNER ONLY</p></div></div>
        <button onClick={() => { recognitionRef.current?.stop(); setListening(false); setOpen(false); }} aria-label="Close assistant"><X size={18}/></button>
      </header>
      <p className="mt-3 text-xs leading-5 text-slate-300">{status}</p>
      {reply && <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 whitespace-pre-wrap">{reply}</div>}
      {proposal && <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={14}/> Approval required</p>
        <p className="mt-2 text-xs">{proposal.summary}</p>
        <div className="mt-3 flex gap-2">
          <button disabled={busy} onClick={() => decide("approve")} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-50">Approve</button>
          <button disabled={busy} onClick={() => decide("reject")} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-50">Reject</button>
        </div>
      </div>}
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void submitTask(input); }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell me what to do…" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs outline-none focus:border-violet-400" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send task" className="rounded-xl bg-violet-600 p-2 disabled:opacity-50"><Send size={16}/></button>
      </form>
      <div className="mt-2 flex gap-2">
        <button onClick={startListening} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-300/30 px-3 py-2 text-xs disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin"/> : listening ? <MicOff size={14}/> : <Mic size={14}/>}
          {listening ? "Stop listening" : "Speak"}
        </button>
        {!token() && <a href="/admin/login" className="flex items-center gap-1 rounded-xl border border-white/15 px-3 py-2 text-xs"><LogIn size={14}/> Owner sign in</a>}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">The portfolio can plan tasks and request approval. Device actions require a paired, online companion.</p>
    </section>}
    <button onClick={activate} aria-label="Activate Hey Suji" title="Activate Hey Suji" className="flex h-14 w-14 items-center justify-center rounded-full border border-violet-200/50 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-violet-300">
      {open ? <X size={22}/> : <Sparkles size={24}/>}
    </button>
  </div>;
}
