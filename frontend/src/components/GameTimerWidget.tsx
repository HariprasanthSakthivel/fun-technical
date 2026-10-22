import { useEffect, useState } from "react";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Mic,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { controlGameTimer } from "@/services/api";
import type { GameTimer } from "@/types";

interface GameTimerWidgetProps {
  timer: GameTimer | null;
  onTimerChange?: (updated: GameTimer) => void;
  isAdmin?: boolean;
  currentGameContext?: "tech-detective" | "lightning-talks" | "all" | string;
  compact?: boolean;
}

export function GameTimerWidget({
  timer,
  onTimerChange,
  isAdmin = false,
  currentGameContext = "all",
  compact = false,
}: GameTimerWidgetProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(timer?.seconds_remaining ?? 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customInput, setCustomInput] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedGameScope, setSelectedGameScope] = useState<string>(timer?.game || currentGameContext);

  // Smooth local tick calculation based on authoritative server end_time
  useEffect(() => {
    const updateTick = () => {
      if (timer?.is_running && timer.end_time) {
        const diff = Math.max(0, timer.end_time - Date.now() / 1000);
        setSecondsLeft(diff);
      } else if (timer) {
        setSecondsLeft(timer.seconds_remaining);
      }
    };

    updateTick();
    const interval = setInterval(updateTick, 100);
    return () => clearInterval(interval);
  }, [timer?.is_running, timer?.end_time, timer?.seconds_remaining]);

  // Sync selectedGameScope when currentGameContext or timer changes
  useEffect(() => {
    if (currentGameContext && currentGameContext !== "all") {
      setSelectedGameScope(currentGameContext);
    } else if (timer?.game) {
      setSelectedGameScope(timer.game);
    }
  }, [currentGameContext, timer?.game]);

  const handleAction = async (
    action: "start" | "pause" | "resume" | "reset" | "set_duration" | "add_time",
    durationSeconds?: number
  ) => {
    try {
      setIsSubmitting(true);
      const res = await controlGameTimer({
        action,
        duration_seconds: durationSeconds,
        game: selectedGameScope,
      });
      if (onTimerChange) {
        onTimerChange(res);
      }
    } catch (err: unknown) {
      console.error("Timer action failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCustomDuration = async () => {
    const parsed = parseInt(customInput.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      await handleAction("set_duration", parsed);
      setShowCustomModal(false);
      setCustomInput("");
    }
  };

  const total = timer?.total_duration || 60;
  const remaining = Math.max(0, secondsLeft);
  const percentage = Math.min(100, Math.max(0, (remaining / total) * 100));

  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isRunning = timer?.is_running ?? false;
  const isTimesUp = remaining <= 0.05;
  const isCritical = remaining > 0 && remaining <= 10;
  const isWarning = remaining > 10 && remaining <= 30;

  // Decide colors based on urgency
  let statusColor = "text-emerald-400";
  let statusBg = "bg-emerald-950/60 border-emerald-800/80";
  let progressColor = "bg-emerald-500";
  let clockGlow = "shadow-emerald-500/10";

  if (isTimesUp) {
    statusColor = "text-rose-400";
    statusBg = "bg-rose-950/80 border-rose-800";
    progressColor = "bg-rose-600";
    clockGlow = "shadow-rose-500/30 ring-2 ring-rose-500/50 animate-pulse";
  } else if (isCritical) {
    statusColor = "text-rose-400";
    statusBg = "bg-rose-950/60 border-rose-800/80";
    progressColor = "bg-rose-500 animate-pulse";
    clockGlow = "shadow-rose-500/20";
  } else if (isWarning) {
    statusColor = "text-amber-400";
    statusBg = "bg-amber-950/60 border-amber-800/80";
    progressColor = "bg-amber-500";
    clockGlow = "shadow-amber-500/10";
  }

  // Check if timer applies to current view: ONLY show in specified games
  const timerGame = timer?.game || "all";
  const isRelevant =
    timerGame === "all" ||
    (currentGameContext && currentGameContext !== "all" && timerGame === currentGameContext);

  if (!isRelevant && !isAdmin) {
    return null;
  }

  // ── Compact Participant View ──────────────────────────────────────────────
  if (!isAdmin && compact) {
    return (
      <div
        className={`flex items-center gap-3 px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
          isTimesUp
            ? "bg-rose-950/80 border-rose-700 text-rose-200 animate-pulse"
            : isCritical
            ? "bg-rose-950/60 border-rose-800 text-rose-200 animate-pulse"
            : isRunning
            ? "bg-zinc-950/90 border-zinc-700 text-white"
            : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
        }`}
      >
        <Clock className={`w-4 h-4 ${isRunning ? "animate-spin text-emerald-400" : ""}`} />
        <span className="font-mono font-black text-sm tracking-wider">
          {formattedTime}
        </span>
        {isTimesUp ? (
          <span className="text-[10px] font-extrabold uppercase bg-rose-600 text-white px-1.5 py-0.5 rounded">
            Time Up!
          </span>
        ) : isRunning ? (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        ) : (
          <span className="text-[10px] uppercase font-bold text-zinc-500">Paused</span>
        )}
      </div>
    );
  }

  // ── Standard Full Display (Admin & Participant Hero) ───────────────────────
  return (
    <Card
      className={`p-4 sm:p-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border-zinc-800 shadow-2xl relative overflow-hidden transition-all ${clockGlow}`}
    >
      {/* Background glow circle */}
      <div
        className={`absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors ${
          isTimesUp
            ? "bg-rose-600/20"
            : isCritical
            ? "bg-rose-500/15"
            : isRunning
            ? "bg-emerald-500/10"
            : "bg-zinc-800/10"
        }`}
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Side: Clock & Status Info */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Circular / Digital Time Display */}
          <div
            className={`px-4 py-2.5 rounded-2xl font-mono font-black text-2xl sm:text-3xl tracking-wider flex items-center gap-3 border shadow-inner ${
              isTimesUp
                ? "bg-rose-950/90 text-rose-100 border-rose-700 shadow-rose-950"
                : isCritical
                ? "bg-rose-950/60 text-rose-200 border-rose-800 animate-pulse"
                : isRunning
                ? "bg-black/80 text-white border-zinc-700 shadow-black"
                : "bg-zinc-950 text-zinc-300 border-zinc-800"
            }`}
          >
            <Clock
              className={`w-6 h-6 shrink-0 ${
                isTimesUp
                  ? "text-rose-400 animate-bounce"
                  : isRunning
                  ? "text-emerald-400"
                  : "text-zinc-500"
              }`}
            />
            <span>{formattedTime}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                {timerGame === "tech-detective" ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Game 1: Tech Detective
                  </>
                ) : timerGame === "lightning-talks" ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-purple-400" /> Game 2: Lightning Talks
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Synchronized Game Timer
                  </>
                )}
              </span>

              <Badge variant="muted" className={`text-[10px] uppercase font-mono font-bold ${statusBg} ${statusColor}`}>
                {isTimesUp ? (
                  "Time's Up!"
                ) : isRunning ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Running
                  </span>
                ) : (
                  "Paused / Ready"
                )}
              </Badge>
            </div>

            <p className="text-[11px] text-zinc-400">
              {isAdmin ? (
                <>
                  Duration: <strong>{total}s</strong> · Controlled by Administrator
                </>
              ) : isTimesUp ? (
                <span className="text-rose-400 font-bold">
                  Time has expired! Please wrap up your answer or presentation.
                </span>
              ) : isRunning ? (
                <span>Admin countdown is actively running for all participants.</span>
              ) : (
                <span>Timer is ready. Waiting for Admin to start countdown.</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Admin Dynamic Controls */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Quick Presets: 30s, 1m, 2m */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => handleAction("set_duration", 30)}
                disabled={isSubmitting}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  total === 30 && !isRunning
                    ? "bg-white text-black font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Set 30 Seconds"
              >
                30s
              </button>
              <button
                type="button"
                onClick={() => handleAction("set_duration", 60)}
                disabled={isSubmitting}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  total === 60 && !isRunning
                    ? "bg-white text-black font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Set 1 Minute (60 seconds)"
              >
                1 min
              </button>
              <button
                type="button"
                onClick={() => handleAction("set_duration", 120)}
                disabled={isSubmitting}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  total === 120 && !isRunning
                    ? "bg-white text-black font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Set 2 Minutes (120 seconds)"
              >
                2 min
              </button>
              <button
                type="button"
                onClick={() => setShowCustomModal((prev) => !prev)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                  showCustomModal
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Set Duration"
              >
                <Sliders className="w-3 h-3" />
                Set Time
              </button>
            </div>

            {/* Scope Selector: All, Game 1, Game 2, or Specified Game */}
            <select
              value={selectedGameScope}
              onChange={(e) => {
                const newScope = e.target.value;
                setSelectedGameScope(newScope);
                controlGameTimer({ action: "reset", game: newScope }).then((res) => {
                  if (onTimerChange) onTimerChange(res);
                });
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-zinc-700"
              title="Select which game this timer applies to"
            >
              <option value="all">Applies: All Games</option>
              <option value="tech-detective">Game 1: Tech Detective</option>
              <option value="lightning-talks">Game 2: Lightning Talks</option>
              {currentGameContext &&
                currentGameContext !== "all" &&
                currentGameContext !== "tech-detective" &&
                currentGameContext !== "lightning-talks" && (
                  <option value={currentGameContext}>Specified: {currentGameContext}</option>
                )}
            </select>

            {/* Start / Pause / Reset Action Buttons */}
            <div className="flex items-center gap-1.5">
              {!isRunning ? (
                <Button
                  size="sm"
                  onClick={() => handleAction("start")}
                  disabled={isSubmitting}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-3.5 shadow-lg shadow-emerald-500/20 gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  Start Timer
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleAction("pause")}
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-3.5 shadow-lg shadow-amber-500/20 gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5 fill-black" />
                  Pause
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("reset")}
                disabled={isSubmitting}
                className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs px-2.5"
                title="Reset to Full Duration"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>

              {/* Quick +/- seconds */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction("add_time", 30)}
                disabled={isSubmitting}
                className="text-xs text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800 px-2 font-mono font-bold"
                title="Add +30 Seconds"
              >
                +30s
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Duration Input Box (collapsible) */}
      {isAdmin && showCustomModal && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center gap-3 animate-in fade-in">
          <span className="text-xs text-zinc-400 font-semibold">
            Duration:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="5"
              max="1800"
              placeholder="e.g. 90"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyCustomDuration()}
              className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-white"
            />
            <span className="text-xs text-zinc-500 font-mono">seconds</span>
            <Button
              size="sm"
              onClick={handleApplyCustomDuration}
              className="bg-white text-black hover:bg-zinc-200 text-xs font-bold h-7 px-3"
            >
              Set Duration
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCustomModal(false)}
              className="text-zinc-500 hover:text-zinc-300 text-xs h-7 px-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Progress Countdown Bar */}
      <div className="mt-3 w-full bg-zinc-900/90 h-1.5 sm:h-2 rounded-full overflow-hidden border border-zinc-800/80">
        <div
          className={`h-full transition-all duration-200 ease-linear ${progressColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Card>
  );
}
