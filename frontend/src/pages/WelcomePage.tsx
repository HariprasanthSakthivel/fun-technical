import { Image, MessageSquareText, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { PlaceholderBanner } from "@/components/PlaceholderBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { GameSummary } from "@/types";

const GAMES: GameSummary[] = [
  {
    id: "guess-tech",
    name: "Guess the Technology",
    description:
      "Identify a technology, language, framework, package, tool, or company from image or text clues.",
  },
  {
    id: "explain-without-naming",
    name: "Explain Without Naming",
    description:
      "One team explains a secret topic without saying its name. Other teams race to identify it.",
  },
];

/** Landing page introducing the platform and both games. */
export function WelcomePage() {
  useDocumentTitle("Welcome · Fun & Technical Activity Platform");

  return (
    <div className="space-y-10">
      <PlaceholderBanner />

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-5">
          <Badge variant="default">Internal company events</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            <span className="text-gradient">Fun &amp; Technical</span>
            <span className="block mt-1">Activity Platform</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Run interactive technical games with live buzzers, team play, and
            admin controls — built for organization-wide events.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg">
              <Link to="/participant/join">Join as participant</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/admin/login">Admin login</Link>
            </Button>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-8 glow-ring"
          aria-hidden
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent-blue/25 blur-3xl" />
          <div className="absolute -bottom-10 -left-6 h-44 w-44 rounded-full bg-accent-purple/20 blur-3xl" />
          <div className="relative space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Two roles
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-navy-950/50 p-4">
              <Shield className="h-5 w-5 text-accent-blue-bright" />
              <div>
                <p className="font-semibold text-foreground">Admin</p>
                <p className="text-sm text-muted">Sessions, questions, buzzers, scores</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-navy-950/50 p-4">
              <Users className="h-5 w-5 text-accent-purple-bright" />
              <div>
                <p className="font-semibold text-foreground">Participant</p>
                <p className="text-sm text-muted">Join a team, buzz in, submit answers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Featured games
          </h2>
          <p className="mt-1 text-sm text-muted">
            Mechanics ship in later steps — this screen is informational only.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {GAMES.map((game) => (
            <Card key={game.id}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-navy-700">
                  {game.id === "guess-tech" ? (
                    <Image className="h-5 w-5 text-accent-blue-bright" aria-hidden />
                  ) : (
                    <MessageSquareText
                      className="h-5 w-5 text-accent-purple-bright"
                      aria-hidden
                    />
                  )}
                </div>
                <CardTitle>{game.name}</CardTitle>
                <CardDescription>{game.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="muted">Coming in a later step</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
