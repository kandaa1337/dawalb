import { Link, useNavigate } from "react-router-dom";
import { FaClipboardList, FaUserLock, FaCog, FaStore, FaListUl, FaChevronDown } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import "../styles/Header.css";
import { useI18n } from "../i18n/Provider";
import { useAuth } from "../AuthContext";
import { api } from "../api";

const SEARCH_DEBOUNCE_MS = 300;
const DROPDOWN_MEDICINES = 6;
const DROPDOWN_PHARMACIES = 3;
const LEBANON_REGIONS = [
  { value: "Beirut", key: "beirut" },
  { value: "Mount Lebanon", key: "mountLebanon" },
  { value: "North Lebanon", key: "northLebanon" },
  { value: "Akkar", key: "akkar" },
  { value: "Baalbek-Hermel", key: "baalbekHermel" },
  { value: "Beqaa", key: "beqaa" },
  { value: "Nabatieh", key: "nabatieh" },
  { value: "South Lebanon", key: "southLebanon" },
];
const REGION_LABELS = {
  en: {
    beirut: "Beirut",
    mountLebanon: "Mount Lebanon",
    northLebanon: "North Lebanon",
    akkar: "Akkar",
    baalbekHermel: "Baalbek-Hermel",
    beqaa: "Beqaa",
    nabatieh: "Nabatieh",
    southLebanon: "South Lebanon",
  },
  fr: {
    beirut: "Beyrouth",
    mountLebanon: "Mont-Liban",
    northLebanon: "Liban-Nord",
    akkar: "Akkar",
    baalbekHermel: "Baalbek-Hermel",
    beqaa: "Bekaa",
    nabatieh: "Nabatieh",
    southLebanon: "Liban-Sud",
  },
  ar: {
    beirut: "بيروت",
    mountLebanon: "جبل لبنان",
    northLebanon: "شمال لبنان",
    akkar: "عكار",
    baalbekHermel: "بعلبك الهرمل",
    beqaa: "البقاع",
    nabatieh: "النبطية",
    southLebanon: "جنوب لبنان",
  },
};

