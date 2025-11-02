import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Home, Calendar as CalendarIcon, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";

interface AppHeaderProps {
  orgLogoUrl?: string | null;
  isAdmin?: boolean;
  isOrgAdmin?: boolean;
  showHomeButton?: boolean;
  currentPage?: string;
  showNavTabs?: boolean;
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

export const AppHeader = ({ 
  orgLogoUrl, 
  isAdmin, 
  isOrgAdmin,
  showHomeButton = true, 
  currentPage,
  showNavTabs = false,
  onTabChange,
  activeTab
}: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="border-b overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <button 
            onClick={() => navigate("/")}
            className="relative cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            aria-label="Go to home page"
          >
            <img src={ordersnaprLogo} alt="ordersnapr" className="h-20 sm:h-24 relative z-10" />
          </button>
          {orgLogoUrl && (
            <button
              onClick={() => navigate("/")}
              className="cursor-pointer hover:opacity-80 transition-opacity shrink-0"
              aria-label="Go to home page"
            >
              <img 
                src={orgLogoUrl} 
                alt="Organization logo" 
                className="h-auto max-h-12 sm:max-h-16 max-w-[120px] sm:max-w-[200px] object-contain"
              />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto">
          <TooltipProvider>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {showHomeButton && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={currentPage === "dashboard" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => navigate("/dashboard")}
                      aria-label="Dashboard"
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Dashboard</TooltipContent>
                </Tooltip>
              )}
              
              {showNavTabs && (
                <>
                  <Button
                    variant={activeTab === "work-orders" ? "default" : "ghost"}
                    onClick={() => onTabChange?.("work-orders")}
                    className="h-8 sm:h-10"
                  >
                    Work Orders
                  </Button>
                  <Button
                    variant={activeTab === "property-info" ? "default" : "ghost"}
                    onClick={() => onTabChange?.("property-info")}
                    className="h-8 sm:h-10"
                  >
                    Property Info
                  </Button>
                  <Button
                    variant={activeTab === "forms" ? "default" : "ghost"}
                    onClick={() => onTabChange?.("forms")}
                    className="h-8 sm:h-10"
                  >
                    Forms
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {(isAdmin || isOrgAdmin) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => navigate(isAdmin ? "/admin" : "/org-admin")}
                      aria-label={isAdmin ? "Admin" : "Org Admin"}
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isAdmin ? "Admin" : "Org Admin"}</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={currentPage === "calendar" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => navigate("/calendar")}
                    aria-label="Calendar"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Calendar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={currentPage === "profile" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => navigate("/profile")}
                    aria-label="Profile"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Profile</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};
