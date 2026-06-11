import { Link } from "react-router";
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Phone,
  Mail,
} from "lucide-react";
import logoImg from "../../imports/logo-with-shadow.png";
import { useI18n } from "../i18n/I18nProvider";

export const Footer = () => {
  const { t } = useI18n();
  return (
    <footer className="bg-ink pt-20 pb-6 border-t border-white/10 relative overflow-hidden grain">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 border-b border-white/10 pb-16 mb-10">
          <div className="md:col-span-5">
            <Link to="/" className="flex items-center gap-4 mb-6">
              <img
                src={logoImg}
                alt="AGROESPACE"
                className="h-12 w-auto object-contain"
              />
              <span className="text-white text-2xl font-bold tracking-tight font-display">
                AGROESPACE
              </span>
            </Link>
            <p className="text-white/50 max-w-sm leading-relaxed">
              {t("footer.tagline")}
            </p>

            <div className="mt-8 space-y-3 text-white/70 text-sm">
              <a
                href="tel:+213661391012"
                className="flex items-center gap-3 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-lime" />
                <span dir="ltr">+213 661 391 012</span>
              </a>
              <a
                href="mailto:contact@agroespace.com"
                className="flex items-center gap-3 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-lime" /> contact@agroespace.com
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-white/40 font-mono mb-6 uppercase tracking-[0.25em] text-[11px]">
              {t("footer.nav")}
            </h4>
            <ul className="space-y-4 text-white/50 text-sm">
              {[
                { to: "/about", label: t("nav.about") },
                { to: "/services", label: t("nav.activities") },
                { to: "/technical", label: t("nav.expertise") },
                { to: "/catalog", label: t("nav.products") },
                { to: "/blog", label: t("nav.blog") },
                { to: "/contact", label: t("nav.contact") },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-lime transition-all duration-300" aria-hidden />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-white/40 font-mono mb-6 uppercase tracking-[0.25em] text-[11px]">
              {t("footer.legal")}
            </h4>
            <ul className="space-y-4 text-white/50 text-sm">
              <li>
                <Link to="/legal/terms" className="hover:text-white transition-colors">
                  {t("footer.legal.terms")}
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="hover:text-white transition-colors">
                  {t("footer.legal.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/legal/notice" className="hover:text-white transition-colors">
                  {t("footer.legal.notice")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-white/40 font-mono mb-6 uppercase tracking-[0.25em] text-[11px]">
              {t("footer.follow")}
            </h4>
            <div className="flex gap-3 flex-wrap">
              {[
                {
                  Icon: Facebook,
                  href: "https://www.facebook.com/sarlagroespace",
                  label: "Facebook",
                },
                {
                  Icon: Instagram,
                  href: "https://www.instagram.com/agroespace_irr",
                  label: "Instagram",
                },
                {
                  Icon: Linkedin,
                  href: "https://www.linkedin.com/company/agroespace-irrigation/",
                  label: "LinkedIn",
                },
                {
                  Icon: Youtube,
                  href: "https://www.youtube.com/@agroespace",
                  label: "YouTube",
                },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:bg-lime hover:text-white hover:border-transparent transition-all"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.6} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center text-white/50 text-sm gap-3">
          <p>
            © {new Date().getFullYear()} AGROESPACE. {t("footer.rights")}
          </p>
          <p className="font-mono text-[10px] tracking-[0.3em] text-white/25 uppercase">
            Alger · Ghardaïa · El Meniaa · Adrar
          </p>
        </div>
      </div>

      {/* Giant ghost wordmark — closes every page like an engraved plate */}
      <div
        aria-hidden
        className="pointer-events-none select-none mt-12 -mb-7 overflow-hidden"
      >
        <div
          dir="ltr"
          className="font-industrial uppercase text-center whitespace-nowrap leading-[0.72]
                     text-[clamp(3.2rem,11.5vw,10.5rem)]
                     text-transparent [-webkit-text-stroke:1.5px_rgba(135,169,34,0.18)]"
        >
          AGROESPACE
        </div>
      </div>
    </footer>
  );
};
