import {
  Activity,
  ClipboardList,
  Gamepad2,
  Layers3,
  MessageSquareText,
  MonitorPlay,
  Plus,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuestions } from "@/context/QuestionsContext";
import { useSessions } from "@/context/SessionsContext";
import { useTeams } from "@/context/TeamsContext";
import { MOCK_ACTIVITY, MOCK_GAMES } from "@/data/mockData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  question_added: ClipboardList,
  team_registered: Users,
  session_created: Layers3,
  game_updated: Gamepad2,
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Admin dashboard overview page with metrics, quick actions, game overview, and activity feed. */
export function AdminDashboardPage() {
  useDocumentTitle("Dashboard · Fun & Technical Activity Platform");
  const navigate = useNavigate();
  const { questions } = useQuestions();
  const { teams } = useTeams();
  const { sessions } = useSessions();

  const completedSessionsCount = sessions.filter((s) => s.status === "completed").length;

  const stats = [
    {
      id: "games",
      label: "Total Games",
      value: 2,
      icon: Gamepad2,
      color: "text-accent-blue-bright",
      bg: "bg-accent-blue/10",
    },
    {
      id: "questions",
      label: "Total Questions",
      value: questions.length,
      icon: ClipboardList,
      color: "text-accent-purple-bright",
      bg: "bg-accent-purple/10",
    },
    {
      id: "teams",
      label: "Registered Teams",
      value: teams.length,
      icon: Users,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      id: "sessions",
      label: "Completed Sessions",
      value: completedSessionsCount,
      icon: Layers3,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.id} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {stat.label}
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="h-full p-5">
            <CardHeader className="mb-4 p-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-accent-blue-bright" aria-hidden />
                Quick Actions
              </CardTitle>
              <CardDescription>Jump to common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              <Button
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/admin/games")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Create New Game
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/admin/questions")}
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                Add Question
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/admin/teams")}
              >
                <UserPlus className="h-4 w-4" aria-hidden />
                Register Team
              </Button>
              <Button
                className="w-full justify-start gap-2"
                onClick={() => navigate("/admin/sessions")}
              >
                <MonitorPlay className="h-4 w-4" aria-hidden />
                Start Live Session
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="h-full p-5">
            <CardHeader className="mb-4 p-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-accent-purple-bright" aria-hidden />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest platform events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="space-y-3">
                {MOCK_ACTIVITY.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
                  return (
                    <li key={item.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-800">
                        <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{item.message}</p>
                        <p className="text-xs text-muted">{formatTime(item.timestamp)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game overview */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Game Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_GAMES.map((game) => (
            <Card key={game.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-800">
                    {game.type === "guess-tech" ? (
                      <Gamepad2 className="h-5 w-5 text-accent-blue-bright" aria-hidden />
                    ) : (
                      <MessageSquareText
                        className="h-5 w-5 text-accent-purple-bright"
                        aria-hidden
                      />
                    )}
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      {game.name}
                    </h3>
                    <p className="text-xs text-muted">
                      {game.questionCount} questions
                    </p>
                  </div>
                </div>
                <Badge variant={game.status === "active" ? "success" : "muted"}>
                  {game.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {game.description}
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/admin/games")}
                >
                  Manage Game
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
