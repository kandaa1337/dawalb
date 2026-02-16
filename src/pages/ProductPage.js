import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n/Provider";

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, isModerator, isAdmin } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", body: "" });
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/offers/${id}`);
        if (!cancelled) setOffer(res.offer);
      } catch (e) {
        if (!cancelled) setError(e?.message || t("product.notFound"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const pharmacyId = offer?.pharmacy?.id;
  useEffect(() => {
    if (!pharmacyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/pharmacies/${pharmacyId}/reviews`);
        if (!cancelled) {
          setReviews(res.reviews || []);
          setMyReview(res.myReview ?? null);
          if (res.myReview) setReviewForm({ rating: res.myReview.rating, title: res.myReview.title || "", body: res.myReview.body || "" });
        }
      } catch {
        if (!cancelled) setReviews([]);
      }
    })();
    return () => { cancelled = true; };
  }, [pharmacyId]);

  const doFreeze = async () => {
    const reason = freezeReason.trim();
    if (!reason) {
      setError("Freeze reason is required");
      return;
    }
    setActionLoading("freeze");
    try {
      await api(`/offers/${id}/freeze`, { method: "POST", body: { reason } });
      setOffer(null);
      setError(t("product.frozenMessage"));
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const doUnfreeze = async () => {
    setActionLoading("unfreeze");
    try {
      await api(`/offers/${id}/unfreeze`, { method: "POST" });
      const res = await api(`/offers/${id}`);
      setOffer(res.offer);
      setError("");
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const doDelete = async () => {
    const reason = deleteReason.trim() || "Removed by admin";
    setActionLoading("delete");
    try {
      await api(`/offers/${id}/delete`, { method: "POST", body: { reason } });
      setOffer(null);
      setError(t("product.deletedMessage"));
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const doRestore = async () => {
    setActionLoading("restore");
    try {
      await api(`/offers/${id}/restore`, { method: "POST" });
      const res = await api(`/offers/${id}`);
      setOffer(res.offer);
      setError("");
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const doRequestUnfreeze = async () => {
    setActionLoading("requestUnfreeze");
    try {
      await api(`/offers/${id}/request-unfreeze`, { method: "POST" });
      setError(t("product.requestUnfreezeSent"));
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const saveReview = async (e) => {
    e?.preventDefault();
    if (!pharmacyId || !user) return;
    setReviewSaving(true);
    try {
      const res = await api(`/pharmacies/${pharmacyId}/reviews`, {
        method: "POST",
        body: { rating: reviewForm.rating, title: reviewForm.title.trim() || null, body: reviewForm.body.trim() || null },
      });
      setMyReview(res.review ?? null);
      const listRes = await api(`/pharmacies/${pharmacyId}/reviews`);
      setReviews(listRes.reviews || []);
    } catch (err) {
      setError(err?.message || t("product.reviewSaveError"));
    } finally {
      setReviewSaving(false);
    }
  };

  const deleteReview = async () => {
    if (!pharmacyId || !user || !myReview) return;
    if (!window.confirm(t("product.confirmDeleteReview"))) return;
    setReviewSaving(true);
    try {
      await api(`/pharmacies/${pharmacyId}/reviews/me`, { method: "DELETE" });
      setMyReview(null);
      setReviewForm({ rating: 5, title: "", body: "" });
      const listRes = await api(`/pharmacies/${pharmacyId}/reviews`);
      setReviews(listRes.reviews || []);
    } catch (err) {
      setError(err?.message || t("product.reviewDeleteError"));
    } finally {
      setReviewSaving(false);
    }
  };

  const doBlockPharmacy = async () => {
    if (!offer?.pharmacy?.id) return;
    const reason = blockReason.trim();
    if (!reason) {
      setError("Block reason is required");
      return;
    }
    setActionLoading("block");
    try {
      await api(`/admin/pharmacies/${offer.pharmacy.id}/block`, { method: "POST", body: { reason } });
      setOffer(null);
      setError(t("product.blockedMessage"));
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const doUnblockPharmacy = async () => {
    if (!offer?.pharmacy?.id) return;
    setActionLoading("unblock");
    try {
      await api(`/admin/pharmacies/${offer.pharmacy.id}/unblock`, { method: "POST" });
      const res = await api(`/offers/${id}`);
      setOffer(res.offer);
      setError("");
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 24, textAlign: "center" }}>{t("product.loading")}</div>
    );
  }

  if (error && !offer) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", borderRadius: 8, color: "#c00" }}>{error}</div>
        <button type="button" onClick={() => navigate(-1)} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>{t("product.back")}</button>
      </div>
    );
  }

  if (!offer) return null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, paddingTop: 88 }}>
      <button type="button" onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", marginBottom: 16 }}>← {t("product.back")}</button>

      {(offer.isFrozen || offer.isDeleted) && (
        <div
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            background: offer.isDeleted ? "#ffebee" : "#fff3e0",
            border: `1px solid ${offer.isDeleted ? "#c62828" : "#ef6c00"}`,
            color: offer.isDeleted ? "#b71c1c" : "#e65100",
          }}
        >
          <strong>{offer.isDeleted ? t("product.deleted") : t("product.frozen")}</strong>
          {offer.isDeleted && offer.deletedReason && <div style={{ marginTop: 6 }}>{t("product.reason")}: {offer.deletedReason}</div>}
          {offer.isFrozen && offer.frozenReason && <div style={{ marginTop: 6 }}>{t("product.reason")}: {offer.frozenReason}</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          {offer.imageUrl ? (
            <img src={offer.imageUrl} alt="" style={{ width: "100%", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
          ) : (
            <div style={{ width: "100%", aspectRatio: "1", background: "#eee", borderRadius: 16, display: "grid", placeItems: "center", fontSize: 64 }}>📦</div>
          )}
        </div>
        <div style={{ flex: "1 1 300px" }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 26 }}>{offer.name}</h1>
          {offer.categorySlug && <span style={{ fontSize: 14, color: "#666" }}>{t(`categoryNames.${offer.categorySlug}`) || offer.categoryName}</span>}
          <div style={{ marginTop: 16, fontSize: 24, fontWeight: 700, color: "#2e7d32" }}>{offer.price} {offer.currency}</div>
          {offer.stockQty != null && <div style={{ marginTop: 6, fontSize: 14, color: "#666" }}>{t("product.inStockQty")}: {offer.stockQty}</div>}
          {offer.pharmacy && (
            <div style={{ marginTop: 16 }}>
              <strong>{t("product.pharmacy")}:</strong> {offer.pharmacy.name}
              {offer.pharmacy.address && <div style={{ fontSize: 14, color: "#666" }}>{offer.pharmacy.address}</div>}
            </div>
          )}
          {offer.isPharmacyOwner && (
            <button
              type="button"
              onClick={() => navigate(`/product/${id}/edit`)}
              style={{ marginTop: 12, padding: "10px 18px", borderRadius: 10, border: "1px solid #2EB872", background: "#fff", color: "#2EB872", fontWeight: 600, cursor: "pointer" }}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, marginTop: 24, paddingTop: 24, borderTop: "1px solid #eee" }}>
        {user && (
          <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 520 }}>
            {offer.pharmacy?.phone && (
              <a
                href={`tel:${offer.pharmacy.phone}`}
                style={{
                  padding: "12px 24px",
                  borderRadius: 10,
                  background: "#2EB872",
                  color: "#fff",
                  fontWeight: 600,
                  textDecoration: "none",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                {t("product.call")}
              </a>
            )}
            <button
              type="button"
              onClick={() => navigate(`/offer/${id}/reserve`)}
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                border: "1px solid #2EB872",
                background: "#fff",
                color: "#2EB872",
                fontWeight: 600,
                cursor: "pointer",
                flex: 1,
              }}
            >
              {t("product.reserve")}
            </button>
          </div>
        )}
        {offer.description && (
          <div style={{ maxWidth: 720, color: "#444", lineHeight: 1.5 }}>
            {offer.description}
          </div>
        )}

        {/* Partner: request unfreeze when frozen */}
        {offer.isFrozen && offer.isPartner && (
          <button type="button" onClick={doRequestUnfreeze} disabled={actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #f57c00", background: "#fff", color: "#e65100", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}>
            {actionLoading === "requestUnfreeze" ? "…" : t("product.requestUnfreeze")}
          </button>
        )}

        {/* Moderator: freeze / unfreeze */}
        {isModerator && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {offer.isFrozen ? (
              <button type="button" onClick={doUnfreeze} disabled={actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #2e7d32", background: "#fff", color: "#2e7d32", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}>
                {actionLoading === "unfreeze" ? "…" : t("product.unfreeze")}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder={t("product.freezeReasonPlaceholder")}
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", minWidth: 200 }}
                />
                <button type="button" onClick={doFreeze} disabled={actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #c00", background: "#fff", color: "#c00", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}>
                  {actionLoading === "freeze" ? "…" : t("product.freeze")}
                </button>
              </>
            )}
          </div>
        )}

        {/* Admin: delete / restore, block / unblock pharmacy */}
        {isAdmin && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {offer.isDeleted ? (
                <button type="button" onClick={doRestore} disabled={actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #2e7d32", background: "#fff", color: "#2e7d32", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}>
                  {actionLoading === "restore" ? "…" : t("product.restore")}
                </button>
              ) : (
                <>
                  <input type="text" placeholder={t("product.deleteReasonPlaceholder")} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", minWidth: 180 }} />
                  <button type="button" onClick={doDelete} disabled={actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #a00", background: "#fff", color: "#a00", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}>
                    {actionLoading === "delete" ? "…" : t("product.delete")}
                  </button>
                </>
              )}
            </div>
            {offer.pharmacy?.id && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!offer.pharmacy?.isActive ? (
                  <button type="button" onClick={doUnblockPharmacy} disabled={actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #2e7d32", background: "#fff", color: "#2e7d32", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}>
                    {actionLoading === "unblock" ? "…" : t("product.unblockPharmacy")}
                  </button>
                ) : (
                  <>
                    <input type="text" placeholder={t("product.blockReasonPlaceholder")} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", minWidth: 200 }} />
                    <button type="button" onClick={doBlockPharmacy} disabled={actionLoading} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #600", background: "#fff", color: "#600", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer" }}>
                      {actionLoading === "block" ? "…" : t("product.blockPharmacy")}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {pharmacyId && offer?.pharmacy && (
        <>
          <section style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #eee" }}>
            <h3 style={{ marginBottom: 16 }}>{t("product.pharmacy")}</h3>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                padding: 20,
                background: "linear-gradient(135deg, #f8faf8 0%, #e8f5e9 100%)",
                borderRadius: 16,
                border: "1px solid rgba(63, 169, 53, 0.2)",
              }}
            >
              <div style={{ width: 100, height: 100, borderRadius: 12, overflow: "hidden", background: "#fff", flexShrink: 0 }}>
                {offer.pharmacy.logoUrl ? (
                  <img src={offer.pharmacy.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 40 }}>🏥</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 18 }}>{offer.pharmacy.name}</h4>
                {offer.pharmacy.address && <div style={{ marginBottom: 4, color: "#555" }}>📍 {offer.pharmacy.address}</div>}
                {offer.pharmacy.phone && (
                  <a href={`tel:${offer.pharmacy.phone}`} style={{ color: "#2e7d32", textDecoration: "none", fontWeight: 500 }}>
                    📞 {offer.pharmacy.phone}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 16 }}>{t("product.reviewsTitle")}</h3>
            {user && (
              <form onSubmit={saveReview} style={{ marginBottom: 24, padding: 16, background: "#f9f9f9", borderRadius: 12 }}>
                <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#666" }}>
                  {myReview ? t("product.editReview") + ":" : t("product.addReview") + ":"}
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                  <span>{t("product.rating")}:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: star }))} style={{ background: reviewForm.rating >= star ? "#ffc107" : "#eee", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
                      ★
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="" value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 8, border: "1px solid #ccc" }} />
                <textarea placeholder="" value={reviewForm.body} onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))} rows={3} style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 8, border: "1px solid #ccc" }} />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="submit" disabled={reviewSaving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#2EB872", color: "#fff", fontWeight: 600, cursor: reviewSaving ? "not-allowed" : "pointer" }}>
                    {reviewSaving ? t("product.savingReview") : myReview ? t("product.saveChanges") : t("product.submitReview")}
                  </button>
                  {myReview && (
                    <button type="button" onClick={deleteReview} disabled={reviewSaving} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #c00", background: "#fff", color: "#c00", cursor: reviewSaving ? "not-allowed" : "pointer" }}>
                      {t("product.deleteReview")}
                    </button>
                  )}
                </div>
              </form>
            )}
          {!user && <p style={{ color: "#666", marginBottom: 16 }}>{t("product.loginToReview")}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.length === 0 ? (
              <p style={{ color: "#666" }}>{t("product.noReviews")}</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#ffc107" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <strong>{r.userName}</strong>
                    <span style={{ fontSize: 12, color: "#999" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>}
                  {r.body && <div style={{ color: "#444" }}>{r.body}</div>}
                </div>
              ))
            )}
          </div>
          </section>
        </>
      )}
    </div>
  );
}


