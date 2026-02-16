import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/Provider";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const [pharmacyId, setPharmacyId] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    currency: "USD",
    stockQty: "",
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/offers/${id}`);
        if (cancelled) return;
        const offer = res?.offer;
        if (!offer?.isPharmacyOwner) {
          setError("FORBIDDEN");
          return;
        }
        setPharmacyId(offer?.pharmacy?.id ?? "");
        setForm({
          name: offer?.name ?? "",
          description: offer?.description ?? "",
          imageUrl: offer?.imageUrl ?? "",
          price: offer?.price != null ? String(offer.price) : "",
          currency: offer?.currency ?? "USD",
          stockQty: offer?.stockQty != null ? String(offer.stockQty) : "",
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || "LOAD_ERROR");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "price") {
      setForm((p) => ({ ...p, price: value.replace(/[^0-9.]/g, "") }));
      return;
    }
    if (name === "stockQty") {
      setForm((p) => ({ ...p, stockQty: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const price = parseFloat(form.price);
    if (!form.name.trim()) {
      setError(t("productNew.nameRequired"));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError(t("productNew.priceRequired"));
      return;
    }
    const stockQty = form.stockQty.trim() ? parseInt(form.stockQty, 10) : null;
    if (form.stockQty.trim() && (!Number.isFinite(stockQty) || stockQty < 1)) {
      setError(t("productNew.stockQtyInvalid"));
      return;
    }
    setSaving(true);
    try {
      await api(`/offers/${id}`, {
        method: "PATCH",
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          price,
          currency: form.currency,
          stockQty,
        },
      });
      navigate(`/product/${id}`);
    } catch (e2) {
      setError(e2?.message || "SAVE_ERROR");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>{t("product.loading")}</div>;
  }

  if (error === "FORBIDDEN") {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>
          Access denied
        </div>
        <button type="button" onClick={() => navigate(`/product/${id}`)} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
          {t("product.back")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
      <button type="button" onClick={() => navigate(`/product/${id}`)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", marginBottom: 16 }}>
        {"<-"} {t("product.back")}
      </button>
      <h2 style={{ marginTop: 0 }}>Edit product</h2>
      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>{error}</div>
      )}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.nameLabel")}</span>
          <input name="name" value={form.name} onChange={onChange} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.descriptionLabel")}</span>
          <textarea name="description" value={form.description} onChange={onChange} rows={3} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.photo")}</span>
          <input
            type="file"
            accept="image/*"
            disabled={imageUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImageUploading(true);
              setImagePreview(URL.createObjectURL(file));
              try {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("type", "product");
                if (pharmacyId) fd.append("pharmacyId", pharmacyId);
                const res = await api("/upload/image", { method: "POST", body: fd });
                if (res?.url) setForm((f) => ({ ...f, imageUrl: res.url }));
              } catch {
                setImagePreview("");
              } finally {
                setImageUploading(false);
              }
            }}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          {(imagePreview || form.imageUrl) && (
            <img
              src={imagePreview || (form.imageUrl.startsWith("/") ? `${window.location.origin}${form.imageUrl}` : form.imageUrl)}
              alt=""
              style={{ maxWidth: 200, maxHeight: 150, objectFit: "contain", borderRadius: 8 }}
            />
          )}
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.priceLabel")}</span>
          <input name="price" value={form.price} onChange={onChange} type="text" inputMode="decimal" style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.currencyLabel")}</span>
          <select name="currency" value={form.currency} onChange={onChange} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}>
            <option value="USD">USD</option>
            <option value="LBP">LBP</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.stockQtyLabel")}</span>
          <input name="stockQty" value={form.stockQty} onChange={onChange} type="text" inputMode="numeric" style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={saving || imageUploading} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "#2EB872", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            {saving ? t("product.loading") : "Save"}
          </button>
          <button type="button" onClick={() => navigate(`/product/${id}`)} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #999", background: "#fff", cursor: "pointer" }}>
            {t("productNew.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
