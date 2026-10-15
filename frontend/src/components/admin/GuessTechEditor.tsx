/**
 * GuessTechEditor — question content editor for "Guess the Technology" game.
 * Handles text, image, multiple-image, and text+image question types.
 */
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ContentType, Question, QuestionImage } from "@/types";

interface GuessTechEditorProps {
  values: Partial<Question>;
  onChange: (updates: Partial<Question>) => void;
  errors: Partial<Record<string, string>>;
}

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; description: string }[] = [
  { value: "text", label: "Text clue", description: "Show text clues or a code snippet" },
  { value: "image", label: "Single image", description: "Show one image for identification" },
  { value: "multiple-images", label: "Multiple images", description: "Show several images in sequence" },
  { value: "text-images", label: "Text + images", description: "Combine text clues with images" },
];

export function GuessTechEditor({ values, onChange, errors }: GuessTechEditorProps) {
  const ct = values.contentType ?? "text";
  const showText = ct === "text" || ct === "text-images";
  const showImages = ct === "image" || ct === "multiple-images" || ct === "text-images";

  return (
    <div className="space-y-6">
      {/* Content type selector */}
      <div className="space-y-2">
        <Label>Content Type *</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTENT_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                ct === opt.value
                  ? "border-accent-blue/60 bg-accent-blue/10"
                  : "border-border hover:border-border/80 hover:bg-navy-800/40"
              }`}
            >
              <input
                type="radio"
                name="contentType"
                value={opt.value}
                checked={ct === opt.value}
                onChange={() => onChange({ contentType: opt.value as ContentType })}
                className="mt-0.5 accent-accent-blue"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                <p className="text-xs text-muted">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.contentType && (
          <p className="text-xs text-danger">{errors.contentType}</p>
        )}
      </div>

      {/* Text content */}
      {showText && (
        <div className="space-y-1.5">
          <Label htmlFor="gt-text">
            {ct === "text" ? "Text Clue / Question Prompt *" : "Text Clues (shown alongside images)"}
          </Label>
          <Textarea
            id="gt-text"
            placeholder={
              ct === "text"
                ? "e.g. Identify the technology: component-based UI, virtual DOM, JSX syntax…"
                : "e.g. Additional context clues to display with the images…"
            }
            value={values.textContent ?? ""}
            onChange={(e) => onChange({ textContent: e.target.value })}
            className="min-h-[100px] font-mono text-sm"
          />
          {errors.textContent && (
            <p className="text-xs text-danger">{errors.textContent}</p>
          )}
          <p className="text-xs text-muted">
            Use code blocks, lists, or prose. Participants will see this verbatim.
          </p>
        </div>
      )}

      {/* Image upload */}
      {showImages && (
        <div className="space-y-1.5">
          <Label>
            {ct === "multiple-images" ? "Images *" : "Image *"}
          </Label>
          <ImageUploader
            images={values.images ?? []}
            onChange={(imgs: QuestionImage[]) => onChange({ images: imgs })}
            maxImages={ct === "image" ? 1 : 8}
            label={ct === "image" ? "Upload one image" : "Upload images"}
          />
          {errors.images && (
            <p className="text-xs text-danger">{errors.images}</p>
          )}
        </div>
      )}

      {/* Answer configuration */}
      <div className="rounded-xl border border-border/60 bg-navy-900/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Answer Configuration — Admin Only
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="gt-answer">Correct Answer *</Label>
          <Input
            id="gt-answer"
            placeholder="e.g. React"
            value={values.correctAnswer ?? ""}
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
          />
          {errors.correctAnswer && (
            <p className="text-xs text-danger">{errors.correctAnswer}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gt-alt">Accepted Alternative Answers</Label>
          <Input
            id="gt-alt"
            placeholder="e.g. ReactJS, React.js (comma-separated)"
            value={(values.acceptedAnswers ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                acceptedAnswers: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="text-xs text-muted">
            Comma-separated. Case-insensitive matching in a later step.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gt-explain">Answer Explanation</Label>
          <Textarea
            id="gt-explain"
            placeholder="e.g. React is a JavaScript library for building user interfaces, developed by Meta."
            value={values.explanation ?? ""}
            onChange={(e) => onChange({ explanation: e.target.value })}
          />
          <p className="text-xs text-muted">Shown to admins after the round is resolved.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gt-cat">Technology Category</Label>
          <Select
            id="gt-cat"
            value={values.technologyCategory ?? ""}
            onChange={(e) => onChange({ technologyCategory: e.target.value || undefined })}
          >
            <option value="">— Select category —</option>
            {[
              "Languages",
              "Frameworks",
              "Libraries",
              "Runtimes",
              "Build Tools",
              "Databases",
              "Cloud",
              "DevOps",
              "CI/CD",
              "Orchestration",
              "Testing",
              "Package Managers",
              "Other",
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
