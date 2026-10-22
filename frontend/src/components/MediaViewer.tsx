import React, { useState } from "react";
import { getFullMediaUrl } from "@/services/api";
import {
  Volume2,
  Video as VideoIcon,
  Image as ImageIcon,
  ExternalLink,
  Maximize2,
  X,
  Play,
} from "lucide-react";

interface MediaViewerProps {
  mediaUrl?: string | null;
  mediaType?: string | null;
  title?: string;
  className?: string;
  compact?: boolean;
}

/** Extracts YouTube video ID from various URL structures */
function getYouTubeVideoId(url: string): string | null {
  try {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch {
    return null;
  }
}

/** Auto-detects media type from URL extension or protocol */
export function detectMediaType(
  url?: string | null,
  specifiedType?: string | null
): "image" | "audio" | "video" | "youtube" | "none" {
  if (!url || !url.trim()) return "none";
  if (specifiedType && specifiedType !== "none") {
    return specifiedType as "image" | "audio" | "video" | "youtube";
  }

  const clean = url.trim().toLowerCase();
  if (clean.includes("youtube.com") || clean.includes("youtu.be")) {
    return "youtube";
  }
  if (
    clean.endsWith(".mp3") ||
    clean.endsWith(".wav") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".m4a") ||
    clean.endsWith(".aac") ||
    clean.endsWith(".flac") ||
    clean.startsWith("data:audio")
  ) {
    return "audio";
  }
  if (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".avi") ||
    clean.startsWith("data:video")
  ) {
    return "video";
  }
  if (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".svg") ||
    clean.startsWith("data:image")
  ) {
    return "image";
  }

  return "image";
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  mediaUrl,
  mediaType,
  title = "Challenge Media",
  className = "",
  compact = false,
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (!mediaUrl || !mediaUrl.trim()) {
    return null;
  }

  const resolvedType = detectMediaType(mediaUrl, mediaType);
  const fullUrl = getFullMediaUrl(mediaUrl);

  // 1. YouTube Video Embed
  if (resolvedType === "youtube") {
    const videoId = getYouTubeVideoId(fullUrl);
    if (!videoId) {
      return (
        <div className={`p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center ${className}`}>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" /> Open Video Link ({title})
          </a>
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono px-1">
          <span className="flex items-center gap-1 text-red-400">
            <VideoIcon className="w-3.5 h-3.5" /> Video Stream
          </span>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            Open in YouTube <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // 2. Audio Challenge Player
  if (resolvedType === "audio") {
    return (
      <div
        className={`p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-900/40 shadow-2xl space-y-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wide">Audio Clue / Mystery Sound</p>
              <p className="text-[10px] font-mono text-zinc-400">Listen carefully and identify the sound</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
            Sound Track
          </span>
        </div>

        <div className="bg-black/60 p-2.5 rounded-xl border border-zinc-800">
          <audio controls className="w-full accent-amber-500">
            <source src={fullUrl} />
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    );
  }

  // 3. HTML5 Video Player
  if (resolvedType === "video") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
          <video
            controls
            playsInline
            preload="metadata"
            className={`w-full ${compact ? "max-h-60" : "max-h-[440px]"} object-contain mx-auto`}
          >
            <source src={fullUrl} />
            Your browser does not support HTML5 video.
          </video>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 px-1">
          <span className="flex items-center gap-1.5 text-blue-400">
            <Play className="w-3.5 h-3.5" /> Video Challenge
          </span>
          <span className="text-zinc-500">Fullscreen available</span>
        </div>
      </div>
    );
  }

  // 4. Image Clue Display
  return (
    <>
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div
          onClick={() => setIsZoomOpen(true)}
          className={`group relative rounded-2xl overflow-hidden border border-zinc-800 bg-black cursor-pointer hover:border-zinc-500 transition-all shadow-2xl ${
            compact ? "max-h-48" : "max-h-[440px]"
          } max-w-2xl w-full flex items-center justify-center p-2.5`}
        >
          <img
            src={fullUrl}
            alt={title}
            className={`w-full ${
              compact ? "max-h-44" : "max-h-[400px]"
            } object-contain group-hover:scale-[1.01] transition-transform duration-300 rounded-xl`}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-2xl">
            <span className="text-xs font-mono font-bold text-white bg-black/80 px-3.5 py-1.5 rounded-full border border-zinc-700 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              Click to Zoom Image
            </span>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-2 flex items-center gap-1">
          <ImageIcon className="w-3 h-3 text-zinc-400" /> Image Clue
        </p>
      </div>

      {/* Lightbox Zoom Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white font-mono">{title}</h4>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={fullUrl}
                alt={title}
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
