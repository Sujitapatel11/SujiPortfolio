import React, { useEffect, useRef, useState } from "react";
import { Mic, Link2, Unlink, Loader2, AlertTriangle, MicOff } from "lucide-react";

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

function normalizeVoiceCommand(input = "") {
  let value = input.normalize("NFKC").toLowerCase().trim().replace(/[।.!?]+$/g, "").replace(/\s+/g, " ");
  const aliases = [
    [/^(?:ओपन|खोलो|खोल दो|खोलिए)\s+(?:व्हाट्स ?एप|व्हाट्सएप|वाट्सएप)$/u, "open whatsapp"],
    [/^(?:व्हाट्स ?एप|व्हाट्सएप|वाट्सएप)\s+(?:खोलो|खोल दो|चालू करो)$/u, "open whatsapp"],
    [/^(?:ओपन|खोलो|खोल दो)\s+इंस्टाग्राम$/u, "open instagram"],
    [/^इंस्टाग्राम\s+(?:खोलो|खोल दो|चालू करो)$/u, "open instagram"],
    [/^(?:ओपन|खोलो|खोल दो)\s+क्रोम$/u, "open chrome"],
    [/^क्रोम\s+(?:खोलो|खोल दो|चालू करो)$/u, "open chrome"],
    [/^(?:ओपन|खोलो|खोल दो)\s+यूट्यूब$/u, "open youtube"],
    [/^यूट्यूब\s+(?:खोलो|खोल दो|चालू करो)$/u, "open youtube"],
    [/^(?:व्हाट्स ?एप|व्हाट्सएप)$/u, "open whatsapp"],
    [/^इंस्टाग्राम$/u, "open instagram"],
    [/^यूट्यूब$/u, "open youtube"],
  ];
  for (const [pattern, replacement] of aliases) {
    if (pattern.test(value)) return replacement;
  }
  value = value
    .replace(/\b(khol do|kholna|kholo|khol)\b/gi, "open")
    .replace(/\b(chalao|start karo)\b/gi, "open")
    .replace(/\bwhats\s?app\b/gi, "whatsapp");
  return value;
}

