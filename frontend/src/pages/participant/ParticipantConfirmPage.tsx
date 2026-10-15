import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParticipant } from "@/context/ParticipantContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function ParticipantConfirmPage() {
  useDocumentTitle("Confirm Team Identity · Fun & Technical Activity Platform");
  const navigate = useNavigate();

  const { pendingJoin, confirmJoin } = useParticipant();

  useEffect(() => {
    // If no pending join data, route back to join
    if (!pendingJoin) {
      navigate("/participant/join", { replace: true });
    }
  }, [pendingJoin, navigate]);

  if (!pendingJoin) {
    return null;
  }

  const { session, team } = pendingJoin;

  function handleConfirm() {
    confirmJoin();
    navigate("/participant/waiting");
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Card className="border-border/70 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 ring-1 ring-success/30">
            <ShieldCheck className="h-6 w-6 text-success" />
          </div>
          <CardTitle className="text-xl font-bold font-display">
            Confirm Team Identity
          </CardTitle>
          <CardDescription>
            You are about to enter this game session. Please verify your team details.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-3">
          <div className="rounded-xl border border-border/60 bg-navy-900/60 p-4 space-y-2.5 text-sm">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted">Game Session</span>
              <span className="font-semibold text-foreground text-right">{session.name}</span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted">Activity Type</span>
              <span className="text-foreground text-right">
                {session.gameType === "guess-tech"
                  ? "Guess the Technology"
                  : "Explain Without Naming"}
              </span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted">Session Code</span>
              <span className="font-mono font-bold text-accent-blue-bright">{session.code}</span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted">Your Team</span>
              <span className="font-bold text-foreground text-right">
                {team.name} ({team.code})
              </span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted">Participating Teams</span>
              <span className="text-foreground">{session.teamIds.length} teams competing</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted">Configured Questions</span>
              <span className="font-bold text-accent-purple-bright">
                {session.questionIds?.length || session.totalQuestions} questions
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Button size="lg" className="w-full" onClick={handleConfirm}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirm &amp; Join Session
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted hover:text-foreground"
              onClick={() => navigate("/participant/join")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
