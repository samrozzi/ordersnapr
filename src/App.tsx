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
import { AppLayout } from "@/components/AppLayout";
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="admin" element={<Admin />} />
              <Route path="org-admin" element={<OrgAdmin />} />
              <Route path="job-audit" element={<FeatureRouteGuard module="work_orders"><JobAudit /></FeatureRouteGuard>} />
              <Route path="ride-along" element={<FeatureRouteGuard module="work_orders"><RideAlong /></FeatureRouteGuard>} />
              <Route path="work-orders" element={<FeatureRouteGuard module="work_orders"><WorkOrders /></FeatureRouteGuard>} />
              <Route path="property-info" element={<FeatureRouteGuard module="properties"><PropertyInfo /></FeatureRouteGuard>} />
              <Route path="forms" element={<FeatureRouteGuard module="forms"><Forms /></FeatureRouteGuard>} />
              <Route path="calendar" element={<FeatureRouteGuard module="calendar"><CalendarPage /></FeatureRouteGuard>} />
            </Route>
            
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
