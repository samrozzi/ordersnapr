import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ordersnaprIcon from "@/assets/ordersnapr-icon.png";

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger />
            <button 
              onClick={() => navigate("/dashboard")}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="OrderSnapr Dashboard"
            >
              <img 
                src={ordersnaprIcon} 
                alt="OrderSnapr" 
                className="h-8 w-8 object-contain"
              />
            </button>
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
