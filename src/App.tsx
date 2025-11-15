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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AppUpdateNotification } from "@/components/AppUpdateNotification";
import { UsernameGuard } from "@/components/UsernameGuard";
import { ThemeRestorer } from "@/components/ThemeRestorer";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";

// Eager load frequently accessed pages for instant navigation
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import WorkOrders from "./pages/WorkOrders";
import PropertyInfo from "./pages/PropertyInfo";
import Notes from "./pages/Notes";

// Lazy load less frequently accessed pages
const Admin = lazy(() => import("./pages/Admin"));
const OrgAdmin = lazy(() => import("./pages/OrgAdmin"));
const CustomFieldsAdmin = lazy(() => import("./pages/CustomFieldsAdmin"));
const JobAudit = lazy(() => import("./pages/JobAudit"));
const RideAlong = lazy(() => import("./pages/RideAlong"));
const Forms = lazy(() => import("./pages/Forms"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Customers = lazy(() => import("./pages/Customers"));
const HealthData = lazy(() => import("./pages/HealthData"));
const Reports = lazy(() => import("./pages/Reports"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const FreeTierWorkspace = lazy(() => import("./pages/FreeTierWorkspace"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const FreeTierDashboard = lazy(() => import("./pages/FreeTierDashboard"));
const PublicInvoice = lazy(() => import("./pages/PublicInvoice"));

// Optimized React Query configuration for speed
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
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
          <ErrorBoundary>
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
                  <Route path="dashboard" element={
                    <RouteErrorBoundary routeName="Dashboard">
                      <Dashboard />
                    </RouteErrorBoundary>
                  } />
                  <Route path="profile" element={
                    <RouteErrorBoundary routeName="Profile">
                      <Profile />
                    </RouteErrorBoundary>
                  } />
                  <Route path="admin" element={
                    <RouteErrorBoundary routeName="Admin">
                      <Admin />
                    </RouteErrorBoundary>
                  } />
                  <Route path="org-admin" element={
                    <RouteErrorBoundary routeName="Organization Admin">
                      <OrgAdmin />
                    </RouteErrorBoundary>
                  } />
                  <Route path="custom-fields-admin" element={
                    <RouteErrorBoundary routeName="Custom Fields Admin">
                      <CustomFieldsAdmin />
                    </RouteErrorBoundary>
                  } />
                  <Route path="free-tier-dashboard" element={
                    <RouteErrorBoundary routeName="Free Tier Dashboard">
                      <Suspense fallback={<PageSkeleton />}>
                        <FreeTierDashboard />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="job-audit" element={
                    <RouteErrorBoundary routeName="Job Audit">
                      <FeatureRouteGuard module="work_orders">
                        <JobAudit />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="ride-along" element={
                    <RouteErrorBoundary routeName="Ride Along">
                      <FeatureRouteGuard module="work_orders">
                        <RideAlong />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="work-orders" element={
                    <RouteErrorBoundary routeName="Work Orders">
                      <FeatureRouteGuard module="work_orders">
                        <WorkOrders />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="property-info" element={
                    <RouteErrorBoundary routeName="Properties">
                      <FeatureRouteGuard module="properties">
                        <PropertyInfo />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="forms" element={
                    <RouteErrorBoundary routeName="Forms">
                      <FeatureRouteGuard module="forms">
                        <Forms />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="calendar" element={
                    <RouteErrorBoundary routeName="Calendar">
                      <FeatureRouteGuard module="calendar">
                        <CalendarPage />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="invoices" element={
                    <RouteErrorBoundary routeName="Invoices">
                      <FeatureRouteGuard module="invoicing">
                        <Invoices />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="customers" element={
                    <RouteErrorBoundary routeName="Customers">
                      <FeatureRouteGuard module="customers">
                        <Customers />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="reports" element={
                    <RouteErrorBoundary routeName="Reports">
                      <FeatureRouteGuard module="reports">
                        <Reports />
                      </FeatureRouteGuard>
                    </RouteErrorBoundary>
                  } />
                  <Route path="notes" element={
                    <RouteErrorBoundary routeName="Notes">
                      <Notes />
                    </RouteErrorBoundary>
                  } />
                  <Route path="health-data" element={
                    <RouteErrorBoundary routeName="Health Data">
                      <HealthData />
                    </RouteErrorBoundary>
                  } />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
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
        defaultTheme="light"
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
