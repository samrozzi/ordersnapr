import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FeatureProvider } from "@/contexts/FeatureContext";
import { FeatureRouteGuard } from "@/components/FeatureRouteGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import OrgAdmin from "./pages/OrgAdmin";
import PendingApproval from "./pages/PendingApproval";
import Profile from "./pages/Profile";
import JobAudit from "./pages/JobAudit";
import RideAlong from "./pages/RideAlong";
import Dashboard from "./pages/Dashboard";
import WorkOrders from "./pages/WorkOrders";
import PropertyInfo from "./pages/PropertyInfo";
import Forms from "./pages/Forms";
import CalendarPage from "./pages/CalendarPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useOrgTheme();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FeatureProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/menu" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/org-admin" element={<ProtectedRoute><OrgAdmin /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Feature-gated routes */}
            <Route path="/work-orders" element={
              <ProtectedRoute>
                <FeatureRouteGuard module="work_orders">
                  <WorkOrders />
                </FeatureRouteGuard>
              </ProtectedRoute>
            } />
            <Route path="/property-info" element={
              <ProtectedRoute>
                <FeatureRouteGuard module="properties">
                  <PropertyInfo />
                </FeatureRouteGuard>
              </ProtectedRoute>
            } />
            <Route path="/forms" element={
              <ProtectedRoute>
                <FeatureRouteGuard module="forms">
                  <Forms />
                </FeatureRouteGuard>
              </ProtectedRoute>
            } />
            <Route path="/job-audit" element={
              <ProtectedRoute>
                <FeatureRouteGuard module="forms">
                  <JobAudit />
                </FeatureRouteGuard>
              </ProtectedRoute>
            } />
            <Route path="/ride-along" element={
              <ProtectedRoute>
                <FeatureRouteGuard module="forms">
                  <RideAlong />
                </FeatureRouteGuard>
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <FeatureRouteGuard module="calendar">
                  <CalendarPage />
                </FeatureRouteGuard>
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FeatureProvider>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
