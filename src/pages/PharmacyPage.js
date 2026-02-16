import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useI18n } from "../i18n/Provider";

export default function PharmacyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [pharmacy, setPharmacy] = useState(null);
  const [products, setProducts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectModal, setRejectModal] = useState({ open: false, reservationId: null, reason: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const loadReservations = async () => {
    if (!id || !isOwner) return;
    try {
      const res = await api(`/partner/pharmacies/${id}/reservations`);
      setReservations(Array.isArray(res?.reservations) ? res.reservations : []);
    } catch {
      setReservations([]);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const ownerPharmacyRes = await api(`/partner/pharmacies/${id}`).catch(() => null);

        if (ownerPharmacyRes?.pharmacy) {
          const [productsRes, reservationsRes] = await Promise.all([
            api(`/partner/pharmacies/${id}/products`).catch(() => ({ products: [] })),
            api(`/partner/pharmacies/${id}/reservations`).catch(() => ({ reservations: [] })),
          ]);
          if (cancelled) return;
          setIsOwner(true);
          setPharmacy(ownerPharmacyRes.pharmacy);
          setProducts(Array.isArray(productsRes.products) ? productsRes.products : []);
          setReservations(Array.isArray(reservationsRes.reservations) ? reservationsRes.reservations : []);
          return;
        }

        const [publicPharmacyRes, publicProductsRes] = await Promise.all([
          api(`/pharmacies/${id}`),
          api(`/pharmacies/${id}/products`).catch(() => ({ products: [] })),
        ]);
        if (cancelled) return;
        setIsOwner(false);
        setPharmacy(publicPharmacyRes?.item ?? null);
        setProducts(Array.isArray(publicProductsRes.products) ? publicProductsRes.products : []);
        setReservations([]);
        if (!publicPharmacyRes?.item) setError(t("pharmacyPage.pharmacyNotFound"));
      } catch (e) {
        if (!cancelled) setError(e?.message || t("pharmacyPage.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: 24, textAlign: "center" }}>
        {t("product.loading")}
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>
          {error || t("pharmacyPage.notFound")}
        </div>
        <button
          type="button"
          onClick={() => navigate("/pharmacies")}
          style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}
        >
          {t("pharmacyPage.backToPharmacies")}
        </button>
      </div>
    );
  }

  const addr = pharmacy.address;
  const addressText = addr?.raw || [addr?.street, addr?.building, addr?.city].filter(Boolean).join(", ") || "-";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, paddingTop: 88 }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => navigate(isOwner ? "/my-pharmacy" : "/pharmacies")}
          style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 0 }}
        >
          {"<-"} {isOwner ? t("pharmacyPage.myPharmacies") : t("pharmacyPage.backToPharmacies")}
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => navigate(`/pharmacy/${id}/edit`)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #2EB872",
              background: "#fff",
              color: "#2EB872",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("pharmacyPage.editPharmacy")}
          </button>
        )}
      </div>

      <section
        style={{
          background: "linear-gradient(135deg, #f8faf8 0%, #e8f5e9 100%)",
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          border: "1px solid rgba(46, 184, 114, 0.2)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 16,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}
          >
            {pharmacy.logoUrl ? (
              <img src={pharmacy.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 36 }}>+</div>
            )}
          </div>
          <div style={{ flex: "1 1 280px" }}>
            <h1 style={{ margin: "0 0 12px 0", fontSize: 28, color: "#1a1a1a" }}>{pharmacy.name}</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "#444", fontSize: 15 }}>
              <div>{addressText}</div>
              {pharmacy.phone && (
                <a href={`tel:${pharmacy.phone}`} style={{ color: "#2e7d32", textDecoration: "none" }}>
                  {pharmacy.phone}
                </a>
              )}
              {pharmacy.website && (
                <a href={pharmacy.website} target="_blank" rel="noopener noreferrer" style={{ color: "#2e7d32", textDecoration: "none" }}>
                  {pharmacy.website}
                </a>
              )}
              {pharmacy.email && (
                <a href={`mailto:${pharmacy.email}`} style={{ color: "#2e7d32", textDecoration: "none" }}>
                  {pharmacy.email}
                </a>
              )}
              {pharmacy.reviewCount != null && pharmacy.reviewCount > 0 && (
                <div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
                  {pharmacy.averageRating != null ? pharmacy.averageRating.toFixed(1) : "-"} ({pharmacy.reviewCount}{" "}
                  {t("myPharmacy.reviewsCount")})
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {isOwner && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16, color: "#333" }}>{t("pharmacyPage.reservations")}</h3>
          <p style={{ color: "#666", marginBottom: 16 }}>{t("pharmacyPage.reservationsHint") || "Reserved orders: accept or decline."}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reservations.length === 0 ? (
              <p style={{ padding: 16, color: "#666", margin: 0 }}>{t("pharmacyPage.noReservations") || "No reservations yet."}</p>
            ) : (
              reservations.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.customerName || "-"}</div>
                      <div style={{ fontSize: 14, color: "#555" }}>{t("pharmacyPage.orderPhone")}: {r.customerPhone || "-"}</div>
                      <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
                        {t("pharmacyPage.orderItems")}: {r.items?.map((i) => `${i.productName} x ${i.quantity}`).join(", ") || "-"}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                        {t("pharmacyPage.orderTotal")}: {r.totalBookingPrice != null ? `${r.totalBookingPrice} ${r.currency || ""}` : "-"}
                      </div>
                      {r.paymentProofUrl && (
                        <a
                          href={r.paymentProofUrl.startsWith("/") ? `${window.location.origin}${r.paymentProofUrl}` : r.paymentProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 14, marginTop: 4, display: "inline-block" }}
                        >
                          {t("pharmacyPage.orderProof")}
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: r.status === "SUBMITTED" ? "#d97706" : r.status === "CONFIRMED" ? "#2e7d32" : "#666" }}>
                        {r.status === "SUBMITTED" ? (t("pharmacyPage.statusSubmitted") || "Pending") : r.status === "CONFIRMED" ? (t("pharmacyPage.statusConfirmed") || "Accepted") : r.status}
                      </span>
                      {r.status === "SUBMITTED" && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={async () => {
                              setActionLoading(true);
                              try {
                                await api(`/partner/pharmacies/${id}/reservations/${r.id}/confirm`, { method: "POST" });
                                await loadReservations();
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#2EB872", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                          >
                            {t("pharmacyPage.confirm")}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setRejectModal({ open: true, reservationId: r.id, reason: "" })}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: "pointer" }}
                          >
                            {t("pharmacyPage.reject")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {isOwner && rejectModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !actionLoading && setRejectModal((m) => ({ ...m, open: false }))}
        >
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 400, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 12px 0" }}>{t("pharmacyPage.rejectReason")}</h4>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
              placeholder={t("pharmacyPage.rejectReasonPlaceholder")}
              rows={3}
              style={{ width: "100%", padding: 8, marginBottom: 16, borderRadius: 8, border: "1px solid #ccc", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectModal({ open: false, reservationId: null, reason: "" })}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #999", background: "#fff", cursor: "pointer" }}
              >
                {t("pharmacyPage.cancel")}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  if (!rejectModal.reservationId) return;
                  setActionLoading(true);
                  try {
                    await api(`/partner/pharmacies/${id}/reservations/${rejectModal.reservationId}/reject`, {
                      method: "POST",
                      body: { reason: rejectModal.reason || undefined },
                    });
                    await loadReservations();
                    setRejectModal({ open: false, reservationId: null, reason: "" });
                  } finally {
                    setActionLoading(false);
                  }
                }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#c00", color: "#fff", fontWeight: 600, cursor: "pointer" }}
              >
                {t("pharmacyPage.reject")}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 16, color: "#333" }}>{t("pharmacyPage.products")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
        {isOwner && (
          <div
            style={{
              padding: 28,
              border: "2px dashed #2EB872",
              borderRadius: 16,
              background: "rgba(46, 184, 114, 0.06)",
              textAlign: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onClick={() => navigate(`/pharmacy/${id}/product/new`)}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/pharmacy/${id}/product/new`)}
            role="button"
            tabIndex={0}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>+</div>
            <strong style={{ display: "block", marginBottom: 6 }}>{t("pharmacyPage.addProduct")}</strong>
            <span style={{ fontSize: 14, color: "#666" }}>{t("pharmacyPage.addProductHint")}</span>
          </div>
        )}

        {products.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 16,
              border: "1px solid #e0e0e0",
              borderRadius: 16,
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            onClick={() => navigate(`/product/${p.id}`)}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${p.id}`)}
            role="button"
            tabIndex={0}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl.startsWith("/") ? `${window.location.origin}${p.imageUrl}` : p.imageUrl} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />
            ) : (
              <div style={{ width: "100%", height: 140, background: "#eee", borderRadius: 10, marginBottom: 10, display: "grid", placeItems: "center", fontSize: 28 }}>-</div>
            )}
            <strong style={{ display: "block", marginBottom: 4 }}>{p.name}</strong>
            <div style={{ fontSize: 14, color: "#2e7d32", fontWeight: 600 }}>
              {p.price} {p.currency}
            </div>
            {p.isFrozen && <span style={{ fontSize: 12, color: "#c00" }}>{t("pharmacyPage.frozen")}</span>}
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <p style={{ color: "#666", marginTop: 16 }}>
          {isOwner ? t("pharmacyPage.addProductHint") : t("search.noResults")}
        </p>
      )}
    </div>
  );
}
