import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
import { Select } from "@/components/ui/select";
import { useQuestions } from "@/context/QuestionsContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/hooks/useToast";
import type {
  ContentType,
  Difficulty,
  GameType,
  Question,
  QuestionStatus,
} from "@/types";

const PAGE_SIZE = 10;

const GAME_LABELS: Record<GameType, string> = {
  "guess-tech": "Guess the Technology",
  "explain-without-naming": "Explain Without Naming",
};

const DIFFICULTY_BADGE: Record<Difficulty, "default" | "warning" | "purple"> = {
  easy: "default",
  medium: "warning",
  hard: "purple",
};

const STATUS_BADGE: Record<QuestionStatus, "success" | "warning" | "muted"> = {
  ready: "success",
  draft: "warning",
  archived: "muted",
};

const CONTENT_LABELS: Record<ContentType, string> = {
  text: "Text",
  image: "Image",
  "multiple-images": "Multi-Image",
  "text-images": "Text + Images",
};

type SortField = "order" | "createdAt" | "title";
type SortDirection = "asc" | "desc";

export function QuestionBankPage() {
  useDocumentTitle("Question Bank · Fun & Technical Activity Platform");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameParam = searchParams.get("game") as GameType | null;

  const { questions, deleteQuestion, duplicateQuestion } = useQuestions();

  // Search & filter state
  const [search, setSearch] = useState("");
  const [filterGame, setFilterGame] = useState<GameType | "">(gameParam ?? "");
  const [filterContentType, setFilterContentType] = useState<ContentType | "">("");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "">("");
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | "">("");
  const [sortField, setSortField] = useState<SortField>("order");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  // Dialog state
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  // Stats
  const stats = useMemo(() => {
    const total = questions.length;
    const guessTech = questions.filter((q) => q.gameType === "guess-tech").length;
    const explain = questions.filter((q) => q.gameType === "explain-without-naming").length;
    const ready = questions.filter((q) => q.status === "ready").length;
    const draft = questions.filter((q) => q.status === "draft").length;
    const archived = questions.filter((q) => q.status === "archived").length;
    return { total, guessTech, explain, ready, draft, archived };
  }, [questions]);

  // Filtered and sorted questions
  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = questions.filter((question) => {
      if (q && !question.title.toLowerCase().includes(q) && !question.id.toLowerCase().includes(q)) {
        return false;
      }
      if (filterGame && question.gameType !== filterGame) return false;
      if (filterContentType && question.contentType !== filterContentType) return false;
      if (filterDifficulty && question.difficulty !== filterDifficulty) return false;
      if (filterStatus && question.status !== filterStatus) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "order") {
        cmp = a.order - b.order;
      } else if (sortField === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === "createdAt") {
        cmp = (a.createdAt || "").localeCompare(b.createdAt || "");
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [questions, search, filterGame, filterContentType, filterDifficulty, filterStatus, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const pagedQuestions = filteredQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setFilterGame("");
    setFilterContentType("");
    setFilterDifficulty("");
    setFilterStatus("");
    setPage(1);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function handleDuplicate(id: string) {
    duplicateQuestion(id);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteQuestion(deleteTarget.id);
    toast.success(`Question "${deleteTarget.title}" deleted.`);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Question Bank
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Manage, organize, and configure questions for technical activities.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/admin/questions/new")}>
          <Plus className="h-4 w-4" aria-hidden />
          Add Question
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-blue-bright">Guess Tech</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.guessTech}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-purple-bright">Explain W/O</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.explain}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-success">Ready</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.ready}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning">Draft</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.draft}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Archived</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.archived}</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            placeholder="Search by title or ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={filterGame}
          onChange={(e) => {
            setFilterGame(e.target.value as GameType | "");
            setPage(1);
          }}
          className="w-44"
          aria-label="Filter by game"
        >
          <option value="">All games</option>
          <option value="guess-tech">Guess the Tech</option>
          <option value="explain-without-naming">Explain W/O Naming</option>
        </Select>

        <Select
          value={filterContentType}
          onChange={(e) => {
            setFilterContentType(e.target.value as ContentType | "");
            setPage(1);
          }}
          className="w-36"
          aria-label="Filter by content type"
        >
          <option value="">All content</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="multiple-images">Multi-Image</option>
          <option value="text-images">Text + Images</option>
        </Select>

        <Select
          value={filterDifficulty}
          onChange={(e) => {
            setFilterDifficulty(e.target.value as Difficulty | "");
            setPage(1);
          }}
          className="w-36"
          aria-label="Filter by difficulty"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>

        <Select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as QuestionStatus | "");
            setPage(1);
          }}
          className="w-32"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ready">Ready</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>

        <Select
          value={`${sortField}-${sortDirection}`}
          onChange={(e) => {
            const [f, d] = e.target.value.split("-") as [SortField, SortDirection];
            setSortField(f);
            setSortDirection(d);
          }}
          className="w-44"
          aria-label="Sort by"
        >
          <option value="order-asc">Order (1 → 99)</option>
          <option value="order-desc">Order (99 → 1)</option>
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="title-asc">Title (A → Z)</option>
          <option value="title-desc">Title (Z → A)</option>
        </Select>

        {(search || filterGame || filterContentType || filterDifficulty || filterStatus) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {pagedQuestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated/60 py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-muted" aria-hidden />
          <p className="font-semibold text-foreground">No questions found</p>
          <p className="mt-1 text-sm text-muted">
            Try adjusting your search filters or create a new question.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => navigate("/admin/questions/new")}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Question
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-navy-900/60">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  <button
                    onClick={() => toggleSort("title")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Question
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted md:table-cell">
                  Game
                </th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted lg:table-cell">
                  Content Type
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Difficulty
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  <button
                    onClick={() => toggleSort("order")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Order
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {pagedQuestions.map((q) => (
                <tr
                  key={q.id}
                  className="bg-surface-elevated/40 transition-colors hover:bg-navy-800/40"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted">{q.id}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-foreground">
                    <div>
                      <span>{q.title}</span>
                      {q.instructions && (
                        <p className="truncate text-xs text-muted">{q.instructions}</p>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    <span className="text-xs">{GAME_LABELS[q.gameType]}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">
                    <span className="text-xs">{CONTENT_LABELS[q.contentType]}</span>
                    {q.images && q.images.length > 0 && (
                      <span className="ml-1 text-[11px] text-accent-blue-bright">
                        ({q.images.length} img)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={DIFFICULTY_BADGE[q.difficulty]}>{q.difficulty}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    #{q.order}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[q.status]}>{q.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="rounded p-1.5 text-muted hover:bg-navy-800 hover:text-foreground"
                        onClick={() => setViewQuestion(q)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded p-1.5 text-muted hover:bg-navy-800 hover:text-accent-blue-bright"
                        onClick={() => navigate(`/admin/questions/${q.id}/edit`)}
                        title="Edit question"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded p-1.5 text-muted hover:bg-navy-800 hover:text-accent-purple-bright"
                        onClick={() => handleDuplicate(q.id)}
                        title="Duplicate question"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded p-1.5 text-muted hover:bg-navy-800 hover:text-danger"
                        onClick={() => setDeleteTarget(q)}
                        title="Delete question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredQuestions.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredQuestions.length)} of{" "}
            {filteredQuestions.length} results
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[3rem] text-center text-muted">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Question Dialog */}
      <Dialog open={viewQuestion !== null} onOpenChange={() => setViewQuestion(null)}>
        <DialogContent className="w-[min(94vw,36rem)] max-h-[85vh] overflow-y-auto">
          {viewQuestion && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={viewQuestion.gameType === "guess-tech" ? "default" : "purple"}>
                    {GAME_LABELS[viewQuestion.gameType]}
                  </Badge>
                  <Badge variant={STATUS_BADGE[viewQuestion.status]}>
                    {viewQuestion.status}
                  </Badge>
                </div>
                <DialogTitle className="mt-1">{viewQuestion.title}</DialogTitle>
                <DialogDescription>
                  Question ID: {viewQuestion.id} · Order: #{viewQuestion.order} · Difficulty: {viewQuestion.difficulty}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-3 text-sm">
                {viewQuestion.instructions && (
                  <div>
                    <span className="text-xs font-semibold uppercase text-muted">Instructions</span>
                    <p className="mt-0.5 text-foreground">{viewQuestion.instructions}</p>
                  </div>
                )}

                {viewQuestion.gameType === "guess-tech" && (
                  <>
                    {viewQuestion.textContent && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted">Text Clue</span>
                        <p className="mt-0.5 whitespace-pre-wrap rounded bg-navy-900 p-2 text-foreground font-mono text-xs">
                          {viewQuestion.textContent}
                        </p>
                      </div>
                    )}
                    {viewQuestion.images && viewQuestion.images.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted">Images ({viewQuestion.images.length})</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {viewQuestion.images.map((img) => (
                            <img
                              key={img.id}
                              src={img.dataUrl}
                              alt={img.caption || "Question clue"}
                              className="h-20 w-20 rounded-lg border border-border object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {viewQuestion.gameType === "explain-without-naming" && (
                  <>
                    <div>
                      <span className="text-xs font-semibold uppercase text-muted">Secret Topic</span>
                      <p className="mt-0.5 font-semibold text-accent-purple-bright">{viewQuestion.secretTopic}</p>
                    </div>
                    {viewQuestion.topicDescription && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted">Topic Description</span>
                        <p className="mt-0.5 text-foreground">{viewQuestion.topicDescription}</p>
                      </div>
                    )}
                    {viewQuestion.prohibitedWords && viewQuestion.prohibitedWords.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted">Prohibited Words</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {viewQuestion.prohibitedWords.map((word) => (
                            <span
                              key={word}
                              className="rounded bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="rounded-xl border border-border/60 bg-navy-900/50 p-3 space-y-2">
                  <div>
                    <span className="text-xs font-semibold uppercase text-muted">Correct Answer</span>
                    <p className="mt-0.5 font-bold text-accent-blue-bright">
                      {viewQuestion.correctAnswer}
                    </p>
                  </div>
                  {viewQuestion.acceptedAnswers && viewQuestion.acceptedAnswers.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold uppercase text-muted">Accepted Variants</span>
                      <p className="mt-0.5 text-xs text-muted">
                        {viewQuestion.acceptedAnswers.join(", ")}
                      </p>
                    </div>
                  )}
                  {viewQuestion.explanation && (
                    <div>
                      <span className="text-xs font-semibold uppercase text-muted">Answer Explanation</span>
                      <p className="mt-0.5 text-xs text-muted">{viewQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewQuestion(null);
                    navigate(`/admin/questions/${viewQuestion.id}/edit`);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Question
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setViewQuestion(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          {deleteTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Delete Question</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &ldquo;{deleteTarget.title}&rdquo; ({deleteTarget.id})? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
