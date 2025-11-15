import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useWorkOrderDialog } from "@/contexts/WorkOrderDialogContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FileText,
  Briefcase,
  Home,
  Calendar,
  Users,
  Search,
  Plus,
  Package,
  DollarSign,
  FolderOpen,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "work_order" | "property" | "form" | "calendar_event" | "customer";
  icon: typeof FileText;
  path: string;
  itemId?: string; // The actual item ID for opening dialogs/sheets
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeOrgId, isPersonalWorkspace } = useActiveOrg();
  const { features, getFeatureConfig } = useFeatureContext();
  const { openWorkOrderDialog } = useWorkOrderDialog();

  // Feature configuration mapping
  const FEATURE_CONFIG: Record<string, { icon: typeof Plus; path: string; defaultLabel: string }> = {
    work_orders: { icon: Briefcase, path: "/work-orders", defaultLabel: "Work Order" },
    properties: { icon: Home, path: "/property-info", defaultLabel: "Property" },
    forms: { icon: FileText, path: "/forms", defaultLabel: "Form" },
    calendar: { icon: Calendar, path: "/calendar", defaultLabel: "Event" },
    appointments: { icon: Users, path: "/appointments", defaultLabel: "Appointment" },
    inventory: { icon: Package, path: "/inventory", defaultLabel: "Inventory Item" },
    invoicing: { icon: DollarSign, path: "/invoices", defaultLabel: "Invoice" },
    reports: { icon: BarChart3, path: "/reports", defaultLabel: "Report" },
    files: { icon: FolderOpen, path: "/files", defaultLabel: "File" },
    customer_portal: { icon: Users, path: "/portal", defaultLabel: "Portal Access" },
    pos: { icon: ShoppingCart, path: "/pos", defaultLabel: "Sale" },
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search function
  useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Use * wildcards for .or() queries, % for direct .ilike()
        const orSearchTerm = `*${search}*`;
        const ilikeSearchTerm = `%${search}%`;

        // Search work orders - filter by current org/personal space
        let workOrdersQuery = supabase
          .from("work_orders")
          .select("id, customer_name, job_id, status, notes, organization_id")
          .or(`customer_name.ilike.${orSearchTerm},job_id.ilike.${orSearchTerm},notes.ilike.${orSearchTerm}`);
        
        // Filter by org context
        if (isPersonalWorkspace) {
          workOrdersQuery = workOrdersQuery.is("organization_id", null);
        } else if (activeOrgId) {
          workOrdersQuery = workOrdersQuery.eq("organization_id", activeOrgId);
        }
        
        const { data: workOrders, error: woError } = await workOrdersQuery.limit(5);

        if (woError) {
          console.error("Work orders search error:", woError);
        } else if (workOrders && workOrders.length > 0) {
          workOrders.forEach((wo: any) => {
              searchResults.push({
                id: wo.id,
                title: wo.customer_name || `Job ${wo.job_id || wo.id.substring(0, 8)}`,
                subtitle: `Status: ${wo.status}`,
                type: "work_order",
                icon: Briefcase,
                path: `/work-orders`,
                itemId: wo.id, // For opening the dialog
              });
            });
        }

        // Search properties - filter by current user (properties are user-based, not org-based)
        const { data: properties, error: propError } = await supabase
          .from("properties")
          .select("id, property_name, address, user_id")
          .or(`property_name.ilike.${orSearchTerm},address.ilike.${orSearchTerm}`)
          .eq("user_id", user?.id || "")
          .limit(5);

        if (propError) {
          console.error("Properties search error:", propError);
        } else if (properties) {
          properties.forEach((prop: any) => {
              searchResults.push({
                id: prop.id,
                title: prop.property_name || "Unnamed Property",
                subtitle: prop.address || undefined,
                type: "property",
                icon: Home,
                path: `/property-info?property=${prop.id}`,
                itemId: prop.id,
              });
            });
        }

        // Search form templates - filter by current org/personal space
        let formsQuery = supabase
          .from("form_templates")
          .select("id, name, org_id, scope, created_by")
          .ilike("name", ilikeSearchTerm);
        
        // Filter by org context
        if (isPersonalWorkspace) {
          formsQuery = formsQuery.or(`scope.eq.user,scope.eq.global`).or(`created_by.eq.${user?.id},scope.eq.global`);
        } else if (activeOrgId) {
          formsQuery = formsQuery.or(`org_id.eq.${activeOrgId},scope.eq.global,and(scope.eq.user,created_by.eq.${user?.id})`);
        }
        
        const { data: forms, error: formError } = await formsQuery.limit(5);

        if (formError) {
          console.error("Forms search error:", formError);
        } else if (forms) {
          forms.forEach((form: any) => {
              searchResults.push({
                id: form.id,
                title: form.name,
                subtitle: undefined,
                type: "form",
                icon: FileText,
                path: `/forms?template=${form.id}`,
                itemId: form.id,
              });
            });
        }

        // Search calendar events - filter by current org/personal space
        let eventsQuery = supabase
          .from("calendar_events")
          .select("id, title, event_date, organization_id")
          .ilike("title", ilikeSearchTerm);
        
        // Filter by org context
        if (isPersonalWorkspace) {
          eventsQuery = eventsQuery.is("organization_id", null);
        } else if (activeOrgId) {
          eventsQuery = eventsQuery.eq("organization_id", activeOrgId);
        }
        
        const { data: events, error: eventError } = await eventsQuery.limit(5);

        if (eventError) {
          console.error("Calendar events search error:", eventError);
        } else if (events) {
          events.forEach((event: any) => {
              searchResults.push({
                id: event.id,
                title: event.title,
                subtitle: event.event_date ? new Date(event.event_date).toLocaleDateString() : undefined,
                type: "calendar_event",
                icon: Calendar,
                path: `/calendar?event=${event.id}`,
                itemId: event.id,
              });
            });
        }

        // Search profiles - filter by current org/personal space
        let profilesQuery = supabase
          .from("profiles")
          .select("id, full_name, email, organization_id, active_org_id")
          .or(`full_name.ilike.${orSearchTerm},email.ilike.${orSearchTerm}`);
        
        // Filter by org context
        if (isPersonalWorkspace) {
          // In personal space, only show own profile
          profilesQuery = profilesQuery.eq("id", user?.id || "");
        } else if (activeOrgId) {
          // In org space, show profiles from same org
          profilesQuery = profilesQuery.eq("organization_id", activeOrgId);
        }
        
        const { data: customers, error: customerError } = await profilesQuery.limit(5);

        if (customerError) {
          console.error("Profiles search error:", customerError);
        } else if (customers) {
          customers.forEach((customer: any) => {
              searchResults.push({
                id: customer.id,
                title: customer.full_name || customer.email || "Unknown User",
                subtitle: customer.email || undefined,
                type: "customer",
                icon: Users,
                path: `/profile`,
              });
            });
        }

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearch("");

    // Navigate to the page
    navigate(result.path);

    // For work orders, open the dialog
    if (result.type === "work_order" && result.itemId) {
      // Small delay to ensure navigation completes first
      setTimeout(() => {
        openWorkOrderDialog(result.itemId!);
      }, 100);
    }
  };

  const handleQuickAction = (path: string) => {
    setOpen(false);
    setSearch("");
    navigate(path);
  };

  // Build quick actions from all enabled features
  const quickActions = features
    .filter(feature => feature.enabled && FEATURE_CONFIG[feature.module])
    .map(feature => {
      const config = FEATURE_CONFIG[feature.module];
      const orgConfig = getFeatureConfig(feature.module as any);

      return {
        label: orgConfig?.display_name || config.defaultLabel,
        path: config.path,
        icon: config.icon,
      };
    });

  return (
    <>
      {/* Search Trigger Button - Can be placed in header/navbar */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search work orders, properties, forms..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? "Searching..." : "No results found."}
          </CommandEmpty>

          {/* Quick Actions - Always visible */}
          {!search && (
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.path}
                    onSelect={() => handleQuickAction(action.path)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {action.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <>
              {results.filter((r) => r.type === "work_order").length > 0 && (
                <CommandGroup heading={getFeatureConfig('work_orders')?.display_name || "Work Orders"}>
                  {results
                    .filter((r) => r.type === "work_order")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              )}

              {results.filter((r) => r.type === "property").length > 0 && (
                <CommandGroup heading={getFeatureConfig('properties')?.display_name || "Properties"}>
                  {results
                    .filter((r) => r.type === "property")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              )}

              {results.filter((r) => r.type === "form").length > 0 && (
                <CommandGroup heading={getFeatureConfig('forms')?.display_name || "Forms"}>
                  {results
                    .filter((r) => r.type === "form")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              )}

              {results.filter((r) => r.type === "calendar_event").length > 0 && (
                <CommandGroup heading={getFeatureConfig('calendar')?.display_name || "Calendar"}>
                  {results
                    .filter((r) => r.type === "calendar_event")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              )}

              {results.filter((r) => r.type === "customer").length > 0 && (
                <CommandGroup heading="People">
                  {results
                    .filter((r) => r.type === "customer")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
