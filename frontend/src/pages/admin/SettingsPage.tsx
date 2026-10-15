import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ToastContainer, type ToastMessage, toastId } from "@/components/ui/toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Settings } from "@/types";

const DEFAULT_SETTINGS: Settings = {
  maxEligibleTeams: 3,
  requireManualApproval: false,
  scoreboardVisibleToParticipants: true,
};

/** Settings page — general, game rules, and appearance. State is local only. */
export function SettingsPage() {
  useDocumentTitle("Settings · Fun & Technical Activity Platform");

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function addToast(message: string, variant: ToastMessage["variant"] = "info") {
    setToasts((prev) => [...prev, { id: toastId(), message, variant }]);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function setField<K extends keyof Settings>(k: K, v: Settings[K]) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [k]: v }));
  }

  function handleSave() {
    // In production this would call the backend API.
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Settings
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Platform configuration — changes affect local state only in this preview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <Badge variant="success">Saved locally</Badge>
          )}
          <Button size="sm" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-5 max-w-2xl">
        {/* General settings */}
        <Card className="p-6">
          <CardHeader className="mb-4 p-0">
            <CardTitle className="text-base">General Settings</CardTitle>
            <CardDescription>Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-0">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-foreground">Platform Name</p>
                <p className="text-xs text-muted">Fun &amp; Technical Activity Platform</p>
              </div>
              <Badge variant="muted">Read-only (Step 1)</Badge>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-foreground">Environment</p>
                <p className="text-xs text-muted">Current deployment environment</p>
              </div>
              <Badge variant="warning">Development</Badge>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-foreground">API Status</p>
                <p className="text-xs text-muted">Backend health check</p>
              </div>
              <Badge variant="success">Healthy</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Game rules */}
        <Card className="p-6">
          <CardHeader className="mb-4 p-0">
            <CardTitle className="text-base">Game Rules</CardTitle>
            <CardDescription>Configure how games behave during sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-0">
            {/* Max eligible teams */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Label htmlFor="max-teams" className="text-sm font-medium text-foreground">
                  Max eligible teams per question
                </Label>
                <p className="mt-0.5 text-xs text-muted">
                  How many teams can buzz in and attempt each question.
                </p>
              </div>
              <Select
                id="max-teams"
                value={String(settings.maxEligibleTeams)}
                onChange={(e) => setField("maxEligibleTeams", Number(e.target.value))}
                className="w-24"
                aria-label="Max eligible teams"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </div>

            {/* Manual approval */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Require manual answer approval
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Admin must approve each submitted answer before points are awarded.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.requireManualApproval}
                  onChange={(e) => setField("requireManualApproval", e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`h-6 w-11 rounded-full transition-colors ${
                    settings.requireManualApproval
                      ? "bg-accent-blue"
                      : "bg-navy-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      settings.requireManualApproval ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-sm text-foreground">
                  {settings.requireManualApproval ? "On" : "Off"}
                </span>
              </label>
            </div>

            {/* Scoreboard visible */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Scoreboard visible to participants
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  When enabled, participants can see the live scoreboard during the session.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.scoreboardVisibleToParticipants}
                  onChange={(e) =>
                    setField("scoreboardVisibleToParticipants", e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`h-6 w-11 rounded-full transition-colors ${
                    settings.scoreboardVisibleToParticipants
                      ? "bg-accent-blue"
                      : "bg-navy-700"
                  }`}
                >
                  <div
                    className={`mt-0.5 ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      settings.scoreboardVisibleToParticipants
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-sm text-foreground">
                  {settings.scoreboardVisibleToParticipants ? "On" : "Off"}
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <CardHeader className="mb-4 p-0">
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Visual preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Theme</p>
                <p className="text-xs text-muted">Dark navy is the only supported theme in Step 2.</p>
              </div>
              <Badge variant="muted">Dark Navy</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Accent Color</p>
                <p className="text-xs text-muted">Blue &amp; purple gradient accents</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-accent-blue" />
                <span className="h-5 w-5 rounded-full bg-accent-purple" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-danger/30 p-6">
          <CardHeader className="mb-4 p-0">
            <CardTitle className="text-base text-danger">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions — available in a later step.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                addToast(
                  "Data reset will be available when database integration is complete.",
                  "warning",
                )
              }
            >
              Reset All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
