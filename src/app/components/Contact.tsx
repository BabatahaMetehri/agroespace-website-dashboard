import { useState } from "react";
import { Mail, Phone, MapPin, Check } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { PivotField } from "./fx/PivotField";

export const Contact = () => {
  const { t } = useI18n();
  const [accepted, setAccepted] = useState(false);

  return (
    <section
      id="contact"
      className="relative py-32 bg-forest overflow-hidden grain"
    >
      <div className="absolute -top-40 ltr:-right-40 rtl:-left-40 w-96 h-96 bg-pine rounded-full blur-[100px] opacity-50" aria-hidden />
      <div className="absolute -bottom-40 ltr:-left-40 rtl:-right-40 w-96 h-96 bg-lime rounded-full blur-[120px] opacity-20" aria-hidden />
      <div
        aria-hidden
        className="absolute -bottom-56 ltr:-left-56 rtl:-right-56 w-[30rem] h-[30rem] text-lime/10 pointer-events-none hidden lg:block"
      >
        <PivotField className="w-full h-full" reverse />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <span className="text-lime uppercase tracking-[0.2em] text-sm font-semibold mb-6 block">
              {t("contact.eyebrow")}
            </span>
            <h2 className="text-5xl md:text-7xl font-display font-light text-white leading-[1.02] mb-8">
              {t("contact.title.1")} <br />{" "}
              <span className="italic text-lime">
                {t("contact.title.italic")}
              </span>
            </h2>
            <p className="text-white/60 text-lg mb-12 max-w-md">
              {t("contact.description")}
            </p>

            <div className="space-y-8">
              <a
                href="tel:+213661391012"
                className="flex items-center gap-6 group"
              >
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-lime group-hover:border-transparent transition-all">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1 uppercase tracking-wider">
                    {t("contact.phone.label")}
                  </div>
                  <div dir="ltr" className="text-white text-xl font-light">
                    +213 661 391 012
                  </div>
                </div>
              </a>

              <a
                href="mailto:contact@agroespace.com"
                className="flex items-center gap-6 group"
              >
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-lime group-hover:border-transparent transition-all">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1 uppercase tracking-wider">
                    {t("contact.email.label")}
                  </div>
                  <div className="text-white text-xl font-light">
                    contact@agroespace.com
                  </div>
                </div>
              </a>

              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-lime group-hover:border-transparent transition-all">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1 uppercase tracking-wider">
                    {t("contact.headquarters.label")}
                  </div>
                  <div className="text-white text-xl font-light">
                    Bordj El Kifane, Alger
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-3xl">
            <h3 className="text-2xl text-white mb-8 font-display font-medium">
              {t("contact.form.title")}
            </h3>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (!accepted) return;
                const form = new FormData(e.currentTarget);
                const name = (form.get("name") as string) ?? "";
                const phone = (form.get("phone") as string) ?? "";
                const email = (form.get("email") as string) ?? "";
                const company = (form.get("company") as string) ?? "";
                const body = (form.get("message") as string) ?? "";

                // Best-effort save so the request lands in "Devis en attente".
                fetch(
                  `https://${projectId}.supabase.co/functions/v1/make-server-0c561120/quotes`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${publicAnonKey}`,
                    },
                    body: JSON.stringify({ name, phone, email, company, message: body }),
                  },
                ).catch(() => null);

                const message = `Bonjour AGROESPACE,%0A%0AJe suis ${name} (${company}).%0ATéléphone : ${phone}%0AEmail : ${email}%0A%0A${body}`;
                window.open(
                  `https://wa.me/213670635013?text=${message}`,
                  "_blank",
                );
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    className="block text-white/60 text-sm mb-2"
                    htmlFor="name"
                  >
                    {t("contact.name.label")}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    maxLength={100}
                    minLength={2}
                    autoComplete="name"
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-lime transition-colors"
                    placeholder={t("contact.name.placeholder")}
                  />
                </div>
                <div>
                  <label
                    className="block text-white/60 text-sm mb-2"
                    htmlFor="phone"
                  >
                    {t("contact.phone.label")}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    maxLength={30}
                    pattern="[+\d][\d\s().\-]{5,24}"
                    autoComplete="tel"
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-lime transition-colors"
                    placeholder={t("contact.phone.placeholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    className="block text-white/60 text-sm mb-2"
                    htmlFor="company"
                  >
                    {t("contact.company.label")}
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    maxLength={150}
                    autoComplete="organization"
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-lime transition-colors"
                    placeholder={t("contact.company.placeholder")}
                  />
                </div>
                <div>
                  <label
                    className="block text-white/60 text-sm mb-2"
                    htmlFor="email"
                  >
                    {t("contact.email.label")}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    maxLength={254}
                    autoComplete="email"
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-lime transition-colors"
                    placeholder={t("contact.email.placeholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-white/60 text-sm mb-2"
                  htmlFor="message"
                >
                  {t("contact.message.label")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  maxLength={2000}
                  className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-lime transition-colors resize-none"
                  placeholder={t("contact.message.placeholder")}
                />
              </div>

              {/* Consent */}
              <label className="flex items-start gap-3 cursor-pointer py-1">
                <span className="mt-0.5 relative flex items-center justify-center w-5 h-5 rounded border border-white/30 bg-transparent flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                    className="absolute w-full h-full opacity-0 cursor-pointer peer"
                  />
                  <Check className="w-3 h-3 text-lime opacity-0 peer-checked:opacity-100 transition-opacity" />
                </span>
                <span className="text-white/60 text-sm leading-relaxed">
                  {t("contact.consent")}{" "}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    {t("contact.terms")}
                  </a>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={!accepted}
                className="w-full bg-lime hover:bg-lime-deep text-white py-4 rounded-xl font-medium tracking-wide transition-colors mt-4 disabled:opacity-50"
              >
                {t("contact.send.whatsapp")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
