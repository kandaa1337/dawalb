import "../styles/Home.css";
import { useI18n } from "../i18n/Provider";

export default function Home() {
  const { t } = useI18n();

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
            {/* Left categories */}
            <aside className="categories">
              <div className="categories__item">
                <span className="categories__icon">💊</span>
                <span>{t("home.categories.medicine")}</span>
              </div>
              <div className="categories__item">
                <span className="categories__icon">🧴</span>
                <span>{t("home.categories.vitamins")}</span>
              </div>
              <div className="categories__item">
                <span className="categories__icon">✨</span>
                <span>{t("home.categories.beauty")}</span>
              </div>
              <div className="categories__item">
                <span className="categories__icon">🏃</span>
                <span>{t("home.categories.sport")}</span>
              </div>
              <div className="categories__item">
                <span className="categories__icon">🧸</span>
                <span>{t("home.categories.kids")}</span>
              </div>
              <div className="categories__item">
                <span className="categories__icon">🩹</span>
                <span>{t("home.categories.medDevices")}</span>
              </div>
              <div className="categories__item">
                <span className="categories__icon">🦴</span>
                <span>{t("home.categories.ortho")}</span>
              </div>
            </aside>

            {/* Right content placeholder */}
            <div className="content">
              <h2 className="section-title">{t("home.actualCategories")}</h2>

              <div className="cards">
                <div className="card skeleton" />
                <div className="card skeleton" />
                <div className="card skeleton" />
                <div className="card skeleton" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
