import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  X,
  Sparkles,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Loader2,
  LogIn,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  FileText,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  Layers,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  createAssistantSession,
  sendAssistantMessage,
  decideAssistantAction,
  listAssistantDevices,
  startWorkflow,
  getWorkflow,
  advanceWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  getWorkProfile,
} from "../api/personalAssistant";

export default function PersonalAssistantOrb() {
  const [open, setOpen] = useState(false);
  const [viewTab, setViewTab] = useState("operator"); // 'operator' | 'workflow' | 'profile'
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLang, setVoiceLang] = useState("hi-IN"); // 'hi-IN' | 'en-US'
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Ready. Speak or type an instruction.");
  const [messages, setMessages] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");

  // Workflow engine state
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [workProfile, setWorkProfile] = useState(null);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const recognitionRef = useRef(null);
  const sessionRef = useRef(null);
  const sessionDeviceRef = useRef("");
  const pollTimerRef = useRef(null);

  const token = () =>
    localStorage.getItem("hey_suji_device_token") ||
    localStorage.getItem("admin_token") ||
    "";

  // Barge-in: interrupt speech synthesis immediately if user acts or speaks
  const interruptSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  // Text-to-speech assistant reply
  const speakResponse = useCallback(
    (text) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      interruptSpeech();
      const clean = text.replace(/[*_#`]/g, "").slice(0, 300);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = voiceLang;
      utterance.rate = 1.0;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [voiceLang, interruptSpeech]
  );

  const loadDevices = async () => {
    const auth = token();
    if (!auth) return;
    try {
      const items = await listAssistantDevices(auth);
      const active = items.filter((item) => item.is_active);
      setDevices(active);
      if (!deviceId && active.length) setDeviceId(active[0].device_id);
    } catch {
      // Ignored if device endpoint isn't paired yet
    }
  };

  const loadProfile = async () => {
    const auth = token();
    if (!auth) return;
    try {
      const p = await getWorkProfile(auth);
      setWorkProfile(p);
    } catch {
      // Ignored
    }
  };

  // Poll active workflow status when running
  useEffect(() => {
    if (!activeWorkflow || !open) return;
    const workflowId = activeWorkflow.workflow_id;
    const auth = token();
    if (!auth) return;

    if (
      activeWorkflow.status === "running" ||
      activeWorkflow.status === "planning"
    ) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const updated = await getWorkflow(auth, workflowId);
          setActiveWorkflow(updated);
          if (
            updated.status === "running" &&
            autoAdvance &&
            updated.steps?.some((s) => s.status === "pending")
          ) {
            // Trigger engine advancement
            await advanceWorkflow(auth, workflowId);
          }
        } catch {
          // Keep polling
        }
      }, 2500);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeWorkflow, open, autoAdvance]);

  // Main task submitter (voice or text)
  const submitTask = useCallback(
    async (raw) => {
      const text = raw.trim();
      if (!text || busy) return;
      interruptSpeech();

      const auth = token();
      if (!auth) {
        setStatus("Trusted owner authentication required. Sign in or connect local device.");
        return;
      }

      setBusy(true);
      setStatus("Planning execution…");
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      // Check if this is an autonomous multi-step workflow command
      const isWorkflow =
        /find|search|compare|propose|fiverr|upwork|freelancer|linkedin|jobs|freelance|apply|work/i.test(
          text
        );

      try {
        if (isWorkflow) {
          setViewTab("workflow");
          setStatus("Launching multi-step autonomous workflow…");
          const wf = await startWorkflow(auth, text, deviceId || null);
          setActiveWorkflow(wf);
          const replyText = `Autonomous workflow started for: "${text}". Monitoring steps on ${wf.allowed_domains?.[0] || "web"}.`;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: replyText },
          ]);
          setStatus("Workflow running. Inspecting visible pages.");
          speakResponse(replyText);
        } else {
          // Standard operator assistant session
          if (!sessionRef.current || sessionDeviceRef.current !== deviceId) {
            const session = await createAssistantSession(
              auth,
              "voice",
              deviceId || null
            );
            sessionRef.current = session.session_id;
            sessionDeviceRef.current = deviceId;
          }
          const result = await sendAssistantMessage(
            auth,
            sessionRef.current,
            text,
            "voice"
          );
          setProposal(result.proposal || null);
          const replyText = result.message || "Task processed.";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: replyText },
          ]);
          setStatus(
            result.status === "awaiting_approval"
              ? "Review required before action execution."
              : "Response received."
          );
          speakResponse(replyText);
        }
        setInput("");
      } catch (error) {
        setStatus(error.message || "Assistant request failed.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${error.message || "Failed to process task."}`,
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, deviceId, interruptSpeech, speakResponse]
  );

  // Automatic voice turn recognition with Hindi & English support
  const startListening = () => {
    interruptSpeech();
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Browser SpeechRecognition unavailable. Please type your task.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatus(
        voiceLang === "hi-IN"
          ? "सुन रहा हूँ… अपना कार्य बोलिए"
          : "Listening… Speak your work instruction."
      );
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      setListening(false);
      setStatus(
        event.error === "not-allowed"
          ? "Microphone access denied. Grant permission to speak."
          : `Voice error: ${event.error}`
      );
    };

    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript || "";
      if (spoken.trim()) {
        setInput(spoken);
        // Automatic end-of-turn submission — no manual Send button needed!
        void submitTask(spoken);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus("Could not initialize voice recording. Please retry.");
    }
  };

  const handlePause = async () => {
    if (!activeWorkflow) return;
    const auth = token();
    try {
      const res = await pauseWorkflow(auth, activeWorkflow.workflow_id);
      setActiveWorkflow((prev) => ({ ...prev, status: res.status }));
      setStatus("Workflow paused.");
    } catch (err) {
      setStatus(err.message || "Pause failed.");
    }
  };

  const handleResume = async () => {
    if (!activeWorkflow) return;
    const auth = token();
    try {
      const res = await resumeWorkflow(auth, activeWorkflow.workflow_id);
      setActiveWorkflow((prev) => ({
        ...prev,
        status: res.status,
        waiting_reason: null,
      }));
      setStatus("Workflow resumed. Continuing execution.");
    } catch (err) {
      setStatus(err.message || "Resume failed.");
    }
  };

  const handleCancel = async () => {
    if (!activeWorkflow) return;
    const auth = token();
    try {
      const res = await cancelWorkflow(auth, activeWorkflow.workflow_id);
      setActiveWorkflow((prev) => ({ ...prev, status: res.status }));
      setStatus("Workflow cancelled.");
    } catch (err) {
      setStatus(err.message || "Cancel failed.");
    }
  };

  const decide = async (decision) => {
    if (!proposal || busy) return;
    const auth = token();
    setBusy(true);
    try {
      const result = await decideAssistantAction(
        auth,
        proposal.action_id,
        decision
      );
      setProposal(null);
      const msg =
        decision === "approve"
          ? "Approved. Command queued for trusted companion execution."
          : "Action rejected by owner.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
      setStatus(result.status || "Decision logged.");
      speakResponse(msg);
    } catch (error) {
      setStatus(error.message || "Could not log decision.");
    } finally {
      setBusy(false);
    }
  };

  const activate = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const auth = token();
      if (auth) {
        void loadDevices();
        void loadProfile();
      }
    } else {
      interruptSpeech();
      recognitionRef.current?.stop();
      setListening(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[71]">
      {open && (
        <section
          className="mb-4 flex flex-col h-[580px] w-[min(94vw,440px)] rounded-3xl border border-violet-500/30 bg-slate-950/95 text-white shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          aria-label="Hey Suji Autonomous AI Operator"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-violet-500/20 px-4 py-3 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-slate-950">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 shadow-md shadow-violet-500/20">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wide text-white">
                  HEY SUJI
                </p>
                <p className="text-[9px] font-medium tracking-wider text-violet-300">
                  AUTONOMOUS AI OPERATOR
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {speaking && (
                <button
                  onClick={interruptSpeech}
                  title="Stop speaking"
                  className="rounded-lg p-1.5 text-pink-400 hover:bg-white/10"
                >
                  <Volume2 size={16} className="animate-pulse" />
                </button>
              )}
              <button
                onClick={() => {
                  interruptSpeech();
                  recognitionRef.current?.stop();
                  setListening(false);
                  setOpen(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close assistant"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="flex border-b border-white/10 bg-slate-900/60 text-xs">
            <button
              onClick={() => setViewTab("operator")}
              className={`flex-1 py-2 font-medium transition-colors ${
                viewTab === "operator"
                  ? "border-b-2 border-violet-400 text-violet-300 bg-violet-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Voice & Chat
            </button>
            <button
              onClick={() => setViewTab("workflow")}
              className={`flex-1 py-2 font-medium transition-colors ${
                viewTab === "workflow"
                  ? "border-b-2 border-violet-400 text-violet-300 bg-violet-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Workflow Engine
              {activeWorkflow?.status === "running" && (
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-violet-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setViewTab("profile")}
              className={`flex-1 py-2 font-medium transition-colors ${
                viewTab === "profile"
                  ? "border-b-2 border-violet-400 text-violet-300 bg-violet-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Work Profile
            </button>
          </nav>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed">
            {/* Status bar */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 px-3 py-2 text-[11px] text-violet-200 flex items-center justify-between">
              <span className="truncate">{status}</span>
              {busy && <Loader2 size={13} className="animate-spin ml-2 shrink-0 text-violet-400" />}
            </div>

            {/* TAB 1: Voice & Chat */}
            {viewTab === "operator" && (
              <div className="space-y-3">
                {/* Conversation stream */}
                <div className="space-y-2">
                  {messages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-slate-400">
                      <Sparkles size={24} className="mx-auto mb-2 text-violet-400" />
                      <p className="font-semibold text-slate-300">
                        Give one high-level goal
                      </p>
                      <p className="mt-1 text-[11px]">
                        "Find Python, FastAPI and AI freelance jobs on Fiverr, compare with my real skills, and prepare tailored proposal drafts."
                      </p>
                    </div>
                  )}

                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl p-3 leading-5 ${
                        m.role === "user"
                          ? "ml-8 bg-violet-600/30 border border-violet-400/30 text-white"
                          : "mr-8 bg-slate-900 border border-white/10 text-slate-200"
                      }`}
                    >
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-violet-300 mb-1">
                        {m.role === "user" ? "You" : "Hey Suji"}
                      </span>
                      {m.content}
                    </div>
                  ))}
                </div>

                {/* Final action approval gate */}
                {proposal && (
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 shadow-lg">
                    <p className="flex items-center gap-1.5 font-bold text-amber-300">
                      <ShieldCheck size={16} /> Final Confirmation Required
                    </p>
                    <p className="mt-1.5 text-slate-200">{proposal.summary}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => decide("approve")}
                        className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                      >
                        Approve Action
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => decide("reject")}
                        className="rounded-xl border border-white/20 px-3 py-2 text-slate-300 hover:bg-white/10 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Multi-Step Autonomous Workflow Engine */}
            {viewTab === "workflow" && (
              <div className="space-y-3">
                {activeWorkflow ? (
                  <div className="space-y-3">
                    {/* Workflow Overview Card */}
                    <div className="rounded-2xl border border-violet-500/30 bg-slate-900/80 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-violet-300 uppercase">
                          ACTIVE WORKFLOW
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            activeWorkflow.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : activeWorkflow.status === "waiting_user"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : activeWorkflow.status === "paused"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                              : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                          }`}
                        >
                          {activeWorkflow.status}
                        </span>
                      </div>

                      <p className="font-semibold text-slate-200">
                        {activeWorkflow.goal}
                      </p>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>
                            Step {activeWorkflow.current_step_index} of {activeWorkflow.total_steps}
                          </span>
                          <span>
                            {Math.round(
                              (activeWorkflow.current_step_index /
                                Math.max(activeWorkflow.total_steps, 1)) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                            style={{
                              width: `${
                                (activeWorkflow.current_step_index /
                                  Math.max(activeWorkflow.total_steps, 1)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 pt-1">
                        {activeWorkflow.status === "running" && (
                          <button
                            onClick={handlePause}
                            className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-white/10"
                          >
                            <Pause size={12} /> Pause
                          </button>
                        )}
                        {(activeWorkflow.status === "paused" ||
                          activeWorkflow.status === "waiting_user") && (
                          <button
                            onClick={handleResume}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
                          >
                            <Play size={12} /> Resume
                          </button>
                        )}
                        {activeWorkflow.status !== "completed" &&
                          activeWorkflow.status !== "cancelled" && (
                            <button
                              onClick={handleCancel}
                              className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300 hover:bg-rose-500/20"
                            >
                              <RotateCcw size={12} /> Cancel
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Security Wall / User handoff alert */}
                    {activeWorkflow.status === "waiting_user" && (
                      <div className="rounded-2xl border border-amber-400/40 bg-amber-950/30 p-3 text-amber-200 space-y-2">
                        <p className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                          <AlertTriangle size={15} /> Security Challenge or Login Required
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          {activeWorkflow.waiting_reason ||
                            "The platform requested human verification or sign-in. Complete it in the opened browser window, then click Resume."}
                        </p>
                        <button
                          onClick={handleResume}
                          className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                        >
                          I've verified — Resume Workflow
                        </button>
                      </div>
                    )}

                    {/* Step Checklist */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Execution Steps
                      </p>
                      {(activeWorkflow.steps || []).map((step, idx) => (
                        <div
                          key={step.id || idx}
                          className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-colors ${
                            step.status === "completed"
                              ? "border-emerald-500/20 bg-emerald-950/10 text-emerald-200"
                              : step.status === "running"
                              ? "border-violet-500/40 bg-violet-950/20 text-violet-100 ring-1 ring-violet-500/30"
                              : "border-white/5 bg-slate-900/40 text-slate-400"
                          }`}
                        >
                          <div className="mt-0.5">
                            {step.status === "completed" ? (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            ) : step.status === "running" ? (
                              <Loader2 size={14} className="animate-spin text-violet-400" />
                            ) : (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-800 text-[9px] text-slate-400">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs leading-4">
                              {step.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Proposal Drafts Section */}
                    {(activeWorkflow.context_data?.proposals || []).length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
                            Tailored Proposal Drafts (Ready for Review)
                          </p>
                          <span className="text-[9px] text-slate-400">
                            No Auto-Submission
                          </span>
                        </div>

                        {activeWorkflow.context_data.proposals.map((p, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-950/20 via-slate-900 to-purple-950/20 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200 text-xs truncate max-w-[70%]">
                                {p.job_title}
                              </span>
                              <span className="rounded-full bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 text-[9px] font-semibold text-pink-300">
                                {p.match_score}% Match
                              </span>
                            </div>

                            <div className="rounded-xl bg-slate-950/80 p-2.5 font-mono text-[10px] text-slate-300 leading-relaxed border border-white/5 whitespace-pre-wrap max-h-36 overflow-y-auto">
                              {p.proposal_draft}
                            </div>

                            {p.missing_facts_checklist && (
                              <div className="space-y-1">
                                <p className="text-[9px] font-semibold text-amber-300 uppercase">
                                  Items to Confirm:
                                </p>
                                {p.missing_facts_checklist.map((item, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="flex items-center gap-1.5 text-[10px] text-slate-300"
                                  >
                                    <span className="h-1 w-1 rounded-full bg-amber-400" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-end pt-1">
                              <a
                                href={p.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200"
                              >
                                View Job Listing <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-slate-400 space-y-2">
                    <Layers size={28} className="mx-auto text-violet-400 opacity-60" />
                    <p className="font-semibold text-slate-300">No active workflow</p>
                    <p className="text-[11px] max-w-[280px] mx-auto">
                      Speak or enter an instruction in the Chat tab to start an autonomous workflow.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Work Profile */}
            {viewTab === "profile" && (
              <div className="space-y-3">
                {workProfile ? (
                  <div className="rounded-2xl border border-violet-500/20 bg-slate-900/80 p-3.5 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-violet-300 uppercase">
                        VERIFIED OWNER PROFILE
                      </span>
                      <h4 className="font-bold text-slate-100 text-sm">
                        {workProfile.headline}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {workProfile.bio}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Core Skills:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(workProfile.skills || []).map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-violet-600/20 border border-violet-400/20 px-2 py-0.5 text-[10px] text-violet-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Frameworks & Backend:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(workProfile.frameworks || []).map((f, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-pink-600/20 border border-pink-400/20 px-2 py-0.5 text-[10px] text-pink-200"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-between">
                      <span>Minimum Budget: {workProfile.minimum_budget || "$500"}</span>
                      <span className="text-emerald-400">● {workProfile.availability}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Loading verified work profile…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Controls / Voice & Input Bar */}
          <footer className="border-t border-white/10 bg-slate-950 p-3 space-y-2">
            {/* Input row */}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submitTask(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  voiceLang === "hi-IN"
                    ? "क्या करना है बताइए… (या टाइप करें)"
                    : "Tell me what to do… (or speak)"
                }
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-400 focus:bg-white/10"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send task"
                className="flex items-center justify-center rounded-xl bg-violet-600 px-3 py-2 text-white hover:bg-violet-500 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>

            {/* Language & Voice trigger bar */}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVoiceLang(voiceLang === "hi-IN" ? "en-US" : "hi-IN")}
                  className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:text-white"
                >
                  {voiceLang === "hi-IN" ? "🇮🇳 Hindi (बोलिए)" : "🇺🇸 English"}
                </button>

                {devices.length > 0 && (
                  <select
                    value={deviceId}
                    onChange={(e) => {
                      setDeviceId(e.target.value);
                      sessionRef.current = null;
                    }}
                    className="rounded-lg border border-white/15 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-300"
                  >
                    {devices.map((d) => (
                      <option key={d.device_id} value={d.device_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={startListening}
                disabled={busy}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold text-xs shadow-md transition-all ${
                  listening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:brightness-110"
                } disabled:opacity-40`}
              >
                {busy ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : listening ? (
                  <MicOff size={13} />
                ) : (
                  <Mic size={13} />
                )}
                <span>{listening ? "Stop" : "Speak"}</span>
              </button>
            </div>
          </footer>
        </section>
      )}

      {/* Floating Orb Button */}
      <button
        onClick={activate}
        aria-label="Hey Suji Assistant"
        title="Activate Hey Suji"
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-violet-300/40 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-xl shadow-purple-600/30 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        {listening && (
          <span className="absolute inset-0 rounded-full border-2 border-pink-400 animate-ping opacity-75" />
        )}
        {speaking && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[9px] font-bold">
            <Volume2 size={10} />
          </span>
        )}
        {open ? <X size={22} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
}
