import { Medal, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { MOCK_SCORES, MOCK_SESSIONS } from "@/data/mockData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { GameType } from "@/types";
import { cn } from "@/utils/cn";

const RANK_STYLES: Record<number, string> = {
  1: "bg-warning/15 text-warning border-warning/30",
  2: "bg-muted/10 text-foreground border-border",
  3: "bg-accent-purple/15 text-accent-purple-bright border-accent-purple/30",
};

const RANK_ICONS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

/** Scoreboard page with ranked table and top-3 visual highlight. */
export function ScoreboardPage() {
  useDocumentTitle("Scoreboard · Fun & Technical Activity Platform");

  const [filterSession, setFilterSession] = useState("");
  const [filterGame, setFilterGame] = useState<GameType | "">("");

  const scores = useMemo(() => {
    // In a real app, scores would be filtered by session/game.
    // For the mock, all data is demonstration data.
    return MOCK_SCORES;
  }, [filterSession, filterGame]);

  const top3 = scores.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Scoreboard
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Preview rankings — live scores available when sessions run.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value as GameType | "")}
            className="w-48"
            aria-label="Filter by game"
          >
            <option value="">All games</option>
            <option value="guess-tech">Guess the Technology</option>
            <option value="explain-without-naming">Explain Without Naming</option>
          </Select>
          <Select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="w-52"
            aria-label="Filter by session"
          >
            <option value="">All sessions (mock)</option>
            {MOCK_SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Mock data notice */}
      <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
        <strong>Preview data</strong> — scores shown are sample data. Live scoring requires a running game session.
      </div>

      {/* Top 3 podium cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {top3.map((entry) => (
          <div
            key={entry.teamId}
            className={cn(
              "rounded-2xl border p-5 text-center",
              RANK_STYLES[entry.rank] ?? "border-border bg-navy-900/40",
            )}
          >
            <div className="mb-2 text-3xl">{RANK_ICONS[entry.rank] ?? `#${entry.rank}`}</div>
            <p className="font-display text-base font-semibold text-foreground">
              {entry.teamName}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">
              {entry.totalPoints} pts
            </p>
            <p className="mt-1 text-xs text-muted">
              {entry.correctAnswers}✓ / {entry.incorrectAnswers}✗
            </p>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-navy-900/60">
              {["Rank", "Team", "Points", "Correct", "Incorrect", "Attempted"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {scores.map((entry) => (
              <tr
                key={entry.teamId}
                className={cn(
                  "transition-colors hover:bg-navy-800/40",
                  entry.rank <= 3
                    ? "bg-surface-elevated/60"
                    : "bg-surface-elevated/30",
                )}
              >
                <td className="px-4 py-3">
                  {entry.rank <= 3 ? (
                    <span className="flex items-center gap-1.5">
                      {RANK_ICONS[entry.rank]}
                      <Badge
                        variant={
                          entry.rank === 1
                            ? "warning"
                            : entry.rank === 2
                            ? "muted"
                            : "purple"
                        }
                      >
                        #{entry.rank}
                      </Badge>
                    </span>
                  ) : (
                    <span className="text-muted">#{entry.rank}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {entry.teamName}
                </td>
                <td className="px-4 py-3 font-display font-semibold text-foreground">
                  {entry.totalPoints}
                </td>
                <td className="px-4 py-3 text-success">{entry.correctAnswers}</td>
                <td className="px-4 py-3 text-danger">{entry.incorrectAnswers}</td>
                <td className="px-4 py-3 text-muted">{entry.questionsAttempted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scores.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Trophy className="mb-3 h-10 w-10 text-muted" aria-hidden />
          <p className="font-semibold text-foreground">No scores yet</p>
          <p className="mt-1 text-sm text-muted">Scores will appear here once a session is completed.</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-2">
          <Medal className="h-3.5 w-3.5" aria-hidden />
          Points: 50 per correct answer (base rate — configurable in Settings)
        </span>
        {scores.length > 0 && (
          <span>Showing {scores.length} of {scores.length} teams</span>
        )}
      </div>
    </div>
  );
}
