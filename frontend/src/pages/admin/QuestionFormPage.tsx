/**
 * QuestionFormPage — dedicated page for creating and editing questions.
 * Routes:
 *   /admin/questions/new         — create
 *   /admin/questions/:id/edit    — edit
 *
 * All data is stored in QuestionsContext (browser session only; no backend yet).
 */
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, useBlocker } from "react-router-dom";

import { ExplainEditor } from "@/components/admin/ExplainEditor";
import { GuessTechEditor } from "@/components/admin/GuessTechEditor";
import { QuestionPreview } from "@/components/admin/QuestionPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuestions } from "@/context/QuestionsContext";
import { toast } from "@/hooks/useToast";
import type {
  Difficulty,
  GameType,
  Question,
  QuestionStatus,
} from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type FormValues = Omit<Question, "id" | "createdAt" | "updatedAt">;
type FormErrors = Partial<Record<string, string>>;

const DEFAULT_VALUES: FormValues = {
  gameType: "guess-tech",
  title: "",
  instructions: "",
  contentType: "text",
  textContent: "",
  images: [],
  technologyCategory: undefined,
  secretTopic: "",
  topicDescription: "",
  prohibitedWords: [],
  adminInstructions: "",
  estimatedTime: undefined,
  correctAnswer: "",
  acceptedAnswers: [],
  explanation: "",
  difficulty: "medium",
  order: 1,
  status: "draft",
};

// ── Validation ────────────────────────────────────────────────────────────────

