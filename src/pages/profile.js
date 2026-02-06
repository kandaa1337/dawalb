// src/pages/profile.js
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * API helper:
 * - always hits /api/*
 * - sends cookies (sid)
 * - parses JSON safely
 * - throws readable errors
 */
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  // profile forms
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [pw, setPw] = useState({ oldPassword: "", newPassword: "" });

  // partner state
  const [partnerState, setPartnerState] = useState(null);
  const partnerUIState = useMemo(() => partnerState?.state || "NONE", [partnerState]);

  // messages
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // init form from auth user
  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user]);

  async function reloadPartnerState() {
    try {
      const data = await api("/partners/status");
      setPartnerState(data);
    } catch (e) {
      // fallback so button never "disappears"
      setPartnerState({ ok: false, state: "NONE", error: e.message });
    }
  }

  useEffect(() => {
    reloadPartnerState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save profile
  const saveProfile = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      // BACKEND: recommended PATCH, but if you only have PUT — change method to PUT
      await api("/auth/me", { method: "PATCH", body: form });
      setMsg("Profile saved ✅");
    } catch (e2) {
      setErr(e2.message || "Failed");
    }
  };

  // change password
  const changePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      // BACKEND: /api/auth/change-password (POST)
      await api("/auth/change-password", { method: "POST", body: pw });
      setPw({ oldPassword: "", newPassword: "" });
      setMsg("Password changed ✅");
    } catch (e2) {
      setErr(e2.message || "Failed");
    }
  };

  // cancel partner application
  const cancelPartner = async () => {
    setErr("");
    setMsg("");
    try {
      await api("/partners/application", { method: "DELETE" });
      setMsg("Application cancelled ✅");
      await reloadPartnerState();
    } catch (e) {
      setErr(e.message || "Failed");
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Profile</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            {user?.email || user?.phone || ""}
          </div>
        </div>

        {/* Partner button state */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {(partnerUIState === "NONE" || partnerUIState === "REJECTED") && (
            <button type="button" onClick={() => nav("/partner/apply")}>
              Become a partner
            </button>
          )}

          {partnerUIState === "IN_PROCESS" && (
            <>
              <button type="button" onClick={() => nav("/partner/apply")}>
                In process
              </button>

              <div style={{ opacity: 0.75 }}>
                Submitted:{" "}
                {partnerState?.application?.createdAt
                  ? fmtDate(partnerState.application.createdAt)
                  : "—"}
              </div>

              <button type="button" onClick={() => nav("/partner/apply")}>
                Edit
              </button>

              <button type="button" onClick={cancelPartner}>
                Cancel
              </button>
            </>
          )}

          {partnerUIState === "PARTNER" && (
            <button type="button" disabled>
              Partner ✅
            </button>
          )}

          {/* if backend returns weird/unknown state */}
          {!["NONE", "REJECTED", "IN_PROCESS", "PARTNER", "APPROVED"].includes(partnerUIState) && (
            <button type="button" onClick={() => nav("/partner/apply")}>
              Become a partner
            </button>
          )}

          {/* Logout always */}
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
      {msg && <div style={{ color: "green", marginTop: 12 }}>{msg}</div>}

      {/* Forms */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 16 }}>
        {/* Account */}
        <form onSubmit={saveProfile} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Account</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />

            <button type="submit">Save</button>

            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Note: Profile update uses <b>PATCH /api/auth/me</b>.
              If your backend still uses PUT, change method to PUT.
            </div>
          </div>
        </form>

        {/* Security */}
        <form onSubmit={changePassword} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Security</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <input
              type="password"
              placeholder="Old password"
              value={pw.oldPassword}
              onChange={(e) => setPw((s) => ({ ...s, oldPassword: e.target.value }))}
            />
            <input
              type="password"
              placeholder="New password (min 6)"
              value={pw.newPassword}
              onChange={(e) => setPw((s) => ({ ...s, newPassword: e.target.value }))}
            />

            <button type="submit" disabled={!pw.oldPassword || pw.newPassword.length < 6}>
              Change password
            </button>

            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Password change uses <b>POST /api/auth/change-password</b>.
            </div>
          </div>
        </form>
      </div>

      {/* Later */}
      <div style={{ marginTop: 18, opacity: 0.7 }}>
        Next: search history / reservations history / reviews history.
      </div>
    </div>
  );
}
