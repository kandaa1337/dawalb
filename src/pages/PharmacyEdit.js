import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/Provider";

export default function PharmacyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    logoUrl: "",
    phone: "",
    email: "",
    addressRaw: "",
    street: "",
    building: "",
    city: "",
    postalCode: "",
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api(`/partner/pharmacies/${id}`)
      .then((res) => {
        if (cancelled) return;
        const p = res.pharmacy;
        const addr = p?.address;
        setForm({
          name: p?.name ?? "",
          logoUrl: p?.logoUrl ?? "",
          phone: p?.phone ?? "",
          email: p?.email ?? "",
          addressRaw: addr?.raw ?? "",
          street: addr?.street ?? "",
          building: addr?.building ?? "",
          city: addr?.city ?? "",
          postalCode: addr?.postalCode ?? "",
        });
        setLogoPreviewUrl(p?.logoUrl ?? "");
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || t("pharmacyPage.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      setLogoPreviewUrl(URL.createObjectURL(file));
      return;
    }
    setLogoPreviewUrl(form.logoUrl || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      let logoUrl = form.logoUrl.trim() || null;
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        fd.append("type", "pharmacy_logo");
        fd.append("pharmacyId", id);
        const uploadRes = await api("/upload/image", { method: "POST", body: fd });
        logoUrl = uploadRes?.url ?? null;
      }

      const address = {
        raw: form.addressRaw.trim() || [form.street, form.building, form.city].filter(Boolean).join(", ") || null,
        street: form.street.trim() || null,
        building: form.building.trim() || null,
        city: form.city.trim() || null,
        postalCode: form.postalCode.trim() || null,
      };
      await api(`/partner/pharmacies/${id}`, {
        method: "PATCH",
        body: {
          name: form.name.trim(),
          logoUrl,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address,
        },
      });
      navigate(`/pharmacy/${id}`);
    } catch (err) {
      setError(err?.message || t("pharmacyNew.createError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>
        {t("product.loading")}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
      <button
        type="button"
        onClick={() => navigate(`/pharmacy/${id}`)}
        style={{ background: "none", border: "none", color: "#666", cursor: "pointer", marginBottom: 16 }}
      >
        {"<-"} {t("pharmacyNew.backToPharmacy")}
      </button>
      <h2 style={{ marginTop: 0 }}>{t("pharmacyPage.editPharmacy")}</h2>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("pharmacyNew.nameLabel")}</span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder={t("pharmacyNew.namePlaceholder")}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{t("productNew.photo")}</span>
          <input
            type="file"
            accept="image/*"
            onChange={onLogoChange}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}
          />
          {logoPreviewUrl && (
            <img
              src={logoPreviewUrl}
              alt=""
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid #ddd" }}
            />
          )}
        </label>

        <fieldset style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <legend style={{ fontWeight: 600 }}>{t("pharmacyNew.address")}</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>{t("pharmacyNew.addressFull")}</span>
              <input
                name="addressRaw"
                value={form.addressRaw}
                onChange={handleChange}
                placeholder={t("pharmacyNew.addressPlaceholder")}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("pharmacyNew.street")}</span>
                <input name="street" value={form.street} onChange={handleChange} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("pharmacyNew.building")}</span>
                <input name="building" value={form.building} onChange={handleChange} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("pharmacyNew.city")}</span>
                <input name="city" value={form.city} onChange={handleChange} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("pharmacyNew.postalCode")}</span>
                <input name="postalCode" value={form.postalCode} onChange={handleChange} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
              </label>
            </div>
          </div>
        </fieldset>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("pharmacyNew.phone")}</span>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            type="tel"
            placeholder="+1234567890"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600 }}>{t("pharmacyNew.email")}</span>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            placeholder="pharmacy@example.com"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              background: "#2EB872",
              color: "#fff",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("product.loading") : t("pharmacyPage.savePharmacy")}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/pharmacy/${id}`)}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "1px solid #999",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {t("pharmacyNew.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
