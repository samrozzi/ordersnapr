import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useTheme } from "next-themes";
import { useActiveOrg } from "@/hooks/use-active-org";
//
import ordersnaprMobileLight from "@/assets/ordersnapr-mobile-light.png";
import ordersnaprMobileDark from "@/assets/ordersnapr-mobile-dark.png";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationCenter } from "@/components/NotificationCenter";
import { QuickAddButton } from "@/components/QuickAddButton";
import { VoiceAssistantButton } from "@/components/VoiceAssistantButton";

export function AppLayout() {
  const { theme } = useTheme();
  const { orgLogoUrl } = useActiveOrg();


  return (
    <SidebarProvider defaultOpen>
      {/* Changed h-screen to h-[100dvh] to fix mobile scrolling/sticky header */}
      <div className="flex h-[100dvh] w-full overflow-hidden">
        <AppSidebar />
        {/* Added min-w-0 to prevent wide content (tables) from expanding the layout */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <header className="sticky top-0 z-50 h-12 md:h-14 border-b flex items-center px-2 md:px-4 gap-2 bg-background shadow-sm shrink-0">
            <SidebarTrigger />

            {/* Center: OrderSnapr Logo (mobile only) */}
            <div className="md:hidden flex-1 flex justify-center items-center min-w-0">
              <img
                src={theme === 'dark' ? ordersnaprMobileDark : ordersnaprMobileLight}
                alt="OrderSnapr"
                className="h-7 object-contain max-w-full"
              />
            </div>

            {/* Right: Org Logo (mobile only) - Added shrink-0 so logo is never cut off */}
            {orgLogoUrl && (
              <div className="md:hidden shrink-0 flex items-center">
                <img
                  src={orgLogoUrl}
                  alt="Organization"
                  className="h-7 max-w-[70px] object-contain"
                />
              </div>
            )}
            
            {/* Desktop: Global Search & Notifications & Org Logo */}
            <div className="hidden md:flex flex-1 justify-end items-center gap-2 min-w-0">
              <GlobalSearch />
              <NotificationCenter />

              {/* Desktop Org Logo */}
              {orgLogoUrl && (
                <div className="ml-2 border-l pl-4 h-8 flex items-center shrink-0">
                  <img
                    src={orgLogoUrl}
                    alt="Organization"
                    className="h-full max-w-[120px] object-contain"
                  />
                </div>
              )}
            </div>
          </header>
          <ConnectionBanner />
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <main className="p-2 md:p-4 lg:p-6 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <Outlet />
            </main>
          </div>
          <QuickAddButton />
          <VoiceAssistantButton />
        </div>
      </div>
    </SidebarProvider>
  );
}
