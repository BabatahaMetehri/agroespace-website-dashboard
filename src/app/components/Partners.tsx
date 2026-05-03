import { partners } from '../data/partners';
import { useI18n } from '../i18n/I18nProvider';

export const Partners = () => {
  const { t } = useI18n();

  return (
    <section className="relative py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <span className="text-[#114232] uppercase tracking-[0.2em] text-sm font-semibold mb-3 block">
              {t('partners.eyebrow')}
            </span>
            <h2 className="text-4xl md:text-5xl font-light text-[#0f2618] leading-tight max-w-2xl">
              {t('partners.title.1')}{' '}
              <span className="font-serif italic text-[#4a7856]">{t('partners.title.italic')}</span>{' '}
              {t('partners.title.2')}
            </h2>
          </div>
          <p className="text-gray-500 max-w-md">
            Western, Alkhorayef, Komet, Nelson, Senninger, UMC – des partenaires sélectionnés pour leur fiabilité éprouvée sur le terrain algérien.
          </p>
        </div>
      </div>

      {/* Single row on desktop (6 cols), 3 cols on tablet, 2 on mobile */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-6 lg:gap-x-8 gap-y-10 items-center justify-items-center">
          {partners.map((p) => (
            <div
              key={p.name}
              className="group flex flex-col items-center justify-center w-full"
            >
              <div className="h-14 md:h-16 lg:h-20 flex items-center justify-center w-full">
                <img
                  src={p.logo}
                  alt={p.name}
                  className="max-h-full max-w-[140px] object-contain grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all duration-500"
                />
              </div>
              {p.tag && (
                <span className="mt-3 text-[11px] uppercase tracking-[0.25em] text-gray-400 group-hover:text-[#4a7856] transition-colors text-center">
                  {p.tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
