import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("./pages/Index"));
const ProfileDetail = lazy(() => import("./pages/ProfileDetail"));
const AddProfile = lazy(() => import("./pages/AddProfile"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TraitementPage = lazy(() => import("./pages/TraitementPage"));
const SuggestedPostsPage = lazy(() => import("./pages/SuggestedPostsPage"));
const PlanifierPage = lazy(() => import("./pages/PlanifierPage"));
const AnalyserPage = lazy(() => import("./pages/AnalyserPage"));
const EngagementPage = lazy(() => import("./pages/EngagementPage"));
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile/:id" element={<ProfileDetail />} />
            <Route path="/traitement" element={<TraitementPage />} />
            <Route path="/posts-suggeres" element={<SuggestedPostsPage />} />
            <Route path="/planifier" element={<PlanifierPage />} />
            <Route path="/analyser" element={<AnalyserPage />} />
            <Route path="/engagement" element={<EngagementPage />} />
            <Route path="/add-profile" element={<AddProfile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
