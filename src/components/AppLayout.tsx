import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ordersnaprMobileLight from "@/assets/ordersnapr-mobile-light.png";
import ordersnaprMobileDark from "@/assets/ordersnapr-mobile-dark.png";

export function AppLayout() {
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchOrgLogo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
        
      if (profile?.organization_id) {
        const { data: orgSettings } = await supabase
          .from("organization_settings")
          .select("logo_url")
          .eq("organization_id", profile.organization_id)
          .single();
          
        if (orgSettings?.logo_url) {
          setOrgLogoUrl(orgSettings.logo_url);
        }
      }
    };
    
    fetchOrgLogo();
  }, []);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 md:h-14 border-b flex items-center px-2 md:px-4 gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
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
            
            {/* Desktop: Empty spacer */}
            <div className="hidden md:flex flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-2 md:p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
