import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/Provider";

export default function ProductNew() {
  const { id: pharmacyId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [rootCategories, setRootCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadCat, setLoadCat] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    categoryId: "",
    parentCategoryId: "",
    currency: "USD",
    stockQty: "",
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/categories?parentId=");
        setRootCategories(res.categories || []);
      } catch {
        setRootCategories([]);
      } finally {
        setLoadCat(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.parentCategoryId) {
      setSubcategories([]);
      setForm((prev) => ({ ...prev, categoryId: "" }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/categories?parentId=${form.parentCategoryId}`);
        if (!cancelled) {
          setSubcategories(res.categories || []);
          setForm((prev) => ({ ...prev, categoryId: "" }));
        }
      } catch {
        if (!cancelled) setSubcategories([]);
      }
    })();
    return () => { cancelled = true; };
  }, [form.parentCategoryId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "price") setForm((prev) => ({ ...prev, price: value.replace(/[^0-9.]/g, "") }));
    if (name === "stockQty") setForm((prev) => ({ ...prev, stockQty: value.replace(/[^0-9]/g, "") }));
    if (name === "parentCategoryId") setForm((prev) => ({ ...prev, categoryId: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const price = parseFloat(form.price);
    const finalCategoryId = subcategories.length > 0 ? form.categoryId : form.parentCategoryId;
    if (!form.name.trim()) { setError(t("productNew.nameRequired")); return; }
    if (!finalCategoryId) { setError(t("productNew.chooseCategoryRequired")); return; }
    if (!Number.isFinite(price) || price <= 0) { setError(t("productNew.priceRequired")); return; }
    const stockQty = form.stockQty.trim() ? parseInt(form.stockQty, 10) : null;
    if (form.stockQty.trim() && (!Number.isFinite(stockQty) || stockQty < 1)) { setError(t("productNew.stockQtyInvalid")); return; }
    setLoading(true);
    try {
      const res = await api(`/partner/pharmacies/${pharmacyId}/products`, {
        method: "POST",
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          price,
          categoryId: finalCategoryId,
          currency: form.currency,
          ...(stockQty != null && { stockQty }),
        },
      });
      if (res.offer?.id) navigate(`/product/${res.offer.id}`);
      else navigate(`/pharmacy/${pharmacyId}`);
    } catch (err) {
      const details = Array.isArray(err?.data?.details) ? err.data.details : [];
      const firstDetail = details[0];
      if (firstDetail?.message) {
        const field = Array.isArray(firstDetail.path) && firstDetail.path.length ? `${firstDetail.path.join(".")}: ` : "";
        setError(`${field}${firstDetail.message}`);
      } else {
        setError(err?.message || t("productNew.createError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
      <button type="button" onClick={() => navigate(`/pharmacy/${pharmacyId}`)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", marginBottom: 16 }}>
        ← {t("productNew.backToPharmacy")}
      </button>
      <h2 style={{ marginTop: 0 }}>{t("productNew.addProduct")}</h2>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.nameLabel")}</span>
          <input name="name" value={form.name} onChange={handleChange} required placeholder={t("productNew.namePlaceholder")} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.descriptionLabel")}</span>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder={t("productNew.descriptionPlaceholder")} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.photo")}</span>
          <input
            type="file"
            accept="image/*"
            disabled={imageUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) {
                setForm((f) => ({ ...f, imageUrl: "" }));
                setImagePreview(null);
                return;
              }
              setImageUploading(true);
              setImagePreview(URL.createObjectURL(file));
              try {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("type", "product");
                if (pharmacyId) fd.append("pharmacyId", pharmacyId);
                const res = await api("/upload/image", { method: "POST", body: fd });
                const url = res?.url;
                if (url) setForm((f) => ({ ...f, imageUrl: url }));
              } catch {
                setForm((f) => ({ ...f, imageUrl: "" }));
                setImagePreview(null);
              } finally {
                setImageUploading(false);
              }
            }}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
          {imageUploading && <span style={{ fontSize: 13, color: "#666" }}>Uploading…</span>}
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
          <input name="price" value={form.price} onChange={handleChange} type="text" inputMode="decimal" placeholder="0.00" style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.currencyLabel")}</span>
          <select name="currency" value={form.currency} onChange={handleChange} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}>
            <option value="USD">USD</option>
            <option value="LBP">LBP</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.stockQtyLabel")}</span>
          <input name="stockQty" value={form.stockQty} onChange={handleChange} type="text" inputMode="numeric" placeholder={t("productNew.stockQtyPlaceholder")} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.categoryLabel")}</span>
          <select name="parentCategoryId" value={form.parentCategoryId} onChange={handleChange} disabled={loadCat} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}>
            <option value="">{t("productNew.chooseCategory")}</option>
            {rootCategories.map((c) => (
              <option key={c.id} value={c.id}>{t(`categoryNames.${c.slug}`) || c.name}</option>
            ))}
          </select>
        </label>
        {subcategories.length > 0 && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{t("productNew.subcategoryLabel")}</span>
            <select name="categoryId" value={form.categoryId} onChange={handleChange} required style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}>
              <option value="">{t("productNew.chooseSubcategory")}</option>
              {subcategories.map((c) => (
                <option key={c.id} value={c.id}>{t(`categoryNames.${c.slug}`) || c.name}</option>
              ))}
            </select>
          </label>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "#2EB872", color: "#fff", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? t("productNew.creating") : t("productNew.submit")}
          </button>
          <button type="button" onClick={() => navigate(`/pharmacy/${pharmacyId}`)} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #999", background: "#fff", cursor: "pointer" }}>
            {t("productNew.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