function resolveCommand(input) {
  const value = normalizeVoiceCommand(input);
  const linkedin = value.match(/^search\s+linkedin\s+for\s+(.+)$/i) || value.match(/^find\s+(?:on\s+)?linkedin\s+(.+)$/i);
  const openLinkedInSearch = value.match(/^(?:open|go to|visit)\s+linkedin\s+and\s+search\s+(.+)$/i);
  const googleSearch = value.match(/^(?:search|google search)\s+(?:google\s+for\s+)?(.+)$/i);
  const instagramSearch = value.match(/^search\s+instagram\s+for\s+(.+)$/i);
  const instagramProfile = value.match(/^(?:open|visit|show)\s+(?:instagram\s+)?@?([a-zA-Z0-9._]{1,30})\s+profile$/i);
  const instagramTag = value.match(/^(?:search|open)\s+instagram\s+hashtag\s+#?([a-zA-Z0-9_]+)$/i);
  const whatsappDraft = value.match(/^draft\s+(?:a\s+)?whatsapp\s+message(?:\s+to\s+(\+?[0-9]{8,15}))?\s*[:,-]?\s+(.+)$/i);
  const open = value.match(/^(?:open|go to|visit)\s+(.+)$/i);

  if (whatsappDraft) {
    const number = whatsappDraft[1] ? whatsappDraft[1].replace(/\D/g, "") : "";
    return { action: "open_url", target: (number ? "https://wa.me/" + number : "https://wa.me/") + "?text=" + encodeURIComponent(whatsappDraft[2]) };
  }
  if (instagramProfile) return { action: "open_url", target: "https://www.instagram.com/" + encodeURIComponent(instagramProfile[1]) + "/" };
  if (instagramTag) return { action: "open_url", target: "https://www.instagram.com/explore/tags/" + encodeURIComponent(instagramTag[1]) + "/" };
  if (openLinkedInSearch) return { action: "linkedin_search", target: openLinkedInSearch[1] };
  if (linkedin) return { action: "linkedin_search", target: linkedin[1] };
  if (googleSearch) return { action: "google_search", target: googleSearch[1] };
  if (instagramSearch) return { action: "open_url", target: "https://www.instagram.com/explore/search/keyword/?q=" + encodeURIComponent(instagramSearch[1]) };
  if (open) {
    const site = open[1].toLowerCase().replace(/^www\./, "").trim();
    const urls = {
      google: "https://www.google.com", "google.com": "https://www.google.com",
      linkedin: "https://www.linkedin.com", "linkedin.com": "https://www.linkedin.com",
      whatsapp: "https://web.whatsapp.com", "whatsapp web": "https://web.whatsapp.com",
      "web.whatsapp.com": "https://web.whatsapp.com", instagram: "https://www.instagram.com",
      "instagram.com": "https://www.instagram.com", youtube: "https://www.youtube.com",
      "youtube.com": "https://www.youtube.com", chrome: "chrome://newtab",
    };
    if (site === "chrome") return { unsupported: "Opening the Chrome application requires a Windows desktop-app handler. Browser navigation to chrome:// is not supported by this companion yet." };
    return { action: "open_url", target: urls[site] || (/^https?:\/\//i.test(site) ? site : "https://" + site) };
  }
  return null;
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
  const busyRef = useRef(false);

  useEffect(() => {
    tokenRef.current = token;
    if (!token) { setMessage("Connect this computer once to enable the Personal Operator."); return; }
    request("/v1/status", { token }).then(() => setMessage("Connected. Your pairing is saved on this browser and Windows computer."))
      .catch((e) => { localStorage.removeItem(TOKEN_KEY); tokenRef.current = ""; setToken(""); setMessage("Pairing needs setup again: " + e.message); });
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

  const execute = async (spoken = command) => {
    const original = spoken.trim();
    if (!original) { setError("I didn't receive a command. Please speak again."); return; }
    if (!tokenRef.current) { setError("This computer is not paired. Connect the local companion first."); return; }
    if (busyRef.current) { setMessage("A previous command is still running. Please wait."); return; }

    const resolved = resolveCommand(original);
    if (!resolved) {
      setError(`I heard “${original}”, but I don't recognize that command yet. Try “ओपन व्हाट्सएप” or “open Instagram”.`);
      return;
    }
    if (resolved.unsupported) { setError(resolved.unsupported); return; }

    busyRef.current = true; setBusy(true); setError("");
    setMessage(`Command understood: ${resolved.action === "open_url" ? "opening website" : "searching"}…`);
    try {
      const result = await request("/v1/action", { token: tokenRef.current, method: "POST", body: { action: resolved.action, value: resolved.target } });
      setMessage("SUCCESS — opened: " + result.url);
      setCommand("");
    } catch (e) {
      setError("Execution failed: " + e.message);
      setMessage("Command was understood but could not be executed.");
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const listen = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setError("Voice recognition is not supported by this browser. Use the latest Chrome or Edge."); return; }
    const recognition = new Speech();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    recognition.onstart = () => { setListening(true); setError(""); setMessage("Listening… बोलिए"); };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => setError(event.error === "not-allowed" ? "Microphone permission blocked. Allow microphone access for this site." : "Microphone error: " + event.error);
    recognition.onresult = (event) => {
      const alternatives = Array.from(event.results[0] || []).map(item => item.transcript);
      const spoken = alternatives.find(item => resolveCommand(item)) || alternatives[0] || "";
      setCommand(spoken);
      setMessage("Heard: “" + spoken + "”");
      execute(spoken);
    };
    try { recognition.start(); } catch (e) { setListening(false); setError("Could not start microphone: " + e.message); }
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
      <div className="mt-4 flex flex-col items-center gap-3">
        <button type="button" onClick={listen} disabled={busy || listening} aria-label="Start voice assistant" title="Click and speak" className={"flex h-16 w-16 items-center justify-center rounded-full border transition " + (listening ? "border-rose-300 bg-rose-500/20 text-rose-100" : "border-violet-300/40 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30")}>
          {listening ? <MicOff size={25}/> : busy ? <Loader2 size={25} className="animate-spin"/> : <Mic size={25}/>}
        </button>
        <p className="text-xs text-violet-100">{listening ? "Listening… बोलिए" : "Tap the microphone and speak"}</p>
        <p className="text-[10px] text-slate-400">Hindi / Hinglish / English voice commands supported. No typing needed.</p>
        <button onClick={disconnect} disabled={busy} className="flex items-center gap-2 rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-100"><Unlink size={14}/> Disconnect</button>
      </div>
    </>}
    {busy && <p className="mt-2 flex items-center gap-2 text-xs text-violet-200"><Loader2 size={13} className="animate-spin"/> Executing command…</p>}
    <p role="status" className="mt-2 text-[11px] text-emerald-200">{message}</p>
    {error && <p role="alert" className="mt-2 flex gap-1.5 text-[11px] text-rose-200"><AlertTriangle size={13}/>{error}</p>}
    <p className="mt-2 text-[10px] text-slate-500">Voice actions: Google/LinkedIn search, Instagram/WhatsApp/YouTube navigation. Desktop app launching and sensitive actions require separate permissioned handlers.</p>
  </section>;
}
