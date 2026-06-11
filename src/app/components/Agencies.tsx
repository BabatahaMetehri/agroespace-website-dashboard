import { motion } from 'motion/react';
import { MapPin, Phone, ArrowUpRight } from 'lucide-react';
import { agencies } from '../data/agencies';
import { useI18n } from '../i18n/I18nProvider';

/** City-level survey coordinates — decorative, engineering-drawing flavour. */
const coords: Record<string, string> = {
  alger: '36.75°N · 3.21°E',
  ghardaia: '32.49°N · 3.67°E',
  'el-meniaa': '30.58°N · 2.88°E',
  adrar: '27.87°N · 0.29°W',
};

export const Agencies = () => {
  const { t, lang } = useI18n();

  return (
    <section className="relative py-32 bg-paper grain" style={{ position: 'relative' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="h-px w-10 bg-sage/40" aria-hidden />
              <span className="text-pine uppercase tracking-[0.2em] text-sm font-semibold">
                {t('agencies.eyebrow')}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-light text-forest leading-tight max-w-2xl">
              {t('agencies.title.1')}{' '}
              <span className="italic text-sage">{t('agencies.title.italic')}</span>
            </h2>
          </div>
          <p className="text-gray-600 max-w-md">{t('agencies.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agencies.map((a, idx) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: idx * 0.08, duration: 0.6 }}
              className="group bg-white rounded-3xl p-8 border border-pine/10 shadow-[0_15px_40px_rgba(15,38,24,0.04)] hover:shadow-[0_25px_60px_rgba(15,38,24,0.1)] hover:-translate-y-1 hover:border-lime/40 transition-all duration-500 flex flex-col"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-paper border border-pine/10 flex items-center justify-center group-hover:bg-lime group-hover:border-transparent transition-colors duration-500">
                  <MapPin className="w-5 h-5 text-pine group-hover:text-white transition-colors duration-500" />
                </div>
                {coords[a.id] && (
                  <span dir="ltr" className="font-mono text-[10px] text-gray-400 tracking-wider pt-1">
                    {coords[a.id]}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-display font-semibold text-forest mb-1">{a.city}</h3>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                {a.address[lang]}
              </p>

              <a
                href={`tel:${a.phone}`}
                className="text-forest font-medium flex items-center gap-2 mb-3 hover:text-lime transition-colors"
              >
                <Phone className="w-4 h-4 text-lime" /> {a.phoneDisplay}
              </a>

              <div className="mt-auto pt-5 border-t border-pine/10 flex items-center justify-between">
                <a
                  href={a.map}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-sage hover:text-forest transition-colors flex items-center gap-1.5"
                >
                  {t('agencies.itinerary')}
                  <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
                </a>
                <a
                  href={`https://wa.me/${a.phone.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white transition-colors flex items-center justify-center"
                  aria-label={`WhatsApp ${a.city}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.012 2C6.506 2 2.023 6.474 2.015 11.97C2.011 13.722 2.474 15.42 3.336 16.92L2.006 21.758L6.963 20.457C8.423 21.246 10.16 21.666 11.996 21.666H12.012C17.514 21.666 22.002 17.191 22.008 11.696C22.011 9.027 20.975 6.52 19.088 4.63C17.201 2.739 14.686 1.705 12.012 2Z" />
                  </svg>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
