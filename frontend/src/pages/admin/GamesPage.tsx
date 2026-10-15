import { Edit, Eye, Gamepad2, MessageSquareText, Plus } from "lucide-react";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToastContainer, type ToastMessage, toastId } from "@/components/ui/toast";
import { useQuestions } from "@/context/QuestionsContext";
import { MOCK_GAMES } from "@/data/mockData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Game } from "@/types";

const GAME_ICONS: Record<string, React.ElementType> = {
  "guess-tech": Gamepad2,
  "explain-without-naming": MessageSquareText,
};

const ICON_COLORS: Record<string, string> = {
  "guess-tech": "text-accent-blue-bright",
  "explain-without-naming": "text-accent-purple-bright",
};

const ICON_BG: Record<string, string> = {
  "guess-tech": "bg-accent-blue/10",
  "explain-without-naming": "bg-accent-purple/10",
};

/** Games management page. Shows both predefined games with management options. */
export function GamesPage() {
  useDocumentTitle("Games · Fun & Technical Activity Platform");
  const navigate = useNavigate();
  const { questions } = useQuestions();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function addToast(message: string, variant: ToastMessage["variant"] = "info") {
    setToasts((prev) => [...prev, { id: toastId(), message, variant }]);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Games
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Two predefined games — manage questions and settings for each.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            addToast(
              "New game types will be configurable in a later step.",
              "info",
            )
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create Game
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-4 py-3 text-sm text-accent-blue-bright">
        This platform supports two game types. New game type creation will be available in a later step.
      </div>

      {/* Game cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {MOCK_GAMES.map((game) => {
          const Icon = GAME_ICONS[game.type] ?? Gamepad2;
          const gameQuestions = questions.filter((q) => q.gameType === game.type);
          const count = gameQuestions.length;
          return (
            <Card key={game.id} className="p-6">
              <CardHeader className="mb-4 p-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ICON_BG[game.type]}`}
                    >
                      <Icon
                        className={`h-6 w-6 ${ICON_COLORS[game.type]}`}
                        aria-hidden
                      />
                    </span>
                    <div>
                      <CardTitle className="text-base">{game.name}</CardTitle>
                      <CardDescription className="mt-0.5">
                        {count} questions ({gameQuestions.filter(q => q.status === "ready").length} ready)
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={game.status === "active" ? "success" : "muted"}>
                    {game.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <p className="mb-5 text-sm leading-relaxed text-muted">
                  {game.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/admin/questions?game=${game.type}`)}
                  >
                    <Edit className="h-3.5 w-3.5" aria-hidden />
                    Manage Questions
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedGame(game)}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addToast(
                        "Game editing will be available in a later step.",
                        "info",
                      )
                    }
                  >
                    <Edit className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Game detail dialog */}
      <Dialog open={selectedGame !== null} onOpenChange={() => setSelectedGame(null)}>
        <DialogContent className="w-[min(92vw,32rem)]">
          {selectedGame && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedGame.name}</DialogTitle>
                <DialogDescription>{selectedGame.description}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-muted">Game ID</span>
                  <span className="font-mono text-foreground">{selectedGame.id}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-muted">Status</span>
                  <Badge variant={selectedGame.status === "active" ? "success" : "muted"}>
                    {selectedGame.status}
                  </Badge>
                </div>
                <div className="flex justify-between border-b border-border/60 py-2">
                  <span className="text-muted">Questions</span>
                  <span className="text-foreground">{selectedGame.questionCount}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted">Game type</span>
                  <span className="text-foreground">{selectedGame.type}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedGame(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
