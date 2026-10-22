import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, LogOut, RefreshCw, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { fetchFinalLeaderboard } from "@/services/api";
import type { FinalLeaderboardItem } from "@/types";

export function FinalLeaderboardPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [leaderboard, setLeaderboard] = useState<FinalLeaderboardItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadScores = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchFinalLeaderboard();
      setLeaderboard(data);
    } catch {
      // Quiet fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadScores();
    const interval = setInterval(() => {
      loadScores();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const topThree = leaderboard.slice(0, 3);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white/20">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(currentUser?.role === "admin" ? "/admin" : "/team")}
            className="text-zinc-400 hover:text-white gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="h-5 w-px bg-zinc-800" />
          <BrandLogo size="sm" />
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Final Combined Leaderboard
            </h1>
            <p className="text-[11px] text-zinc-400">
              Total Score = Tech Detective + Lightning Talks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadScores()}
            disabled={isRefreshing}
            className="text-xs border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {currentUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Podium for Top 3 */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* 2nd Place */}
            {topThree[1] && (
              <Card className="p-6 bg-zinc-950 border-zinc-800 text-center order-2 md:order-1 flex flex-col items-center justify-between shadow-xl relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-black text-xl mb-3 shadow-lg">
                  2
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">2nd Place</span>
                  <h3 className="text-xl font-bold text-white">{topThree[1].team_name}</h3>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800 w-full flex justify-between text-xs text-zinc-400">
                  <span>G1: {topThree[1].tech_detective_score}</span>
                  <span>G2: {topThree[1].lightning_talks_score}</span>
                  <span className="font-bold text-white font-mono">{topThree[1].total_score} pts</span>
                </div>
              </Card>
            )}

            {/* 1st Place Champion */}
            {topThree[0] && (
              <Card className="p-8 bg-zinc-950 border-white/40 text-center order-1 md:order-2 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden md:-mt-4 ring-1 ring-white/20">
                <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center font-black text-2xl mb-3 shadow-xl">
                  <Crown className="w-8 h-8 text-black" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white text-black px-2 py-0.5 rounded">
                    Champion
                  </span>
                  <h3 className="text-2xl font-black text-white">{topThree[0].team_name}</h3>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800 w-full flex justify-between text-xs text-zinc-400">
                  <span>G1: <strong className="text-white">{topThree[0].tech_detective_score}</strong></span>
                  <span>G2: <strong className="text-white">{topThree[0].lightning_talks_score}</strong></span>
                  <span className="text-base font-black text-white font-mono">{topThree[0].total_score} pts</span>
                </div>
              </Card>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <Card className="p-6 bg-zinc-950 border-zinc-800 text-center order-3 flex flex-col items-center justify-between shadow-xl relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center font-black text-xl mb-3 shadow-lg">
                  3
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">3rd Place</span>
                  <h3 className="text-xl font-bold text-white">{topThree[2].team_name}</h3>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800 w-full flex justify-between text-xs text-zinc-400">
                  <span>G1: {topThree[2].tech_detective_score}</span>
                  <span>G2: {topThree[2].lightning_talks_score}</span>
                  <span className="font-bold text-white font-mono">{topThree[2].total_score} pts</span>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Complete Ranked Table */}
        <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Overall Team Standings
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              {leaderboard.length} Teams
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">
              No scores recorded yet. Standings will appear once teams earn points.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-bold">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Team Name</th>
                    <th className="py-3 px-3 text-center">Tech Detective</th>
                    <th className="py-3 px-3 text-center">Lightning Talks</th>
                    <th className="py-3 px-3 text-right font-black">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {leaderboard.map((item) => (
                    <tr key={item.team_id} className="hover:bg-zinc-900/60">
                      <td className="py-3.5 px-3 font-mono font-bold text-white">
                        #{item.rank}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-white">
                        {item.team_name}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-zinc-300">
                        {item.tech_detective_score} pts
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-zinc-300">
                        {item.lightning_talks_score} pts
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-black text-white text-sm">
                        {item.total_score} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
