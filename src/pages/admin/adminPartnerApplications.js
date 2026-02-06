import { useEffect, useMemo, useState } from "react";

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || "REQUEST_FAILED");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "";
  }
}

export default function AdminPartnerApplications() {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [err, setErr] = useState("");

  // reject modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const counters = useMemo(() => {
    const by = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
    for (const it of items) if (by[it.status] !== undefined) by[it.status]++;
    return by;
  }, [items]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api(`/api/admin/partner-applications?status=${encodeURIComponent(status)}`);
      setItems(data.items || []);
    } catch (e) {
      setErr(`${e.status || ""} ${e.message || "Error"}`.trim());
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [status]);

  async function approve(id) {
    if (!window.confirm("Approve this application?")) return;
    setErr("");
    try {
      await api(`/api/admin/partner-applications/${id}/approve`, { method: "POST" });
      await load();
    } catch (e) {
      setErr(`${e.status || ""} ${e.message || "Error"}`.trim());
    }
  }

  function openReject(id) {
    setRejectId(id);
    setRejectReason("");
    setRejectOpen(true);
  }

  async function submitReject() {
    if (!rejectId) return;
    setErr("");
    try {
      await api(`/api/admin/partner-applications/${rejectId}/reject`, {
        method: "POST",
        body: { reason: rejectReason || null },
      });
      setRejectOpen(false);
      setRejectId(null);
      await load();
    } catch (e) {
      setErr(`${e.status || ""} ${e.message || "Error"}`.trim());
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin · Partner applications</h2>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            Approve / Reject partner requests
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: status === s ? "#f3f4f6" : "white",
                fontWeight: 800,
              }}
            >
              {s}
            </button>
          ))}
          <button type="button" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          {err === "403 FORBIDDEN" || err.includes("FORBIDDEN")
            ? "Forbidden: this page is for admins only."
            : err}
        </div>
      )}

      <div style={{ marginTop: 12, opacity: 0.75 }}>
        Status: <b>{status}</b>{" "}
        {loading ? "· loading…" : `· ${items.length} item(s)`}
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {loading && (
          <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 14 }}>
            Loading…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 14, opacity: 0.75 }}>
            No applications
          </div>
        )}

        {!loading &&
          items.map((a) => (
            <div
              key={a.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {a.orgName} → {a.chainName}
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    User: <b>{a.user?.name || "—"}</b> · {a.user?.email || a.user?.phone || "—"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900 }}>{a.status}</div>
                  <div style={{ opacity: 0.75 }}>{fmt(a.createdAt)}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ opacity: 0.85 }}>
                  <div>Legal: {a.legalName || "—"}</div>
                  <div>Phone: {a.phone || "—"}</div>
                  <div>Website: {a.website || "—"}</div>
                </div>

                <div style={{ opacity: 0.85 }}>
                  <div>DecidedAt: {a.decidedAt ? fmt(a.decidedAt) : "—"}</div>
                  <div>DecidedBy: {a.decidedBy?.email || "—"}</div>
                  <div>RejectReason: {a.rejectReason || "—"}</div>
                </div>
              </div>

              {a.status === "PENDING" ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => approve(a.id)}>
                    Approve
                  </button>
                  <button type="button" onClick={() => openReject(a.id)}>
                    Reject
                  </button>
                </div>
              ) : (
                <div style={{ opacity: 0.7 }}>No actions for this status</div>
              )}
            </div>
          ))}
      </div>

      {/* Reject modal */}
      {rejectOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div style={{ background: "white", borderRadius: 16, padding: 16, width: "min(520px, 100%)" }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Reject application</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Optional: provide a reason
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason…"
              style={{ width: "100%", marginTop: 12, minHeight: 90 }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectId(null);
                }}
                style={{ background: "transparent" }}
              >
                Cancel
              </button>
              <button type="button" onClick={submitReject}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
