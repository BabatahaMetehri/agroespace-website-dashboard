import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export const BlogGallery = ({ images }: { images: string[] }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (images.length === 0) return null;

  return (
    <section className="my-12">
      <div className="text-xs uppercase tracking-[0.18em] text-[#87A922] font-semibold mb-4">
        Galerie
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-3xl bg-black/40" ref={emblaRef}>
          <div className="flex">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(i)}
                className="flex-[0_0_100%] min-w-0 flex items-center justify-center max-h-[70vh]"
              >
                <img
                  src={src}
                  alt={`Galerie ${i + 1}`}
                  className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-colors"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-colors"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? 'w-8 bg-[#87A922]' : 'w-2 bg-[#0f2618]/20 hover:bg-[#0f2618]/40'
              }`}
              aria-label={`Aller à l'image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={images[lightbox]}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};