export default function Header() {
  const [reservationHistory, setReservationHistory] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ medicines: [], pharmacies: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [reservationsOpen, setReservationsOpen] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("regionFilter") || "null");
      if (Array.isArray(raw) && raw.length) return raw;
    } catch {
      // ignore
    }
    return ["ALL"];
  });

  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { isAdmin, user } = useAuth();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const regionRef = useRef(null);
  const reservationsRef = useRef(null);

  const isAllRegions = selectedRegions.includes("ALL");
  const getRegionLabel = (value) => {
    const item = LEBANON_REGIONS.find((r) => r.value === value);
    if (!item) return value;
    return REGION_LABELS[lang]?.[item.key] || REGION_LABELS.en[item.key] || value;
  };
  const regionSummary = isAllRegions
    ? t("common.allLebanon")
    : (selectedRegions.length <= 2
      ? selectedRegions.map(getRegionLabel).join(", ")
      : `${selectedRegions.slice(0, 2).map(getRegionLabel).join(", ")} +${selectedRegions.length - 2}`);
  const regionParam = isAllRegions ? "" : selectedRegions.join(",");

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      // Hysteresis prevents sticky header flicker around threshold.
      setIsScrolled((prev) => (prev ? y > 24 : y > 56));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    const handleKey = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        setDropdownOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadReservations = async () => {
      if (!user) {
        if (!cancelled) setReservationHistory([]);
        return;
      }
      try {
        const res = await api("/reservations");
        if (!cancelled) setReservationHistory(res.reservations || []);
      } catch {
        if (!cancelled) setReservationHistory([]);
      }
    };

    loadReservations();
    const handler = () => { loadReservations(); };
    window.addEventListener("reservationHistoryUpdated", handler);

    return () => {
      cancelled = true;
      window.removeEventListener("reservationHistoryUpdated", handler);
    };
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem("regionFilter", JSON.stringify(selectedRegions));
  }, [selectedRegions]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults({ medicines: [], pharmacies: [] });
      setDropdownOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const regionQuery = regionParam ? `&regions=${encodeURIComponent(regionParam)}` : "";
        const res = await api(`/search?q=${encodeURIComponent(q)}&limit_med=${DROPDOWN_MEDICINES}&limit_pharm=${DROPDOWN_PHARMACIES}${regionQuery}`);
        setSearchResults({
          medicines: res.medicines || [],
          pharmacies: res.pharmacies || [],
        });
        setDropdownOpen(true);
      } catch {
        setSearchResults({ medicines: [], pharmacies: [] });
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, regionParam]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (regionRef.current && !regionRef.current.contains(e.target)) {
        setRegionOpen(false);
      }
      if (reservationsRef.current && !reservationsRef.current.contains(e.target)) {
        setReservationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setDropdownOpen(false);
    const params = new URLSearchParams({ q });
    if (!isAllRegions) params.set("regions", selectedRegions.join(","));
    navigate(`/search?${params.toString()}`);
  };

  const goToProduct = (id) => {
    setDropdownOpen(false);
    setQuery("");
    navigate(`/product/${id}`);
  };

  const goToPharmacy = (id) => {
    setDropdownOpen(false);
    setQuery("");
    navigate(`/pharmacies?highlight=${id}`);
  };

  const hasResults = searchResults.medicines.length > 0 || searchResults.pharmacies.length > 0;
  const showDropdown = dropdownOpen && query.trim().length >= 2;
  const reservationItems = reservationHistory.slice(0, 6);

  const toggleRegion = (region) => {
    if (region === "ALL") {
      setSelectedRegions(["ALL"]);
      return;
    }
    setSelectedRegions((prev) => {
      const next = new Set(prev.filter((r) => r !== "ALL"));
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next.size ? Array.from(next) : ["ALL"];
    });
  };

  return (
    <header dir="ltr" className={`header ${isScrolled ? "scrolled" : ""}`}>
      <section className="hero">
        <div className="hero__container">
          <div className="hero__topbar">
            <Link to="/" className="brand" aria-label="Home">
              <div className="brand__logo" />
              <div className="brand__name">DAWA LB</div>
            </Link>

            <div className="topright">
              <button className="pill" type="button" onClick={() => navigate("/pharmacies")}>
                {t("common.choosePharmacy")} <FaChevronDown className="pill__chev" />
              </button>

              <div className="region-picker" ref={regionRef}>
                <button
                  className="pill pill--region"
                  type="button"
                  onClick={() => setRegionOpen((v) => !v)}
                  aria-expanded={regionOpen}
                  aria-haspopup="dialog"
                >
                  <FaListUl className="pill__icon" />
                  <span className="pill__label">{t("common.regions")}</span>
                  <span className="pill__value">{regionSummary}</span>
                  <FaChevronDown className="pill__chev" />
                </button>

                {regionOpen && (
                  <div className="region-popover" role="dialog" aria-label={t("common.regions")}>
                    <div className="region-popover__title">{t("common.regions")}</div>
                    <button
                      type="button"
                      className={`region-option ${isAllRegions ? "active" : ""}`}
                      onClick={() => toggleRegion("ALL")}
                    >
                      <span className="region-option__dot" />
                      {t("common.allLebanon")}
                    </button>
                    <div className="region-grid">
                      {LEBANON_REGIONS.map((region) => {
                        const active = selectedRegions.includes(region.value);
                        return (
                          <button
                            key={region.value}
                            type="button"
                            className={`region-option ${active ? "active" : ""}`}
                            onClick={() => toggleRegion(region.value)}
                          >
                            <span className="region-option__dot" />
                            {getRegionLabel(region.value)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="reservations" ref={reservationsRef}>
                <button
                  className="icon icon--reservations"
                  type="button"
                  onClick={() => setReservationsOpen((v) => !v)}
                  aria-label={t("common.reservationHistory")}
                  title={t("common.reservationHistory")}
                  aria-expanded={reservationsOpen}
                >
                  <FaClipboardList />
                  {reservationHistory.length > 0 && <span className="badge">{reservationHistory.length}</span>}
                </button>
                {reservationsOpen && (
                  <div className="reservations-popover" role="dialog" aria-label={t("common.reservationHistory")}>
                    <div className="reservations-popover__header">
                      <div>{t("common.reservationHistory")}</div>
                      <button type="button" className="reservations-popover__link" onClick={() => navigate("/profile")}>
                        {t("common.viewAll")}
                      </button>
                    </div>
                    {reservationItems.length === 0 ? (
                      <div className="reservations-empty">{t("common.reservationHistoryEmpty")}</div>
                    ) : (
                      <div className="reservations-list">
                        {reservationItems.map((r) => {
                          const items = Array.isArray(r.items) ? r.items : [];
                          const first = items[0] || {};
                          const moreCount = items.length > 1 ? items.length - 1 : 0;
                          const dateValue = r.submittedAt || r.createdAt;
                          return (
                            <div key={r.id} className="reservation-card">
                              {first.imageUrl && (
                                <img src={first.imageUrl} alt="" className="reservation-card__img" />
                              )}
                              <div>
                                <div className="reservation-card__title">{r.pharmacyName || "Pharmacy"}</div>
                                <div className="reservation-card__row">
                                  <span>
                                    {first.productName || "Item"} {moreCount ? `+${moreCount}` : ""}
                                  </span>
                                  <span>x{first.quantity || 1}</span>
                                </div>
                                <div className="reservation-card__row">
                                  <span>{r.totalBookingPrice || 0} {r.currency || ""}</span>
                                  <span className="reservation-card__status">{r.status || "SUBMITTED"}</span>
                                </div>
                                <div className="reservation-card__meta">
                                  {r.paymentProvider || ""} {dateValue ? `- ${new Date(dateValue).toLocaleString()}` : ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                className="icon"
                type="button"
                onClick={() => navigate("/profile")}
                aria-label={t("common.profile")}
                title={t("common.profile")}
              >
                <FaUserLock />
              </button>

              <button
                className="icon"
                type="button"
                onClick={() => navigate("/my-pharmacy")}
                aria-label={t("common.myPharmacy")}
                title={t("common.myPharmacy")}
              >
                <FaStore />
              </button>

              {isAdmin && (
                <button
                  className="icon icon--admin"
                  type="button"
                  onClick={() => navigate("/admin")}
                  aria-label={t("common.admin")}
                  title={t("common.admin")}
                >
                  <FaCog />
                </button>
              )}

              <div className="lang-switch" aria-label={t("common.language")}>
                <button
                  type="button"
                  className={`lang-pill ${lang === "en" ? "active" : ""}`}
                  onClick={() => setLang("en")}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`lang-pill ${lang === "fr" ? "active" : ""}`}
                  onClick={() => setLang("fr")}
                >
                  FR
                </button>
                <button
                  type="button"
                  className={`lang-pill ${lang === "ar" ? "active" : ""}`}
                  onClick={() => setLang("ar")}
                >
                  AR
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="hero__search-wrap" ref={dropdownRef}>
        <form className="hero__search" onSubmit={onSubmit}>
          <div className="searchbox">
            <span className="searchbox__icon" aria-hidden="true">??</span>

            <input
              ref={inputRef}
              className="searchbox__input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setDropdownOpen(true)}
              placeholder={t("common.searchPlaceholder")}
              aria-label={t("common.searchPlaceholder")}
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              autoComplete="off"
            />

            <div className="searchbox__divider" aria-hidden="true" />

            <button className="searchbox__btn" type="submit" disabled={!query.trim()}>
              {searchLoading ? "..." : t("common.search")}
            </button>
          </div>
        </form>

        {showDropdown && (
          <div className="searchbox__dropdown" role="listbox">
            {searchLoading ? (
              <div className="searchbox__dropdown-item searchbox__dropdown-item--muted">{t("product.loading")}</div>
            ) : !hasResults ? (
              <div className="searchbox__dropdown-item searchbox__dropdown-item--muted">{t("search.noResults")}</div>
            ) : (
              <>
                {searchResults.medicines.length > 0 && (
                  <div className="searchbox__dropdown-section">
                    <div className="searchbox__dropdown-label">{t("search.medicines")}</div>
                    {searchResults.medicines.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="searchbox__dropdown-item"
                        onClick={() => goToProduct(m.id)}
                        role="option"
                      >
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt="" className="searchbox__dropdown-img" />
                        ) : (
                          <span className="searchbox__dropdown-img searchbox__dropdown-img--placeholder">??</span>
                        )}
                        <span className="searchbox__dropdown-text">
                          <strong>{m.name}</strong>
                          {m.pharmacyName && <span className="searchbox__dropdown-meta">{m.pharmacyName}</span>}
                        </span>
                        <span className="searchbox__dropdown-price">{m.price} {m.currency}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.pharmacies.length > 0 && (
                  <div className="searchbox__dropdown-section">
                    <div className="searchbox__dropdown-label">{t("search.pharmacies")}</div>
                    {searchResults.pharmacies.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="searchbox__dropdown-item"
                        onClick={() => goToPharmacy(p.id)}
                        role="option"
                      >
                        <span className="searchbox__dropdown-img searchbox__dropdown-img--placeholder">??</span>
                        <span className="searchbox__dropdown-text">
                          <strong>{p.name}</strong>
                          {p.address && <span className="searchbox__dropdown-meta">{p.address}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="searchbox__dropdown-footer">
                  <button
                    type="button"
                    className="searchbox__dropdown-link"
                    onClick={() => {
                      setDropdownOpen(false);
                      const params = new URLSearchParams({ q: query.trim() });
                      if (!isAllRegions) params.set("regions", selectedRegions.join(","));
                      navigate(`/search?${params.toString()}`);
                    }}
                  >
                    {t("search.title")}: "{query.trim()}"
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
