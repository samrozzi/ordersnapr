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
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AppUpdateNotification } from "@/components/AppUpdateNotification";
import { UsernameGuard } from "@/components/UsernameGuard";
import { ThemeRestorer } from "@/components/ThemeRestorer";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";

// Lazy load heavy page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const OrgAdmin = lazy(() => import("./pages/OrgAdmin"));
const CustomFieldsAdmin = lazy(() => import("./pages/CustomFieldsAdmin"));
const Profile = lazy(() => import("./pages/Profile"));
const JobAudit = lazy(() => import("./pages/JobAudit"));
const RideAlong = lazy(() => import("./pages/RideAlong"));
const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const PropertyInfo = lazy(() => import("./pages/PropertyInfo"));
const Forms = lazy(() => import("./pages/Forms"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Customers = lazy(() => import("./pages/Customers"));
const Notes = lazy(() => import("./pages/Notes"));
const HealthData = lazy(() => import("./pages/HealthData"));
const Reports = lazy(() => import("./pages/Reports"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const FreeTierWorkspace = lazy(() => import("./pages/FreeTierWorkspace"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const FreeTierDashboard = lazy(() => import("./pages/FreeTierDashboard"));
const PublicInvoice = lazy(() => import("./pages/PublicInvoice"));

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
      <ThemeRestorer />
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <AppUpdateNotification />
      <UsernameGuard>
        <BrowserRouter>
        <FeatureProvider>
          <MigrationChecker />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />

              {/* Customer Portal - Public route (token-based access) */}
              <Route path="/portal/:token" element={<CustomerPortal />} />

              {/* Public Invoice - Shareable invoice links */}
              <Route path="/invoice/:token" element={<PublicInvoice />} />

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
                <Route path="custom-fields-admin" element={<CustomFieldsAdmin />} />
                <Route path="free-tier-dashboard" element={<Suspense fallback={<PageSkeleton />}><FreeTierDashboard /></Suspense>} />
                <Route path="job-audit" element={<FeatureRouteGuard module="work_orders"><JobAudit /></FeatureRouteGuard>} />
                <Route path="ride-along" element={<FeatureRouteGuard module="work_orders"><RideAlong /></FeatureRouteGuard>} />
                <Route path="work-orders" element={<FeatureRouteGuard module="work_orders"><WorkOrders /></FeatureRouteGuard>} />
                <Route path="property-info" element={<FeatureRouteGuard module="properties"><PropertyInfo /></FeatureRouteGuard>} />
                <Route path="forms" element={<FeatureRouteGuard module="forms"><Forms /></FeatureRouteGuard>} />
                <Route path="calendar" element={<FeatureRouteGuard module="calendar"><CalendarPage /></FeatureRouteGuard>} />
                <Route path="invoices" element={<FeatureRouteGuard module="invoicing"><Invoices /></FeatureRouteGuard>} />
                <Route path="customers" element={<FeatureRouteGuard module="customers"><Customers /></FeatureRouteGuard>} />
                <Route path="reports" element={<FeatureRouteGuard module="reports"><Reports /></FeatureRouteGuard>} />
                <Route path="notes" element={<Notes />} />
                <Route path="health-data" element={<HealthData />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </FeatureProvider>
        </BrowserRouter>
      </UsernameGuard>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="ordersnapr-theme"
        enableColorScheme
      >
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
