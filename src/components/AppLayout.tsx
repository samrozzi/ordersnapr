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
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <header className="sticky top-0 z-50 h-12 md:h-14 border-b flex items-center px-2 md:px-4 gap-2 bg-background shadow-sm">
            <SidebarTrigger />
            
            {/* Center: OrderSnapr Logo (mobile only) */}
            <div className="md:hidden flex-1 flex justify-center items-center">
              <img 
                src={theme === 'dark' ? ordersnaprMobileDark : ordersnaprMobileLight}
                alt="OrderSnapr"
                className="h-7 object-contain"
              />
            </div>
            
            {/* Right: Org Logo (mobile only, if exists) */}
            {orgLogoUrl && (
              <div className="md:hidden">
                <img 
                  src={orgLogoUrl}
                  alt="Organization"
                  className="h-7 max-w-[70px] object-contain"
                />
              </div>
            )}
            
            {/* Desktop: Global Search & Notifications */}
            <div className="hidden md:flex flex-1 justify-end items-center gap-2">
              <GlobalSearch />
              <NotificationCenter />
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
