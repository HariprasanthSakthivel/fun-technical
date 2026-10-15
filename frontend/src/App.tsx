import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ParticipantProvider } from "@/context/ParticipantContext";
import { QuestionsProvider } from "@/context/QuestionsContext";
import { SessionsProvider } from "@/context/SessionsContext";
import { TeamsProvider } from "@/context/TeamsContext";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ParticipantLayout } from "@/layouts/ParticipantLayout";
import { RootLayout } from "@/layouts/RootLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { CreateSessionPage } from "@/pages/admin/CreateSessionPage";
import { GamesPage } from "@/pages/admin/GamesPage";
import { LiveSessionsPage } from "@/pages/admin/LiveSessionsPage";
import { QuestionBankPage } from "@/pages/admin/QuestionBankPage";
import { QuestionFormPage } from "@/pages/admin/QuestionFormPage";
import { ResultsPage } from "@/pages/admin/ResultsPage";
import { ScoreboardPage } from "@/pages/admin/ScoreboardPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";
import { TeamsPage } from "@/pages/admin/TeamsPage";
import {
  ParticipantConfirmPage,
  ParticipantGamePage,
  ParticipantJoinPage,
  ParticipantWaitingPage,
} from "@/pages/participant";
import { WelcomePage } from "@/pages/WelcomePage";

/** Application route tree. */
export default function App() {
  return (
    <BrowserRouter>
      <QuestionsProvider>
        <TeamsProvider>
          <SessionsProvider>
            <ParticipantProvider>
              <Routes>
                {/* Public / root pages */}
                <Route element={<RootLayout />}>
                  <Route index element={<WelcomePage />} />
                  <Route path="admin/login" element={<AdminLoginPage />} />
                </Route>

                {/* Admin section */}
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="games" element={<GamesPage />} />
                  <Route path="questions" element={<QuestionBankPage />} />
                  <Route path="questions/new" element={<QuestionFormPage />} />
                  <Route path="questions/:id/edit" element={<QuestionFormPage />} />
                  <Route path="teams" element={<TeamsPage />} />
                  <Route path="sessions" element={<LiveSessionsPage />} />
                  <Route path="sessions/new" element={<CreateSessionPage />} />
                  <Route path="scoreboard" element={<ScoreboardPage />} />
                  <Route path="results" element={<ResultsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Participant section */}
                <Route path="participant" element={<ParticipantLayout />}>
                  <Route index element={<Navigate to="join" replace />} />
                  <Route path="join" element={<ParticipantJoinPage />} />
                  <Route path="confirm" element={<ParticipantConfirmPage />} />
                  <Route path="waiting" element={<ParticipantWaitingPage />} />
                  <Route path="game" element={<ParticipantGamePage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ParticipantProvider>
          </SessionsProvider>
        </TeamsProvider>
      </QuestionsProvider>
    </BrowserRouter>
  );
}
