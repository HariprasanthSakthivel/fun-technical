import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Clock,
  Lock,
  Maximize2,
  Radio,
  Trophy,
  X,
  Zap,
  LogOut,
} from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { GameTimerWidget } from "@/components/GameTimerWidget";
import {
  fetchBuzzerQueue,
  fetchGameTimer,
  fetchMyTeam,
  fetchTechDetectiveActiveQuestion,
  fetchTechDetectiveLeaderboard,
  fetchTechDetectiveScoreBreakdown,
  pressBuzzer,
} from "@/services/api";
import type {
  BuzzerQueue,
  GameTimer,
  QuestionWiseScoreResponse,
  Team,
  TechDetectiveLeaderboardItem,
  TechDetectiveQuestionParticipant,
} from "@/types";

export function ParticipantTechDetectivePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<TechDetectiveQuestionParticipant | null>(null);
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerQueue | null>(null);
  const [leaderboard, setLeaderboard] = useState<TechDetectiveLeaderboardItem[]>([]);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [buzzerMessage, setBuzzerMessage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [gameTimer, setGameTimer] = useState<GameTimer | null>(null);

  // Score breakdown modal state
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownData, setBreakdownData] = useState<QuestionWiseScoreResponse | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  // Poll state every 2 seconds
  const syncState = async () => {
    try {
      if (!myTeam) {
        const t = await fetchMyTeam();
        setMyTeam(t);
      }
      const [q, lb, tm] = await Promise.all([
        fetchTechDetectiveActiveQuestion(),
        fetchTechDetectiveLeaderboard(),
        fetchGameTimer(),
      ]);
      setActiveQuestion(q);
      setLeaderboard(lb);
      setGameTimer(tm);

      if (q) {
        const bq = await fetchBuzzerQueue(q.id);
        setBuzzerQueue(bq);
      } else {
        setBuzzerQueue(null);
      }
    } catch {
      // Quiet fallback
    }
  };

  useEffect(() => {
    syncState();
    const interval = setInterval(syncState, 2000);
    return () => clearInterval(interval);
  }, [myTeam?.id]);

  const handleBuzz = async () => {
    try {
      setIsBuzzing(true);
      setBuzzerMessage(null);
      const res = await pressBuzzer();
      setBuzzerMessage(`Buzzer confirmed! Position #${res.position}`);
      if (activeQuestion) {
        const bq = await fetchBuzzerQueue(activeQuestion.id);
        setBuzzerQueue(bq);
      }
    } catch (err: unknown) {
      setBuzzerMessage(err instanceof Error ? err.message : "Buzzer request failed");
    } finally {
      setIsBuzzing(false);
    }
  };

  const handleOpenBreakdown = async () => {
    try {
      setIsLoadingBreakdown(true);
      setBreakdownOpen(true);
      const data = await fetchTechDetectiveScoreBreakdown();
      setBreakdownData(data);
    } catch {
      // Quiet fallback
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  const myBuzzerEntry = buzzerQueue?.buzzers.find((b) => b.team_id === myTeam?.id);
  const isMyTeamAnswering = buzzerQueue?.current_answering_team_id === myTeam?.id;
  const isBuzzerLocked =
    !buzzerQueue?.is_buzzer_open || (buzzerQueue?.buzzers.length ?? 0) >= 3;

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
              <Zap className="w-4 h-4 text-white" />
              Game 1: Tech Detective
            </h1>
            <p className="text-[11px] text-zinc-400">
              Identify the technology from the images below
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <GameTimerWidget timer={gameTimer} compact={true} currentGameContext="tech-detective" />

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenBreakdown}
            className="text-xs border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Question Marks</span>
          </Button>

          <div className="text-right">
            <p className="text-xs font-bold text-white">{myTeam?.team_name || "Your Team"}</p>
            <p className="text-[10px] text-zinc-400 font-mono font-bold">
              Score: {myTeam?.tech_detective_score || 0} pts
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Question Showcase & Big Buzzer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synchronized Dynamic Game Timer */}
          <GameTimerWidget timer={gameTimer} currentGameContext="tech-detective" />

          {!activeQuestion ? (
            <Card className="p-12 text-center bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-500">
                <Lock className="w-8 h-8 animate-pulse text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">
                  Waiting for Next Question
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  The administrator will unlock the question shortly. Once unlocked, your buzzer will activate!
                </p>
              </div>
              <Badge variant="muted" className="text-xs font-mono">
                Buzzer Status: Locked
              </Badge>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Question Showcase Card */}
              <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-white text-black px-2.5 py-1 rounded">
                      Question #{activeQuestion.question_number}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded">
                      +{activeQuestion.points} Marks
                    </span>
                  </div>

                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    ACTIVE
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white tracking-tight">
                  {activeQuestion.title}
                </h2>

                {/* Single Image Showcase - Prominent & Zoomable */}
                {activeQuestion.images && activeQuestion.images.length > 0 && (
                  <div className="pt-2 flex justify-center">
                    <div
                      onClick={() => setSelectedImage(activeQuestion.images[0].url)}
                      className="group relative rounded-2xl overflow-hidden border border-zinc-800 bg-black cursor-pointer hover:border-zinc-500 transition-all shadow-2xl max-h-[440px] max-w-2xl w-full flex items-center justify-center p-3"
                    >
                      <img
                        src={activeQuestion.images[0].url}
                        alt={activeQuestion.title}
                        className="w-full max-h-[400px] object-contain group-hover:scale-[1.02] transition-transform duration-300 rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-2xl">
                        <span className="text-xs font-mono font-bold text-white bg-black/80 px-3.5 py-1.5 rounded-full border border-zinc-700 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                          <Maximize2 className="w-3.5 h-3.5" />
                          Click to View Full Image
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Buzzer Control Card */}
              <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-2xl text-center space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">
                    Team Buzzer
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Press quickly to request an opportunity to answer. The top 3 teams will be queued!
                  </p>
                </div>

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
              </Card>
            </div>
          )}
        </div>

        {/* Right Col: Buzzer Queue & Leaderboard */}
        <div className="space-y-6">
          {/* Buzzer Queue */}
          <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Buzzer Queue (Top 3)
              </h3>
              <Badge variant="muted" className="text-[10px]">
                Max 3 Teams
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

          {/* Real-time Tech Detective Leaderboard */}
          <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Leaderboard
              </h3>
              <span className="text-[11px] text-zinc-500">
                Auto-updating
              </span>
            </div>

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
          </Card>
        </div>
      </main>

      {/* Image Zoom Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Enlarged Clue"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 bg-zinc-900 text-white p-2 rounded-full border border-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Question-Wise Score Breakdown Modal */}
      <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Question-Wise Marks Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Review how many marks each team scored on each question.
            </DialogDescription>
          </DialogHeader>

          {isLoadingBreakdown ? (
            <div className="py-10 text-center text-xs text-zinc-500">Loading breakdown...</div>
          ) : !breakdownData || breakdownData.questions.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              No questions or scores recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto py-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-bold">
                    <th className="py-2.5 px-3">Team</th>
                    {breakdownData.questions.map((q) => (
                      <th key={q.id} className="py-2.5 px-2 text-center font-mono">
                        Q{q.question_number}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right font-black text-white">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {breakdownData.team_scores.map((t) => (
                    <tr
                      key={t.team_id}
                      className={t.team_id === myTeam?.id ? "bg-zinc-900/80 font-bold" : "hover:bg-zinc-900/40"}
                    >
                      <td className="py-2.5 px-3 text-white">
                        {t.team_name}
                        {t.team_id === myTeam?.id && " (You)"}
                      </td>
                      {breakdownData.questions.map((q) => {
                        const s = t.question_scores[String(q.question_number)] ?? 0;
                        return (
                          <td
                            key={q.id}
                            className={`py-2.5 px-2 text-center font-mono ${
                              s > 0 ? "text-emerald-400" : s < 0 ? "text-rose-400" : "text-zinc-600"
                            }`}
                          >
                            {s > 0 ? `+${s}` : s === 0 ? "-" : `${s}`}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-white">
                        {t.total_score} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
