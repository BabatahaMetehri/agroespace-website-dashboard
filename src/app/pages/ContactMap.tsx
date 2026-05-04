import { useState } from 'react';
import { Link } from 'react-router';
import { MapPin, Phone, ChevronDown, Check, Mail, ArrowUpRight, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { agencies } from '../data/agencies';
import { useI18n } from '../i18n/I18nProvider';

const faq: { q: { fr: string; ar: string; en: string }; a: { fr: string; ar: string; en: string } }[] = [
  {
    q: {
      fr: 'Le transport et le montage sont-ils inclus ?',
      ar: 'هل النقل والتركيب مشمولان؟',
      en: 'Are transport and assembly included?',
    },
    a: {
      fr: 'Oui. Tous nos pivots Western sont livrés et montés par nos équipes jusqu\'au démarrage et à la première rotation.',
      ar: 'نعم. تُسلَّم محاور Western وتُركَّب من طرف فرقنا حتى أول دوران.',
      en: 'Yes. All our Western pivots are delivered and assembled by our teams up to first rotation.',
    },
  },
  {
    q: {
      fr: 'Quelle est la garantie sur les pivots ?',
      ar: 'ما مدة الضمان على المحاور؟',
      en: 'What warranty do you offer on pivots?',
    },
    a: {
      fr: 'Garantie 1 an pièces et main-d\'œuvre, avec un service après-vente assuré par nos ingénieurs.',
      ar: 'ضمان سنة على القطع واليد العاملة مع خدمة ما بعد البيع من قِبَل مهندسينا.',
      en: '1-year parts-and-labor warranty, with after-sales handled by our engineers.',
    },
  },
  {
    q: {
      fr: 'Vendez-vous d\'autres types de pivots ?',
      ar: 'هل تبيعون أنواعاً أخرى من المحاور؟',
      en: 'Do you sell other types of pivots?',
    },
    a: {
      fr: "Non. Nous nous concentrons exclusivement sur les pivots centraux pour offrir la meilleure qualité d'installation et de suivi.",
      ar: 'لا. نُركز فقط على المحاور المركزية لضمان أفضل جودة تركيب ومتابعة.',
      en: "No. We focus exclusively on central pivots to deliver the best install and follow-up quality.",
    },
  },
  {
    q: {
      fr: 'Comment passer une commande de pièces détachées ?',
      ar: 'كيف نطلب قطع غيار؟',
      en: 'How can I order spare parts?',
    },
    a: {
      fr: "Contactez l'agence la plus proche par téléphone ou WhatsApp, ou utilisez le formulaire de cette page : nous revenons vers vous sous 24 h.",
      ar: 'تواصلوا مع أقرب وكالة هاتفياً أو عبر واتساب، أو استخدموا النموذج المتوفر هنا.',
      en: "Contact the nearest agency by phone or WhatsApp, or use the form on this page: we get back to you within 24h.",
    },
  },
];

const PRODUCT_OPTIONS: { value: string; fr: string; ar: string; en: string }[] = [
  { value: 'pivot', fr: 'Système Pivot Central', ar: 'نظام المحور المركزي', en: 'Central Pivot System' },
  { value: 'fertilization', fr: 'Fertilisation', ar: 'التسميد', en: 'Fertilization' },
  { value: 'parts', fr: 'Pièces détachées', ar: 'قطع غيار', en: 'Spare parts' },
  { value: 'other', fr: 'Autre', ar: 'أخرى', en: 'Other' },
];

export const ContactMap = () => {
  const { t, lang } = useI18n();
  const [selectedId, setSelectedId] = useState(agencies[0].id);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selected = agencies.find((a) => a.id === selectedId)!;
  const mapEmbedUrl = `https://www.google.com/maps?q=${selected.embedQuery}&output=embed`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accepted) {
      toast.error(lang === 'ar' ? 'يرجى قبول الشروط.' : lang === 'en' ? 'Please accept the terms.' : 'Merci d\'accepter les conditions.');
      return;
    }
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string ?? '';
    const phone = form.get('phone') as string ?? '';
    const product = form.get('product') as string ?? '';
    const message = form.get('message') as string ?? '';
    const email = form.get('email') as string ?? '';

    setSubmitting(true);

    // POST to Formspree for email CC
    try {
      await fetch('https://formspree.io/f/xvgaybny', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          product,
          agency: selected.city,
          message,
        }),
      }).catch(() => null);
    } catch {
      // best-effort, don't block WA
    } finally {
      setSubmitting(false);
    }

    const text = `Bonjour AGROESPACE,%0A%0AJe suis ${name} (${phone}).%0AAgence souhaitée : ${selected.city}.%0AProduit : ${product}%0A%0A${message}`;
    window.open(`https://wa.me/213552498687?text=${text}`, '_blank');
    toast.success(
      lang === 'ar' ? 'تم إرسال الطلب' : lang === 'en' ? 'Request sent' : 'Demande enregistrée',
      { description: lang === 'ar' ? 'سنوجّهك إلى واتساب...' : lang === 'en' ? 'Redirecting to WhatsApp...' : 'Nous vous redirigeons vers WhatsApp...' }
    );
  };

  const productPlaceholder = lang === 'ar' ? 'المنتج المطلوب...' : lang === 'en' ? 'Product of interest...' : 'Produit d\'intérêt...';
  const namePlaceholder = t('contact.name.placeholder');
  const phonePlaceholder = t('contact.phone.placeholder');
  const emailPlaceholder = t('contact.email.placeholder');
  const messagePlaceholder = lang === 'ar' ? 'مشروعكم' : lang === 'en' ? 'Your project' : 'Votre projet';

  return (
    <div className="bg-[#0a1c12] text-white" style={{ position: 'relative' }}>
      {/* Header */}
      <section className="relative pt-32 pb-16 bg-[#0f2618] overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-[#114232] blur-[120px] opacity-50" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
            {t('contact.eyebrow')}
          </span>
          <h1 className="text-4xl md:text-6xl font-light text-white leading-tight max-w-3xl">
            {t('contact.title.1')}{' '}
            <span className="font-serif italic text-white/85">{t('contact.title.italic')}</span>
          </h1>
        </div>
      </section>

      {/* Form + Map */}
      <section className="bg-[#0a1c12] py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-[#0f2618] rounded-3xl p-8 md:p-12 border border-white/5">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                required
                placeholder={namePlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922] focus:bg-white/10 transition-all"
              />
              <input
                type="tel"
                name="phone"
                required
                placeholder={phonePlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922] focus:bg-white/10 transition-all"
              />
              <input
                type="email"
                name="email"
                placeholder={emailPlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922] focus:bg-white/10 transition-all"
              />

              <div className="relative">
                <select
                  name="product"
                  required
                  defaultValue=""
                  className="w-full appearance-none bg-[#114232] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#87A922] transition-all"
                >
                  <option value="" disabled className="bg-[#114232] text-white/50">
                    {productPlaceholder}
                  </option>
                  {PRODUCT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#114232] text-white">
                      {o[lang]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
              </div>

              <textarea
                name="message"
                rows={4}
                placeholder={messagePlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922] focus:bg-white/10 transition-all resize-none"
              />

              <label className="flex items-start gap-3 py-2 cursor-pointer">
                <span className="mt-1 relative flex items-center justify-center w-5 h-5 rounded border border-white/30 bg-transparent flex-shrink-0">
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
                  {t('contact.consent')}{' '}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    {t('contact.terms')}
                  </a>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting || !accepted}
                className="w-full bg-[#25D366] hover:bg-[#1fad53] text-white rounded-2xl px-6 py-5 font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(37,211,102,0.2)] disabled:opacity-60"
              >
                <Phone className="w-5 h-5" fill="currentColor" />
                {t('contact.send.whatsapp')}
              </button>
            </form>
          </div>

          {/* Map */}
          <div className="relative bg-[#0f2618] rounded-3xl border border-white/5 overflow-hidden min-h-[520px]">
            <div className="absolute top-6 left-6 right-6 z-20">
              <button
                onClick={() => setOpenDropdown((o) => !o)}
                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-4 flex items-center justify-between text-white shadow-2xl"
              >
                <span className="flex items-center gap-3 text-start">
                  <MapPin className="w-5 h-5 text-[#87A922] flex-shrink-0" />
                  <span className="font-medium truncate">{selected.fullCity[lang]}</span>
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${openDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {openDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-2 bg-[#114232] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                  >
                    {agencies.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedId(a.id);
                          setOpenDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-5 py-4 text-start text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 ${
                          a.id === selectedId ? 'bg-white/5' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium">{a.fullCity[lang]}</div>
                          <div className="text-xs text-white/50 mt-0.5">{a.phoneDisplay}</div>
                        </div>
                        {a.id === selectedId && <Check className="w-4 h-4 text-[#87A922]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <iframe
              key={selected.id}
              src={mapEmbedUrl}
              title={`Map ${selected.city}`}
              className="absolute inset-0 w-full h-full grayscale-[35%] contrast-110"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />

            <div className="absolute bottom-6 left-6 right-6 z-20 bg-[#0f2618]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="text-white">
                  <div className="font-semibold">{selected.city}</div>
                  <div className="text-white/60 text-sm">{selected.address[lang]}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white text-white hover:text-[#0f2618] rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> {selected.phoneDisplay}
                  </a>
                  <a
                    href={selected.map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors"
                  >
                    {t('agencies.itinerary')}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Big agency cards */}
      <section className="bg-[#0a1c12] pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-12">
            {t('agencies.title.1')}{' '}
            <span className="font-serif italic text-white/80">{t('agencies.title.italic')}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agencies.map((a) => (
              <div
                key={a.id}
                className={`group bg-[#0f2618] rounded-3xl p-8 border ${
                  a.id === selectedId ? 'border-[#87A922]/40' : 'border-white/5'
                } hover:border-white/20 transition-all duration-500`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-medium text-white">{a.fullCity[lang]}</h3>
                      <span className="text-[10px] uppercase tracking-[0.15em] font-semibold bg-[#87A922]/15 text-[#87A922] px-2 py-0.5 rounded-full">
                        {a.type[lang]}
                      </span>
                    </div>
                    <p className="text-white/55 text-sm">{a.address[lang]}</p>
                  </div>
                  <button
                    onClick={() => setSelectedId(a.id)}
                    className={`text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 rounded-full transition-colors flex-shrink-0 ${
                      a.id === selectedId
                        ? 'bg-[#87A922] text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {a.id === selectedId
                      ? lang === 'ar' ? 'مختارة' : lang === 'en' ? 'Selected' : 'Sélectionnée'
                      : lang === 'ar' ? 'على الخريطة' : lang === 'en' ? 'View on map' : 'Voir sur la carte'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                  <a
                    href={`tel:${a.phone}`}
                    className="flex items-center gap-2 text-white/80 hover:text-white text-sm"
                  >
                    <Phone className="w-4 h-4 text-[#87A922]" /> {a.phoneDisplay}
                  </a>
                  <a
                    href={`https://wa.me/${a.phone.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#25D366] hover:text-white text-sm font-semibold"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={a.map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white text-sm font-semibold flex items-center gap-1.5"
                  >
                    {t('agencies.itinerary')}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f4f7f5] text-[#0f2618] py-24">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <h2 className="text-4xl md:text-5xl font-light mb-12 text-center">
            {t('faq.title.1')}{' '}
            <span className="font-serif italic text-[#4a7856]">{t('faq.title.italic')}</span>
          </h2>

          <div className="space-y-3">
            {faq.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[#0f2618]/5 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-start"
                  >
                    <span className="font-medium text-[#0f2618]">{item.q[lang]}</span>
                    {open ? (
                      <Minus className="w-5 h-5 text-[#87A922] flex-shrink-0" />
                    ) : (
                      <Plus className="w-5 h-5 text-[#0f2618]/40 flex-shrink-0" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 text-gray-600 leading-relaxed">{item.a[lang]}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-[#0f2618] py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <Mail className="w-10 h-10 text-[#87A922] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4">{t('newsletter.title')}</h2>
          <p className="text-white/60 mb-8">{t('newsletter.subtitle')}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const email = new FormData(e.currentTarget).get('email') as string;
              if (!email) return;
              try {
                await fetch('https://formspree.io/f/mgvkqljp', {
                  method: 'POST',
                  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });
              } catch {
                // best-effort
              }
              toast.success(
                lang === 'ar' ? 'شكراً!' : lang === 'en' ? 'Thank you!' : 'Merci !',
                { description: lang === 'ar' ? `تم تسجيل ${email}` : lang === 'en' ? `Subscribed: ${email}` : `Inscription enregistrée pour ${email}` }
              );
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              name="email"
              required
              placeholder={t('newsletter.placeholder')}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
            />
            <button
              type="submit"
              className="bg-[#87A922] hover:bg-[#6c871b] text-white rounded-full px-7 py-4 font-bold uppercase tracking-[0.1em] text-sm transition-colors"
            >
              {t('newsletter.submit')}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
