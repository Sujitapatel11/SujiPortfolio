import React, { useCallback, useEffect, useState } from "react";
import { API_ORIGIN, apiUrl } from "../api/config";

const COMPANION = "http://127.0.0.1:8765";

async function api(path, token, options = {}) {
  const response = await fetch(apiUrl(`/api/assistant${path}`), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Assistant API error (${response.status})`);
  return data;
}

async function localConnect(deviceId, deviceToken) {
  let response;
  try {
    response = await fetch(`${COMPANION}/v1/backend/connect`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "strict-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_base_url: API_ORIGIN, device_id: deviceId, device_token: deviceToken }),
    });
  } catch {
    throw new Error("Local companion is unreachable. Start companion/companion.py on this Windows computer and allow the browser's local-network permission.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Local companion rejected pairing (${response.status})`);
  return data;
}

async function localDisconnect(deviceId) {
  let response;
  try {
    response = await fetch(`${COMPANION}/v1/backend/disconnect`, {
      method: "POST", mode: "cors", credentials: "omit", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    });
  } catch {
    throw new Error("Local companion is unreachable; revoke the device below to disable its backend credential.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Disconnect failed (${response.status})`);
  return data;
}

export default function PersonalOperatorDevices({ adminToken }) {
  const [devices, setDevices] = useState([]);
  const [deviceName, setDeviceName] = useState("Suji Windows laptop");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [connection, setConnection] = useState(null);
  const [androidDeviceName, setAndroidDeviceName] = useState("Suji Android phone");
  const [androidCredentials, setAndroidCredentials] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const rows = await api("/devices", adminToken);
      setDevices(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const [sessionId, setSessionId] = useState("");
  const [actions, setActions] = useState([]);
  const [commandText, setCommandText] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);

  const refreshActions = useCallback(async (id = sessionId) => {
    if (!id) return;
    try { setActions(await api(`/sessions/${encodeURIComponent(id)}/actions`, adminToken)); }
    catch (err) { setError(err.message); }
  }, [adminToken, sessionId]);

  const startAssistantSession = async (deviceId) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const session = await api("/sessions", adminToken, {
        method: "POST", body: JSON.stringify({ input_mode: "voice", device_id: deviceId }),
      });
      setSessionId(session.session_id); setActions([]);
      setMessage("Voice session ready. Proposed actions require your approval.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const submitCommand = async (text = commandText, inputMode = "text") => {
    const clean = text.trim();
    if (!clean || !sessionId || voiceBusy) return;
    setVoiceBusy(true); setError(""); setAssistantReply("");
    try {
      const result = await api(`/sessions/${encodeURIComponent(sessionId)}/messages`, adminToken, {
        method: "POST", body: JSON.stringify({ text: clean, input_mode: inputMode }),
      });
      setAssistantReply(result.message || "Request received.");
      setCommandText("");
      await refreshActions(sessionId);
    } catch (err) { setError(err.message); }
    finally { setVoiceBusy(false); }
  };

  const startVoiceCommand = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setError("Voice recognition is unavailable here. Use Chrome or Edge."); return; }
    const recognition = new Speech();
    recognition.lang = "hi-IN"; recognition.interimResults = false;
    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript || "";
      setCommandText(spoken); submitCommand(spoken, "voice");
    };
    recognition.onerror = (event) => setError("Microphone error: " + event.error);
    recognition.start();
  };

  const decideAction = async (actionId, decision) => {
    setBusy(true); setError("");
    try {
      await api(`/actions/${encodeURIComponent(actionId)}/decision`, adminToken, {
        method: "POST", body: JSON.stringify({ decision }),
      });
      await refreshActions(sessionId);
      setMessage(decision === "approve" ? "Approved and queued for the selected paired device." : "Action rejected.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const registerAndroidDevice = async () => {
    setBusy(true); setError(""); setMessage(""); setAndroidCredentials(null); setCopyMessage("");
    try {
      const device = await api("/devices", adminToken, {
        method: "POST",
        body: JSON.stringify({ name: androidDeviceName.trim() }),
      });
      setAndroidCredentials({
        apiBaseUrl: API_ORIGIN,
        deviceId: device.device_id,
        deviceToken: device.device_token,
      });
      setMessage("Android device record created. Copy these one-time credentials into the Hey Suji Android app.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyAndroidValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(label + " copied. Paste it into Hey Suji on your phone.");
    } catch {
      setCopyMessage("Clipboard access was blocked. Select and copy the value manually.");
    }
  };

  const pairDevice = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage(""); setConnection(null);
    let createdDeviceId = null;
    try {
      const device = await api("/devices", adminToken, {
        method: "POST",
        body: JSON.stringify({ name: deviceName.trim() }),
      });
      createdDeviceId = device.device_id;
      // The raw one-time token exists only in this function's memory and is sent directly to localhost.
      const connected = await localConnect(device.device_id, device.device_token);
      setConnection(connected);
      setMessage("Laptop paired. The local companion is connected and polling for approved commands.");
      await refresh();
    } catch (err) {
      setError(createdDeviceId
        ? `${err.message} A device record was created but connection did not complete. Revoke that device before retrying.`
        : err.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (deviceId) => {
    setBusy(true); setError(""); setMessage("");
    try {
      try { await localDisconnect(deviceId); } catch (err) {
        if (!window.confirm(`${err.message}\n\nRevoke this device on the backend anyway?`)) return;
      }
      await api(`/devices/${encodeURIComponent(deviceId)}/revoke`, adminToken, { method: "POST" });
      setConnection(null);
      setMessage("Device revoked. It can no longer claim commands from the backend.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-data-panel">
      <div className="admin-data-panel-head">
        <span className="admin-data-panel-title">SUJI · PRIVATE PERSONAL OPERATOR</span>
        <button className="admin-btn-secondary" onClick={refresh} disabled={busy}>Refresh</button>
      </div>
      <div style={{ padding: "1.4rem", display: "grid", gap: "1.2rem" }}>
        <div style={{ color: "var(--bp-grey)", fontSize: "0.78rem", lineHeight: 1.7 }}>
          Pair your Windows computer or Android phone with the private operator. Device credentials remain protected; tasks are not executed until you approve the exact proposal.
        </div>
        {error && <div className="admin-error-banner" role="alert">{error}</div>}
        {message && <div style={{ color: "#22D69A", fontSize: "0.78rem" }} role="status">{message}</div>}
        {connection && <div className="admin-settings-row"><span>Local connection</span><strong>Connected · polling enabled</strong></div>}
        <div style={{ border: "1px solid var(--bp-grid-line)", borderRadius: "12px", padding: "1rem", display: "grid", gap: "0.7rem" }}>
          <div className="admin-label">Pair an Android phone</div>
          <p style={{ color: "var(--bp-grey)", fontSize: "0.75rem", lineHeight: 1.6, margin: 0 }}>
            Generate a device credential here, then enter it once in the Hey Suji Android companion. The phone encrypts it with Android Keystore, receives only approved tasks, and shows a notification to tap before opening the approved app or website.
          </p>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "end" }}>
            <div className="admin-form-group" style={{ flex: "1 1 220px", marginBottom: 0 }}>
              <label className="admin-label" htmlFor="operator-android-name">Phone name</label>
              <input id="operator-android-name" className="admin-input" value={androidDeviceName} onChange={(e) => setAndroidDeviceName(e.target.value)} maxLength={120} required />
            </div>
            <button className="admin-btn-primary" type="button" onClick={registerAndroidDevice} disabled={busy || !androidDeviceName.trim()}>
              {busy ? "Generating…" : "Generate Android pairing"}
            </button>
          </div>
          {androidCredentials && (
            <div style={{ display: "grid", gap: "0.65rem", borderTop: "1px solid var(--bp-grid-line)", paddingTop: "0.8rem" }}>
              <p style={{ color: "#E7B65A", fontSize: "0.72rem", margin: 0 }}>
                One-time token: copy it now. It is not stored in browser storage and cannot be recovered after this panel is cleared.
              </p>
              {[
                ["Backend URL", androidCredentials.apiBaseUrl],
                ["Device ID", androidCredentials.deviceId],
                ["Device token", androidCredentials.deviceToken],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "grid", gap: "0.3rem" }}>
                  <span className="admin-label">{label}</span>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input className="admin-input" readOnly value={value} aria-label={label} />
                    <button className="admin-btn-secondary" type="button" onClick={() => copyAndroidValue(value, label)}>Copy</button>
                  </div>
                </div>
              ))}
              <button className="admin-btn-secondary" type="button" onClick={() => { setAndroidCredentials(null); setCopyMessage(""); }}>Hide one-time token</button>
              {copyMessage && <span role="status" style={{ color: "var(--bp-grey)", fontSize: "0.72rem" }}>{copyMessage}</span>}
            </div>
          )}
        </div>

        <form onSubmit={pairDevice} style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "end" }}>
          <div className="admin-form-group" style={{ flex: "1 1 220px", marginBottom: 0 }}>
            <label className="admin-label" htmlFor="operator-device-name">Device name</label>
            <input id="operator-device-name" className="admin-input" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} maxLength={120} required />
          </div>
          <button className="admin-btn-primary" type="submit" disabled={busy || !deviceName.trim()}>{busy ? "Connecting…" : "Pair this computer"}</button>
        </form>
        {devices.some((device) => device.is_active) && (
          <div style={{ borderTop: "1px solid var(--bp-grid-line)", paddingTop: "1rem", display: "grid", gap: "0.8rem" }}>
            <div className="admin-label">Voice command session</div>
            {!sessionId ? <p style={{ color: "var(--bp-grey)", fontSize: "0.78rem" }}>Start a device-bound session from a paired device below.</p> : <>
              <div className="admin-settings-row"><span>Session</span><strong>Active · {sessionId.slice(0, 8)}</strong></div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button className="admin-btn-secondary" type="button" disabled={voiceBusy || busy} onClick={startVoiceCommand}>Speak command</button>
                <button className="admin-btn-secondary" type="button" disabled={voiceBusy || busy} onClick={() => refreshActions()}>Refresh proposals</button>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); submitCommand(commandText, "text"); }} style={{ display: "flex", gap: "0.6rem" }}>
                <input className="admin-input" value={commandText} onChange={(event) => setCommandText(event.target.value)} placeholder="Say or type: open google.com" />
                <button className="admin-btn-primary" disabled={voiceBusy || !commandText.trim()}>Send</button>
              </form>
              {assistantReply && <p role="status" style={{ color: "var(--bp-grey)", fontSize: "0.78rem" }}>{assistantReply}</p>}
              <div className="admin-label">Action proposals · approval required</div>
              {actions.length === 0 ? <p style={{ color: "var(--bp-grey)", fontSize: "0.78rem" }}>No proposals yet.</p> : actions.map((action) => (
                <div key={action.action_id} style={{ border: "1px solid var(--bp-grid-line)", borderRadius: "10px", padding: "0.8rem", display: "grid", gap: "0.45rem" }}>
                  <strong style={{ fontSize: "0.82rem" }}>{action.summary || action.tool}</strong>
                  <code style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "0.68rem", color: "var(--bp-grey)" }}>{JSON.stringify(action.arguments, null, 2)}</code>
                  <span style={{ fontSize: "0.68rem", color: "var(--bp-grey)" }}>Tool: {action.tool} · Risk: {action.risk} · Status: {action.status}</span>
                  {action.result && <p style={{ fontSize: "0.72rem", color: "var(--bp-grey)" }}>Result: {action.result.message || action.result.code}</p>}
                  {action.status === "awaiting_approval" && <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="admin-btn-success" type="button" disabled={busy} onClick={() => decideAction(action.action_id, "approve")}>Approve exact action</button>
                    <button className="admin-btn-danger" type="button" disabled={busy} onClick={() => decideAction(action.action_id, "reject")}>Reject</button>
                  </div>}
                </div>
              ))}
            </>}
          </div>
        )}
        <div style={{ borderTop: "1px solid var(--bp-grid-line)", paddingTop: "1rem" }}>
          <div className="admin-label">Paired devices</div>
          {loading ? <p style={{ color: "var(--bp-grey)", fontSize: "0.78rem" }}>Loading devices…</p> :
            devices.length === 0 ? <p style={{ color: "var(--bp-grey)", fontSize: "0.78rem" }}>No paired devices yet.</p> :
            devices.map((device) => (
              <div key={device.device_id} className="admin-settings-row" style={{ gap: "1rem", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block" }}>{device.name}</strong>
                  <span style={{ color: "var(--bp-grey)", fontSize: "0.68rem" }}>
                    {device.is_active ? "Active credential" : "Revoked"} · {device.last_seen_at ? `Last seen ${new Date(device.last_seen_at).toLocaleString()}` : "Not yet seen"}
                  </span>
                </div>
                {device.is_active && <div style={{ display: "flex", gap: "0.4rem" }}><button className="admin-btn-secondary" disabled={busy} onClick={() => startAssistantSession(device.device_id)}>Start session</button><button className="admin-btn-danger" disabled={busy} onClick={() => disconnect(device.device_id)}>Revoke</button></div>}
              </div>
            ))
          }
        </div>
        <p style={{ color: "var(--bp-grey)", fontSize: "0.68rem", lineHeight: 1.6, margin: 0 }}>
          Safety: pairing only establishes a secure device channel. It does not enable unrestricted computer control. The companion currently supports only its explicitly allowlisted actions.
        </p>
      </div>
    </section>
  );
}
