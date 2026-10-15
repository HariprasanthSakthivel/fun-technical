import {
  Calendar,
  HelpCircle,
  Layers,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  StopCircle,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuestions } from "@/context/QuestionsContext";
import { useSessions } from "@/context/SessionsContext";
import { useTeams } from "@/context/TeamsContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/hooks/useToast";
import type { GameSession, GameType, SessionStatus } from "@/types";

const STATUS_BADGE: Record<SessionStatus, "default" | "success" | "warning" | "danger" | "purple" | "muted"> = {
  draft: "warning",
  ready: "default",
  live: "success",
  completed: "purple",
  cancelled: "danger",
  upcoming: "default",
  active: "success",
};

const GAME_LABELS: Record<GameType, string> = {
  "guess-tech": "Guess the Technology",
  "explain-without-naming": "Explain Without Naming",
};

export function LiveSessionsPage() {
  useDocumentTitle("Live Sessions · Fun & Technical Activity Platform");
  const navigate = useNavigate();

  const { sessions, setSessionStatus, deleteSession } = useSessions();
  const { teams } = useTeams();
  const { questions } = useQuestions();

  const [activeTab, setActiveTab] = useState<"all" | "draft" | "ready" | "live" | "completed" | "cancelled">("all");
  const [search, setSearch] = useState("");

  // Modals
  const [viewSession, setViewSession] = useState<GameSession | null>(null);
  const [startConfirmSession, setStartConfirmSession] = useState<GameSession | null>(null);
  const [cancelConfirmSession, setCancelConfirmSession] = useState<GameSession | null>(null);
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<GameSession | null>(null);
  const [livePlaceholderSession, setLivePlaceholderSession] = useState<GameSession | null>(null);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: sessions.length,
      draft: sessions.filter((s) => s.status === "draft").length,
      ready: sessions.filter((s) => s.status === "ready").length,
      live: sessions.filter((s) => s.status === "live").length,
      completed: sessions.filter((s) => s.status === "completed").length,
      cancelled: sessions.filter((s) => s.status === "cancelled").length,
    };
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (activeTab !== "all" && s.status !== activeTab) {
        return false;
      }
      if (q && !s.name.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [sessions, activeTab, search]);

  function handleStartLive() {
    if (!startConfirmSession) return;
    setSessionStatus(startConfirmSession.id, "live");
    toast.success(`Session "${startConfirmSession.name}" is now LIVE!`);
    const session = startConfirmSession;
    setStartConfirmSession(null);
    setLivePlaceholderSession(session);
  }

  function handleCancelSession() {
    if (!cancelConfirmSession) return;
    setSessionStatus(cancelConfirmSession.id, "cancelled");
    toast.info(`Session "${cancelConfirmSession.name}" was cancelled.`);
    setCancelConfirmSession(null);
  }

  function handleDeleteSession() {
    if (!deleteConfirmSession) return;
    deleteSession(deleteConfirmSession.id);
    setDeleteConfirmSession(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Live Game Sessions
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Configure, manage, and conduct interactive game sessions with real-time buzzer controls.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/admin/sessions/new")}>
          <Plus className="h-4 w-4 mr-1" />
          Create Session
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {(
          [
            { id: "all", label: "All Sessions" },
            { id: "draft", label: "Draft" },
            { id: "ready", label: "Ready" },
            { id: "live", label: "Live" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-accent-blue/20 text-accent-blue-bright border border-accent-blue/30"
                : "text-muted hover:bg-navy-800 hover:text-foreground"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === tab.id ? "bg-accent-blue text-white" : "bg-navy-800 text-muted"
              }`}
            >
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search by session name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated/60 py-16 text-center">
          <Layers className="mb-3 h-10 w-10 text-muted" />
          <p className="font-semibold text-foreground">No sessions found</p>
          <p className="mt-1 text-sm text-muted">
            {search
              ? "Try adjusting your search terms."
              : `No sessions found in the "${activeTab}" category.`}
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => navigate("/admin/sessions/new")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Session
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((s) => {
            return (
              <Card key={s.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-accent-blue-bright">
                        {s.code}
                      </span>
                      <h3 className="font-display text-base font-semibold text-foreground mt-0.5">
                        {s.name}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {GAME_LABELS[s.gameType]}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE[s.status] || "muted"}>
                      {s.status.toUpperCase()}
                    </Badge>
                  </div>

                  {s.description && (
                    <p className="text-xs text-muted mb-3 line-clamp-2">{s.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted border-t border-border/40 pt-3 mb-4">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-accent-blue-bright" />
                      <span>{s.questionIds?.length || s.totalQuestions || 0} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-accent-purple-bright" />
                      <span>{s.teamIds?.length || 0} Teams</span>
                    </div>
                    {s.scheduledDate && (
                      <div className="col-span-2 flex items-center gap-1.5 text-muted">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {s.scheduledDate} {s.scheduledTime || ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status-specific action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                  {s.status === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/admin/sessions/new?edit=${s.id}`)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setViewSession(s)}>
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10 ml-auto"
                        onClick={() => setDeleteConfirmSession(s)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  {s.status === "ready" && (
                    <>
                      <Button size="sm" onClick={() => setStartConfirmSession(s)}>
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Start Session
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setViewSession(s)}>
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/admin/sessions/new?edit=${s.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10 ml-auto"
                        onClick={() => setCancelConfirmSession(s)}
                        title="Cancel session"
                      >
                        <StopCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  {s.status === "live" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setLivePlaceholderSession(s)}
                        className="bg-success text-white hover:bg-success/90"
                      >
                        <Radio className="h-3.5 w-3.5 mr-1 animate-pulse" />
                        Control Panel
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setViewSession(s)}>
                        Details
                      </Button>
                    </>
                  )}

                  {s.status === "completed" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          toast.info("Session results will be available in the Results page.")
                        }
                      >
                        View Results
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setViewSession(s)}>
                        Details
                      </Button>
                    </>
                  )}

                  {s.status === "cancelled" && (
                    <Button size="sm" variant="secondary" onClick={() => setViewSession(s)}>
                      View Details
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── View Session Details Modal ─────────────────────────────────────── */}
      <Dialog open={viewSession !== null} onOpenChange={() => setViewSession(null)}>
        <DialogContent className="w-[min(94vw,38rem)] max-h-[85vh] overflow-y-auto">
          {viewSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_BADGE[viewSession.status] || "muted"}>
                    {viewSession.status.toUpperCase()}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-accent-blue-bright">
                    Code: {viewSession.code}
                  </span>
                </div>
                <DialogTitle className="mt-1">{viewSession.name}</DialogTitle>
                <DialogDescription>
                  {GAME_LABELS[viewSession.gameType]} · Created: {viewSession.createdAt}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4 text-sm">
                {viewSession.description && (
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted">Description</span>
                    <p className="mt-0.5 text-foreground">{viewSession.description}</p>
                  </div>
                )}

                {/* Schedule & Rules */}
                <div className="rounded-xl border border-border/60 bg-navy-900/60 p-3 space-y-2">
                  <span className="text-xs uppercase font-semibold text-accent-purple-bright tracking-wider">
                    Session Configuration &amp; Rules
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted">Max Buzzer Eligible:</span>{" "}
                      <strong className="text-foreground">
                        {viewSession.rules?.maxEligibleTeams || 3} teams
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted">Timer:</span>{" "}
                      <strong className="text-foreground">
                        {viewSession.rules?.questionTimerSeconds
                          ? `${viewSession.rules.questionTimerSeconds}s`
                          : "Untimed"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted">Answer Reveals:</span>{" "}
                      <strong className="text-foreground">Host controlled</strong>
                    </div>
                    <div>
                      <span className="text-muted">Scoreboard:</span>{" "}
                      <strong className="text-foreground">Hidden during play</strong>
                    </div>
                  </div>
                </div>

                {/* Questions Order list */}
                <div>
                  <span className="text-xs uppercase font-semibold text-muted">
                    Questions in Order ({viewSession.questionIds?.length || 0})
                  </span>
                  <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border bg-navy-900/40 p-2 space-y-1 text-xs">
                    {(viewSession.questionIds || []).map((qId, idx) => {
                      const q = questions.find((x) => x.id === qId);
                      return (
                        <div key={qId} className="flex items-center gap-2 py-0.5">
                          <span className="font-mono text-muted">#{idx + 1}</span>
                          <span className="font-semibold text-foreground truncate flex-1">
                            {q?.title || qId}
                          </span>
                          <span className="font-mono text-xs text-muted">{qId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Participating Teams */}
                <div>
                  <span className="text-xs uppercase font-semibold text-muted">
                    Participating Teams ({viewSession.teamIds?.length || 0})
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(viewSession.teamIds || []).map((tId) => {
                      const t = teams.find((x) => x.id === tId);
                      return (
                        <span
                          key={tId}
                          className="rounded bg-navy-800 px-2.5 py-1 text-xs text-foreground font-medium flex items-center gap-1.5"
                        >
                          <span>{t?.name || tId}</span>
                          <span className="font-mono text-[10px] text-accent-blue-bright">
                            [{t?.code}]
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-border/40 pt-3">
                {viewSession.status === "ready" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const s = viewSession;
                      setViewSession(null);
                      setStartConfirmSession(s);
                    }}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Start Session Now
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setViewSession(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Start Session Confirmation Modal ──────────────────────────────── */}
      <Dialog
        open={startConfirmSession !== null}
        onOpenChange={() => setStartConfirmSession(null)}
      >
        <DialogContent>
          {startConfirmSession && (
            <>
              <DialogHeader>
                <DialogTitle>Start Game Session</DialogTitle>
                <DialogDescription>
                  Are you ready to start &ldquo;{startConfirmSession.name}&rdquo;?
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 space-y-2 text-xs text-muted">
                <p>
                  • Session Code:{" "}
                  <strong className="font-mono text-accent-blue-bright">
                    {startConfirmSession.code}
                  </strong>
                </p>
                <p>• Questions: {startConfirmSession.questionIds?.length || 0}</p>
                <p>• Teams: {startConfirmSession.teamIds?.length || 0} active teams</p>
                <p className="rounded bg-navy-900 p-2 text-foreground font-medium">
                  Starting this session will transition its status to <strong>LIVE</strong>.
                </p>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setStartConfirmSession(null)}>
                  Cancel
                </Button>
                <Button onClick={handleStartLive}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Confirm &amp; Start
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel Session Modal ─────────────────────────────────────────── */}
      <Dialog
        open={cancelConfirmSession !== null}
        onOpenChange={() => setCancelConfirmSession(null)}
      >
        <DialogContent>
          {cancelConfirmSession && (
            <>
              <DialogHeader>
                <DialogTitle>Cancel Session</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel &ldquo;{cancelConfirmSession.name}&rdquo;?
                </DialogDescription>
              </DialogHeader>
              <p className="mt-2 text-xs text-muted">
                The session will be marked as Cancelled. You can review it later in the Cancelled tab.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCancelConfirmSession(null)}>
                  Keep Session
                </Button>
                <Button variant="danger" onClick={handleCancelSession}>
                  Cancel Session
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Draft Session Modal ────────────────────────────────────── */}
      <Dialog
        open={deleteConfirmSession !== null}
        onOpenChange={() => setDeleteConfirmSession(null)}
      >
        <DialogContent>
          {deleteConfirmSession && (
            <>
              <DialogHeader>
                <DialogTitle>Delete Draft Session</DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete draft session &ldquo;
                  {deleteConfirmSession.name}&rdquo;?
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteConfirmSession(null)}>
                  Back
                </Button>
                <Button variant="danger" onClick={handleDeleteSession}>
                  Delete Draft
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Live Control Panel Placeholder Modal ──────────────────────────── */}
      <Dialog
        open={livePlaceholderSession !== null}
        onOpenChange={() => setLivePlaceholderSession(null)}
      >
        <DialogContent className="w-[min(92vw,34rem)]">
          {livePlaceholderSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-success animate-ping" />
                  <DialogTitle>Live Session Control Panel</DialogTitle>
                </div>
                <DialogDescription>
                  {livePlaceholderSession.name} ({livePlaceholderSession.code})
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 rounded-xl border border-accent-blue/40 bg-navy-900/80 p-5 text-center space-y-3">
                <Radio className="mx-auto h-10 w-10 text-accent-blue-bright animate-pulse" />
                <h4 className="font-display text-base font-bold text-foreground">
                  Session is Live in UI State
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Live gameplay functionality, real-time WebSocket buzzer events, participant answer unlocking, and score updates will be implemented in the subsequent live gameplay step.
                </p>
                <div className="pt-2 text-xs font-mono text-accent-blue-bright">
                  Session Code: {livePlaceholderSession.code}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSessionStatus(livePlaceholderSession.id, "completed");
                    toast.success(`Session marked as Completed.`);
                    setLivePlaceholderSession(null);
                  }}
                >
                  Mark Completed
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setLivePlaceholderSession(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
