import { Building2, Check, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveOrg } from "@/hooks/use-active-org";
import { Skeleton } from "@/components/ui/skeleton";

export function OrgSwitcher() {
  const { activeOrgId, activeOrg, memberships, isPersonalWorkspace, isLoading, switchOrg, isSwitching } = useActiveOrg();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  // Don't show switcher if user has no org memberships
  if (!memberships || memberships.length === 0) {
    return null;
  }

  const displayName = isPersonalWorkspace 
    ? "Personal Workspace" 
    : activeOrg?.name || "Organization";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 truncate">
            {isPersonalWorkspace ? (
              <User className="h-4 w-4 shrink-0" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{displayName}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Personal Workspace */}
        <DropdownMenuItem
          onClick={() => switchOrg(null)}
          disabled={isSwitching}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span className="flex-1">Personal Workspace</span>
          {isPersonalWorkspace && <Check className="ml-2 h-4 w-4" />}
        </DropdownMenuItem>

        {/* Organization Workspaces */}
        {memberships.map((membership) => (
          <DropdownMenuItem
            key={membership.id}
            onClick={() => switchOrg(membership.org_id)}
            disabled={isSwitching}
            className="cursor-pointer"
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span className="flex-1">{membership.organization.name}</span>
            {activeOrgId === membership.org_id && <Check className="ml-2 h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
