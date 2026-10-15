import {
  AlertCircle,
  ArrowLeft,
  HelpCircle,
  Lock,
  MessageSquareText,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { AnswerSubmissionForm } from "@/components/participant/AnswerSubmissionForm";
import { BuzzerButton } from "@/components/participant/BuzzerButton";
import { ImageGallery } from "@/components/participant/ImageGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParticipant } from "@/context/ParticipantContext";
import { useQuestions } from "@/context/QuestionsContext";
import { useSessions } from "@/context/SessionsContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function ParticipantGamePage() {
  useDocumentTitle("Game Arena · Fun & Technical Activity Platform");
  const navigate = useNavigate();

  const {
    currentParticipant,
    buzzerState,
    pressBuzzer,
    submitAnswer,
    submittedAnswer,
    isEligibleToAnswer,
    setIsEligibleToAnswer,
    unlockedQuestionIndex,
    setBuzzerState,
  } = useParticipant();

  const { sessions } = useSessions();
  const { questions } = useQuestions();

  // If no participant identity, return to join page
  if (!currentParticipant) {
    return (
      <div className="space-y-6 max-w-md mx-auto text-center py-12">
        <Card className="p-6">
          <AlertCircle className="mx-auto h-10 w-10 text-warning mb-3" />
          <h3 className="text-lg font-bold text-foreground">Participant session required</h3>
          <p className="text-xs text-muted mt-1">
            Please join a session with your team credentials first.
          </p>
          <Button className="mt-4" onClick={() => navigate("/participant/join")}>
            Go to Join Page
          </Button>
        </Card>
      </div>
    );
  }

  const activeSession =
    sessions.find((s) => s.id === currentParticipant.session.id) || currentParticipant.session;
  const currentTeam = currentParticipant.team;

  // Resolve session questions in configured order
  const sessionQuestions = useMemo(() => {
    return (activeSession.questionIds || [])
      .map((qId) => questions.find((q) => q.id === qId))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));
  }, [activeSession.questionIds, questions]);

  const totalQuestionsCount = activeSession.questionIds?.length || activeSession.totalQuestions || 1;
  const currentQuestion = sessionQuestions[unlockedQuestionIndex];

  // For Game 2 (Explain Without Naming): check if current team is the explaining team
  // Spec: If no explaining team has been configured, display an organizer-controlled placeholder
  // If the session has teams, we use the first registered team or an admin designation
  const isExplainingTeam =
    activeSession.gameType === "explain-without-naming" &&
    activeSession.teamIds[0] === currentTeam.id;

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-8">
      {/* ── Game Header ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/70 bg-navy-900/80 backdrop-blur-md p-3.5 shadow-md flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-accent-blue-bright">
              {activeSession.code}
            </span>
            <span className="text-muted text-xs">•</span>
            <span className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-xs">
              {activeSession.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted">Team:</span>
            <span className="text-xs font-bold text-accent-purple-bright truncate">
              {currentTeam.name}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <Badge variant="purple" className="text-xs font-bold">
            Q {unlockedQuestionIndex + 1} of {totalQuestionsCount}
          </Badge>
        </div>
      </div>

      {/* ── Question / Waiting Area ────────────────────────────────────────── */}
      {!currentQuestion ? (
        <Card className="p-8 text-center space-y-3">
          <Lock className="mx-auto h-10 w-10 text-muted" />
          <h3 className="font-display text-lg font-bold text-foreground">
            Waiting for Question to Unlock
          </h3>
          <p className="text-xs text-muted max-w-xs mx-auto">
            The organizer has not unlocked the first question yet. Stay ready to buzz in when the clue appears!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* ── Game 1: Guess the Technology ── */}
          {activeSession.gameType === "guess-tech" && (
            <Card className="p-5 space-y-4 shadow-lg border-border/80">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <Badge variant="default" className="text-xs">
                  Guess the Technology
                </Badge>
                <span className="text-xs text-muted capitalize font-medium">
                  Difficulty: {currentQuestion.difficulty}
                </span>
              </div>

              {/* Public Instructions */}
              {currentQuestion.instructions && (
                <div className="rounded-xl bg-accent-blue/5 border border-accent-blue/20 p-3 text-xs text-accent-blue-bright flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{currentQuestion.instructions}</span>
                </div>
              )}

              {/* Text Clue (if text or text-images) */}
              {currentQuestion.textContent && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Technical Clue / Code
                  </span>
                  <div className="rounded-xl border border-border/80 bg-navy-950 p-3.5 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {currentQuestion.textContent}
                  </div>
                </div>
              )}

              {/* Images (Single, Multiple, or Text + Images) with enlarge dialog */}
              {currentQuestion.images && currentQuestion.images.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Visual Clues ({currentQuestion.images.length})
                  </span>
                  <ImageGallery
                    images={currentQuestion.images}
                    title={currentQuestion.title}
                  />
                </div>
              )}
            </Card>
          )}

          {/* ── Game 2: Explain Without Naming ── */}
          {activeSession.gameType === "explain-without-naming" && (
            <Card className="p-5 space-y-4 shadow-lg border-border/80">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <Badge variant="purple" className="text-xs">
                  Explain Without Naming
                </Badge>
                <Badge variant={isExplainingTeam ? "warning" : "muted"}>
                  {isExplainingTeam ? "YOUR TEAM IS EXPLAINING" : "GUESSING TEAM"}
                </Badge>
              </div>

              {/* Explaining Team View */}
              {isExplainingTeam ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-2">
                    <span className="text-xs font-semibold uppercase text-warning tracking-wider">
                      Secret Topic To Explain
                    </span>
                    <h3 className="text-2xl font-black font-display text-foreground tracking-tight">
                      {currentQuestion.secretTopic || currentQuestion.title}
                    </h3>
                    {currentQuestion.topicDescription && (
                      <p className="text-xs text-muted">{currentQuestion.topicDescription}</p>
                    )}
                  </div>

                  {/* Prohibited Words */}
                  {currentQuestion.prohibitedWords && currentQuestion.prohibitedWords.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase text-danger flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Prohibited Words (Do Not Say These!)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentQuestion.prohibitedWords.map((word) => (
                          <span
                            key={word}
                            className="rounded-lg bg-danger/15 border border-danger/30 px-2.5 py-1 text-xs font-bold text-danger line-through"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-navy-950 p-3 text-xs text-muted">
                    Explain this topic to other teams without uttering the secret name or any prohibited word. Other teams will buzz in when they think they know it.
                  </div>
                </div>
              ) : (
                /* Guessing Team View — Strictly hides secret topic & prohibited words */
                <div className="space-y-3">
                  <div className="rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-4 text-center space-y-2">
                    <MessageSquareText className="mx-auto h-8 w-8 text-accent-purple-bright" />
                    <h4 className="font-display text-base font-bold text-foreground">
                      Listen Carefully to the Explaining Team
                    </h4>
                    <p className="text-xs text-muted max-w-sm mx-auto">
                      The explaining team is describing the secret topic without naming it. When you think you have identified it, buzz in immediately!
                    </p>
                  </div>

                  {currentQuestion.instructions && (
                    <div className="rounded-xl bg-navy-900/40 p-3 text-xs text-muted">
                      <strong>Host Prompt:</strong> {currentQuestion.instructions}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ── Buzzer Button ────────────────────────────────────────────────── */}
          <BuzzerButton
            state={buzzerState}
            onPress={pressBuzzer}
            disabled={isExplainingTeam} // Explaining team doesn't buzz in
          />

          {/* Demonstration State Switcher for Pair-Programming & Verification */}
          <div className="rounded-xl border border-border/40 bg-navy-950/60 p-3 text-center space-y-2">
            <span className="text-[11px] uppercase font-semibold text-muted">
              Demo Simulation Controls (Test Buzzer &amp; Answer States)
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7"
                onClick={() => {
                  setBuzzerState("ready_to_buzz");
                  setIsEligibleToAnswer(false);
                }}
              >
                Reset Buzzer
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 text-success"
                onClick={() => {
                  setBuzzerState("position_secured");
                  setIsEligibleToAnswer(true);
                }}
              >
                Mark Eligible (Position 1)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 text-danger"
                onClick={() => {
                  setBuzzerState("not_eligible");
                  setIsEligibleToAnswer(false);
                }}
              >
                Mark Ineligible
              </Button>
            </div>
          </div>

          {/* ── Answer Submission Form ───────────────────────────────────────── */}
          {!isExplainingTeam && (
            <AnswerSubmissionForm
              isEligible={isEligibleToAnswer}
              submittedAnswer={submittedAnswer}
              onSubmit={submitAnswer}
            />
          )}
        </div>
      )}

      {/* Return to waiting room link */}
      <div className="text-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted hover:text-foreground text-xs"
          onClick={() => navigate("/participant/waiting")}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Return to Waiting Room
        </Button>
      </div>
    </div>
  );
}
