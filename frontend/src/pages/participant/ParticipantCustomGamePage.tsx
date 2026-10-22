import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Clock,
  Lock,
  Radio,
  Trophy,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GameTimerWidget } from "@/components/GameTimerWidget";
import { MediaViewer } from "@/components/MediaViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  fetchActiveGameQuestion,
  fetchCustomGameBuzzerQueue,
  fetchGames,
  fetchGameScores,
  fetchGameTimer,
  fetchMyTeam,
  fetchTeams,
  pressCustomGameBuzzer,
} from "@/services/api";
import type { BuzzerQueue, GameItem, GameQuestion, GameTimer, Team, TeamGameScore } from "@/types";

interface LeaderboardItem {
  team_id: string;
  team_name: string;
  score: number;
  rank: number;
}

export function ParticipantCustomGamePage() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  useAuth();

  const [game, setGame] = useState<GameItem | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<GameQuestion | null>(null);
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerQueue | null>(null);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [buzzerMessage, setBuzzerMessage] = useState<string | null>(null);
  const [gameTimer, setGameTimer] = useState<GameTimer | null>(null);
  const [teamScore, setTeamScore] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync game data, active question, timer, and leaderboard
  const syncGameState = async () => {
    if (!gameCode) return;
    try {
      const [allGames, timerData, questionData, teamData, allTeams, allScores] = await Promise.all([
        fetchGames(),
        fetchGameTimer(),
        fetchActiveGameQuestion(gameCode),
        fetchMyTeam().catch(() => null),
        fetchTeams().catch(() => [] as Team[]),
        fetchGameScores(gameCode).catch(() => [] as TeamGameScore[]),
      ]);

      const foundGame = allGames.find((g) => g.game_code === gameCode || g.id === gameCode);
      if (foundGame) {
        setGame(foundGame);
      }

      setGameTimer(timerData);
      setActiveQuestion(questionData);

      if (questionData) {
        const bq = await fetchCustomGameBuzzerQueue(gameCode, questionData.id).catch(() => null);
        setBuzzerQueue(bq);
      } else {
        setBuzzerQueue(null);
      }

      // Compute leaderboard for this game
      const scoreMap = new Map<string, number>();
      allScores.forEach((s) => scoreMap.set(String(s.team_id), s.score));

      const entries = allTeams.map((t) => ({
        team_id: String(t.id),
        team_name: t.team_name,
        score: scoreMap.get(String(t.id)) || 0,
      }));
      entries.sort((a, b) => b.score - a.score || a.team_name.localeCompare(b.team_name));
      const ranked = entries.map((e, idx) => ({
        ...e,
        rank: idx + 1,
      }));
      setLeaderboard(ranked);

      if (teamData) {
        setMyTeam(teamData);
        setTeamScore(scoreMap.get(String(teamData.id)) || 0);
      }
    } catch {
      // Quiet fallback for polling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncGameState();
    const interval = setInterval(syncGameState, 2000);
    return () => clearInterval(interval);
  }, [gameCode, activeQuestion?.id]);

  const handleBuzz = async () => {
    if (!gameCode || !activeQuestion) return;
    try {
      setIsBuzzing(true);
      setBuzzerMessage(null);
      const res = await pressCustomGameBuzzer(gameCode);
      setBuzzerMessage(`Buzzer confirmed! Position #${res.position}`);
      const bq = await fetchCustomGameBuzzerQueue(gameCode, activeQuestion.id);
      setBuzzerQueue(bq);
    } catch (err: unknown) {
      setBuzzerMessage(err instanceof Error ? err.message : "Buzzer request failed");
    } finally {
      setIsBuzzing(false);
    }
  };

  const myBuzzerEntry = buzzerQueue?.buzzers.find((b) => b.team_id === myTeam?.id);
  const isMyTeamAnswering = buzzerQueue?.current_answering_team_id === myTeam?.id;
  const isBuzzerLocked =
    !buzzerQueue?.is_buzzer_open ||
    (buzzerQueue?.buzzers.length ?? 0) >= 3 ||
    Boolean(activeQuestion?.is_completed);

  // Reset buzzer message when active question changes
  useEffect(() => {
    setBuzzerMessage(null);
  }, [activeQuestion?.id]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white/20">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/team")}
            className="text-zinc-400 hover:text-white gap-1 px-2 h-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-zinc-800" />
          <BrandLogo size="sm" />
          <Badge variant="muted" className="text-xs font-mono font-bold uppercase tracking-wider">
            {game?.title || "Challenge Arena"}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {myTeam && (
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">{myTeam.team_name}:</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {teamScore} pts
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Arena (3-Column Layout Matching Game 1 & Game 2) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Question Showcase & Big Buzzer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synchronized Game Timer */}
          {gameTimer && (
            <GameTimerWidget
              timer={gameTimer}
              currentGameContext={gameCode || "all"}
            />
          )}

          {/* Question Display */}
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs">
              Connecting to Arena...
            </div>
          ) : !activeQuestion ? (
            <Card className="p-12 text-center bg-zinc-950 border-zinc-800 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Lock className="w-8 h-8 animate-pulse text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Waiting for Next Question
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  The administrator will unlock the question shortly. Once unlocked, your buzzer will activate!
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Badge variant="muted" className="text-xs font-mono text-zinc-400">
                  Buzzer Status: Locked
                </Badge>
              </div>
            </Card>
          ) : (
            <Card className="p-7 bg-zinc-950 border-zinc-800 shadow-2xl space-y-6 animate-in fade-in duration-300">
              {/* Header info bar */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold bg-white text-black px-2.5 py-1 rounded">
                    Question #{activeQuestion.question_number}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded font-bold">
                    +{activeQuestion.points} Marks
                  </span>
                  {activeQuestion.deduction > 0 && (
                    <span className="text-xs font-mono text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded">
                      -{activeQuestion.deduction} Wrong
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeQuestion.time_limit_seconds && (
                    <span className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {activeQuestion.time_limit_seconds}s
                    </span>
                  )}
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3.5 h-3.5" /> ACTIVE
                  </span>
                </div>
              </div>

              {/* Question Title & Prompt */}
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight leading-snug">
                  {activeQuestion.title}
                </h2>
                {activeQuestion.description && (
                  <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 font-mono whitespace-pre-wrap">
                    {activeQuestion.description}
                  </p>
                )}
              </div>

              {/* Multimedia Clue Showcase */}
              {(activeQuestion.media_url || activeQuestion.image_url) && (
                <div className="pt-1">
                  <MediaViewer
                    mediaUrl={activeQuestion.media_url || activeQuestion.image_url}
                    mediaType={activeQuestion.media_type}
                    title={activeQuestion.title}
                  />
                </div>
              )}

              {/* Interactive Buzzer Arena Section */}
              <div className="pt-4 border-t border-zinc-800 space-y-5 text-center">
                {buzzerMessage && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs max-w-md mx-auto">
                    {buzzerMessage}
                  </div>
                )}

                {/* Big Interactive Buzzer Button */}
                <div className="py-2">
                  <button
                    type="button"
                    onClick={handleBuzz}
                    disabled={isBuzzing || isBuzzerLocked || !!myBuzzerEntry}
                    className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full font-black text-lg tracking-wider uppercase transition-all transform active:scale-95 shadow-2xl flex flex-col items-center justify-center gap-2 mx-auto ${
                      myBuzzerEntry
                        ? "bg-emerald-600 text-white shadow-emerald-600/30 cursor-default"
                        : isBuzzerLocked
                        ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60"
                        : "bg-white text-black hover:bg-zinc-200 shadow-white/10 hover:shadow-white/20 animate-pulse"
                    }`}
                  >
                    <Bell className="w-8 h-8" />
                    <span>
                      {myBuzzerEntry
                        ? `Pos #${myBuzzerEntry.position}`
                        : isBuzzerLocked
                        ? "Locked"
                        : "BUZZ NOW"}
                    </span>
                  </button>
                </div>

                {/* Status Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  {myBuzzerEntry ? (
                    <span className="px-3 py-1 font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Your Team is Position #{myBuzzerEntry.position} in Queue
                    </span>
                  ) : isBuzzerLocked ? (
                    <span className="px-3 py-1 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800">
                      Buzzer Closed for this question
                    </span>
                  ) : (
                    <span className="px-3 py-1 font-bold rounded-full bg-white text-black animate-pulse">
                      Buzzer Open! Race to press
                    </span>
                  )}
                </div>

                {/* Answering Turn Notification */}
                {isMyTeamAnswering && (
                  <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/80 text-amber-300 text-xs font-bold animate-bounce max-w-md mx-auto">
                    IT IS YOUR TEAM'S TURN TO ANSWER! State your answer clearly to the Admin.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Col: Buzzer Queue & Leaderboard (Matches Game 1 & Game 2) */}
        <div className="space-y-6">
          {/* Buzzer Queue Card */}
          <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Buzzer Queue
              </h3>
              <Badge variant="muted" className="text-[10px] font-mono">
                {buzzerQueue?.buzzers.length || 0} / 3 Teams
              </Badge>
            </div>

            {!buzzerQueue || buzzerQueue.buzzers.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                No teams have buzzed yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {buzzerQueue.buzzers.map((b) => {
                  const isCurrent = b.position === buzzerQueue.current_answering_position;
                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        isCurrent
                          ? "bg-zinc-900 border-white shadow-md shadow-white/5"
                          : "bg-zinc-900/40 border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-mono font-bold text-white text-xs">
                          #{b.position}
                        </span>
                        <div>
                          <p className="font-bold text-white">{b.team_name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {new Date(b.pressed_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded">
                          Answering
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">In Queue</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Real-time Game Leaderboard Card */}
          <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                {game?.title ? `${game.title} Leaderboard` : "Leaderboard"}
              </h3>
              <span className="text-[11px] text-zinc-500">
                Auto-updating
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                No scores recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((item) => {
                  const isMyTeamRow = item.team_id === myTeam?.id;
                  return (
                    <div
                      key={item.team_id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isMyTeamRow
                          ? "bg-zinc-900 border-zinc-600 shadow-sm"
                          : "bg-zinc-900/30 border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center font-mono font-bold text-white text-[11px]">
                          #{item.rank}
                        </span>
                        <div>
                          <span className="font-bold text-white">{item.team_name}</span>
                          {isMyTeamRow && (
                            <span className="ml-1.5 text-[9px] text-zinc-400 font-mono">
                              (Your Team)
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-white">
                        {item.score} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
