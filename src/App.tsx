import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FreeRoute } from "@/components/FreeRoute";
import { FeatureProvider } from "@/contexts/FeatureContext";
import { WorkOrderDialogProvider } from "@/contexts/WorkOrderDialogContext";
import { FeatureRouteGuard } from "@/components/FeatureRouteGuard";
import { AppLayout } from "@/components/AppLayout";
import { ProfileCompletionWrapper } from "@/components/ProfileCompletionWrapper";
import { PageSkeleton } from "@/components/PageSkeleton";
import { MigrationChecker } from "@/components/MigrationChecker";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";

// Lazy load heavy page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const OrgAdmin = lazy(() => import("./pages/OrgAdmin"));
const Profile = lazy(() => import("./pages/Profile"));
const JobAudit = lazy(() => import("./pages/JobAudit"));
const RideAlong = lazy(() => import("./pages/RideAlong"));
const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const PropertyInfo = lazy(() => import("./pages/PropertyInfo"));
const Forms = lazy(() => import("./pages/Forms"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Invoices = lazy(() => import("./pages/Invoices"));
const HealthData = lazy(() => import("./pages/HealthData"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const FreeTierWorkspace = lazy(() => import("./pages/FreeTierWorkspace"));
const FreeTierDashboard = lazy(() => import("./pages/FreeTierDashboard"));

// Optimized React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const AppContent = () => {
  useOrgTheme();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FeatureProvider>
          <MigrationChecker />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />

              {/* Free Tier Routes - No approval required */}
              <Route path="/onboarding" element={<FreeRoute><Onboarding /></FreeRoute>} />
              <Route path="/free-workspace" element={<FreeRoute><FreeTierWorkspace /></FreeRoute>} />

              {/* Protected Routes - Require approval */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin" element={<Admin />} />
                <Route path="org-admin" element={<OrgAdmin />} />
                <Route path="free-tier-dashboard" element={<Suspense fallback={<PageSkeleton />}><FreeTierDashboard /></Suspense>} />
                <Route path="job-audit" element={<FeatureRouteGuard module="work_orders"><JobAudit /></FeatureRouteGuard>} />
                <Route path="ride-along" element={<FeatureRouteGuard module="work_orders"><RideAlong /></FeatureRouteGuard>} />
                <Route path="work-orders" element={<FeatureRouteGuard module="work_orders"><WorkOrders /></FeatureRouteGuard>} />
                <Route path="property-info" element={<FeatureRouteGuard module="properties"><PropertyInfo /></FeatureRouteGuard>} />
                <Route path="forms" element={<FeatureRouteGuard module="forms"><Forms /></FeatureRouteGuard>} />
                <Route path="calendar" element={<FeatureRouteGuard module="calendar"><CalendarPage /></FeatureRouteGuard>} />
                <Route path="invoices" element={<FeatureRouteGuard module="invoicing"><Invoices /></FeatureRouteGuard>} />
                <Route path="health-data" element={<HealthData />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
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
          <WorkOrderDialogProvider>
            <ProfileCompletionWrapper>
              <AppContent />
            </ProfileCompletionWrapper>
          </WorkOrderDialogProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
