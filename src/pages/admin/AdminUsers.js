import { useEffect, useState } from "react";
import { api } from "../../api";

function fmtDate(dt) {
  try {
    return new Date(dt).toLocaleDateString();
  } catch {
    return "";
  }
}

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [acting, setActing] = useState(null); // { userId, action }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: 50, offset: 0 });
      if (q) params.set("q", q);
      const data = await api(`/admin/users?${params}`);
      setItems(data.items || []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError((e.message || "Error") + (e.status ? ` (${e.status})` : ""));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [q]);

  async function addRole(userId, role) {
    setActing({ userId, action: `add-${role}` });
    setError("");
    try {
      await api(`/admin/users/${userId}/roles`, { method: "POST", body: { role } });
      await load();
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setActing(null);
    }
  }

  async function removeRole(userId, roleCode) {
    setActing({ userId, action: `remove-${roleCode}` });
    setError("");
    try {
      await api(`/admin/users/${userId}/roles/${roleCode}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setActing(null);
    }
  }

  const isActing = (userId, action) =>
    acting?.userId === userId && acting?.action === action;

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Users & roles</h3>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Assign or remove <strong>Admin</strong> and <strong>Moderator</strong> roles. Only super admins can manage roles.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          placeholder="Search by email, name, phone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQ(searchInput.trim())}
          style={{ padding: "8px 12px", minWidth: 220, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button
          type="button"
          onClick={() => setQ(searchInput.trim())}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#fff", cursor: "pointer" }}
        >
          Search
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <p style={{ marginBottom: 8 }}>Total: {total} user(s)</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                  <th style={{ padding: 10 }}>Email / Phone</th>
                  <th style={{ padding: 10 }}>Name</th>
                  <th style={{ padding: 10 }}>Roles</th>
                  <th style={{ padding: 10 }}>Joined</th>
                  <th style={{ padding: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 10 }}>
                      {u.email || u.phone || "—"}
                    </td>
                    <td style={{ padding: 10 }}>{u.name || "—"}</td>
                    <td style={{ padding: 10 }}>
                      {(u.roles && u.roles.length)
                        ? u.roles.join(", ")
                        : "—"}
                    </td>
                    <td style={{ padding: 10 }}>{fmtDate(u.createdAt)}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {u.roles?.includes("ADMIN") ? (
                          <button
                            type="button"
                            disabled={isActing(u.id, "remove-ADMIN")}
                            onClick={() => removeRole(u.id, "ADMIN")}
                            style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" }}
                          >
                            {isActing(u.id, "remove-ADMIN") ? "…" : "Remove Admin"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActing(u.id, "add-ADMIN")}
                            onClick={() => addRole(u.id, "ADMIN")}
                            style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #0a0", background: "#fff", color: "#0a0", cursor: "pointer" }}
                          >
                            {isActing(u.id, "add-ADMIN") ? "…" : "Add Admin"}
                          </button>
                        )}
                        {u.roles?.includes("MODERATOR") ? (
                          <button
                            type="button"
                            disabled={isActing(u.id, "remove-MODERATOR")}
                            onClick={() => removeRole(u.id, "MODERATOR")}
                            style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" }}
                          >
                            {isActing(u.id, "remove-MODERATOR") ? "…" : "Remove Moderator"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActing(u.id, "add-MODERATOR")}
                            onClick={() => addRole(u.id, "MODERATOR")}
                            style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #06c", background: "#fff", color: "#06c", cursor: "pointer" }}
                          >
                            {isActing(u.id, "add-MODERATOR") ? "…" : "Add Moderator"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && !loading && <p style={{ color: "#666" }}>No users found.</p>}
        </>
      )}
    </div>
  );
}
