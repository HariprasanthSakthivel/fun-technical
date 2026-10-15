import {
  CheckCircle2,
  Lock,
  Radio,
  Timer,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type BuzzerState } from "@/context/ParticipantContext";
import { toast } from "@/hooks/useToast";

interface BuzzerButtonProps {
  state: BuzzerState;
  onPress: () => void;
  disabled?: boolean;
}

export function BuzzerButton({ state, onPress, disabled = false }: BuzzerButtonProps) {
  function handleClick() {
    if (disabled || state === "waiting_for_question" || state === "question_closed") {
      return;
    }
    // Spec requirement: When clicked, show demo response indicating backend connection in next step
    toast.info("Demonstration: Buzzer interaction recorded. Real concurrency and position assignment will connect via WebSocket in Step 6.");
    onPress();
  }

  // Visual button configuration based on state
  let buttonLabel = "BUZZ IN!";
  let buttonSubtext = "Tap when you know the answer";
  let buttonStyle = "from-accent-blue via-accent-blue-bright to-accent-purple shadow-accent-blue/30 active:scale-95";
  let Icon = Zap;
  let isActionable = true;

  switch (state) {
    case "waiting_for_question":
      buttonLabel = "WAITING FOR QUESTION";
      buttonSubtext = "Question is currently locked";
      buttonStyle = "from-navy-800 to-navy-900 border border-border/60 text-muted opacity-60";
      Icon = Lock;
      isActionable = false;
      break;

    case "ready_to_buzz":
      buttonLabel = "PRESS BUZZER!";
      buttonSubtext = "Be among the first to qualify";
      buttonStyle = "from-accent-blue via-indigo-500 to-accent-purple shadow-accent-blue/40 hover:brightness-110 active:scale-95 animate-pulse";
      Icon = Zap;
      isActionable = true;
      break;

    case "buzzer_pressed":
      buttonLabel = "BUZZER PRESSED";
      buttonSubtext = "Simulated: Eligibility determined by organizer";
      buttonStyle = "from-accent-purple to-indigo-700 shadow-accent-purple/30 text-white";
      Icon = Radio;
      isActionable = false;
      break;

    case "position_secured":
      buttonLabel = "POSITION SECURED";
      buttonSubtext = "You are eligible to submit an answer";
      buttonStyle = "from-success to-emerald-600 shadow-success/30 text-white";
      Icon = CheckCircle2;
      isActionable = false;
      break;

    case "not_eligible":
      buttonLabel = "NOT ELIGIBLE";
      buttonSubtext = "Other teams buzzed in first";
      buttonStyle = "from-navy-800 to-navy-900 text-muted opacity-60";
      Icon = Lock;
      isActionable = false;
      break;

    case "answering":
      buttonLabel = "SUBMITTING ANSWER";
      buttonSubtext = "Enter your answer in the form below";
      buttonStyle = "from-accent-blue to-accent-purple text-white";
      Icon = Timer;
      isActionable = false;
      break;

    case "answer_submitted":
      buttonLabel = "ANSWER SUBMITTED";
      buttonSubtext = "Waiting for organizer to reveal results";
      buttonStyle = "from-navy-800 to-navy-900 border border-border/80 text-success";
      Icon = CheckCircle2;
      isActionable = false;
      break;

    case "question_closed":
      buttonLabel = "ROUND CLOSED";
      buttonSubtext = "Waiting for next question";
      buttonStyle = "from-navy-800 to-navy-900 border border-border/60 text-muted opacity-50";
      Icon = Lock;
      isActionable = false;
      break;
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || !isActionable}
        className={`group relative flex h-48 w-48 sm:h-56 sm:w-56 cursor-pointer flex-col items-center justify-center rounded-full bg-gradient-to-br p-6 text-center text-white shadow-2xl transition-all select-none disabled:cursor-not-allowed ${buttonStyle}`}
        aria-label={buttonLabel}
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          {state === "ready_to_buzz" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue-bright opacity-75" />
          )}
        </span>

        <Icon className="h-12 w-12 sm:h-14 sm:w-14 mb-2 drop-shadow" />
        <span className="font-display text-lg sm:text-xl font-black uppercase tracking-wider drop-shadow">
          {buttonLabel}
        </span>
        <span className="mt-1 text-[11px] sm:text-xs opacity-90 font-medium max-w-[140px] leading-tight drop-shadow">
          {buttonSubtext}
        </span>
      </button>

      <div className="mt-4 flex items-center gap-2">
        <Badge variant={state === "ready_to_buzz" ? "default" : state === "position_secured" ? "success" : "muted"}>
          State: {state.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}
