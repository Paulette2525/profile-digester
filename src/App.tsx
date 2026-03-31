import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const Index = lazy(() => import("./pages/Index"));
const ProfileDetail = lazy(() => import("./pages/ProfileDetail"));
const AddProfile = lazy(() => import("./pages/AddProfile"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TraitementPage = lazy(() => import("./pages/TraitementPage"));
const StrategiePage = lazy(() => import("./pages/StrategiePage"));
const SuggestedPostsPage = lazy(() => import("./pages/SuggestedPostsPage"));
const PlanifierPage = lazy(() => import("./pages/PlanifierPage"));
const AnalyserPage = lazy(() => import("./pages/AnalyserPage"));
const EngagementPage = lazy(() => import("./pages/EngagementPage"));
const MemoirePage = lazy(() => import("./pages/MemoirePage"));
const AutopilotPage = lazy(() => import("./pages/AutopilotPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const IdeasPage = lazy(() => import("./pages/IdeasPage"));
const ProspectionPage = lazy(() => import("./pages/ProspectionPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><ProfileDetail /></ProtectedRoute>} />
              <Route path="/traitement" element={<ProtectedRoute><TraitementPage /></ProtectedRoute>} />
              <Route path="/strategie" element={<ProtectedRoute><StrategiePage /></ProtectedRoute>} />
              <Route path="/posts-suggeres" element={<ProtectedRoute><SuggestedPostsPage /></ProtectedRoute>} />
              <Route path="/planifier" element={<ProtectedRoute><PlanifierPage /></ProtectedRoute>} />
              <Route path="/analyser" element={<ProtectedRoute><AnalyserPage /></ProtectedRoute>} />
              <Route path="/engagement" element={<ProtectedRoute><EngagementPage /></ProtectedRoute>} />
              <Route path="/memoire" element={<ProtectedRoute><MemoirePage /></ProtectedRoute>} />
              <Route path="/autopilote" element={<ProtectedRoute><AutopilotPage /></ProtectedRoute>} />
              <Route path="/add-profile" element={<ProtectedRoute><AddProfile /></ProtectedRoute>} />
              <Route path="/calendrier" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/idees" element={<ProtectedRoute><IdeasPage /></ProtectedRoute>} />
              <Route path="/prospection" element={<ProtectedRoute><ProspectionPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
