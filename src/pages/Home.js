import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import { useI18n } from "../i18n/Provider";
import { api } from "../api";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [randomCategories, setRandomCategories] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api("/categories/tree");
        const tree = res.tree || [];
        if (cancelled) return;
        const shuffled = shuffle(tree);
        const four = shuffled.slice(0, 4);
        const withFourSubs = four.map((cat) => ({
          ...cat,
          children: shuffle(cat.children || []).slice(0, 3),
        }));
        setRandomCategories(withFourSubs);
      } catch {
        if (!cancelled) setRandomCategories([]);
      } finally {
        if (!cancelled) setLoadingTree(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const categoryImageSrc = (imageName) => (imageName ? `/category-images/${imageName}` : "");
  const categoryImageFallback = (imageName) => (imageName ? `/images/categories/${imageName}` : "");
  const onCategoryImageError = (e, imageName) => {
    const img = e.currentTarget;
    if (!img.dataset.fallbackTried) {
      img.dataset.fallbackTried = "1";
      img.src = categoryImageFallback(imageName);
      return;
    }
    img.style.display = "none";
  };

  return (
    <div className="home">
      {/* STEPS */}
      <section className="steps">
        <div className="container">
          <div className="steps__grid">
            <div className="stepcard">
              <div className="stepcard__badge stepcard__badge--1">1</div>
              <div className="stepcard__title">{t("home.steps.1.title")}</div>
              <div className="stepcard__text">{t("home.steps.1.text")}</div>
            </div>

            <div className="stepcard">
              <div className="stepcard__badge stepcard__badge--2">2</div>
              <div className="stepcard__title">{t("home.steps.2.title")}</div>
              <div className="stepcard__text">{t("home.steps.2.text")}</div>
            </div>

            <div className="stepcard">
              <div className="stepcard__badge stepcard__badge--3">3</div>
              <div className="stepcard__title">{t("home.steps.3.title")}</div>
              <div className="stepcard__text">{t("home.steps.3.text")}</div>
            </div>

            <div className="stepcard">
              <div className="stepcard__badge stepcard__badge--4">✓</div>
              <div className="stepcard__title">{t("home.steps.4.title")}</div>
              <div className="stepcard__text">{t("home.steps.4.text")}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="main">
        <div className="container">
          <div className="main__grid">
            {/* Left: 4 random parent categories */}
            <aside className="categories">
              {loadingTree ? (
                <div className="categories__item">…</div>
              ) : (
                randomCategories.map((cat) => (
                  <div key={cat.id} className="categories__item">
                    <div className="categories__icon">
                      {cat.imageName ? (
                        <img
                          src={categoryImageSrc(cat.imageName)}
                          alt=""
                          onError={(e) => onCategoryImageError(e, cat.imageName)}
                        />
                      ) : null}
                    </div>
                    <span>{t(`categoryNames.${cat.slug}`) || cat.name}</span>
                  </div>
                ))
              )}
            </aside>

            {/* Right: 4 categories × 4 subcategories */}
            <div className="content">
              <h2 className="section-title">{t("home.actualCategories")}</h2>
              {loadingTree ? (
                <div className="cards">
                  <div className="card skeleton" />
                  <div className="card skeleton" />
                  <div className="card skeleton" />
                  <div className="card skeleton" />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {randomCategories.map((cat) => (
                    <div key={cat.id}>
                      <h3 style={{ marginBottom: 12, fontSize: 18, color: "#333" }}>{t(`categoryNames.${cat.slug}`) || cat.name}</h3>
                      <div className="cards cards--category">
                        {(cat.children || []).map((sub) => {
                          const subLabel = t(`categoryNames.${sub.slug}`) || sub.name;
                          const target = `/search?category=${encodeURIComponent(sub.slug)}&label=${encodeURIComponent(subLabel)}`;
                          return (
                          <a
                            key={sub.id}
                            href={target}
                            onClick={(e) => { e.preventDefault(); navigate(target); }}
                            className="card card--category"
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <div className="card__thumbWrap">
                              {sub.imageName ? (
                                <img
                                  src={categoryImageSrc(sub.imageName)}
                                  alt=""
                                  className="card__thumb"
                                  onError={(e) => onCategoryImageError(e, sub.imageName)}
                                />
                              ) : (
                                <div className="card__thumbPlaceholder" aria-hidden="true">
                                  {(subLabel || "?").slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="card__label">{subLabel}</span>
                          </a>
                        )})}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
