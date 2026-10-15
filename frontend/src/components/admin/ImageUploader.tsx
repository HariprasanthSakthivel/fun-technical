/**
 * ImageUploader — drag-and-drop / click-to-upload image list with
 * preview, reordering, and validation.
 *
 * Stores images as base64 data-URLs (browser session only; no server upload yet).
 */
import { ImageIcon, MoveDown, MoveUp, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { QuestionImage } from "@/types";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES = 8;

interface ImageUploaderProps {
  images: QuestionImage[];
  onChange: (images: QuestionImage[]) => void;
  maxImages?: number;
  label?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUploader({
  images,
  onChange,
  maxImages = MAX_IMAGES,
  label = "Upload images",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function processFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newErrors: string[] = [];
    const newImages: QuestionImage[] = [];

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      setErrors([`Maximum ${maxImages} images allowed.`]);
      return;
    }

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!ACCEPTED_TYPES.includes(file.type)) {
        newErrors.push(`"${file.name}": unsupported type (use PNG, JPG, or WebP)`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        newErrors.push(`"${file.name}": exceeds 5 MB limit (${formatBytes(file.size)})`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        newImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          dataUrl,
          size: file.size,
          mimeType: file.type,
        });
      } catch {
        newErrors.push(`"${file.name}": could not read file`);
      }
    }

    setErrors(newErrors);
    if (newImages.length > 0) onChange([...images, ...newImages]);
  }

  function handleRemove(id: string) {
    onChange(images.filter((img) => img.id !== id));
  }

  function handleMove(index: number, direction: "up" | "down") {
    const next = [...images];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  const canAdd = images.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
          dragOver
            ? "border-accent-blue bg-accent-blue/10"
            : canAdd
            ? "border-border hover:border-accent-blue/50 hover:bg-navy-800/40"
            : "cursor-not-allowed border-border/40 opacity-50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (canAdd) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (canAdd) void processFiles(e.dataTransfer.files);
        }}
        onClick={() => canAdd && inputRef.current?.click()}
        role="button"
        tabIndex={canAdd ? 0 : -1}
        aria-label={label}
        onKeyDown={(e) => e.key === "Enter" && canAdd && inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-muted" aria-hidden />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {canAdd ? "Click or drag images here" : `Maximum ${maxImages} images reached`}
          </p>
          <p className="text-xs text-muted">
            PNG, JPG, JPEG, WebP · Max {formatBytes(MAX_SIZE_BYTES)} per file
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => void processFiles(e.target.files)}
          aria-hidden
        />
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((err, i) => (
            <li key={i} className="text-xs text-danger">
              {err}
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-navy-900/30 px-4 py-3 text-sm text-muted">
          <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
          No images uploaded yet. Add images above.
        </div>
      )}

      {/* Image list */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            {images.length} / {maxImages} images
          </p>
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-navy-900/50 p-2"
            >
              {/* Thumbnail */}
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-navy-800">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-full w-full object-cover"
                  aria-label={`Preview of ${img.name}`}
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{img.name}</p>
                <p className="text-xs text-muted">{formatBytes(img.size)}</p>
                <p className="text-xs text-muted">Position {idx + 1}</p>
              </div>

              {/* Controls */}
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMove(idx, "up")}
                  disabled={idx === 0}
                  title="Move up"
                  type="button"
                >
                  <MoveUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMove(idx, "down")}
                  disabled={idx === images.length - 1}
                  title="Move down"
                  type="button"
                >
                  <MoveDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted hover:text-danger"
                onClick={() => handleRemove(img.id)}
                title="Remove image"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Gallery preview (multiple images) */}
      {images.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            Gallery preview (participant order)
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((img, idx) => (
              <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-navy-800">
                <img
                  src={img.dataUrl}
                  alt={`Image ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 right-1 rounded bg-navy-950/70 px-1.5 py-0.5 text-[10px] text-foreground">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
