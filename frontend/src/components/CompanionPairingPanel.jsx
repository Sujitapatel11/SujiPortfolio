import React, { useEffect, useRef, useState } from "react";
import { Link2, Unlink, ShieldCheck, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

const COMPANION_BASE = "http://127.0.0.1:8765";

async function companionRequest(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${COMPANION_BASE}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      mode: "cors", credentials: "omit", cache: "no-store",
    });
  } catch {
    throw new Error("Browser cannot reach 127.0.0.1:8765. Start the companion locally and allow this site to access your local network.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Companion request failed (${response.status}).`);
  return data;
}

export default function CompanionPairingPanel() {
  const [challenge, setChallenge] = useState("");
  const [token, setToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [capabilities, setCapabilities] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const tokenRef = useRef("");

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => () => {
    tokenRef.current = "";
  }, []);

  const checkCompanion = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const health = await companionRequest("/health");
      setNotice(`Companion reachable · execution enabled: ${String(health.execution_enabled)}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const pair = async (event) => {
    event.preventDefault();
    if (!challenge.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await companionRequest("/v1/pairing/complete", {
        method: "POST", body: { challenge: challenge.trim() },
      });
      setToken(result.session_token);
      tokenRef.current = result.session_token;
      setDeviceId(result.device_id);
      setExpiresAt(result.expires_at);
      setChallenge("");
      const info = await companionRequest("/v1/capabilities", { token: result.session_token });
      setCapabilities(info);
      setNotice("Browser paired with the local companion. No desktop actions are enabled.");
    } catch (err) {
      setToken(""); tokenRef.current = ""; setDeviceId(""); setExpiresAt(""); setCapabilities(null);
      setError(err.message);
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    const activeToken = tokenRef.current;
    if (!activeToken) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await companionRequest("/v1/pairing/disconnect", { method: "POST", token: activeToken, body: {} });
      setNotice("Local companion pairing disconnected.");
    } catch (err) { setError(err.message); }
    finally {
      setToken(""); tokenRef.current = ""; setDeviceId(""); setExpiresAt(""); setCapabilities(null); setBusy(false);
    }
  };

  return (
    <section className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-cyan-100"><Link2 size={14}/> LOCAL DEVICE PAIRING</p>
        <span className={`rounded-full px-2 py-1 text-[10px] ${token ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-slate-300"}`}>{token ? "Paired" : "Not paired"}</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Connect this browser to the companion running on this computer. Pairing credentials stay in memory and are cleared when this panel unmounts or you disconnect.</p>
      {!token ? (
        <form onSubmit={pair} className="mt-3 space-y-2">
          <button type="button" onClick={checkCompanion} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-50"><RefreshCw size={13}/> Check local companion</button>
          <label className="block text-[10px] text-slate-400" htmlFor="assistant-pairing-challenge">One-time challenge shown in the companion terminal</label>
          <input id="assistant-pairing-challenge" value={challenge} onChange={(e) => setChallenge(e.target.value)} autoComplete="off" spellCheck="false" placeholder="Paste the 120-second challenge" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/50"/>
          <button type="submit" disabled={busy || challenge.trim().length < 30} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin"/> : <ShieldCheck size={13}/>} Pair this browser</button>
        </form>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-emerald-100">Device ID: <span className="font-mono">{deviceId}</span></p>
          <p className="text-[10px] text-slate-400">Session expires: {expiresAt ? new Date(expiresAt).toLocaleTimeString() : "unknown"}</p>
          <p className="text-[11px] text-slate-300">Available capabilities: {capabilities?.capabilities?.length ?? 0}</p>
          <button onClick={disconnect} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-100 hover:bg-rose-400/10 disabled:opacity-50"><Unlink size={13}/> Disconnect device</button>
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-[10px] text-emerald-200">{notice}</p>}
      {error && <p role="alert" className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-rose-200"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>{error}</p>}
      <p className="mt-2 text-[10px] leading-relaxed text-amber-100/70">Pairing only grants status access. The companion currently exposes zero desktop capabilities; this does not enable browser automation or computer control.</p>
    </section>
  );
}
