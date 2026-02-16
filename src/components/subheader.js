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

  const examples = useMemo(() => [t("common.searchExample1"), t("common.searchExample2"), t("common.searchExample3")], [t]);

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
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
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
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const goExample = (text) => {
    setQuery(text);
    inputRef.current?.focus();
    navigate(`/search?q=${encodeURIComponent(text)}`);
  };

  return (
    <header className={`header ${isScrolled ? "scrolled" : ""}`}>
      <section className="subheader">
       {/* Search */}
          
      </section>
    </header>
  );
}