function validate(values: FormValues, questions: Question[], editingId?: string): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) errors.title = "Title is required.";
  if (!values.gameType) errors.gameType = "Select a game type.";
  if (!values.difficulty) errors.difficulty = "Select a difficulty.";
  if (!values.correctAnswer.trim()) errors.correctAnswer = "Correct answer is required.";

  const orderNum = Number(values.order);
  if (!values.order || isNaN(orderNum) || orderNum < 1 || !Number.isInteger(orderNum)) {
    errors.order = "Order must be a positive integer.";
  } else {
    const conflict = questions.find(
      (q) =>
        q.gameType === values.gameType &&
        q.order === orderNum &&
        q.id !== editingId,
    );
    if (conflict) {
      errors.order = `Order ${orderNum} is already used by "${conflict.title}". Choose a different number.`;
    }
  }

  if (values.gameType === "guess-tech") {
    if (!values.contentType) errors.contentType = "Select a content type.";
    const needsText = values.contentType === "text" || values.contentType === "text-images";
    const needsImages =
      values.contentType === "image" ||
      values.contentType === "multiple-images" ||
      values.contentType === "text-images";
    if (needsText && !values.textContent?.trim()) {
      errors.textContent = "Text content is required for this content type.";
    }
    if (needsImages && (values.images ?? []).length === 0) {
      errors.images = "At least one image is required for this content type.";
    }
  }

  if (values.gameType === "explain-without-naming") {
    if (!values.secretTopic?.trim()) errors.secretTopic = "Secret topic is required.";
    if ((values.prohibitedWords ?? []).length === 0)
      errors.prohibitedWords = "Add at least one prohibited word.";
  }

  return errors;
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuestionFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { questions, addQuestion, updateQuestion } = useQuestions();
  const isEdit = Boolean(id);

  // Find the question to edit
  const existingQuestion = useMemo(
    () => (id ? questions.find((q) => q.id === id) : undefined),
    [id, questions],
  );

  // Pre-fill game from URL param (?game=guess-tech)
  const gameFromUrl = searchParams.get("game") as GameType | null;

  // Form state
  const [values, setValues] = useState<FormValues>(() => {
    if (existingQuestion) {
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = existingQuestion;
      return rest as FormValues;
    }
    return {
      ...DEFAULT_VALUES,
      gameType: gameFromUrl ?? "guess-tech",
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const initialValues = useRef(values);

  // Track dirtiness
  useEffect(() => {
    const hasChanged =
      JSON.stringify(values) !== JSON.stringify(initialValues.current);
    setIsDirty(hasChanged);
  }, [values]);

  // Block navigation if dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  function update(updates: Partial<FormValues>) {
    setValues((prev) => ({ ...prev, ...updates }));
    // Clear related errors
    const clearedErrors = { ...errors };
    for (const key of Object.keys(updates)) {
      delete clearedErrors[key];
    }
    setErrors(clearedErrors);
  }

  // When game type changes, reset game-specific fields
  function handleGameTypeChange(newGame: GameType) {
    update({
      gameType: newGame,
      contentType: newGame === "guess-tech" ? "text" : "text",
      textContent: "",
      images: [],
      secretTopic: "",
      topicDescription: "",
      prohibitedWords: [],
      adminInstructions: "",
      estimatedTime: undefined,
    });
  }

  function handleSave(saveStatus?: QuestionStatus) {
    const finalValues: FormValues = {
      ...values,
      status: saveStatus ?? values.status,
    };

    const errs = validate(finalValues, questions, id);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the highlighted errors before saving.");
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsDirty(false);

    if (isEdit && id) {
      updateQuestion(id, finalValues);
      toast.success(`Question "${finalValues.title}" updated.`);
    } else {
      const newQ = addQuestion(finalValues);
      toast.success(`Question "${newQ.title}" saved.`);
    }

    navigate("/admin/questions");
  }

  const pageTitle = isEdit ? `Edit: ${existingQuestion?.title ?? id}` : "Add Question";
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/questions")}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {pageTitle}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {isEdit ? "Update question details" : "Create a new question for the question bank"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? "Hide preview" : "Show preview"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => handleSave("draft")}
          >
            Save as Draft
          </Button>
          <Button type="button" size="sm" onClick={() => handleSave("ready")}>
            <Save className="h-4 w-4" aria-hidden />
            Save & Publish
          </Button>
        </div>
      </div>

      {/* Validation error banner */}
      {hasErrors && (
        <div className="flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/5 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden />
          <p className="text-sm text-danger">
            Some required fields need attention. Please review and fix the highlighted errors.
          </p>
        </div>
      )}

      {/* ── Main form + preview layout ───────────────────────────────────── */}
      <div
        className={`grid gap-6 ${showPreview ? "xl:grid-cols-[1fr_380px]" : "xl:grid-cols-1"}`}
      >
        {/* Form column */}
        <div className="space-y-6">
          {/* ── Section 1: Basic Info ────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/60 bg-surface-elevated/50 p-5">
            <h3 className="mb-4 font-display text-base font-semibold text-foreground">
              Basic Information
            </h3>
            <div className="space-y-4">
              {/* Game Type */}
              <div className="space-y-1.5">
                <Label htmlFor="f-game">Game Type *</Label>
                <Select
                  id="f-game"
                  value={values.gameType}
                  onChange={(e) => handleGameTypeChange(e.target.value as GameType)}
                  error={!!errors.gameType}
                >
                  <option value="guess-tech">Guess the Technology</option>
                  <option value="explain-without-naming">Explain Without Naming</option>
                </Select>
                {errors.gameType && <p className="text-xs text-danger">{errors.gameType}</p>}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="f-title">Question Title *</Label>
                <Input
                  id="f-title"
                  placeholder="Short descriptive title for this question"
                  value={values.title}
                  onChange={(e) => update({ title: e.target.value })}
                />
                {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <Label htmlFor="f-instructions">Question Instructions</Label>
                <Textarea
                  id="f-instructions"
                  placeholder="Instructions shown to participants at the top of the question card…"
                  value={values.instructions ?? ""}
                  onChange={(e) => update({ instructions: e.target.value })}
                />
                <p className="text-xs text-muted">
                  Shown to all participants. Do not reveal the answer here.
                </p>
              </div>

              {/* Difficulty + Order + Time */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="f-diff">Difficulty *</Label>
                  <Select
                    id="f-diff"
                    value={values.difficulty}
                    onChange={(e) => update({ difficulty: e.target.value as Difficulty })}
                    error={!!errors.difficulty}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                  {errors.difficulty && (
                    <p className="text-xs text-danger">{errors.difficulty}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-order">Question Order *</Label>
                  <Input
                    id="f-order"
                    type="number"
                    min={1}
                    max={999}
                    value={values.order}
                    onChange={(e) =>
                      update({ order: e.target.value ? Number(e.target.value) : 1 })
                    }
                  />
                  {errors.order && <p className="text-xs text-danger">{errors.order}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-time">Est. Answer Time (s)</Label>
                  <Input
                    id="f-time"
                    type="number"
                    min={10}
                    max={300}
                    placeholder="e.g. 30"
                    value={values.estimatedTime ?? ""}
                    onChange={(e) =>
                      update({ estimatedTime: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                  <p className="text-xs text-muted">Optional</p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="f-status">Status</Label>
                <Select
                  id="f-status"
                  value={values.status}
                  onChange={(e) => update({ status: e.target.value as QuestionStatus })}
                  className="w-40"
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>
          </section>

          {/* ── Section 2: Game-specific editor ─────────────────────────── */}
          <section className="rounded-2xl border border-border/60 bg-surface-elevated/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="font-display text-base font-semibold text-foreground">
                Question Content
              </h3>
              <Badge variant={values.gameType === "guess-tech" ? "default" : "purple"}>
                {values.gameType === "guess-tech" ? "Guess the Technology" : "Explain Without Naming"}
              </Badge>
            </div>

            {values.gameType === "guess-tech" ? (
              <GuessTechEditor
                values={values}
                onChange={(u) => update(u as Partial<FormValues>)}
                errors={errors}
              />
            ) : (
              <ExplainEditor
                values={values}
                onChange={(u) => update(u as Partial<FormValues>)}
                errors={errors}
              />
            )}
          </section>

          {/* ── Footer action buttons ────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate("/admin/questions")}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => handleSave("draft")}
            >
              Save as Draft
            </Button>
            <Button type="button" onClick={() => handleSave("ready")}>
              <Save className="h-4 w-4" aria-hidden />
              Save & Publish
            </Button>
          </div>
        </div>

        {/* Preview column */}
        {showPreview && (
          <div className="xl:sticky xl:top-6 xl:self-start">
            <QuestionPreview question={values} />
          </div>
        )}
      </div>

      {/* ── Unsaved changes dialog ───────────────────────────────────────── */}
      <Dialog open={blocker.state === "blocked"}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. If you leave now, your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => blocker.state === "blocked" && blocker.reset()}
            >
              Stay on page
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={() => blocker.state === "blocked" && blocker.proceed()}
            >
              Leave without saving
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
