import {
  AlertCircle,
  Gamepad2,
  LoaderCircle,
  LogOut,
  Play,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParticipant } from "@/context/ParticipantContext";
import { useSessions } from "@/context/SessionsContext";
import { useTeams } from "@/context/TeamsContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function ParticipantWaitingPage() {
  useDocumentTitle("Waiting Room · Fun & Technical Activity Platform");
  const navigate = useNavigate();

  const { currentParticipant, leaveSession } = useParticipant();
  const { sessions } = useSessions();
  const { teams } = useTeams();

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  // If no participant identity in state, prompt to join
  if (!currentParticipant) {
    return (
      <div className="space-y-6 max-w-md mx-auto text-center py-12">
        <Card className="p-6">
          <AlertCircle className="mx-auto h-10 w-10 text-warning mb-3" />
          <h3 className="text-lg font-bold text-foreground">No active session found</h3>
          <p className="text-xs text-muted mt-1">
            Please enter your session code and team code to join.
          </p>
          <Button className="mt-4" onClick={() => navigate("/participant/join")}>
            Go to Join Page
          </Button>
        </Card>
      </div>
    );
  }

  // Get live session state from context
  const activeSession =
    sessions.find((s) => s.id === currentParticipant.session.id) || currentParticipant.session;
  const isLive = activeSession.status === "live";

  function handleConfirmLeave() {
    leaveSession();
    setLeaveModalOpen(false);
    navigate("/participant/join");
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Session Card */}
      <Card className="border-border/70 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-accent-blue/15 via-accent-purple/10 to-transparent p-4 border-b border-border/40 flex items-center justify-between">
          <div>
            <span className="font-mono text-xs font-bold text-accent-blue-bright">
              {activeSession.code}
            </span>
            <h2 className="font-display text-lg font-bold text-foreground mt-0.5">
              {activeSession.name}
            </h2>
          </div>
          <Badge
            variant={
              isLive
                ? "success"
                : activeSession.status === "ready"
                ? "default"
                : activeSession.status === "completed"
                ? "purple"
                : "muted"
            }
          >
            {isLive ? "LIVE IN PROGRESS" : activeSession.status.toUpperCase()}
          </Badge>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Waiting Status hero */}
          <div className="text-center py-4 space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-purple/15 ring-2 ring-accent-purple/30">
              {isLive ? (
                <Play className="h-8 w-8 text-success animate-pulse" />
              ) : (
                <LoaderCircle className="h-8 w-8 animate-spin text-accent-purple-bright" />
              )}
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-foreground">
                {isLive
                  ? "The Game Has Started!"
                  : "Waiting for the organizer to start the game"}
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                {isLive
                  ? "Your session is live. Click below to enter the game screen."
                  : "Keep this screen open on your device. The game screen will be accessible once the host begins the session."}
              </p>
            </div>

            {isLive && (
              <Button
                size="lg"
                className="w-full max-w-xs mx-auto bg-success hover:bg-success/90 text-white font-bold text-base shadow-lg animate-bounce"
                onClick={() => navigate("/participant/game")}
              >
                Enter Game Screen Now
              </Button>
            )}

            {!isLive && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/participant/game")}
                  className="text-xs"
                >
                  <Gamepad2 className="h-3.5 w-3.5 mr-1" />
                  Preview Game Screen
                </Button>
              </div>
            )}
          </div>

          {/* Identity & Room Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border/50 bg-navy-900/50 p-3">
              <span className="text-muted uppercase font-semibold">Your Team</span>
              <p className="mt-0.5 text-sm font-bold text-foreground truncate">
                {currentParticipant.team.name}
              </p>
              <p className="font-mono text-[11px] text-accent-blue-bright">
                Code: {currentParticipant.team.code}
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-navy-900/50 p-3">
              <span className="text-muted uppercase font-semibold">Questions</span>
              <p className="mt-0.5 text-sm font-bold text-foreground">
                {activeSession.questionIds?.length || activeSession.totalQuestions} Questions
              </p>
              <p className="text-[11px] text-muted">
                {activeSession.gameType === "guess-tech" ? "Guess the Tech" : "Explain Without Naming"}
              </p>
            </div>
          </div>

          {/* Competing Teams list */}
          <div className="rounded-xl border border-border/50 bg-navy-900/40 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted">
              <Users className="h-3.5 w-3.5" />
              Competing Teams ({activeSession.teamIds.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeSession.teamIds.map((tId) => {
                const t = teams.find((x) => x.id === tId);
                const isCurrent = tId === currentParticipant.team.id;
                return (
                  <span
                    key={tId}
                    className={`rounded-lg px-2 py-1 text-xs font-medium flex items-center gap-1 ${
                      isCurrent
                        ? "bg-accent-blue/20 text-accent-blue-bright border border-accent-blue/40 font-bold"
                        : "bg-navy-800 text-muted"
                    }`}
                  >
                    <span>{t?.name || tId}</span>
                    {isCurrent && <span className="text-[10px] uppercase">(You)</span>}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Leave Session Action */}
          <div className="pt-2 border-t border-border/40 flex justify-between items-center text-xs text-muted">
            <span>Joined: {new Date(currentParticipant.joinedAt).toLocaleTimeString()}</span>
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="text-danger hover:underline flex items-center gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave Session
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Leave Session Confirmation Dialog */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Game Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave &ldquo;{activeSession.name}&rdquo;? You will return to
              the join screen.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLeaveModalOpen(false)}>
              Stay in Lobby
            </Button>
            <Button variant="danger" onClick={handleConfirmLeave}>
              Leave Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
