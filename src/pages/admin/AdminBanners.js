import { useEffect, useState } from "react";
import { api } from "../../api";

const SLOTS = [
  { value: "side_left", label: "Left side (PC)" },
  { value: "side_right", label: "Right side (PC)" },
  { value: "mobile_bottom", label: "Under search (mobile)" },
];

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ slot: "side_left", link: "", imageFile: null, imagePreview: null });
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ link: "", imageUrl: "", imageFile: null });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/banners/admin/list");
      setBanners(data.banners || []);
    } catch (e) {
      setError(e?.message || "Failed to load");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(type) {
    const file = type === "new" ? form.imageFile : editForm.imageFile;
    if (!file) return null;
    const fd = new FormData();
    fd.append("type", "banner");
    fd.append("file", file);
    const res = await api("/upload/image", { method: "POST", body: fd });
    return res?.url;
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.imageFile) {
      setError("Choose an image");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await handleUpload("new");
      if (!url) throw new Error("Upload failed");
      await api("/banners/admin", {
        method: "POST",
        body: { slot: form.slot, imageUrl: url, link: form.link.trim() || undefined },
      });
      setForm({ slot: "side_left", link: "", imageFile: null, imagePreview: null });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to create");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate(id) {
    setUploading(true);
    setError("");
    try {
      let imageUrl = editForm.imageUrl;
      if (editForm.imageFile) {
        const url = await handleUpload("edit");
        if (url) imageUrl = url;
      }
      await api(`/banners/admin/${id}`, {
        method: "PATCH",
        body: {
          link: editForm.link.trim() || null,
          ...(imageUrl && { imageUrl }),
        },
      });
      setEditingId(null);
      setEditForm({ link: "", imageUrl: "", imageFile: null });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to update");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this banner?")) return;
    setError("");
    try {
      await api(`/banners/admin/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to delete");
    }
  }

  if (loading) {
    return <p style={{ color: "#666" }}>Loading banners…</p>;
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Banners</h3>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Add banners: they appear on the sides on desktop and under the search bar on mobile. Image + link (optional).
      </p>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} style={{ marginBottom: 24, padding: 16, border: "1px solid #e0e0e0", borderRadius: 12, maxWidth: 480 }}>
        <h4 style={{ margin: "0 0 12px 0" }}>Add banner</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Slot</span>
            <select
              value={form.slot}
              onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            >
              {SLOTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setForm((f) => ({
                  ...f,
                  imageFile: file || null,
                  imagePreview: file ? URL.createObjectURL(file) : null,
                }));
              }}
              style={{ padding: 8 }}
            />
            {form.imagePreview && (
              <img src={form.imagePreview} alt="" style={{ maxWidth: 200, maxHeight: 120, objectFit: "contain", borderRadius: 8 }} />
            )}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Link (optional)</span>
            <input
              type="url"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="https://..."
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
          </label>
          <button type="submit" disabled={uploading} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#2EB872", color: "#fff", fontWeight: 600, cursor: uploading ? "wait" : "pointer" }}>
            {uploading ? "Uploading…" : "Add banner"}
          </button>
        </div>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {banners.map((b) => (
          <div
            key={b.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 12,
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <img
              src={b.imageUrl.startsWith("/") ? `${window.location.origin}${b.imageUrl}` : b.imageUrl}
              alt=""
              style={{ width: 120, height: 60, objectFit: "contain", borderRadius: 6 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{SLOTS.find((s) => s.value === b.slot)?.label ?? b.slot}</div>
              <div style={{ fontSize: 13, color: "#666" }}>{b.link || "—"}</div>
            </div>
            {editingId === b.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="url"
                  value={editForm.link}
                  onChange={(e) => setEditForm((f) => ({ ...f, link: e.target.value }))}
                  placeholder="Link"
                  style={{ padding: 8, width: 200, borderRadius: 6, border: "1px solid #ccc" }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditForm((f) => ({ ...f, imageFile: e.target.files?.[0] || null }))}
                  style={{ fontSize: 12 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleUpdate(b.id)} disabled={uploading} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#2EB872", color: "#fff", cursor: "pointer" }}>Save</button>
                  <button type="button" onClick={() => { setEditingId(null); setEditForm({ link: "", imageUrl: "", imageFile: null }); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #999", background: "#fff", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { setEditingId(b.id); setEditForm({ link: b.link || "", imageUrl: b.imageUrl, imageFile: null }); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #2EB872", background: "#fff", color: "#2EB872", cursor: "pointer" }}>Edit</button>
                <button type="button" onClick={() => handleDelete(b.id)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" }}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {banners.length === 0 && !loading && <p style={{ color: "#666" }}>No banners yet. Add one above.</p>}
    </div>
  );
}
