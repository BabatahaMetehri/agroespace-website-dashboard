import { partners } from '../data/partners';
import { useI18n } from '../i18n/I18nProvider';
import { Marquee } from './fx/Marquee';

export const Partners = () => {
  const { t } = useI18n();

  return (
    <section className="relative py-28 bg-paper overflow-hidden grain">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-14 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="h-px w-10 bg-sage/40" aria-hidden />
              <span className="text-pine uppercase tracking-[0.2em] text-sm font-semibold">
                {t('partners.eyebrow')}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-light text-forest leading-tight max-w-2xl">
              {t('partners.title.1')}{' '}
              <span className="italic text-sage">{t('partners.title.italic')}</span>{' '}
              {t('partners.title.2')}
            </h2>
          </div>
          <p className="text-gray-500 max-w-md">{t('partners.desc')}</p>
        </div>
      </div>

      {/* Living logo band — continuous marquee between hairlines */}
      <div className="relative z-10 border-y border-pine/10">
        <Marquee speed={38} className="py-10">
          {partners.map((p) => (
            <div
              key={p.name}
              className="group flex flex-col items-center justify-center shrink-0 mx-12 lg:mx-16"
            >
              <div className="h-14 md:h-16 flex items-center justify-center">
                <img
                  src={p.logo}
                  alt={p.name}
                  className="max-h-full max-w-[150px] object-contain grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-500"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              {p.tag && (
                <span className="mt-3 text-[10px] uppercase tracking-[0.25em] text-gray-400 group-hover:text-sage transition-colors text-center whitespace-nowrap">
                  {p.tag}
                </span>
              )}
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
};
