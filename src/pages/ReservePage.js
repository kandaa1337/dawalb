import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n/Provider";

export default function ReservePage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!offerId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const offerRes = await api(`/offers/${offerId}`);
        if (!cancelled) setOffer(offerRes.offer ?? null);
        let pmRes = { paymentMethods: [] };
        if (offerRes?.offer?.pharmacy?.id) {
          pmRes = await api(`/pharmacies/${offerRes.offer.pharmacy.id}/payment-methods`).catch(() => ({ paymentMethods: [] }));
        }
        if (!cancelled) {
          setPaymentMethods(Array.isArray(pmRes?.paymentMethods) ? pmRes.paymentMethods : []);
          if (offerRes?.offer?.pharmacy?.id && !(pmRes?.paymentMethods?.length)) setError("No payment methods for this pharmacy");
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [offerId, user]);

  useEffect(() => {
    if (user?.phone) setPhone((p) => p || user.phone);
  }, [user?.phone]);

  const maxQty = offer?.stockQty != null ? Math.max(1, offer.stockQty) : null;
  const effectiveQuantity = (() => {
    const n = parseInt(quantityInput, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return maxQty != null ? Math.min(n, maxQty) : n;
  })();
  const reserveAmount = offer ? (Number(offer.price) / 10) * effectiveQuantity : 0;
  const currency = offer?.currency ?? "";

  const handleSubmit = async () => {
    const phoneTrim = (phone || "").toString().trim();
    if (!phoneTrim) {
      setError(t("reservePage.phoneRequired"));
      return;
    }
    if (!selectedMethod) {
      setError(t("reservePage.selectPayment"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api("/reservations", {
        method: "POST",
        body: {
          offerId,
          quantity: effectiveQuantity,
          paymentMethodCode: selectedMethod.code,
          paymentProofUrl: screenshotUrl.trim() || undefined,
          customerPhone: phoneTrim,
        },
      });
      setSuccess(true);
      window.dispatchEvent(new Event("reservationHistoryUpdated"));
    } catch (e) {
      setError(e?.message || e?.data?.error || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <p style={{ color: "#666" }}>Please sign in to reserve.</p>
        <button type="button" onClick={() => navigate("/login")} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
          Sign in
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>
        {t("product.loading")}
      </div>
    );
  }

  if (error && !offer) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>{error}</div>
        <button type="button" onClick={() => navigate(-1)} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
          {t("product.back")}
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <div style={{ padding: 24, background: "#e8f5e9", borderRadius: 12, marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#2e7d32" }}>{t("reservePage.success")}</p>
        </div>
        <button type="button" onClick={() => navigate(`/product/${offerId}`)} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
          {t("product.back")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 0, marginBottom: 16 }}
      >
        ← {t("product.back")}
      </button>

      <h1 style={{ margin: "0 0 8px 0" }}>{t("reservePage.title")}</h1>
      {offer && (
        <p style={{ margin: 0, color: "#666" }}>
          {offer.name} — {offer.pharmacy?.name}
        </p>
      )}

      {offer && (
        <>
          <div style={{ marginTop: 24 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>{t("reservePage.quantity")}</label>
            <input
              type="number"
              min={1}
              max={maxQty ?? 99}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              onBlur={() => setQuantityInput(String(effectiveQuantity))}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", width: 80 }}
            />
            {maxQty != null && (
              <span style={{ fontSize: 13, color: "#666", marginLeft: 8 }}>{t("reservePage.maxQuantity")} {maxQty}</span>
            )}
          </div>

          <div style={{ marginTop: 16, padding: 16, background: "#f5f5f5", borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("reservePage.reserveAmount")}</div>
            <div style={{ fontSize: 24, color: "#2e7d32" }}>
              {reserveAmount} {currency}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>{t("reservePage.phonePlaceholder")}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("reservePage.phonePlaceholder")}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{t("reservePage.selectPayment")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paymentMethods.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => setSelectedMethod(m)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: selectedMethod?.code === m.code ? "2px solid #2EB872" : "1px solid #ddd",
                    background: selectedMethod?.code === m.code ? "rgba(46,184,114,0.08)" : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: selectedMethod?.code === m.code ? 600 : 400,
                  }}
                >
                  {m.name}
                  {m.payToIdentifier && (
                    <span style={{ display: "block", fontSize: 14, color: "#666", marginTop: 4 }}>
                      {t("reservePage.sendToPhone").replace("{{amount}}", `${reserveAmount} ${currency}`).replace("{{phone}}", m.payToIdentifier)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {paymentMethods.length === 0 && <p style={{ color: "#666", margin: 0 }}>No payment methods available.</p>}
          </div>

          {selectedMethod && (
            <div style={{ marginTop: 24 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>{t("reservePage.screenshotUrl")}</label>
              <input
                type="file"
                accept="image/*"
                disabled={screenshotUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setScreenshotUrl("");
                    setScreenshotPreview(null);
                    return;
                  }
                  setScreenshotUploading(true);
                  setScreenshotPreview(URL.createObjectURL(file));
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("type", "payment");
                    if (offer?.pharmacy?.id) fd.append("pharmacyId", offer.pharmacy.id);
                    const res = await api("/upload/image", { method: "POST", body: fd });
                    if (res?.url) setScreenshotUrl(res.url);
                  } catch {
                    setScreenshotUrl("");
                    setScreenshotPreview(null);
                  } finally {
                    setScreenshotUploading(false);
                  }
                }}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
              />
              {screenshotUploading && <span style={{ fontSize: 13, color: "#666" }}>Uploading…</span>}
              {(screenshotPreview || screenshotUrl) && (
                <img
                  src={screenshotPreview || (screenshotUrl.startsWith("/") ? `${window.location.origin}${screenshotUrl}` : screenshotUrl)}
                  alt=""
                  style={{ marginTop: 8, maxWidth: 280, maxHeight: 180, objectFit: "contain", borderRadius: 8 }}
                />
              )}
              <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{t("reservePage.screenshotHint") || "Upload payment screenshot (optional but recommended)."}</p>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: "#fee", borderRadius: 8, color: "#c00" }}>
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={submitting || !selectedMethod}
            onClick={handleSubmit}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px 24px",
              borderRadius: 10,
              border: "none",
              background: selectedMethod && !submitting ? "#2EB872" : "#ccc",
              color: "#fff",
              fontWeight: 600,
              cursor: selectedMethod && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "…" : t("reservePage.submit")}
          </button>
        </>
      )}
    </div>
  );
}
