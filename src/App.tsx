import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import ProfileDetail from "./pages/ProfileDetail";
import AddProfile from "./pages/AddProfile";
import SettingsPage from "./pages/SettingsPage";
import TraitementPage from "./pages/TraitementPage";
import SuggestedPostsPage from "./pages/SuggestedPostsPage";
import PlanifierPage from "./pages/PlanifierPage";
import AnalyserPage from "./pages/AnalyserPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profile/:id" element={<ProfileDetail />} />
          <Route path="/traitement" element={<TraitementPage />} />
          <Route path="/posts-suggeres" element={<SuggestedPostsPage />} />
          <Route path="/planifier" element={<PlanifierPage />} />
          <Route path="/analyser" element={<AnalyserPage />} />
          <Route path="/add-profile" element={<AddProfile />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
