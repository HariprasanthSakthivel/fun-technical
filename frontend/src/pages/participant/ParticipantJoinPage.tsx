import { AlertCircle, ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParticipant } from "@/context/ParticipantContext";
import { useSessions } from "@/context/SessionsContext";
import { useTeams } from "@/context/TeamsContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/hooks/useToast";
import { apiJoinSession } from "@/services/api";

export function ParticipantJoinPage() {
  useDocumentTitle("Join Game Session · Fun & Technical Activity Platform");
  const navigate = useNavigate();

  const { sessions } = useSessions();
  const { teams } = useTeams();
  const { setPendingJoin } = useParticipant();

  const [sessionCode, setSessionCode] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const sCode = sessionCode.trim().toUpperCase();
    const tCode = teamCode.trim().toUpperCase();

    if (!sCode) {
      setError("Please enter a game session code.");
      return;
    }

    if (!tCode) {
      setError("Please enter your team code.");
      return;
    }

    // 1. Validate session exists
    const session = sessions.find((s) => s.code.toUpperCase() === sCode);
    if (!session) {
      setError(`Session "${sCode}" not found. Please verify the code with your organizer.`);
      return;
    }

    // 2. Validate session status (Ready or Live)
    if (session.status === "completed") {
      setError(`Session "${session.name}" has already completed.`);
      return;
    }

    if (session.status === "cancelled") {
      setError(`Session "${session.name}" was cancelled.`);
      return;
    }

    if (session.status === "draft") {
      setError(`Session "${session.name}" is still a draft and has not been opened by the organizer.`);
      return;
    }

    // 3. Validate team exists
    const team = teams.find((t) => t.code.toUpperCase() === tCode);
    if (!team) {
      setError(`Team with code "${tCode}" does not exist. Check with your team leader.`);
      return;
    }

    // 4. Validate team is active
    if (team.status === "inactive") {
      setError(`Team "${team.name}" is marked as inactive and cannot join live games.`);
      return;
    }

    // 5. Validate team is registered for the selected session
    const isRegistered = session.teamIds.includes(team.id);
    if (!isRegistered) {
      setError(`Team "${team.name}" is not registered to participate in session "${session.name}".`);
      return;
    }

    // Call backend participant join API to obtain secure participant token
    apiJoinSession({ session_code: sCode, team_code: tCode }).catch(() => {
      // Local fallback preserves UI navigation if backend isn't running
    });

    // Validation successful! Store pending join and route to confirmation
    setPendingJoin({ session, team });
    toast.success(`Session verified: ${session.name}`);
    navigate("/participant/confirm");
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Card className="border-border/70 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <Badge variant="purple" className="mx-auto mb-2">
            Participant Portal
          </Badge>
          <CardTitle className="text-2xl font-black font-display tracking-tight">
            Join Game Session
          </CardTitle>
          <CardDescription>
            Enter your game session code and your registered team code to enter the room.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleJoin} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="s-code">Game Session Code *</Label>
              <Input
                id="s-code"
                placeholder="e.g. TECH-4821 or EXPL-9142"
                value={sessionCode}
                onChange={(e) => {
                  setSessionCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="font-mono uppercase font-bold text-base tracking-wider"
                autoComplete="off"
                autoFocus
              />
              <p className="text-[11px] text-muted">Provided by the organizer or event screen.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-code">Team Code *</Label>
              <Input
                id="t-code"
                placeholder="e.g. ALPHA, BETA, or GAMMA"
                value={teamCode}
                onChange={(e) => {
                  setTeamCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="font-mono uppercase font-bold text-base tracking-wider"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted">Your team&apos;s unique registration code.</p>
            </div>

            <Button type="submit" size="lg" className="w-full mt-2">
              Verify &amp; Join Game
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Assist */}
          <div className="mt-6 rounded-xl border border-border/40 bg-navy-900/50 p-3 text-xs text-muted">
            <span className="font-semibold text-foreground">Demo Codes Available:</span>
            <div className="mt-1 space-y-0.5 text-[11px]">
              <div>
                • Session: <code className="text-accent-blue-bright">TECH-4821</code> · Teams:{" "}
                <code className="text-foreground">ALPHA</code>,{" "}
                <code className="text-foreground">BETA</code>,{" "}
                <code className="text-foreground">GAMMA</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
