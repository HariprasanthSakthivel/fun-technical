import {
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSessions } from "@/context/SessionsContext";
import { useTeams } from "@/context/TeamsContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/hooks/useToast";
import type { Team, TeamStatus } from "@/types";

const PAGE_SIZE = 8;

const STATUS_BADGE: Record<TeamStatus, "success" | "warning" | "muted"> = {
  active: "success",
  registered: "success",
  pending: "warning",
  inactive: "muted",
};

interface TeamFormData {
  name: string;
  code: string;
  leaderName: string;
  members: number;
  memberNames: string; // comma separated in form
  status: TeamStatus;
  description: string;
}

const EMPTY_FORM: TeamFormData = {
  name: "",
  code: "",
  leaderName: "",
  members: 4,
  memberNames: "",
  status: "active",
  description: "",
};

export function TeamsPage() {
  useDocumentTitle("Teams · Fun & Technical Activity Platform");

  const { teams, registerTeam, updateTeam, deleteTeam, toggleTeamStatus, generateUniqueCode } =
    useTeams();
  const { sessions } = useSessions();

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TeamStatus | "">("");
  const [page, setPage] = useState(1);

  // Modals
  const [modalMode, setModalMode] = useState<"register" | "edit" | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof TeamFormData, string>>>({});
  const [viewTeam, setViewTeam] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  // Compute session participation per team
  const sessionCountByTeam = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      for (const tId of s.teamIds) {
        map[tId] = (map[tId] || 0) + 1;
      }
    }
    return map;
  }, [sessions]);

  // Filtered & paginated teams
  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.code.toLowerCase().includes(q)) {
        return false;
      }
      if (filterStatus && t.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [teams, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
  const pagedTeams = filteredTeams.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats summary
  const stats = useMemo(() => {
    const total = teams.length;
    const active = teams.filter((t) => t.status === "active" || t.status === "registered").length;
    const inactive = teams.filter((t) => t.status === "inactive").length;
    const totalMembers = teams.reduce((acc, t) => acc + (t.members || 0), 0);
    return { total, active, inactive, totalMembers };
  }, [teams]);

  function openRegisterModal() {
    setModalMode("register");
    setEditingTeamId(null);
    setForm({
      ...EMPTY_FORM,
      code: generateUniqueCode("TEAM"),
    });
    setErrors({});
  }

  function openEditModal(t: Team) {
    setModalMode("edit");
    setEditingTeamId(t.id);
    setForm({
      name: t.name,
      code: t.code,
      leaderName: t.leaderName || "",
      members: t.members,
      memberNames: (t.memberNames || []).join(", "),
      status: t.status,
      description: t.description || "",
    });
    setErrors({});
  }

  function closeModal() {
    setModalMode(null);
    setEditingTeamId(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function handleNameChange(newName: string) {
    setForm((prev) => {
      const updated = { ...prev, name: newName };
      // Auto-suggest code if registering and user hasn't manually customized a valid code
      if (modalMode === "register" && newName.trim().length >= 2) {
        updated.code = generateUniqueCode(newName);
      }
      return updated;
    });
    setErrors((prev) => ({ ...prev, name: undefined }));
  }

  function handleRegenerateCode() {
    const code = generateUniqueCode(form.name || "TEAM");
    setForm((prev) => ({ ...prev, code }));
    setErrors((prev) => ({ ...prev, code: undefined }));
  }

  function validateForm(): boolean {
    const errs: Partial<Record<keyof TeamFormData, string>> = {};
    if (!form.name.trim()) errs.name = "Team name is required.";
    if (!form.code.trim()) {
      errs.code = "Team code is required.";
    } else {
      const codeUpper = form.code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{2,10}$/.test(codeUpper)) {
        errs.code = "Code must be 2–10 uppercase letters, numbers, or dashes.";
      } else {
        const conflict = teams.find(
          (t) => t.code.toUpperCase() === codeUpper && t.id !== editingTeamId,
        );
        if (conflict) {
          errs.code = `Code "${codeUpper}" is already in use by ${conflict.name}.`;
        }
      }
    }

    if (!form.members || form.members < 1) {
      errs.members = "Must have at least 1 member.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validateForm()) return;

    const parsedMembers = form.memberNames
      ? form.memberNames
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean)
      : [];

    if (modalMode === "register") {
      registerTeam({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        leaderName: form.leaderName.trim() || undefined,
        members: Number(form.members),
        memberNames: parsedMembers.length > 0 ? parsedMembers : undefined,
        status: form.status,
        description: form.description.trim() || undefined,
      });
    } else if (modalMode === "edit" && editingTeamId) {
      updateTeam(editingTeamId, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        leaderName: form.leaderName.trim() || undefined,
        members: Number(form.members),
        memberNames: parsedMembers.length > 0 ? parsedMembers : undefined,
        status: form.status,
        description: form.description.trim() || undefined,
      });
    }

    closeModal();
  }

  function confirmDelete() {
    if (!deleteTarget) return;

    // Safety check: Does team have session participation?
    const sessionsParticipated = sessionCountByTeam[deleteTarget.id] || deleteTarget.sessionsParticipated || 0;
    if (sessionsParticipated > 0) {
      // Instead of hard deleting and breaking history, deactivate team
      toggleTeamStatus(deleteTarget.id);
      toast.info(
        `Team "${deleteTarget.name}" has participated in ${sessionsParticipated} session(s). To preserve historical data, the team was deactivated instead of deleted.`,
      );
    } else {
      deleteTeam(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Team Management
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Register teams, manage members, and configure team identities for game sessions.
          </p>
        </div>
        <Button size="sm" onClick={openRegisterModal}>
          <Plus className="h-4 w-4" aria-hidden />
          Register Team
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Teams</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-success">Active Teams</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Inactive</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.inactive}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-blue-bright">
            Total Participants
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.totalMembers}</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            placeholder="Search by team name or code…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as TeamStatus | "");
            setPage(1);
          }}
          className="w-40"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>

        {(search || filterStatus) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterStatus("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {pagedTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface-elevated/60 py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted" aria-hidden />
          <p className="font-semibold text-foreground">No teams found</p>
          <p className="mt-1 text-sm text-muted">
            {search ? "Try adjusting your search criteria." : "Register a team to get started."}
          </p>
          <Button size="sm" className="mt-4" onClick={openRegisterModal}>
            <Plus className="h-4 w-4" aria-hidden />
            Register Team
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-navy-900/60">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Team Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Code
                </th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted md:table-cell">
                  Leader
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Members
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted lg:table-cell">
                  Sessions
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {pagedTeams.map((team) => {
                const sessionsCount = sessionCountByTeam[team.id] || team.sessionsParticipated || 0;
                return (
                  <tr
                    key={team.id}
                    className="bg-surface-elevated/40 transition-colors hover:bg-navy-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div>
                        <span>{team.name}</span>
                        {team.description && (
                          <p className="truncate text-xs text-muted">{team.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-accent-blue-bright">
                      {team.code}
                    </td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      {team.leaderName || "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{team.members}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleTeamStatus(team.id)}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        title="Click to toggle active/inactive"
                      >
                        <Badge variant={STATUS_BADGE[team.status] || "muted"}>{team.status}</Badge>
                      </button>
                    </td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">
                      <span className="font-semibold text-foreground">{sessionsCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded p-1.5 text-muted hover:bg-navy-800 hover:text-foreground"
                          onClick={() => setViewTeam(team)}
                          title="View team details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1.5 text-muted hover:bg-navy-800 hover:text-accent-blue-bright"
                          onClick={() => openEditModal(team)}
                          title="Edit team"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1.5 text-muted hover:bg-navy-800 hover:text-danger"
                          onClick={() => setDeleteTarget(team)}
                          title="Delete / Deactivate team"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredTeams.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredTeams.length)} of{" "}
            {filteredTeams.length} teams
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

      {/* Team Details Modal */}
      <Dialog open={viewTeam !== null} onOpenChange={() => setViewTeam(null)}>
        <DialogContent className="w-[min(92vw,32rem)]">
          {viewTeam && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-bold">{viewTeam.name}</DialogTitle>
                  <Badge variant={STATUS_BADGE[viewTeam.status] || "muted"}>
                    {viewTeam.status}
                  </Badge>
                </div>
                <DialogDescription>
                  Team ID: {viewTeam.id} · Registered: {viewTeam.createdAt}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/40 py-2">
                  <span className="text-muted">Unique Team Code</span>
                  <span className="font-mono font-bold text-accent-blue-bright">
                    {viewTeam.code}
                  </span>
                </div>

                <div className="flex justify-between border-b border-border/40 py-2">
                  <span className="text-muted">Team Leader</span>
                  <span className="text-foreground">{viewTeam.leaderName || "None designated"}</span>
                </div>

                <div className="flex justify-between border-b border-border/40 py-2">
                  <span className="text-muted">Number of Members</span>
                  <span className="text-foreground">{viewTeam.members}</span>
                </div>

                {viewTeam.memberNames && viewTeam.memberNames.length > 0 && (
                  <div className="border-b border-border/40 py-2">
                    <span className="text-xs uppercase font-semibold text-muted">Member Roster</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {viewTeam.memberNames.map((name, i) => (
                        <span
                          key={i}
                          className="rounded bg-navy-800 px-2 py-0.5 text-xs text-foreground"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {viewTeam.description && (
                  <div className="border-b border-border/40 py-2">
                    <span className="text-xs uppercase font-semibold text-muted">Description</span>
                    <p className="mt-1 text-xs text-muted">{viewTeam.description}</p>
                  </div>
                )}

                {/* Performance & Session History */}
                <div className="rounded-xl border border-border/60 bg-navy-900/60 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-accent-purple-bright">
                    <Award className="h-4 w-4" />
                    Historical Performance &amp; Activity
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="rounded bg-navy-800/80 p-2">
                      <p className="text-xs text-muted">Sessions</p>
                      <p className="text-base font-bold text-foreground">
                        {sessionCountByTeam[viewTeam.id] || viewTeam.sessionsParticipated || 0}
                      </p>
                    </div>
                    <div className="rounded bg-navy-800/80 p-2">
                      <p className="text-xs text-muted">Points</p>
                      <p className="text-base font-bold text-foreground">
                        {viewTeam.totalPoints ?? 0}
                      </p>
                    </div>
                    <div className="rounded bg-navy-800/80 p-2">
                      <p className="text-xs text-muted">Correct Ans</p>
                      <p className="text-base font-bold text-success">
                        {viewTeam.correctAnswers ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const t = viewTeam;
                    setViewTeam(null);
                    openEditModal(t);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Team
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setViewTeam(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Register / Edit Team Modal */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="w-[min(92vw,32rem)]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "register" ? "Register Team" : "Edit Team Details"}
            </DialogTitle>
            <DialogDescription>
              {modalMode === "register"
                ? "Register a new participating team with a unique team join code."
                : "Update team identity, roster, or active status."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tm-name">Team Name *</Label>
              <Input
                id="tm-name"
                placeholder="e.g. Team Phoenix"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tm-code">Team Code *</Label>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="flex items-center gap-1 text-xs text-accent-blue-bright hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Auto-generate code
                </button>
              </div>
              <Input
                id="tm-code"
                placeholder="e.g. PHX-01"
                value={form.code}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                  setErrors((prev) => ({ ...prev, code: undefined }));
                }}
                className="font-mono uppercase font-bold"
              />
              <p className="text-xs text-muted">
                Unique identifier used by participants to join live sessions.
              </p>
              {errors.code && <p className="text-xs text-danger">{errors.code}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tm-leader">Team Leader Name (optional)</Label>
                <Input
                  id="tm-leader"
                  placeholder="e.g. Sarah Connor"
                  value={form.leaderName}
                  onChange={(e) => setForm((prev) => ({ ...prev, leaderName: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tm-members">Number of Members *</Label>
                <Input
                  id="tm-members"
                  type="number"
                  min={1}
                  max={20}
                  value={form.members}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, members: Number(e.target.value) }))
                  }
                />
                {errors.members && <p className="text-xs text-danger">{errors.members}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tm-membernames">Member Names (optional, comma-separated)</Label>
              <Input
                id="tm-membernames"
                placeholder="e.g. Sarah, John, Kyle, T-800"
                value={form.memberNames}
                onChange={(e) => setForm((prev) => ({ ...prev, memberNames: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tm-status">Team Status</Label>
              <Select
                id="tm-status"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value as TeamStatus }))
                }
                className="w-40"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tm-desc">Team Description (optional)</Label>
              <Textarea
                id="tm-desc"
                placeholder="Department, special focus, or notes…"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
              >
                Reset Form
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button size="sm" type="button" onClick={handleSubmit}>
                  {modalMode === "register" ? "Register Team" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          {deleteTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Delete Team</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove &ldquo;{deleteTarget.name}&rdquo; ({deleteTarget.code})?
                </DialogDescription>
              </DialogHeader>

              {(sessionCountByTeam[deleteTarget.id] || deleteTarget.sessionsParticipated || 0) > 0 ? (
                <div className="mt-2 rounded-xl border border-warning/40 bg-warning/5 p-3 flex gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
                  <p className="text-xs text-warning">
                    This team has participated in past session(s). To protect historical records,
                    clicking confirm will set its status to <strong>Inactive</strong> rather than
                    deleting it permanently.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  This action is permanent and will remove the team from the registry.
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete}>
                  Confirm
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
