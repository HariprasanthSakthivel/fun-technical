import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  LogOut,
  Mic,
  MicOff,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { GameTimerWidget } from "@/components/GameTimerWidget";
import {
  fetchGameTimer,
  fetchLightningLeaderboard,
  fetchMyActiveLightningTopic,
  fetchMyTeam,
} from "@/services/api";
import type {
  GameTimer,
  LightningLeaderboardItem,
  LightningTopicParticipant,
  Team,
} from "@/types";

export function ParticipantLightningTalksPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [activeTopic, setActiveTopic] = useState<LightningTopicParticipant | null>(null);
  const [leaderboard, setLeaderboard] = useState<LightningLeaderboardItem[]>([]);
  const [gameTimer, setGameTimer] = useState<GameTimer | null>(null);

  // Sync state every 2 seconds
  const syncState = async () => {
    try {
      if (!myTeam) {
        const t = await fetchMyTeam();
        setMyTeam(t);
      }
      const [top, lb, tm] = await Promise.all([
        fetchMyActiveLightningTopic(),
        fetchLightningLeaderboard(),
        fetchGameTimer(),
      ]);
      setActiveTopic(top);
      setLeaderboard(lb);
      setGameTimer(tm);
    } catch {
      // Quiet fallback
    }
  };

  useEffect(() => {
    syncState();
    const interval = setInterval(syncState, 2000);
    return () => clearInterval(interval);
  }, [myTeam?.id]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white/20">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/team")}
            className="text-zinc-400 hover:text-white gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Team</span>
          </Button>
          <div className="h-4 w-px bg-zinc-800" />
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-white" />
              Game 2: Lightning Talks
            </h1>
            <p className="text-[11px] text-zinc-400">
              1-Minute Technical Speaking Challenge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <GameTimerWidget timer={gameTimer} compact={true} currentGameContext="lightning-talks" />

          <div className="text-right">
            <p className="text-xs font-bold text-white">{myTeam?.team_name || "Your Team"}</p>
            <p className="text-[10px] text-zinc-400 font-mono font-bold">
              Lightning Score: {myTeam?.lightning_talks_score || 0} pts
            </p>
          </div>

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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Speaker Card & Timer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synchronized Dynamic Game Timer */}
          <GameTimerWidget timer={gameTimer} currentGameContext="lightning-talks" />

          {!activeTopic || !activeTopic.is_unlocked ? (
            /* Waiting for admin to unlock topic */
            <Card className="p-12 text-center bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-500">
                <MicOff className="w-8 h-8 animate-pulse text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">
                  Waiting for Next Speaker
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  The administrator will unlock the topic for each participant. Once unlocked, your assigned topic will be revealed here!
                </p>
              </div>
            </Card>
          ) : (
            /* Active Unlocked Topic for Speaker */
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="p-6 sm:p-8 bg-zinc-950 border-zinc-700 shadow-2xl relative overflow-hidden space-y-6">
                <div className="flex items-center justify-between">
                  <Badge variant="purple" className="text-xs uppercase font-extrabold tracking-wider bg-white text-black">
                    Active Topic Unlocked
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                    Assigned Topic
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {activeTopic.topic_name}
                  </h2>
                  {activeTopic.description && (
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {activeTopic.description}
                    </p>
                  )}
                </div>

                {/* Prohibited Taboo Words */}
                {activeTopic.prohibited_words && activeTopic.prohibited_words.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2">
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Prohibited Words (Do NOT say these!)
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activeTopic.prohibited_words.map((word) => (
                        <span
                          key={word}
                          className="px-2.5 py-1 rounded-md bg-rose-900/60 text-rose-200 border border-rose-700/80 font-mono text-xs font-bold"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Evaluation Criteria Explanation */}
              <Card className="p-6 bg-zinc-950 border-zinc-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                  Speech Evaluation Criteria
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="font-bold text-white">1. Delivery & Flow</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Confidence, clarity, and engaging explanation of the topic.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="font-bold text-white">2. Words Used</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Creative vocabulary used while successfully avoiding taboo words.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="font-bold text-white">3. Understandability</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      How clear, structured, and easy to understand your technical description is.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Col: Lightning Talks Scoreboard */}
        <div className="space-y-6">
          <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Game 2 Leaderboard
              </h3>
              <Badge variant="purple" className="text-[10px] bg-white text-black">
                Scores
              </Badge>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                No scores recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((item) => (
                  <div
                    key={item.team_id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                      item.team_id === myTeam?.id
                        ? "bg-zinc-900 border-zinc-700 font-bold"
                        : "bg-zinc-900/40 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center font-mono text-zinc-500 text-xs">
                        #{item.rank}
                      </span>
                      <span className="text-white truncate max-w-[140px]">
                        {item.team_name} {item.team_id === myTeam?.id && "(You)"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-white">
                      {item.score} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Speaker Guidelines
            </h4>
            <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside">
              <li>Each team member speaks for exactly <strong className="text-white">1 minute</strong>.</li>
              <li>Topics are given manually by the admin team.</li>
              <li>Scores earned by each speaker contribute to their team's Lightning Talks total.</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
