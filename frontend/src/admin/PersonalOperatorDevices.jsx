import React, { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const COMPANION = "http://127.0.0.1:8765";

async function api(path, token, options = {}) {
  const response = await fetch(`${API_BASE}/api/assistant${path}`, {
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
      body: JSON.stringify({ api_base_url: API_BASE, device_id: deviceId, device_token: deviceToken }),
    });
  } catch {
    throw new Error("Local companion is unreachable. Start companion/companion.py on this Windows computer and allow the browser's local-network permission.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Local companion rejected pairing (${response.status})`);
  return data;
}

async function localDisconnect() {
  let response;
  try {
    response = await fetch(`${COMPANION}/v1/backend/disconnect`, {
      method: "POST", mode: "cors", credentials: "omit", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: "{}",
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
      try { await localDisconnect(); } catch (err) {
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
          Pair this Windows computer with your private assistant. Device credentials are sent directly to the local companion and are not saved in browser storage. Commands still require your approval before execution.
        </div>
        {error && <div className="admin-error-banner" role="alert">{error}</div>}
        {message && <div style={{ color: "#22D69A", fontSize: "0.78rem" }} role="status">{message}</div>}
        {connection && <div className="admin-settings-row"><span>Local connection</span><strong>Connected · polling enabled</strong></div>}
        <form onSubmit={pairDevice} style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "end" }}>
          <div className="admin-form-group" style={{ flex: "1 1 220px", marginBottom: 0 }}>
            <label className="admin-label" htmlFor="operator-device-name">Device name</label>
            <input id="operator-device-name" className="admin-input" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} maxLength={120} required />
          </div>
          <button className="admin-btn-primary" type="submit" disabled={busy || !deviceName.trim()}>{busy ? "Connecting…" : "Pair this computer"}</button>
        </form>
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
                {device.is_active && <button className="admin-btn-danger" disabled={busy} onClick={() => disconnect(device.device_id)}>Revoke</button>}
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
