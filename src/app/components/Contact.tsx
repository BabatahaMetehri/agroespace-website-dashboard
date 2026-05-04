import { useState } from "react";
import { Mail, Phone, MapPin, Check } from "lucide-react";
import { Link } from "react-router";
import { useI18n } from "../i18n/I18nProvider";

export const Contact = () => {
  const { t } = useI18n();
  const [accepted, setAccepted] = useState(false);

  return (
    <section
      id="contact"
      className="relative py-32 bg-[#0f2618] overflow-hidden"
    >
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#114232] rounded-full blur-[100px] opacity-50" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#87A922] rounded-full blur-[120px] opacity-20" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-6 block">
              {t("contact.eyebrow")}
            </span>
            <h2 className="text-5xl md:text-7xl font-light text-white leading-tight mb-8">
              {t("contact.title.1")} <br />{" "}
              <span className="font-serif italic text-white/80">
                {t("contact.title.italic")}
              </span>
            </h2>
            <p className="text-white/60 text-lg mb-12 max-w-md">
              Notre équipe d'experts est à votre disposition pour étudier vos
              besoins et vous proposer des solutions sur-mesure.
            </p>

            <div className="space-y-8">
              <a
                href="tel:+213661391012"
                className="flex items-center gap-6 group"
              >
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-[#87A922] group-hover:border-transparent transition-all">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1 uppercase tracking-wider">
                    {t("contact.phone.label")}
                  </div>
                  <div className="text-white text-xl font-light">
                    +213 661 391 012
                  </div>
                </div>
              </a>

              <a
                href="mailto:contact@agroespace.com"
                className="flex items-center gap-6 group"
              >
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-[#87A922] group-hover:border-transparent transition-all">
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
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-[#87A922] group-hover:border-transparent transition-all">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1 uppercase tracking-wider">
                    Siège
                  </div>
                  <div className="text-white text-xl font-light">
                    Bordj El Kifane, Alger
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-3xl">
            <h3 className="text-2xl text-white mb-8 font-medium">
              {t("contact.form.title")}
            </h3>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (!accepted) return;
                const form = new FormData(e.currentTarget);
                const message = `Bonjour AGROESPACE,%0A%0AJe suis ${form.get("name") ?? ""} (${form.get("company") ?? ""}).%0ATéléphone : ${form.get("phone") ?? ""}%0AEmail : ${form.get("email") ?? ""}%0A%0A${form.get("message") ?? ""}`;
                window.open(
                  `https://wa.me/213552498687?text=${message}`,
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
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[#87A922] transition-colors"
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
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[#87A922] transition-colors"
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
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[#87A922] transition-colors"
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
                    className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[#87A922] transition-colors"
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
                  className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white focus:outline-none focus:border-[#87A922] transition-colors resize-none"
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
                  <Check className="w-3 h-3 text-[#87A922] opacity-0 peer-checked:opacity-100 transition-opacity" />
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
                className="w-full bg-[#87A922] hover:bg-[#6c871b] text-white py-4 rounded-xl font-medium tracking-wide transition-colors mt-4 disabled:opacity-50"
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
