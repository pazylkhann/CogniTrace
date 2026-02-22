import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { RightPanelProvider } from "@/contexts/RightPanelContext";
import { RoleProvider } from "@/hooks/useRole";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import AnalysisStudio from "./pages/AnalysisStudio";
import Students from "./pages/Students";
import Classrooms from "./pages/Classrooms";
import ClassroomDetail from "./pages/ClassroomDetail";
import Settings from "./pages/Settings";
import Progress from "./pages/Progress";
import AiTutor from "./pages/AiTutor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RoleProvider>
        <div className="min-h-screen">
          <div className="bg-mesh" aria-hidden />
          <SidebarProvider>
          <RightPanelProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/analysis" element={<ProtectedRoute><AnalysisStudio /></ProtectedRoute>} />
              <Route path="/tutor" element={<ProtectedRoute><AiTutor /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
              <Route path="/classrooms" element={<ProtectedRoute><Classrooms /></ProtectedRoute>} />
              <Route path="/classrooms/:id" element={<ProtectedRoute><ClassroomDetail /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
          </RightPanelProvider>
          </SidebarProvider>
        </div>
      </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
