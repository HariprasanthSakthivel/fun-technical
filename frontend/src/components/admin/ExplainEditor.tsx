/**
 * ExplainEditor — question content editor for "Explain Without Naming" game.
 * Handles secret topic, prohibited words, admin instructions, and answer config.
 */
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/types";

interface ExplainEditorProps {
  values: Partial<Question>;
  onChange: (updates: Partial<Question>) => void;
  errors: Partial<Record<string, string>>;
}

export function ExplainEditor({ values, onChange, errors }: ExplainEditorProps) {
  const [wordInput, setWordInput] = useState("");

  function addProhibitedWord() {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    const existing = values.prohibitedWords ?? [];
    if (!existing.includes(trimmed)) {
      onChange({ prohibitedWords: [...existing, trimmed] });
    }
    setWordInput("");
  }

  function removeWord(word: string) {
    onChange({
      prohibitedWords: (values.prohibitedWords ?? []).filter((w) => w !== word),
    });
  }

  return (
    <div className="space-y-6">
      {/* Secret topic */}
      <div className="rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-purple-bright">
          Secret Topic — Admin / Explaining Team Only
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="ew-topic">Secret Topic *</Label>
          <Input
            id="ew-topic"
            placeholder="e.g. Docker"
            value={values.secretTopic ?? ""}
            onChange={(e) => onChange({ secretTopic: e.target.value })}
          />
          {errors.secretTopic && (
            <p className="text-xs text-danger">{errors.secretTopic}</p>
          )}
          <p className="text-xs text-muted">
            This is shown to the explaining team. <strong>Never shown to guessing teams.</strong>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ew-topicdesc">Topic Description for Admin</Label>
          <Textarea
            id="ew-topicdesc"
            placeholder="Brief context about the topic to help the admin verify the answer…"
            value={values.topicDescription ?? ""}
            onChange={(e) => onChange({ topicDescription: e.target.value })}
          />
        </div>

        {/* Prohibited words */}
        <div className="space-y-2">
          <Label>Prohibited Words / Phrases *</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a word or phrase…"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addProhibitedWord();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addProhibitedWord}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          {errors.prohibitedWords && (
            <p className="text-xs text-danger">{errors.prohibitedWords}</p>
          )}
          {(values.prohibitedWords ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(values.prohibitedWords ?? []).map((word) => (
                <span
                  key={word}
                  className="flex items-center gap-1.5 rounded-lg border border-accent-purple/30 bg-accent-purple/10 px-2.5 py-1 text-xs font-semibold text-accent-purple-bright"
                >
                  {word}
                  <button
                    type="button"
                    onClick={() => removeWord(word)}
                    className="rounded hover:text-danger"
                    aria-label={`Remove "${word}"`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">No prohibited words added yet.</p>
          )}
          <p className="text-xs text-muted">
            These words are shown to the explaining team. Shown to the admin — <strong>never to guessing teams.</strong>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ew-admin">Admin Instructions</Label>
          <Textarea
            id="ew-admin"
            placeholder="e.g. Explain its purpose and how developers use it without saying the prohibited words."
            value={values.adminInstructions ?? ""}
            onChange={(e) => onChange({ adminInstructions: e.target.value })}
          />
          <p className="text-xs text-muted">Internal notes for the admin about how to run this question.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ew-time">Estimated Explanation Time (seconds)</Label>
          <Input
            id="ew-time"
            type="number"
            min={15}
            max={300}
            placeholder="e.g. 90"
            value={values.estimatedTime ?? ""}
            onChange={(e) =>
              onChange({ estimatedTime: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-40"
          />
          <p className="text-xs text-muted">Timer for the explaining team (15–300 seconds).</p>
        </div>
      </div>

      {/* Answer configuration */}
      <div className="rounded-xl border border-border/60 bg-navy-900/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Answer Configuration — Admin Only
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="ew-answer">Correct Answer *</Label>
          <Input
            id="ew-answer"
            placeholder="e.g. Docker"
            value={values.correctAnswer ?? ""}
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
          />
          {errors.correctAnswer && (
            <p className="text-xs text-danger">{errors.correctAnswer}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ew-alt">Accepted Alternative Answers</Label>
          <Input
            id="ew-alt"
            placeholder="e.g. Docker containerization (comma-separated)"
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
        </div>
      </div>
    </div>
  );
}
