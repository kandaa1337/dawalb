import { Link, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaUserLock } from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/Header.css";
import { useI18n } from "../i18n/Provider";

export default function Header() {
  const [cartCount, setCartCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState("");

  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const inputRef = useRef(null);

  const examples = useMemo(() => ["Парацетамол", "Ибупрофен", "Витамин C"], []);
  const selected = JSON.parse(localStorage.getItem("selectedPharmacy") || "null");

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const total = cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
      setCartCount(total);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);

    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);

    const handleKey = (e) => {
      // "/" фокус в поиск (как на многих сайтах)
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Esc очищает
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/products?query=${encodeURIComponent(q)}`);
  };

  const goExample = (text) => {
    setQuery(text);
    inputRef.current?.focus();
    navigate(`/products?query=${encodeURIComponent(text)}`);
  };

  return (
    <header className={`header ${isScrolled ? "scrolled" : ""}`}>
      <section className="hero">
        <div className="hero__container">
          {/* Top bar */}
          <div className="hero__topbar">
            <Link to="/" className="brand" aria-label="Home">
              <div className="brand__logo" />
              <div className="brand__name">DAWA LB</div>
            </Link>

            <div className="toplinks">
              <button className="toplinks__btn" type="button" onClick={() => navigate("/catalog")}>
                {t("common.catalog")}
              </button>

              <button className="toplinks__btn" type="button" onClick={() => navigate("/pharmacies")}>
                {t("common.pharmacies")}
              </button>

              <button className="toplinks__btn" type="button" onClick={() => navigate("/services")}>
                {t("common.services")}
              </button>

              <button className="toplinks__btn" type="button" onClick={() => navigate("/contact")}>
                {t("common.contact")}
              </button>
            </div>

            <div className="topright">
              <button className="pill" type="button" onClick={() => navigate("/pharmacies")}>
                {selected?.name || t("common.choosePharmacy")} ▾
              </button>

              <button className="pill pill--white" type="button" onClick={() => navigate("/availability")}>
                {t("common.availability")}
              </button>

              <button
                className="icon icon--cart"
                type="button"
                onClick={() => navigate("/cart")}
                aria-label={t("common.cart")}
                title={t("common.cart")}
              >
                <FaShoppingCart />
                {cartCount > 0 && <span className="badge">{cartCount}</span>}
              </button>

              <button
                className="icon"
                type="button"
                onClick={() => navigate("/profile")}
                aria-label={t("common.profile")}
                title={t("common.profile")}
              >
                <FaUserLock />
              </button>

              {/* Language switch (segmented) */}
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
      <form className="hero__search" onSubmit={onSubmit}>
            <div className="searchbox">
              <span className="searchbox__icon" aria-hidden="true">🔎</span>

              <input
                ref={inputRef}
                className="searchbox__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.searchPlaceholder")}
                aria-label={t("common.searchPlaceholder")}
              />

              <div className="searchbox__divider" aria-hidden="true" />

              <button className="searchbox__btn" type="submit" disabled={!query.trim()}>
                {t("common.search")}
              </button>
            </div>
          </form>
    </header>
  );
}
