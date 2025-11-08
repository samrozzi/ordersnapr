import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureContext } from "@/contexts/FeatureContext";
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
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "work_order" | "property" | "form" | "calendar_event" | "customer";
  icon: typeof FileText;
  path: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getFeatureConfig } = useFeatureContext();

  // Get custom display names from org feature configs
  const workOrdersConfig = getFeatureConfig('work_orders');
  const propertiesConfig = getFeatureConfig('properties');
  const formsConfig = getFeatureConfig('forms');
  const calendarConfig = getFeatureConfig('calendar');

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
      console.log("🔍 Starting search for:", search);
      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Use * wildcards for .or() queries, % for direct .ilike()
        const orSearchTerm = `*${search}*`;
        const ilikeSearchTerm = `%${search}%`;

        // Search work orders (RLS will filter by org automatically)
        console.log("🔍 Searching work orders for:", search);
        const { data: workOrders, error: woError } = await supabase
          .from("work_orders")
          .select("id, customer_name, job_id, status, notes")
          .or(`customer_name.ilike.${orSearchTerm},job_id.ilike.${orSearchTerm},notes.ilike.${orSearchTerm}`)
          .limit(5);

        if (woError) {
          console.error("❌ Work orders search error:", woError);
        } else {
          console.log("✅ Found work orders:", workOrders?.length || 0);
          if (workOrders && workOrders.length > 0) {
            console.log("📋 Work order data sample:", workOrders[0]);
            workOrders.forEach((wo: any) => {
              searchResults.push({
                id: wo.id,
                title: wo.customer_name || `Job ${wo.job_id || wo.id.substring(0, 8)}`,
                subtitle: `Status: ${wo.status}`,
                type: "work_order",
                icon: Briefcase,
                path: `/work-orders`,
              });
            });
          }
        }

        // Search properties (RLS will filter by org automatically)
        console.log("🔍 Searching properties...");
        const { data: properties, error: propError } = await supabase
          .from("properties")
          .select("id, property_name, address")
          .or(`property_name.ilike.${orSearchTerm},address.ilike.${orSearchTerm}`)
          .limit(5);

        if (propError) {
          console.error("Properties search error:", propError);
        } else {
          console.log("✅ Found properties:", properties?.length || 0);
          if (properties) {
            properties.forEach((prop: any) => {
              searchResults.push({
                id: prop.id,
                title: prop.property_name || "Unnamed Property",
                subtitle: prop.address || undefined,
                type: "property",
                icon: Home,
                path: `/property-info`,
              });
            });
          }
        }

        // Search form templates (RLS will filter by org automatically)
        console.log("🔍 Searching forms...");
        const { data: forms, error: formError } = await supabase
          .from("form_templates")
          .select("id, name")
          .ilike("name", ilikeSearchTerm)
          .limit(5);

        if (formError) {
          console.error("Forms search error:", formError);
        } else {
          console.log("✅ Found forms:", forms?.length || 0);
          if (forms) {
            forms.forEach((form: any) => {
              searchResults.push({
                id: form.id,
                title: form.name,
                subtitle: undefined,
                type: "form",
                icon: FileText,
                path: `/forms`,
              });
            });
          }
        }

        // Search calendar events (RLS will filter by org automatically)
        console.log("🔍 Searching calendar events...");
        const { data: events, error: eventError } = await supabase
          .from("calendar_events")
          .select("id, title, event_date")
          .ilike("title", ilikeSearchTerm)
          .limit(5);

        if (eventError) {
          console.error("Calendar events search error:", eventError);
        } else {
          console.log("✅ Found events:", events?.length || 0);
          if (events) {
            events.forEach((event: any) => {
              searchResults.push({
                id: event.id,
                title: event.title,
                subtitle: event.event_date ? new Date(event.event_date).toLocaleDateString() : undefined,
                type: "calendar_event",
                icon: Calendar,
                path: `/calendar`,
              });
            });
          }
        }

        // Search profiles (RLS will filter by org automatically)
        console.log("🔍 Searching profiles...");
        const { data: customers, error: customerError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .or(`full_name.ilike.${orSearchTerm},email.ilike.${orSearchTerm}`)
          .limit(5);

        if (customerError) {
          console.error("Profiles search error:", customerError);
        } else {
          console.log("✅ Found profiles:", customers?.length || 0);
          if (customers) {
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
        }

        console.log("📊 Total results:", searchResults.length);
        setResults(searchResults);
      } catch (error) {
        console.error("❌ Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setSearch("");
    navigate(path);
  };

  const quickActions = [
    { label: `New ${workOrdersConfig?.display_name?.replace(/s$/, '') || "Work Order"}`, path: "/work-orders", icon: Briefcase },
    { label: `New ${propertiesConfig?.display_name?.replace(/s$/, '') || "Property"}`, path: "/property-info", icon: Home },
    { label: `New ${formsConfig?.display_name?.replace(/s$/, '') || "Form"}`, path: "/forms", icon: FileText },
    { label: `New ${calendarConfig?.display_name?.replace(/s$/, '') || "Event"}`, path: "/calendar", icon: Calendar },
  ];

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

      <CommandDialog open={open} onOpenChange={setOpen}>
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
                    onSelect={() => handleSelect(action.path)}
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
                <CommandGroup heading={workOrdersConfig?.display_name || "Work Orders"}>
                  {results
                    .filter((r) => r.type === "work_order")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result.path)}
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
                <CommandGroup heading={propertiesConfig?.display_name || "Properties"}>
                  {results
                    .filter((r) => r.type === "property")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result.path)}
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
                <CommandGroup heading={formsConfig?.display_name || "Forms"}>
                  {results
                    .filter((r) => r.type === "form")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result.path)}
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
                <CommandGroup heading={calendarConfig?.display_name || "Calendar"}>
                  {results
                    .filter((r) => r.type === "calendar_event")
                    .map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result.path)}
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
                          onSelect={() => handleSelect(result.path)}
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
