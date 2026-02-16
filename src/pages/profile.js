// src/pages/profile.js
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/Provider";
import "../styles/Profile.css";

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
  const { t } = useI18n();

  const [form, setForm] = useState({ name: "" });
  const [pw, setPw] = useState({ oldPassword: "", newPassword: "", confirmNewPassword: "" });

  const [partnerState, setPartnerState] = useState(null);
  const partnerUIState = useMemo(() => partnerState?.state || "NONE", [partnerState]);

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);

  useEffect(() => {
    setForm({
      name: user?.name || "",
    });
  }, [user]);

  async function reloadPartnerState() {
    try {
      const data = await api("/partners/status");
      setPartnerState(data);
    } catch (e) {
      setPartnerState({ ok: false, state: "NONE", error: e.message });
    }
  }

  useEffect(() => {
    reloadPartnerState();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadReservations = async () => {
      if (!user) {
        if (!cancelled) setReservations([]);
        if (!cancelled) setReservationsLoading(false);
        return;
      }
      try {
        const res = await api("/reservations");
        if (!cancelled) setReservations(res.reservations || []);
      } catch {
        if (!cancelled) setReservations([]);
      } finally {
        if (!cancelled) setReservationsLoading(false);
      }
    };
    loadReservations();
    const handler = () => loadReservations();
    window.addEventListener("reservationHistoryUpdated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("reservationHistoryUpdated", handler);
    };
  }, [user?.id]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api("/auth/me", { method: "PATCH", body: { name: form.name } });
      setMsg("Name updated");
    } catch (e2) {
      setErr(e2.message || "Failed");
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (pw.newPassword !== pw.confirmNewPassword) {
      setErr("New passwords do not match");
      return;
    }
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { oldPassword: pw.oldPassword, newPassword: pw.newPassword },
      });
      setPw({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
      setMsg("Password changed");
    } catch (e2) {
      setErr(e2.message || "Failed");
    }
  };

  const cancelPartner = async () => {
    setErr("");
    setMsg("");
    try {
      await api("/partners/application", { method: "DELETE" });
      setMsg("Application cancelled");
      await reloadPartnerState();
    } catch (e) {
      setErr(e.message || "Failed");
    }
  };

  return (
    <div className="profile">
      <header className="profile__header">
        <div>
          <h2 className="profile__title">Profile</h2>
          <div className="profile__subtitle">{user?.email || user?.phone || ""}</div>
        </div>

        <div className="profile__actions">
          {(partnerUIState === "NONE" || partnerUIState === "REJECTED") && (
            <button type="button" className="btn" onClick={() => nav("/partner/apply")}>
              Become a partner
            </button>
          )}

          {partnerUIState === "IN_PROCESS" && (
            <>
              <button type="button" className="btn" onClick={() => nav("/partner/apply")}>
                In process
              </button>
              <div className="profile__meta">
                Submitted: {partnerState?.application?.createdAt ? fmtDate(partnerState.application.createdAt) : "-"}
              </div>
              <button type="button" className="btn btn--ghost" onClick={() => nav("/partner/apply")}>
                Edit
              </button>
              <button type="button" className="btn btn--ghost" onClick={cancelPartner}>
                Cancel
              </button>
            </>
          )}

          {partnerUIState === "PARTNER" && (
            <button type="button" className="btn btn--success" disabled>
              Partner
            </button>
          )}

          {!(["NONE", "REJECTED", "IN_PROCESS", "PARTNER", "APPROVED"].includes(partnerUIState)) && (
            <button type="button" className="btn" onClick={() => nav("/partner/apply")}>
              Become a partner
            </button>
          )}

          <button type="button" className="btn btn--ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {err && <div className="profile__message profile__message--error">{err}</div>}
      {msg && <div className="profile__message profile__message--ok">{msg}</div>}

      <section className="profile__partner">
        <div>
          <h3>{t("common.myPharmacy")}</h3>
          <p>{t("profile.myPharmacyDesc")}</p>
        </div>
        <button type="button" className="btn btn--outline" onClick={() => nav("/my-pharmacy")}>
          {t("profile.open")}
        </button>
      </section>

      <div className="profile__grid">
        <form onSubmit={saveProfile} className="profile-card">
          <div className="profile-card__header">
            <h3>Account</h3>
            <span className="profile-card__hint">Change your name</span>
          </div>
          <div className="profile-card__body">
            <label className="field">
              <span>Name</span>
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={!form.name.trim()}>
              Save name
            </button>
          </div>
        </form>

        <form onSubmit={changePassword} className="profile-card">
          <div className="profile-card__header">
            <h3>Security</h3>
            <span className="profile-card__hint">Change your password</span>
          </div>
          <div className="profile-card__body">
            <label className="field">
              <span>Old password</span>
              <input
                type="password"
                placeholder="Old password"
                value={pw.oldPassword}
                onChange={(e) => setPw((s) => ({ ...s, oldPassword: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                placeholder="New password (min 6)"
                value={pw.newPassword}
                onChange={(e) => setPw((s) => ({ ...s, newPassword: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Re-enter new password</span>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={pw.confirmNewPassword}
                onChange={(e) => setPw((s) => ({ ...s, confirmNewPassword: e.target.value }))}
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={
                !pw.oldPassword ||
                pw.newPassword.length < 6 ||
                !pw.confirmNewPassword ||
                pw.newPassword !== pw.confirmNewPassword
              }
            >
              Change password
            </button>
          </div>
        </form>
      </div>

      <section className="profile-reservations">
        <div className="profile-reservations__header">
          <h3>{t("common.reservationHistory")}</h3>
          <span className="profile-card__hint">{t("common.reservationHistoryEmpty")}</span>
        </div>
        {reservationsLoading ? (
          <div className="profile-reservations__list">
            <div className="profile-reservation-row">
              <div className="profile-reservation-row__img" />
              <div>
                <div className="profile-reservation-row__title">Loading...</div>
                <div className="profile-reservation-row__meta" />
              </div>
            </div>
          </div>
        ) : reservations.length === 0 ? (
          <div className="profile-reservations__list">
            <div className="profile-reservation-row">
              <div className="profile-reservation-row__img" />
              <div>
                <div className="profile-reservation-row__title">{t("common.reservationHistoryEmpty")}</div>
                <div className="profile-reservation-row__meta" />
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-reservations__list">
            {reservations.map((r) => {
              const items = Array.isArray(r.items) ? r.items : [];
              const first = items[0] || {};
              const moreCount = items.length > 1 ? items.length - 1 : 0;
              const dateValue = r.submittedAt || r.createdAt;
              return (
                <div key={r.id} className="profile-reservation-row">
                  {first.imageUrl ? (
                    <img src={first.imageUrl} alt="" className="profile-reservation-row__img" />
                  ) : (
                    <div className="profile-reservation-row__img" />
                  )}
                  <div>
                    <div className="profile-reservation-row__title">
                      {first.productName || "Item"} {moreCount ? `+${moreCount}` : ""}
                    </div>
                    <div className="profile-reservation-row__meta">
                      {r.pharmacyName || "Pharmacy"} • x{first.quantity || 1} • {r.status || "SUBMITTED"} • {dateValue ? fmtDate(dateValue) : ""}
                    </div>
                  </div>
                  <div className="profile-reservation-row__amount">
                    {r.totalBookingPrice || 0} {r.currency || ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

