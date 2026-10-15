import { Maximize2, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuestionImage } from "@/types";

interface ImageGalleryProps {
  images?: QuestionImage[];
  title?: string;
}

export function ImageGallery({ images, title = "Question Clue" }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<QuestionImage | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-3 ${
          images.length === 1
            ? "grid-cols-1 max-w-md mx-auto"
            : images.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {images.map((img, idx) => (
          <div
            key={img.id || idx}
            onClick={() => setSelectedImage(img)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-navy-900/60 transition-all hover:border-accent-blue/80 hover:shadow-lg"
          >
            <div className="aspect-video w-full overflow-hidden bg-navy-950 flex items-center justify-center">
              {img.dataUrl ? (
                <img
                  src={img.dataUrl}
                  alt={img.caption || `Clue ${idx + 1}`}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback placeholder if image fails to render
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement?.classList.add("fallback-error");
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted p-4">
                  <ImageIcon className="h-8 w-8 mb-1" />
                  <span className="text-xs">Image unavailable</span>
                </div>
              )}
            </div>

            <div className="absolute inset-0 bg-navy-950/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-navy-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
                <Maximize2 className="h-3.5 w-3.5" />
                Tap to Enlarge
              </span>
            </div>

            {img.caption && (
              <div className="p-2 text-center text-xs text-muted truncate border-t border-border/40">
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Accessible Enlarge Dialog */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="w-[min(94vw,44rem)] p-4 max-h-[90vh] flex flex-col items-center">
          {selectedImage && (
            <>
              <DialogHeader className="w-full text-left">
                <DialogTitle className="text-sm font-semibold truncate">
                  {selectedImage.caption || title}
                </DialogTitle>
              </DialogHeader>
              <div className="my-2 flex-1 w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-navy-950 p-2">
                <img
                  src={selectedImage.dataUrl}
                  alt={selectedImage.caption || "Enlarged clue"}
                  className="max-h-[68vh] max-w-full object-contain rounded-lg"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
