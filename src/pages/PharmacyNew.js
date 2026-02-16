import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/Provider";

export default function PharmacyNew() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    addressRaw: "",
    street: "",
    building: "",
    city: "",
    postalCode: "",
    paymentMethods: [],
  });

  useEffect(() => {
    api("/payment-methods")
      .then((res) => setPaymentMethods(res.paymentMethods || []))
      .catch(() => setPaymentMethods([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) setLogoPreviewUrl(URL.createObjectURL(file));
    else setLogoPreviewUrl("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const address = {
        raw: form.addressRaw.trim() || [form.street, form.building, form.city].filter(Boolean).join(", ") || "Address",
        street: form.street.trim() || null,
        building: form.building.trim() || null,
        city: form.city.trim() || null,
        postalCode: form.postalCode.trim() || null,
      };
      const paymentMethodsPayload = (form.paymentMethods || [])
        .filter((pm) => pm.code)
        .map((pm) => ({ code: pm.code, payToIdentifier: pm.payToIdentifier?.trim() || null }));

      const createRes = await api("/partner/pharmacies", {
        method: "POST",
        body: {
          name: form.name.trim(),
          logoUrl: null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address,
          paymentMethods: paymentMethodsPayload,
        },
      });

      const pharmacyId = createRes?.pharmacy?.id;
      if (!pharmacyId) {
        navigate("/my-pharmacy");
        return;
      }

      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        fd.append("type", "pharmacy_logo");
        fd.append("pharmacyId", pharmacyId);
        const uploadRes = await api("/upload/image", { method: "POST", body: fd });
        if (uploadRes?.url) {
          await api(`/partner/pharmacies/${pharmacyId}`, {
            method: "PATCH",
            body: { logoUrl: uploadRes.url },
          });
        }
      }

      navigate(`/pharmacy/${pharmacyId}`);
    } catch (err) {
      setError(err?.message || t("pharmacyNew.createError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{t("pharmacyNew.title")}</h2>
      <p style={{ color: "#666", marginBottom: 24 }}>{t("pharmacyNew.description")}</p>

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

        <fieldset style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <legend style={{ fontWeight: 600 }}>{t("pharmacyNew.paymentMethods")}</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {paymentMethods.map((m) => (
              <div key={m.code} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(form.paymentMethods || []).some((pm) => pm.code === m.code)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...(form.paymentMethods || []).filter((pm) => pm.code !== m.code), { code: m.code, payToIdentifier: "" }]
                        : (form.paymentMethods || []).filter((pm) => pm.code !== m.code);
                      setForm((prev) => ({ ...prev, paymentMethods: next }));
                    }}
                  />
                  <span>{m.name}</span>
                </label>
                {(m.code === "WHISH" || m.code === "OMT") && (form.paymentMethods || []).some((pm) => pm.code === m.code) && (
                  <input
                    type="tel"
                    placeholder={t("pharmacyNew.paymentPhonePlaceholder")}
                    value={(form.paymentMethods || []).find((pm) => pm.code === m.code)?.payToIdentifier ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        paymentMethods: (prev.paymentMethods || []).map((pm) =>
                          pm.code === m.code ? { ...pm, payToIdentifier: val } : pm
                        ),
                      }));
                    }}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", minWidth: 180 }}
                  />
                )}
              </div>
            ))}
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              background: "#2EB872",
              color: "#fff",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? t("pharmacyNew.creating") : t("pharmacyNew.submit")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/my-pharmacy")}
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
