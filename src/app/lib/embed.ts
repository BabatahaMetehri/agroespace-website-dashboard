// Tiny URL → embed parser. Accepts whatever the user pastes from YouTube,
// Vimeo, or a direct file URL on Cloudinary / Supabase Storage.
//
// Returned `src` is safe to drop into an <iframe> (for youtube/vimeo) or a
// <video> tag (for video). For unknown URLs we let the caller decide.

export type EmbedKind = 'youtube' | 'vimeo' | 'video' | 'unknown';
export type Embed = { kind: EmbedKind; src: string; original: string };

export function parseEmbed(url: string): Embed {
  const trimmed = url.trim();
  if (!trimmed) return { kind: 'unknown', src: '', original: '' };

  // YouTube — watch?v=, youtu.be/, embed/, shorts/
  const yt = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  if (yt) {
    return {
      kind: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`,
      original: trimmed,
    };
  }

  // Vimeo — vimeo.com/123, player.vimeo.com/video/123
  const vm = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return {
      kind: 'vimeo',
      src: `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0`,
      original: trimmed,
    };
  }

  // Direct video file (Cloudinary, Supabase Storage, S3, etc.)
  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return { kind: 'video', src: trimmed, original: trimmed };
  }

  return { kind: 'unknown', src: trimmed, original: trimmed };
}
