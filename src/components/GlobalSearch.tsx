import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText,
  Briefcase,
  Home,
  Calendar,
  Users,
  Search,
  Plus,
  Star,
} from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";

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
  const { favorites } = useFavorites("work_order", "");

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
        // Get user's org_id
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", currentUser.id)
          .single();

        if (!profile?.organization_id) {
          setLoading(false);
          return;
        }

        const searchTerm = `%${search}%`;

        // Search work orders
        const { data: workOrders } = await supabase
          .from("work_orders")
          .select("id, title, status, job_number, organization_id")
          .eq("organization_id", profile.organization_id)
          .or(`title.ilike.${searchTerm},job_number.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);

        if (workOrders) {
          workOrders.forEach((wo) => {
            searchResults.push({
              id: wo.id,
              title: wo.title || `Job #${wo.job_number}`,
              subtitle: `Status: ${wo.status}`,
              type: "work_order",
              icon: Briefcase,
              path: `/work-orders`,
            });
          });
        }

        // Search properties
        const { data: properties } = await supabase
          .from("properties")
          .select("id, property_name, address, organization_id")
          .eq("organization_id", profile.organization_id)
          .or(`property_name.ilike.${searchTerm},address.ilike.${searchTerm}`)
          .limit(5);

        if (properties) {
          properties.forEach((prop) => {
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

        // Search form templates (can be org-scoped or global)
        const { data: forms } = await supabase
          .from("form_templates")
          .select("id, name, description, organization_id")
          .or(`organization_id.eq.${profile.organization_id},organization_id.is.null`)
          .ilike("name", searchTerm)
          .limit(5);

        if (forms) {
          forms.forEach((form) => {
            searchResults.push({
              id: form.id,
              title: form.name,
              subtitle: form.description || undefined,
              type: "form",
              icon: FileText,
              path: `/forms`,
            });
          });
        }

        // Search calendar events
        const { data: events } = await supabase
          .from("calendar_events")
          .select("id, title, event_type, start_time, organization_id")
          .eq("organization_id", profile.organization_id)
          .ilike("title", searchTerm)
          .limit(5);

        if (events) {
          events.forEach((event) => {
            searchResults.push({
              id: event.id,
              title: event.title,
              subtitle: `${event.event_type} - ${new Date(event.start_time).toLocaleDateString()}`,
              type: "calendar_event",
              icon: Calendar,
              path: `/calendar`,
            });
          });
        }

        // Search profiles (users in same org)
        const { data: customers } = await supabase
          .from("profiles")
          .select("id, full_name, email, organization_id")
          .eq("organization_id", profile.organization_id)
          .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        if (customers) {
          customers.forEach((customer) => {
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

  const handleSelect = (path: string) => {
    setOpen(false);
    setSearch("");
    navigate(path);
  };

  const quickActions = [
    { label: "New Work Order", path: "/work-orders", icon: Briefcase },
    { label: "New Property", path: "/property-info", icon: Home },
    { label: "New Form", path: "/forms", icon: FileText },
    { label: "New Event", path: "/calendar", icon: Calendar },
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

          {/* Favorites */}
          {!search && favorites && favorites.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Favorites">
                {favorites.slice(0, 5).map((fav) => (
                  <CommandItem
                    key={fav.id}
                    onSelect={() => handleSelect(`/work-orders/${fav.entity_id}`)}
                  >
                    <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
                    Favorite Item
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <>
              {results.filter((r) => r.type === "work_order").length > 0 && (
                <CommandGroup heading="Work Orders">
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
                <CommandGroup heading="Properties">
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
                <CommandGroup heading="Forms">
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
                <CommandGroup heading="Calendar">
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
