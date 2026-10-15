/**
 * QuestionPreview — simulates the participant-facing view for both game types.
 *
 * IMPORTANT: This component intentionally does NOT expose:
 * - correctAnswer
 * - acceptedAnswers
 * - explanation
 * - secretTopic (in guessing-team view)
 * - prohibitedWords (in guessing-team view)
 *
 * Frontend hiding is NOT production security; real access control will be added
 * in the backend authentication step.
 */
import { Gamepad2, MessageSquareText, Monitor } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import type { Question } from "@/types";

type PreviewTab = "explaining" | "guessing";

interface QuestionPreviewProps {
  question: Partial<Question>;
}

/* ── Guess the Technology preview ─────────────────────────────────────────── */

function GuessTechPreview({ q }: { q: Partial<Question> }) {
  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-xl border border-border/60 bg-navy-900/60 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Instructions
        </p>
        <p className="text-sm text-foreground">
          {q.instructions ?? "Identify the technology shown below."}
        </p>
      </div>

      {/* Images */}
      {(q.images ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {q.images!.length > 1 ? `${q.images!.length} images` : "Image clue"}
          </p>
          <div
            className={cn(
              "grid gap-2",
              q.images!.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {q.images!.map((img, i) => (
              <div
                key={img.id}
                className="relative overflow-hidden rounded-xl border border-border/40 bg-navy-800"
              >
                <img
                  src={img.dataUrl}
                  alt={`Clue image ${i + 1}`}
                  className="h-auto max-h-48 w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text content */}
      {q.textContent && (
        <div className="rounded-xl border border-border/60 bg-navy-950/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Text clue
          </p>
          <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
            {q.textContent}
          </pre>
        </div>
      )}

      {/* Empty state */}
      {!q.textContent && (q.images ?? []).length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 py-8 text-center text-muted">
          <p className="text-sm">No content added yet.</p>
          <p className="mt-1 text-xs">Add text clues or images in the editor.</p>
        </div>
      )}

      {/* Simulated buzzer + answer placeholder */}
      <div className="space-y-2 border-t border-border/40 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Participant controls (preview — not functional)
        </p>
        <button
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-accent-blue/30 bg-accent-blue/10 py-4 text-center text-sm font-semibold text-accent-blue-bright opacity-70"
        >
          🔔 Press Buzzer
        </button>
        <div className="rounded-lg border border-border/40 bg-navy-900/30 px-3 py-2 text-sm text-muted">
          [ Answer submission box — available after buzzing in ]
        </div>
      </div>
    </div>
  );
}

/* ── Explain Without Naming preview ───────────────────────────────────────── */

function ExplainingTeamPreview({ q }: { q: Partial<Question> }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent-purple/40 bg-accent-purple/10 p-5 text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent-purple-bright">
          🔒 Your team's secret topic
        </p>
        <p className="font-display text-2xl font-bold text-foreground">
          {q.secretTopic ?? "(topic not set)"}
        </p>
      </div>

      {(q.prohibitedWords ?? []).length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-danger">
            ❌ Do NOT say these words
          </p>
          <div className="flex flex-wrap gap-2">
            {(q.prohibitedWords ?? []).map((w) => (
              <span
                key={w}
                className="rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {q.adminInstructions && (
        <div className="rounded-xl border border-border/60 bg-navy-900/60 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Instructions for explainer
          </p>
          <p className="text-sm text-foreground">{q.adminInstructions}</p>
        </div>
      )}

      {q.estimatedTime && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <span className="font-display text-xl font-bold text-warning">{q.estimatedTime}s</span>
          <span className="text-sm text-muted">to explain (timer — not functional in preview)</span>
        </div>
      )}
    </div>
  );
}

function GuessingTeamPreview({ q }: { q: Partial<Question> }) {
  // Intentionally omits: secretTopic, prohibitedWords, correctAnswer, explanation
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-navy-900/60 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Round instructions
        </p>
        <p className="text-sm text-foreground">
          {q.instructions ?? "Listen carefully as a team explains a secret topic. Buzz in when you think you know the answer!"}
        </p>
      </div>

      <div className="rounded-xl border border-border/40 bg-navy-800/40 px-4 py-6 text-center">
        <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-accent-purple-bright" aria-hidden />
        <p className="text-sm font-semibold text-foreground">
          A team is explaining the topic…
        </p>
        <p className="mt-1 text-xs text-muted">Listen carefully before buzzing in.</p>
      </div>

      <div className="space-y-2 border-t border-border/40 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Participant controls (preview — not functional)
        </p>
        <button
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-accent-blue/30 bg-accent-blue/10 py-4 text-center text-sm font-semibold text-accent-blue-bright opacity-70"
        >
          🔔 Press Buzzer
        </button>
        <div className="rounded-lg border border-border/40 bg-navy-900/30 px-3 py-2 text-sm text-muted">
          [ Answer submission box — available after buzzing in ]
        </div>
      </div>
    </div>
  );
}

/* ── Main preview component ───────────────────────────────────────────────── */

export function QuestionPreview({ question: q }: QuestionPreviewProps) {
  const [tab, setTab] = useState<PreviewTab>("explaining");

  const isGuess = q.gameType === "guess-tech" || !q.gameType;
  const isExplain = q.gameType === "explain-without-naming";

  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated/60 overflow-hidden">
      {/* Preview header */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-navy-900/60 px-4 py-3">
        <Monitor className="h-4 w-4 text-muted" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Participant preview
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isGuess && (
            <Badge variant="default">
              <Gamepad2 className="mr-1 h-3 w-3" aria-hidden />
              Guess the Tech
            </Badge>
          )}
          {isExplain && (
            <Badge variant="purple">
              <MessageSquareText className="mr-1 h-3 w-3" aria-hidden />
              Explain W/O Naming
            </Badge>
          )}
        </div>
      </div>

      {/* Question title */}
      {q.title && (
        <div className="border-b border-border/40 bg-navy-900/30 px-4 py-3">
          <p className="text-xs text-muted">Question</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{q.title}</p>
        </div>
      )}

      {/* Tabs for explain game */}
      {isExplain && (
        <div className="flex border-b border-border/40">
          {(["explaining", "guessing"] as PreviewTab[]).map((t) => (
            <button
              key={t}
              className={cn(
                "flex-1 px-4 py-2.5 text-xs font-semibold transition-colors",
                tab === t
                  ? "border-b-2 border-accent-blue bg-navy-900/40 text-foreground"
                  : "text-muted hover:text-foreground",
              )}
              onClick={() => setTab(t)}
              type="button"
            >
              {t === "explaining" ? "🎤 Explaining Team" : "👥 Guessing Teams"}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {isGuess && <GuessTechPreview q={q} />}
        {isExplain && tab === "explaining" && <ExplainingTeamPreview q={q} />}
        {isExplain && tab === "guessing" && <GuessingTeamPreview q={q} />}
        {!q.gameType && (
          <div className="py-8 text-center text-muted">
            <p className="text-sm">Select a game type to see the preview.</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-border/40 bg-navy-950/40 px-4 py-2">
        <p className="text-[10px] text-muted">
          Preview only — buzzer and answer submission not functional. Correct answers never shown here.
        </p>
      </div>
    </div>
  );
}
