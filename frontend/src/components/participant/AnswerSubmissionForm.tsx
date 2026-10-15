import { CheckCircle2, Lock, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/useToast";

interface AnswerSubmissionFormProps {
  isEligible: boolean;
  submittedAnswer: string;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function AnswerSubmissionForm({
  isEligible,
  submittedAnswer,
  onSubmit,
  disabled = false,
}: AnswerSubmissionFormProps) {
  const [answerInput, setAnswerInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEligible) {
      toast.error("Your team is not currently eligible to submit an answer.");
      return;
    }
    const clean = answerInput.trim();
    if (!clean) {
      setError("Please enter your team's answer.");
      return;
    }

    setError(null);
    onSubmit(clean);
    toast.success("Answer submitted! Waiting for organizer review.");
  }

  // If answer was already submitted:
  if (submittedAnswer) {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/5 p-4 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-success mb-2" />
        <p className="text-xs uppercase font-semibold text-muted">Submitted Answer</p>
        <p className="mt-1 text-base font-bold text-foreground">
          &ldquo;{submittedAnswer}&rdquo;
        </p>
        <p className="mt-1 text-xs text-muted">
          Your submission is recorded for this round. Results will be revealed by the organizer.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        isEligible
          ? "border-accent-blue/80 bg-surface-elevated shadow-lg"
          : "border-border/60 bg-navy-900/40 opacity-70"
      }`}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="ans-input" className="text-sm font-semibold text-foreground">
            {isEligible ? "Enter Team Answer *" : "Answer Submission Locked"}
          </Label>
          {!isEligible && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Lock className="h-3 w-3" />
              Eligible teams only
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            id="ans-input"
            placeholder={isEligible ? "Type your guess here…" : "Buzz in to unlock answer field"}
            value={answerInput}
            onChange={(e) => {
              setAnswerInput(e.target.value);
              setError(null);
            }}
            disabled={!isEligible || disabled}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={!isEligible || disabled || !answerInput.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4 mr-1.5" />
            Submit
          </Button>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        {!isEligible && (
          <p className="text-[11px] text-muted">
            Only the first teams to secure a buzzer spot can submit an answer.
          </p>
        )}
      </form>
    </div>
  );
}
