import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Clock,
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
  fetchLightningBuzzerQueue,
  fetchLightningLeaderboard,
  fetchMyActiveLightningTopic,
  fetchMyTeam,
  pressLightningBuzzer,
} from "@/services/api";
import type {
  BuzzerQueue,
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
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerQueue | null>(null);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [buzzerMessage, setBuzzerMessage] = useState<string | null>(null);

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

      if (top?.id) {
        const bq = await fetchLightningBuzzerQueue(top.id).catch(() => null);
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
      const res = await pressLightningBuzzer();
      setBuzzerMessage(`Buzzer confirmed! Position #${res.position}`);
      if (activeTopic?.id) {
        const bq = await fetchLightningBuzzerQueue(activeTopic.id).catch(() => null);
        setBuzzerQueue(bq);
      }
    } catch (err: unknown) {
      setBuzzerMessage(err instanceof Error ? err.message : "Buzzer request failed");
    } finally {
      setIsBuzzing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const myBuzzerEntry = buzzerQueue?.buzzers?.find((b) => b.team_id === myTeam?.id);
  const isMyTeamAnswering = buzzerQueue?.current_answering_team_id === myTeam?.id;
  const isBuzzerLocked = !activeTopic?.is_buzzer_open || (buzzerQueue?.buzzers?.length || 0) >= 3;
  const isSpeakerTeam = Boolean(
    activeTopic?.assigned_team_id && myTeam?.id === activeTopic.assigned_team_id
  );

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

          {!activeTopic ? (
            /* Waiting for admin to assign or unlock topic */
            <Card className="p-12 text-center bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-500">
                <MicOff className="w-8 h-8 animate-pulse text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">
                  Waiting for Next Speaker
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  The administrator will assign and unlock a topic when it's your turn to speak. Once assigned to you, your topic and prohibited words will appear here.
                </p>
              </div>
            </Card>
          ) : activeTopic.is_my_turn === false ? (
            /* Audience View: Another speaker is on stage, topic is strictly hidden */
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="p-8 bg-zinc-950 border-zinc-800 shadow-2xl relative overflow-hidden space-y-6">
                <div className="flex items-center justify-between">
                  <Badge variant="purple" className="text-xs uppercase font-extrabold tracking-wider bg-amber-400 text-black">
                    ● Speaker On Stage
                  </Badge>
                  <span className="text-xs font-mono text-zinc-400">
                    Listening Mode
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                    Current Presenter
                  </p>
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    {activeTopic.active_speaker_name || "Active Participant"}
                  </h2>
                  {activeTopic.active_speaker_team && (
                    <p className="text-sm font-bold text-zinc-300">
                      Team: <span className="text-white">{activeTopic.active_speaker_team}</span>
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Confidential Topic (Hidden from Audience)
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    The speaker is explaining their technical concept right now without uttering forbidden buzzwords. Topic details and prohibited words are visible only to the speaker.
                  </p>
                </div>
              </Card>

              {/* Audience Topic Guessing Buzzer Card */}
              <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-2xl text-center space-y-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-400" />
                      Topic Guessing Buzzer
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Guess the topic after the speaker finishes!
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                      Correct: +10 pts
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
                      Incorrect: -5 pts
                    </span>
                  </div>
                </div>

                {buzzerMessage && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs max-w-md mx-auto">
                    {buzzerMessage}
                  </div>
                )}

                {isSpeakerTeam ? (
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs">
                    Your team member is the speaker. Your team cannot buzz to guess this topic.
                  </div>
                ) : (
                  <>
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
                            ? (buzzerQueue?.buzzers?.length || 0) >= 3 ? "Locked (3/3)" : "Locked"
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
                          {activeTopic.is_buzzer_open
                            ? "Buzzer Full (Top 3 teams reached)"
                            : "Buzzer Closed (Awaiting speaker to finish)"}
                        </span>
                      ) : (
                        <span className="px-3 py-1 font-bold rounded-full bg-white text-black animate-pulse">
                          Buzzer Open! Race to guess the topic!
                        </span>
                      )}
                    </div>

                    {/* Answering Turn Notification */}
                    {isMyTeamAnswering && (
                      <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/80 text-amber-300 text-xs font-bold animate-bounce max-w-md mx-auto">
                        IT IS YOUR TEAM'S TURN TO GUESS! State your topic guess clearly to the conductor.
                      </div>
                    )}
                  </>
                )}
              </Card>

              {/* Evaluation Criteria Explanation for audience */}
              <Card className="p-6 bg-zinc-950 border-zinc-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                  What the Conductor Is Evaluating
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="font-bold text-white">1. Time Management</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Optimal use of the 60-second timer window.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="font-bold text-white">2. Words Used</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Vocabulary and avoiding taboo topic names.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="font-bold text-white">3. Understandability</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Clarity and technical accuracy of description.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* Active Assigned Topic for Current Speaker Only */
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="p-6 sm:p-8 bg-zinc-950 border-zinc-700 shadow-2xl relative overflow-hidden space-y-6">
                <div className="flex items-center justify-between">
                  <Badge variant="purple" className="text-xs uppercase font-extrabold tracking-wider bg-white text-black">
                    {activeTopic.is_unlocked ? "Active Topic Unlocked" : "Assigned to You"}
                  </Badge>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Your Turn to Speak!
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                    Your Assigned Topic
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

                {activeTopic.is_buzzer_open && (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 space-y-1">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="w-4 h-4" />
                      Audience Topic Guessing Active
                    </p>
                    <p className="text-xs text-zinc-300">
                      The conductor opened the buzzer for audience teams to guess your topic. Watch the live queue on the right!
                    </p>
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

        {/* Right Col: Buzzer Queue & Scoreboard */}
        <div className="space-y-6">
          {/* Topic Guessing Buzzer Queue */}
          <Card className="p-5 bg-zinc-950 border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Topic Guessing Queue
              </h3>
              <Badge variant="muted" className="text-[10px]">
                {buzzerQueue?.buzzers?.length || 0}/3 Teams
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
                          <p className="font-bold text-white">
                            {b.team_name} {b.team_id === myTeam?.id && "(You)"}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {new Date(b.pressed_at).toLocaleTimeString([], {
                              minute: "2-digit",
                              second: "2-digit",
                              fractionalSecondDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold text-black bg-white px-2 py-0.5 rounded-full animate-pulse">
                          Answering
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

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
