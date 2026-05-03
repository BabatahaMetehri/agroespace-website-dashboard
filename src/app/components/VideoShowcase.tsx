import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { parseEmbed } from "../lib/embed";

// Drop a YouTube / Vimeo / .mp4 URL here once the real promo video is
// uploaded. While `videoUrl` is null the component keeps its placeholder
// behaviour (cover image + fake play button) so the layout never breaks.
const videoUrl: string | null = "https://www.youtube.com/watch?v=lVet82JVA3s";

const cover = "https://i.ibb.co/9HTdBChj/montage-pivot-haute-resolution.jpg";

export const VideoShowcase = () => {
  const containerRef = useRef(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.9]);

  const embed = videoUrl ? parseEmbed(videoUrl) : null;

  const togglePlay = () => {
    setIsPlaying((p) => !p);
    if (embed?.kind === "video" && videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    setIsMuted((m) => !m);
    if (embed?.kind === "video" && videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  return (
    <section
      ref={containerRef}
      style={{ position: "relative" }}
      className="py-32 bg-[#0f2618] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-16 text-center">
        <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
          Notre Méthode
        </span>
        <h2 className="text-4xl md:text-5xl font-light text-white leading-tight">
          L'excellence en{" "}
          <span className="font-serif italic text-white/80">action</span>
        </h2>
      </div>

      <motion.div
        style={{ scale }}
        className="w-full max-w-[95%] md:max-w-7xl mx-auto aspect-video md:aspect-[21/9] bg-black rounded-3xl overflow-hidden shadow-2xl relative group"
      >
        {/* Real embed when videoUrl is configured. */}
        {embed?.kind === "youtube" && isPlaying && (
          <iframe
            src={`${embed.src}&autoplay=1&mute=${isMuted ? 1 : 0}`}
            title="AGROESPACE — Notre méthode"
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}
        {embed?.kind === "vimeo" && isPlaying && (
          <iframe
            src={`${embed.src}&autoplay=1&muted=${isMuted ? 1 : 0}`}
            title="AGROESPACE — Notre méthode"
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}
        {embed?.kind === "video" && (
          <video
            ref={videoRef}
            src={embed.src}
            poster={cover}
            playsInline
            muted={isMuted}
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Cover image — visible until a real iframe plays. */}
        {(!embed || (embed.kind !== "video" && !isPlaying)) && (
          <>
            <div className="absolute inset-0 transition-opacity duration-700 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <img
              src={cover}
              alt="Agriculture Drone View"
              className={`w-full h-full object-cover transition-all duration-1000 ${
                isPlaying ? "scale-105 opacity-80" : "scale-100 opacity-100"
              }`}
            />
          </>
        )}

        {/* Play button overlay. Hidden once an iframe is playing — YouTube
            and Vimeo come with their own controls. */}
        {(!isPlaying || embed?.kind === "video") && (
          <div
            className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 ${
              isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}
          >
            <button
              onClick={togglePlay}
              className="w-24 h-24 bg-white/10 backdrop-blur-md hover:bg-[#87A922] text-white border border-white/20 hover:border-transparent rounded-full flex items-center justify-center transition-all shadow-[0_0_50px_rgba(0,0,0,0.3)]"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 ml-1" />
              ) : (
                <Play className="w-10 h-10 ml-2" />
              )}
            </button>
          </div>
        )}

        {/* Caption + mute toggle. Hidden once an iframe is playing so it
            doesn't cover YT/Vimeo's own UI. */}
        {(!isPlaying || embed?.kind === "video") && (
          <div
            className={`absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between z-30 transition-opacity duration-300 ${
              isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}
          >
            <div>
              <h3 className="text-2xl md:text-3xl font-medium text-white mb-2">
                Pivots WESTERN
              </h3>
              <p className="text-white/70">
                Vue aérienne par drone — Installation au Sud Algérien
              </p>
            </div>

            <button
              onClick={toggleMute}
              className="w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
              aria-label={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </motion.div>
    </section>
  );
};
