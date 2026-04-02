import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import ScrollToTop from "@/components/ScrollToTop";

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
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* All protected routes share a single persistent shell */}
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/profile/:id" element={<ProfileDetail />} />
                <Route path="/traitement" element={<TraitementPage />} />
                <Route path="/strategie" element={<StrategiePage />} />
                <Route path="/posts-suggeres" element={<SuggestedPostsPage />} />
                <Route path="/planifier" element={<PlanifierPage />} />
                <Route path="/analyser" element={<AnalyserPage />} />
                <Route path="/engagement" element={<EngagementPage />} />
                <Route path="/memoire" element={<MemoirePage />} />
                <Route path="/autopilote" element={<AutopilotPage />} />
                <Route path="/add-profile" element={<AddProfile />} />
                <Route path="/calendrier" element={<CalendarPage />} />
                <Route path="/idees" element={<IdeasPage />} />
                <Route path="/prospection" element={<ProspectionPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
