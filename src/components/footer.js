import { useMemo } from "react";
import { useI18n } from "../i18n/Provider";
import "../styles/Footer.css";

const COPY = {
  en: {
    warning: "Self-medication can be harmful to your health",
    featureTitles: ["Service", "Payment", "Returns"],
    featureTexts: [
      "Find medicines and health products quickly across pharmacies in Lebanon.",
      "Reservation payment and purchase are completed directly at the pharmacy.",
      "Medicines bought at pharmacies are not returnable under policy.",
    ],
    cols: {
      users: "For users",
      info: "Information",
      partners: "For partners",
    },
    users: ["How to save", "Nearby pharmacies", "Extended search", "Delivery and payment"],
    info: ["About us", "Feedback", "Blog", "Useful links"],
    partners: ["Place a pharmacy", "Pharmacy cabinet", "Technical docs", "Advertising policy"],
    copyright: "DAWA LB online platform",
  },
  fr: {
    warning: "L'automedication peut nuire a votre sante",
    featureTitles: ["Service", "Paiement", "Retours"],
    featureTexts: [
      "Recherchez des medicaments et produits sante dans les pharmacies du Liban.",
      "Le paiement de reservation et l'achat se font directement en pharmacie.",
      "Les medicaments achetes en pharmacie ne sont pas retournables.",
    ],
    cols: {
      users: "Pour les utilisateurs",
      info: "Informations",
      partners: "Pour les partenaires",
    },
    users: ["Comment economiser", "Pharmacies proches", "Recherche avancee", "Livraison et paiement"],
    info: ["A propos", "Commentaires", "Blog", "Liens utiles"],
    partners: ["Ajouter une pharmacie", "Cabinet pharmacie", "Docs techniques", "Politique publicitaire"],
    copyright: "Plateforme DAWA LB",
  },
  ar: {
    warning: "قد يكون العلاج الذاتي ضارا بصحتك",
    featureTitles: ["الخدمة", "الدفع", "الاسترجاع"],
    featureTexts: [
      "ابحث عن الادوية ومنتجات الصحة بسرعة عبر صيدليات لبنان.",
      "الدفع للحجز والشراء يتم مباشرة في الصيدلية.",
      "الادوية المشتراة من الصيدليات غير قابلة للاسترجاع.",
    ],
    cols: {
      users: "للمستخدمين",
      info: "معلومات",
      partners: "للشركاء",
    },
    users: ["كيف توفر", "صيدليات قريبة", "بحث متقدم", "الدفع والتوصيل"],
    info: ["من نحن", "ملاحظات", "المدونة", "روابط مفيدة"],
    partners: ["اضافة صيدلية", "لوحة الصيدلية", "وثائق تقنية", "سياسة الاعلان"],
    copyright: "منصة DAWA LB",
  },
};

export default function Footer() {
  const { lang } = useI18n();
  const copy = useMemo(() => COPY[lang] || COPY.en, [lang]);

  return (
    <footer className="footer" id="footer-contact">
      <div className="footer__inner">
        <h2 className="footer__warning">{copy.warning}</h2>

        <div className="footer__features">
          {copy.featureTitles.map((title, idx) => (
            <article key={title} className="footer__feature">
              <h3>{title}</h3>
              <p>{copy.featureTexts[idx]}</p>
            </article>
          ))}
        </div>

        <div className="footer__cols">
          <div>
            <h4>{copy.cols.users}</h4>
            {copy.users.map((x) => <p key={x}>{x}</p>)}
          </div>
          <div>
            <h4>{copy.cols.info}</h4>
            {copy.info.map((x) => <p key={x}>{x}</p>)}
          </div>
          <div>
            <h4>{copy.cols.partners}</h4>
            {copy.partners.map((x) => <p key={x}>{x}</p>)}
          </div>
        </div>

        <p className="footer__copy">© {new Date().getFullYear()} {copy.copyright}</p>
      </div>
    </footer>
  );
}

