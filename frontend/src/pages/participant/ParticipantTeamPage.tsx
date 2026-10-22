import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronRight,
  Edit2,
  Gamepad2,
  Mic,
  RefreshCw,
  Sparkles,
  Trophy,
  Users,
  LogOut,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { fetchGames, fetchMyTeam, updateTeamName } from "@/services/api";
import type { GameItem, Team } from "@/types";

export function ParticipantTeamPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [customGames, setCustomGames] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTeam = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [data, allGames] = await Promise.all([
        fetchMyTeam(),
        fetchGames().catch(() => [] as GameItem[]),
      ]);
      setTeam(data);
      setNewTeamName(data.team_name);
      setCustomGames(
        allGames.filter(
          (g) => g.game_code !== "tech-detective" && g.game_code !== "lightning-talks"
        )
      );
      setErrorMsg(null);
    } catch {
      setTeam(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeam();
    const interval = setInterval(() => {
      loadTeam(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveTeamName = async () => {
    if (!team || !newTeamName.trim()) return;
    try {
      setIsSavingName(true);
      const updated = await updateTeamName(team.id, newTeamName.trim());
      setTeam(updated);
      setIsEditDialogOpen(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update team name");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white/20">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
          <div className="h-5 w-px bg-zinc-800" />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
            Participant Hub
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-white">
              {currentUser?.display_name || currentUser?.username}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono uppercase">
              {team ? team.team_name : "Participant"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-zinc-400 font-medium">Checking team status...</p>
          </div>
        ) : !team ? (
          /* Waiting for Team Formation */
          <div className="max-w-xl mx-auto py-12 text-center space-y-6">
            <Card className="p-8 bg-zinc-950 border-zinc-800 shadow-2xl space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
                <Users className="w-8 h-8 animate-pulse text-zinc-300" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Team Formation in Progress
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Welcome, <span className="font-bold text-white">{currentUser?.display_name}</span>! The admin team is gathering registered participants and will randomly form the teams.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left space-y-2">
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                  Team Formation Rules
                </p>
                <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                  <li>The administrator configures the team size (e.g. 2, 3, 4, 5+ members).</li>
                  <li>All participants are evenly distributed into balanced teams.</li>
                  <li>Once formed, you and your teammates will be able to customize your team name.</li>
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={() => loadTeam(true)}
                disabled={isRefreshing}
                className="w-full gap-2 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Checking Server..." : "Refresh Team Status"}
              </Button>
            </Card>
          </div>
        ) : (
          /* Formed Team Overview */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Team Hero Card */}
            <Card className="p-6 sm:p-8 bg-zinc-950 border-zinc-800 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white text-black">
                      Your Assigned Team
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      Code: {team.team_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {team.team_name}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                      title="Edit Team Name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Collaborate with your team to guess technologies in Game 1 and present topics in Game 2.
                  </p>
                </div>

                {/* Score Summary */}
                <div className="flex items-center gap-3 bg-black p-3.5 rounded-xl border border-zinc-800">
                  <div className="text-center px-3 border-r border-zinc-800">
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase">Game 1</p>
                    <p className="text-lg font-black text-white">{team.tech_detective_score} pts</p>
                  </div>
                  <div className="text-center px-3 border-r border-zinc-800">
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase">Game 2</p>
                    <p className="text-lg font-black text-white">{team.lightning_talks_score} pts</p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase">Total</p>
                    <p className="text-xl font-black text-emerald-400">{team.total_score} pts</p>
                  </div>
                </div>
              </div>

              {/* Teammates List */}
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-white" />
                  Team Roster ({team.members.length} Members)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className={`p-3 rounded-xl border flex items-center gap-3 ${
                        member.id === currentUser?.id
                          ? "bg-zinc-900 border-zinc-700"
                          : "bg-zinc-950 border-zinc-800"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-white">
                        {member.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {member.display_name}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          @{member.username} {member.id === currentUser?.id && "(You)"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Games Navigation Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Games Available
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Enter the arena as directed by the administrator.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/leaderboard")}
                  className="gap-2 text-xs border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Final Leaderboard
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Game 1: Tech Detective Card */}
                <Card className="p-6 bg-zinc-950 border-zinc-800 hover:border-zinc-600 transition-all shadow-xl group">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                      <Gamepad2 className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-black">
                      Game 1
                    </span>
                  </div>

                  <h4 className="text-xl font-extrabold text-white tracking-tight">
                    Tech Detective
                  </h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Image-based technology guessing game with 2 to 4 clean uploaded images per question. Buzz first to state your answer for question marks!
                  </p>

                  <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-xs text-zinc-400">
                      Your Score: <strong className="text-white font-mono">{team.tech_detective_score} pts</strong>
                    </div>
                    <Button
                      onClick={() => navigate("/games/tech-detective")}
                      className="bg-white hover:bg-zinc-200 text-black text-xs font-bold gap-1.5"
                    >
                      Enter Game Arena
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>

                {/* Game 2: Lightning Talks Card */}
                <Card className="p-6 bg-zinc-950 border-zinc-800 hover:border-zinc-600 transition-all shadow-xl group">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                      <Mic className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-black">
                      Game 2
                    </span>
                  </div>

                  <h4 className="text-xl font-extrabold text-white tracking-tight">
                    Lightning Talks
                  </h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    1-minute technical speaking challenge with topics manually given by the admin. Explain your topic cleanly without saying the taboo words!
                  </p>

                  <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-xs text-zinc-400">
                      Your Score: <strong className="text-white font-mono">{team.lightning_talks_score} pts</strong>
                    </div>
                    <Button
                      onClick={() => navigate("/games/lightning-talks")}
                      className="bg-white hover:bg-zinc-200 text-black text-xs font-bold gap-1.5"
                    >
                      Enter Talks Arena
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>

                {/* Dynamically Created Games (Game 3, Game 4, etc.) */}
                {customGames.map((cg, idx) => (
                  <Card
                    key={cg.id}
                    className="p-6 bg-zinc-950 border-zinc-800 hover:border-zinc-600 transition-all shadow-xl group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-black">
                        Game {idx + 3}
                      </span>
                    </div>

                    <h4 className="text-xl font-extrabold text-white tracking-tight">
                      {cg.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {cg.description || "Activity with questions, multimedia clues, and real-time timer."}
                    </p>

                    <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                      <div className="text-xs text-zinc-400 font-mono">
                        Format: <strong className="text-white capitalize">{cg.game_type}</strong>
                      </div>
                      <Button
                        onClick={() => navigate(`/games/${cg.game_code || cg.id}`)}
                        className="bg-white hover:bg-zinc-200 text-black text-xs font-bold gap-1.5"
                      >
                        Enter Arena
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Team Name Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Team Name</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Choose a name for your team. All teammates and the admin will see this updated name.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="py-2">
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. AI Titans"
              className="bg-zinc-900 border-zinc-800 text-white"
              maxLength={64}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-zinc-700 text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTeamName}
              disabled={isSavingName || !newTeamName.trim()}
              className="bg-white text-black hover:bg-zinc-200 font-bold"
            >
              {isSavingName ? "Saving..." : "Save Team Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
