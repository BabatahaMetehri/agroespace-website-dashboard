import { parseEmbed } from '../../lib/embed';

export const VideoEmbed = ({ url, title }: { url: string; title?: string }) => {
  const embed = parseEmbed(url);
  if (!embed.src) return null;

  if (embed.kind === 'youtube' || embed.kind === 'vimeo') {
    return (
      <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
        <iframe
          src={embed.src}
          title={title ?? 'Vidéo'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (embed.kind === 'video') {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        className="w-full aspect-video rounded-3xl bg-black object-cover shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
      >
        <source src={embed.src} />
      </video>
    );
  }

  // Unknown URL — render as a fallback link rather than failing silently.
  return (
    <a
      href={embed.original}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block bg-[#0f2618]/5 border border-[#0f2618]/10 rounded-2xl px-5 py-4 text-[#0f2618] hover:bg-[#0f2618]/10 transition-colors"
    >
      Ouvrir la vidéo : {embed.original}
    </a>
  );
};
