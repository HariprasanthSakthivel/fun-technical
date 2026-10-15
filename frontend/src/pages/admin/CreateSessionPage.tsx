import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  HelpCircle,
  Save,
  Search,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuestions } from "@/context/QuestionsContext";
import { useSessions } from "@/context/SessionsContext";
import { useTeams } from "@/context/TeamsContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/hooks/useToast";
import type { GameRules, GameType } from "@/types";

const STEPS = [
  { id: "basic", title: "Basic Information", desc: "Name & Game Type" },
  { id: "questions", title: "Select Questions", desc: "Question Bank & Order" },
  { id: "teams", title: "Select Teams", desc: "Participating Teams" },
  { id: "rules", title: "Game Rules", desc: "Buzzer & Flow Settings" },
  { id: "review", title: "Review & Create", desc: "Final Verification" },
];

const DEFAULT_RULES: GameRules = {
  maxEligibleTeams: 3,
  answerSubmission: "eligible_only",
  correctAnswerReveal: "manual",
  questionProgression: "manual",
  scoreboardVisibility: "hidden",
  questionTimerSeconds: 60,
  enableBuzzer: true,
};

export function CreateSessionPage() {
  useDocumentTitle("Create Game Session · Fun & Technical Activity Platform");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const { questions } = useQuestions();
  const { teams } = useTeams();
  const { sessions, createSession, updateSession, generateUniqueSessionCode } = useSessions();

  // Load existing session if editing
  const existingSession = useMemo(
    () => (editId ? sessions.find((s) => s.id === editId) : undefined),
    [editId, sessions],
  );

  const [currentStep, setCurrentStep] = useState(0);

  // Step A: Basic Info
  const [name, setName] = useState(existingSession?.name || "");
  const [description, setDescription] = useState(existingSession?.description || "");
  const [gameType, setGameType] = useState<GameType>(existingSession?.gameType || "guess-tech");
  const [scheduledDate, setScheduledDate] = useState(existingSession?.scheduledDate || "");
  const [scheduledTime, setScheduledTime] = useState(existingSession?.scheduledTime || "");

  // Step B: Questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    existingSession?.questionIds || [],
  );
  const [targetCount, setTargetCount] = useState<number>(existingSession?.totalQuestions || 15);
  const [questionSearch, setQuestionSearch] = useState("");

  // Step C: Teams
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    existingSession?.teamIds || [],
  );
  const [teamSearch, setTeamSearch] = useState("");

  // Step D: Rules
  const [rules, setRules] = useState<GameRules>(existingSession?.rules || DEFAULT_RULES);

  // Filter eligible questions (same gameType and status === 'ready')
  const eligibleQuestions = useMemo(() => {
    return questions.filter((q) => q.gameType === gameType && q.status === "ready");
  }, [questions, gameType]);

  // When gameType changes, reset selected questions if they don't match
  function handleGameTypeChange(newGame: GameType) {
    setGameType(newGame);
    const validIds = selectedQuestionIds.filter((id) => {
      const q = questions.find((x) => x.id === id);
      return q && q.gameType === newGame && q.status === "ready";
    });
    setSelectedQuestionIds(validIds);
  }

  // Active teams only
  const activeTeams = useMemo(() => {
    return teams.filter((t) => t.status === "active" || t.status === "registered");
  }, [teams]);

  // Reordering helpers for questions
  function moveQuestion(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedQuestionIds.length) return;
    const nextList = [...selectedQuestionIds];
    const temp = nextList[index];
    nextList[index] = nextList[targetIndex];
    nextList[targetIndex] = temp;
    setSelectedQuestionIds(nextList);
  }

  function toggleQuestionSelection(id: string) {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds((prev) => prev.filter((qId) => qId !== id));
    } else {
      setSelectedQuestionIds((prev) => [...prev, id]);
    }
  }

  function selectAllEligibleQuestions() {
    setSelectedQuestionIds(eligibleQuestions.map((q) => q.id));
  }

  function deselectAllQuestions() {
    setSelectedQuestionIds([]);
  }

  function toggleTeamSelection(id: string) {
    if (selectedTeamIds.includes(id)) {
      setSelectedTeamIds((prev) => prev.filter((tId) => tId !== id));
    } else {
      setSelectedTeamIds((prev) => [...prev, id]);
    }
  }

  function selectAllActiveTeams() {
    setSelectedTeamIds(activeTeams.map((t) => t.id));
  }

  function deselectAllTeams() {
    setSelectedTeamIds([]);
  }

  // Validation
  function canProceed(): { valid: boolean; message?: string } {
    if (currentStep === 0) {
      if (!name.trim()) return { valid: false, message: "Please provide a session name." };
      if (!gameType) return { valid: false, message: "Please select a game type." };
    }
    if (currentStep === 1) {
      if (selectedQuestionIds.length === 0) {
        return { valid: false, message: "Please select at least 1 question for the session." };
      }
    }
    if (currentStep === 2) {
      if (selectedTeamIds.length < 2) {
        return {
          valid: false,
          message: "A session requires at least 2 active participating teams.",
        };
      }
    }
    if (currentStep === 3) {
      if (!rules.maxEligibleTeams || rules.maxEligibleTeams < 1) {
        return { valid: false, message: "Max eligible teams must be at least 1." };
      }
    }
    return { valid: true };
  }

  function handleNext() {
    const check = canProceed();
    if (!check.valid) {
      toast.error(check.message || "Please complete required fields.");
      return;
    }
    setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }

  function handleSave(targetStatus: "draft" | "ready") {
    // Validate basic requirements
    if (!name.trim()) {
      toast.error("Session name is required.");
      setCurrentStep(0);
      return;
    }

    if (targetStatus === "ready") {
      if (selectedQuestionIds.length === 0) {
        toast.error("Cannot mark session Ready without selected questions.");
        setCurrentStep(1);
        return;
      }
      if (selectedTeamIds.length < 2) {
        toast.error("Cannot mark session Ready without at least 2 active teams.");
        setCurrentStep(2);
        return;
      }
    }

    if (editId && existingSession) {
      updateSession(editId, {
        name: name.trim(),
        description: description.trim() || undefined,
        gameType,
        status: targetStatus,
        questionIds: selectedQuestionIds,
        teamIds: selectedTeamIds,
        rules,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        totalQuestions: selectedQuestionIds.length,
      });
      toast.success(
        `Session "${name.trim()}" updated and marked as ${targetStatus.toUpperCase()}.`,
      );
    } else {
      const code = generateUniqueSessionCode(gameType);
      const newSession = createSession({
        name: name.trim(),
        description: description.trim() || undefined,
        gameType,
        status: targetStatus,
        questionIds: selectedQuestionIds,
        teamIds: selectedTeamIds,
        rules,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        totalQuestions: selectedQuestionIds.length,
        code,
      });
      toast.success(
        `Session "${newSession.name}" (${newSession.code}) created with status ${targetStatus.toUpperCase()}!`,
      );
    }

    navigate("/admin/sessions");
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/sessions")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Sessions
          </Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {editId ? `Edit Session: ${existingSession?.name || editId}` : "Create Game Session"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Configure game type, question order, participating teams, and buzzer rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleSave("draft")}>
            <Save className="h-4 w-4 mr-1" />
            Save as Draft
          </Button>
          <Button size="sm" onClick={() => handleSave("ready")}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {editId ? "Save & Mark Ready" : "Create Session"}
          </Button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="rounded-2xl border border-border/60 bg-surface-elevated/40 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <button
                key={step.id}
                onClick={() => {
                  // Allow jumping to completed steps or current
                  if (idx <= currentStep || canProceed().valid) {
                    setCurrentStep(idx);
                  }
                }}
                className={`flex flex-col items-start p-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-accent-blue/15 border border-accent-blue/40"
                    : isCompleted
                    ? "bg-navy-900/60 border border-border/40 hover:bg-navy-800/40"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-accent-blue text-white"
                        : isCompleted
                        ? "bg-success text-white"
                        : "bg-navy-800 text-muted"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {step.title}
                  </span>
                </div>
                <span className="mt-1 text-[11px] text-muted truncate hidden sm:block">
                  {step.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ─────────────────────────────────────────────────── */}
      <Card className="p-6">
        {/* ── STEP 0: Basic Info ── */}
        {currentStep === 0 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Step A: Basic Information</h3>
              <p className="text-sm text-muted">
                Define the session name, pick one of the two technical activities, and schedule it.
              </p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="cs-name">Session Name *</Label>
                <Input
                  id="cs-name"
                  placeholder="e.g. Engineering All-Hands Tech Quiz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cs-game">Game Type *</Label>
                <Select
                  id="cs-game"
                  value={gameType}
                  onChange={(e) => handleGameTypeChange(e.target.value as GameType)}
                >
                  <option value="guess-tech">Guess the Technology</option>
                  <option value="explain-without-naming">Explain Without Naming</option>
                </Select>
                <p className="text-xs text-muted">
                  Only the two predefined activity types are available for game sessions.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cs-date">Scheduled Date (optional)</Label>
                  <Input
                    id="cs-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cs-time">Scheduled Start Time (optional)</Label>
                  <Input
                    id="cs-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cs-desc">Session Description (optional)</Label>
                <Textarea
                  id="cs-desc"
                  placeholder="Notes, target audience, or instructions for co-hosts…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Select Questions ── */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Step B: Select &amp; Order Questions
                </h3>
                <p className="text-sm text-muted">
                  Showing Ready questions for <strong>{gameType === "guess-tech" ? "Guess the Technology" : "Explain Without Naming"}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllEligibleQuestions}>
                  Select All Ready ({eligibleQuestions.length})
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllQuestions}>
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Shortage warning & configuration banner */}
            <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">
                  Default Target: 15 questions · Currently Selected:{" "}
                  <span className="text-accent-blue-bright font-bold">
                    {selectedQuestionIds.length}
                  </span>
                </p>
                {eligibleQuestions.length < 15 ? (
                  <p className="mt-0.5 text-xs text-warning">
                    Notice: There are only {eligibleQuestions.length} Ready questions in the Question Bank for this game. You can select all available or configure a smaller number.
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted">
                    {eligibleQuestions.length} eligible Ready questions available in the Question Bank.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Target Count:</span>
                <Input
                  type="number"
                  min={1}
                  max={eligibleQuestions.length || 15}
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  className="w-20 h-8"
                />
              </div>
            </div>

            {/* Questions Selection Grid / Table */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  placeholder="Filter available questions…"
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {eligibleQuestions.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-navy-900/40 p-8 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-warning mb-2" />
                  <p className="font-semibold text-foreground">No Ready questions found</p>
                  <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                    There are no published questions marked with &ldquo;Ready&rdquo; status for this game. Please publish questions in the Question Bank first.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate("/admin/questions")}
                  >
                    Go to Question Bank
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40 max-h-96 overflow-y-auto">
                  {eligibleQuestions
                    .filter(
                      (q) =>
                        !questionSearch ||
                        q.title.toLowerCase().includes(questionSearch.toLowerCase()) ||
                        q.id.toLowerCase().includes(questionSearch.toLowerCase()),
                    )
                    .map((q) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      const orderIdx = selectedQuestionIds.indexOf(q.id);
                      return (
                        <div
                          key={q.id}
                          className={`flex items-center justify-between gap-3 p-3 transition-colors ${
                            isSelected ? "bg-accent-blue/10" : "bg-navy-900/40 hover:bg-navy-800/40"
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleQuestionSelection(q.id)}
                              className="accent-accent-blue h-4 w-4 rounded"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-muted">
                                  {q.id}
                                </span>
                                <Badge variant="default" className="text-[10px] py-0 px-1.5">
                                  {q.difficulty}
                                </Badge>
                                <span className="text-sm font-medium text-foreground truncate">
                                  {q.title}
                                </span>
                              </div>
                              {q.instructions && (
                                <p className="text-xs text-muted truncate mt-0.5">{q.instructions}</p>
                              )}
                            </div>
                          </label>

                          {/* Reordering Controls when selected */}
                          {isSelected && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-mono font-bold text-accent-blue-bright px-2">
                                #{orderIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => moveQuestion(orderIdx, "up")}
                                disabled={orderIdx === 0}
                                className="p-1 text-muted hover:text-foreground disabled:opacity-30 rounded hover:bg-navy-800"
                                title="Move up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveQuestion(orderIdx, "down")}
                                disabled={orderIdx === selectedQuestionIds.length - 1}
                                className="p-1 text-muted hover:text-foreground disabled:opacity-30 rounded hover:bg-navy-800"
                                title="Move down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Select Teams ── */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Step C: Select Participating Teams
                </h3>
                <p className="text-sm text-muted">
                  Choose which registered active teams will compete in this session. At least 2 active teams are required.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllActiveTeams}>
                  Select All Active ({activeTeams.length})
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllTeams}>
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-3 flex items-center justify-between">
              <span className="text-sm text-foreground">
                Selected Teams:{" "}
                <strong className="text-accent-blue-bright">{selectedTeamIds.length}</strong> (Minimum 2 required)
              </span>
              {selectedTeamIds.length < 2 && (
                <span className="text-xs font-semibold text-danger flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Select at least {2 - selectedTeamIds.length} more
                </span>
              )}
            </div>

            {/* Teams search & list */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  placeholder="Filter active teams…"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {activeTeams.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-navy-900/40 p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-warning mb-2" />
                  <p className="font-semibold text-foreground">No active teams available</p>
                  <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                    There are no active teams currently registered. Please activate or register teams first.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate("/admin/teams")}
                  >
                    Go to Teams Page
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeTeams
                    .filter(
                      (t) =>
                        !teamSearch ||
                        t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
                        t.code.toLowerCase().includes(teamSearch.toLowerCase()),
                    )
                    .map((t) => {
                      const isSelected = selectedTeamIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTeamSelection(t.id)}
                          className={`cursor-pointer rounded-xl border p-3.5 transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-accent-blue bg-accent-blue/10"
                              : "border-border/60 bg-navy-900/40 hover:bg-navy-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="accent-accent-blue h-4 w-4 rounded"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                              <p className="text-xs text-muted">
                                {t.members} members · {t.leaderName ? `Lead: ${t.leaderName}` : "No lead"}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-accent-blue-bright">
                            {t.code}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Game Rules ── */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Step D: Game Rules</h3>
              <p className="text-sm text-muted">
                Configure buzzer threshold, timers, answer reveal controls, and scoreboard behavior.
              </p>
            </div>

            <div className="space-y-4 max-w-2xl">
              {/* Max eligible teams buzzer rule */}
              <div className="rounded-xl border border-border/60 bg-navy-900/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="gr-max">Maximum Eligible Teams Per Question *</Label>
                    <p className="text-xs text-muted mt-1">
                      Only the first <strong>{rules.maxEligibleTeams}</strong> team(s) to press the buzzer will qualify to submit an answer for each question.
                    </p>
                  </div>
                  <Input
                    id="gr-max"
                    type="number"
                    min={1}
                    max={10}
                    value={rules.maxEligibleTeams}
                    onChange={(e) =>
                      setRules((prev) => ({ ...prev, maxEligibleTeams: Number(e.target.value) || 1 }))
                    }
                    className="w-24 text-center font-bold"
                  />
                </div>

                <div className="rounded-lg bg-navy-800/80 p-3 text-xs text-muted flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-accent-blue-bright shrink-0 mt-0.5" />
                  <span>
                    When set to {rules.maxEligibleTeams}, all other teams who press after the first {rules.maxEligibleTeams} will be locked out until the next question or until the admin resets the round.
                  </span>
                </div>
              </div>

              {/* Timer */}
              <div className="space-y-1.5">
                <Label htmlFor="gr-timer">Question Timer (seconds, optional)</Label>
                <Input
                  id="gr-timer"
                  type="number"
                  min={10}
                  max={300}
                  placeholder="e.g. 60"
                  value={rules.questionTimerSeconds || ""}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      questionTimerSeconds: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
                <p className="text-xs text-muted">
                  Leave blank or set to 0 for untimed manual rounds.
                </p>
              </div>

              {/* Fixed rule displays with explanatory badges */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-3">
                  <span className="text-xs font-semibold uppercase text-muted">Answer Submission</span>
                  <p className="mt-1 text-sm font-semibold text-foreground">Eligible Teams Only</p>
                  <p className="text-xs text-muted mt-0.5">
                    Only teams that qualify via buzzer can submit.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-3">
                  <span className="text-xs font-semibold uppercase text-muted">Answer Reveal</span>
                  <p className="mt-1 text-sm font-semibold text-foreground">Manual Admin Control</p>
                  <p className="text-xs text-muted mt-0.5">
                    The host decides when to reveal the answer.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-3">
                  <span className="text-xs font-semibold uppercase text-muted">Question Flow</span>
                  <p className="mt-1 text-sm font-semibold text-foreground">Manual Progression</p>
                  <p className="text-xs text-muted mt-0.5">Host advances to the next question.</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-3">
                  <span className="text-xs font-semibold uppercase text-muted">Scoreboard</span>
                  <p className="mt-1 text-sm font-semibold text-foreground">Hidden During Play</p>
                  <p className="text-xs text-muted mt-0.5">Maintains suspense until rounds end.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review and Create ── */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Step E: Review &amp; Create Session
              </h3>
              <p className="text-sm text-muted">
                Review your session configuration before finalizing. You can save as Draft or mark as Ready.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Overview Details */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-accent-blue-bright tracking-wider">
                    Session Summary
                  </h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between border-b border-border/40 pb-1.5">
                      <span className="text-muted">Name</span>
                      <span className="font-semibold text-foreground">{name}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-1.5">
                      <span className="text-muted">Game Type</span>
                      <span className="text-foreground">
                        {gameType === "guess-tech" ? "Guess the Technology" : "Explain Without Naming"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-1.5">
                      <span className="text-muted">Schedule</span>
                      <span className="text-foreground">
                        {scheduledDate ? `${scheduledDate} ${scheduledTime || ""}` : "Not scheduled"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-1.5">
                      <span className="text-muted">Questions</span>
                      <span className="font-bold text-accent-blue-bright">
                        {selectedQuestionIds.length} questions
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Teams</span>
                      <span className="font-bold text-accent-purple-bright">
                        {selectedTeamIds.length} teams
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rules Summary */}
                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-4 space-y-2 text-sm">
                  <h4 className="text-xs font-semibold uppercase text-accent-purple-bright tracking-wider">
                    Configured Rules
                  </h4>
                  <ul className="text-xs text-muted space-y-1.5">
                    <li>
                      • <strong>Max eligible teams:</strong> First {rules.maxEligibleTeams} teams to buzz
                    </li>
                    <li>
                      • <strong>Question timer:</strong> {rules.questionTimerSeconds ? `${rules.questionTimerSeconds} seconds` : "Untimed"}
                    </li>
                    <li>• <strong>Answer reveals:</strong> Host-controlled manual reveal</li>
                    <li>• <strong>Scoreboard:</strong> Hidden during gameplay</li>
                  </ul>
                </div>
              </div>

              {/* Roster & Question Order List */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted tracking-wider">
                    Question Order ({selectedQuestionIds.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {selectedQuestionIds.map((qId, i) => {
                      const q = questions.find((x) => x.id === qId);
                      return (
                        <div key={qId} className="flex items-center gap-2 py-1 border-b border-border/20">
                          <span className="font-mono text-muted">#{i + 1}</span>
                          <span className="font-medium text-foreground truncate flex-1">
                            {q?.title || qId}
                          </span>
                          <span className="font-mono text-muted">{qId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-navy-900/40 p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted tracking-wider">
                    Participating Teams ({selectedTeamIds.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {selectedTeamIds.map((tId) => {
                      const t = teams.find((x) => x.id === tId);
                      return (
                        <span
                          key={tId}
                          className="rounded bg-navy-800 px-2 py-1 text-foreground font-medium"
                        >
                          {t?.name || tId} ({t?.code})
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-border/40">
          <div>
            {currentStep > 0 && (
              <Button variant="secondary" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/admin/sessions")}>
              Cancel
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Next Step
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleSave("draft")}>
                  Save as Draft
                </Button>
                <Button onClick={() => handleSave("ready")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {editId ? "Save & Mark Ready" : "Create Session"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
