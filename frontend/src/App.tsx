import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { FinalLeaderboardPage } from "@/pages/FinalLeaderboardPage";
import { LoginPage } from "@/pages/LoginPage";
import {
  ParticipantCustomGamePage,
  ParticipantLightningTalksPage,
  ParticipantTeamPage,
  ParticipantTechDetectivePage,
} from "@/pages/participant";

function PublicLoginRoute() {
  const { currentUser, token } = useAuth();
  if (token && currentUser) {
    return <Navigate to={currentUser.role === "admin" ? "/admin" : "/team"} replace />;
  }
  return <LoginPage />;
}

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin" | "participant";
}) {
  const { currentUser, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs">
        Loading...
      </div>
    );
  }

  if (!token || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to={currentUser.role === "admin" ? "/admin" : "/team"} replace />;
  }

  return <>{children}</>;
}

/** Application route tree with role-based routing and automatic redirection on logout. */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / Authentication */}
          <Route path="/" element={<PublicLoginRoute />} />
          <Route path="/login" element={<PublicLoginRoute />} />

          {/* Participant Flow */}
          <Route
            path="/team"
            element={
              <ProtectedRoute requiredRole="participant">
                <ParticipantTeamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/tech-detective"
            element={
              <ProtectedRoute requiredRole="participant">
                <ParticipantTechDetectivePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/lightning-talks"
            element={
              <ProtectedRoute requiredRole="participant">
                <ParticipantLightningTalksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/:gameCode"
            element={
              <ProtectedRoute requiredRole="participant">
                <ParticipantCustomGamePage />
              </ProtectedRoute>
            }
          />

          {/* Public / Participant / Admin Leaderboard */}
          <Route path="/leaderboard" element={<FinalLeaderboardPage />} />

          {/* Admin Flow */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
