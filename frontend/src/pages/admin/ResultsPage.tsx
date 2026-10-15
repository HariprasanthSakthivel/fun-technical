import { History, Trophy } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOCK_RESULTS, type CompletedResult } from "@/data/mockData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/**
 * Results & History page.
 * Displays completed sessions with winner and summary metrics.
 */
export function ResultsPage() {
  useDocumentTitle("Results & History · Fun & Technical Activity Platform");
  const navigate = useNavigate();
  const [results] = useState<CompletedResult[]>(MOCK_RESULTS);
  const [viewResult, setViewResult] = useState<CompletedResult | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Results &amp; History
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Completed sessions and their final results.
        </p>
      </div>

      {results.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated/40 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-800">
            <History className="h-8 w-8 text-muted" aria-hidden />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            No completed sessions yet
          </h3>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Session results will appear here after a live game session is
            completed. Start a session from the Live Sessions page.
          </p>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => navigate("/admin/sessions")}
          >
            Go to Live Sessions
          </Button>
        </div>
      ) : (
        <>
          {/* Info banner */}
          <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-4 py-3 text-sm text-accent-blue-bright">
            Showing{" "}
            <strong>{results.length}</strong> completed session
            {results.length !== 1 ? "s" : ""}. Live results will populate
            automatically when sessions complete.
          </div>

          {/* Results table */}
          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-navy-900/60">
                  {["Session", "Date", "Game Type", "Teams", "Winner", "Questions", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-muted"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {results.map((s) => (
                  <tr
                    key={s.id}
                    className="bg-surface-elevated/40 transition-colors hover:bg-navy-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.date}</td>
                    <td className="px-4 py-3 text-muted">{s.gameType}</td>
                    <td className="px-4 py-3 text-foreground">{s.teams}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold text-success">
                        <Trophy className="h-3.5 w-3.5" aria-hidden />
                        {s.winner}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{s.totalQuestions}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewResult(s)}
                      >
                        View Results
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* View result dialog */}
      <Dialog open={viewResult !== null} onOpenChange={() => setViewResult(null)}>
        <DialogContent className="w-[min(92vw,30rem)]">
          {viewResult && (
            <>
              <DialogHeader>
                <DialogTitle>{viewResult.name}</DialogTitle>
                <DialogDescription>Session result summary</DialogDescription>
              </DialogHeader>
              <div className="mt-2 space-y-2 text-sm">
                {[
                  ["Session ID", viewResult.id],
                  ["Game Type", viewResult.gameType],
                  ["Date", viewResult.date],
                  ["Participating Teams", String(viewResult.teams)],
                  ["Total Questions", String(viewResult.totalQuestions)],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-border/40 py-2"
                  >
                    <span className="text-muted">{label}</span>
                    <span className="text-right text-foreground">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 py-2">
                  <span className="text-muted">Winner</span>
                  <Badge variant="success">{viewResult.winner}</Badge>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => setViewResult(null)}>
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
