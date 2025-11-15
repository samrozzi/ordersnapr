import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface Customer {
  id: string;
  org_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: CustomerAddress | null;
  meta: any;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithStats extends Customer {
  invoice_count?: number;
  work_order_count?: number;
  total_invoiced_cents?: number;
  total_paid_cents?: number;
}

export function useCustomers(options?: { includeStats?: boolean }) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchOrgId = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      setOrgId(profile?.organization_id || null);
    };

    fetchOrgId();
  }, [user]);

  // Fetch all customers for the organization
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["customers", orgId, options?.includeStats],
    queryFn: async () => {
      if (!orgId) return [];

      let query = supabase
        .from("customers")
        .select("*")
        .eq("org_id", orgId)
        .order("name", { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching customers:", error);
        throw error;
      }

      // If stats are requested, fetch them in bulk (optimized - no N+1 queries)
      if (options?.includeStats && data && data.length > 0) {
        const customerIds = data.map(c => c.id);

        // Fetch ALL invoice stats in one query
        const { data: allInvoices } = await supabase
          .from("invoices")
          .select("customer_id, total_cents, paid_amount_cents, status")
          .in("customer_id", customerIds);

        // Fetch ALL work order counts in one query
        const workOrdersQuery: any = supabase.from("work_orders");
        const { data: allWorkOrders } = await workOrdersQuery
          .select("customer_id, id")
          .in("customer_id", customerIds);

        // Aggregate stats by customer ID
        const statsByCustomer = customerIds.reduce((acc, customerId) => {
          const customerInvoices = allInvoices?.filter(inv => inv.customer_id === customerId) || [];
          const customerWorkOrders = allWorkOrders?.filter(wo => wo.customer_id === customerId) || [];

          acc[customerId] = {
            invoice_count: customerInvoices.length,
            work_order_count: customerWorkOrders.length,
            total_invoiced_cents: customerInvoices.reduce((sum, inv) => sum + (inv.total_cents || 0), 0),
            total_paid_cents: customerInvoices.reduce((sum, inv) => sum + (inv.paid_amount_cents || 0), 0),
          };

          return acc;
        }, {} as Record<string, any>);

        // Combine customer data with stats
        const customersWithStats = data.map(customer => ({
          ...customer,
          ...statsByCustomer[customer.id],
        })) as CustomerWithStats[];

        return customersWithStats;
      }

      return data as Customer[];
    },
    enabled: !!orgId && !!user,
  });

  // Fetch single customer
  const useCustomer = (customerId: string) => {
    return useQuery({
      queryKey: ["customer", customerId, orgId],
      queryFn: async () => {
        if (!orgId || !customerId) return null;

        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", customerId)
          .eq("org_id", orgId)
          .single();

        if (error) {
          console.error("Error fetching customer:", error);
          throw error;
        }

        return data as Customer;
      },
      enabled: !!orgId && !!customerId,
    });
  };

  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (customerData: Partial<Customer> & { name: string }) => {
      if (!orgId) throw new Error("Organization required");

      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email,
            address: customerData.address as any,
            meta: customerData.meta,
            org_id: orgId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
      toast.success("Customer created successfully");
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error);
      toast.error(error.message || "Failed to create customer");
    },
  });

  // Update customer mutation
  const updateCustomer = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Customer> }) => {
      const updateData = {
        ...updates,
        address: updates.address as any,
      };
      
      const { data, error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", id)
        .eq("org_id", orgId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      toast.success("Customer updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating customer:", error);
      toast.error(error.message || "Failed to update customer");
    },
  });

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      // Check if customer has associated invoices or work orders
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("customer_id", id)
        .limit(1);

      const workOrdersQuery: any = supabase.from("work_orders");
      const { data: workOrders } = await workOrdersQuery
        .select("id")
        .eq("customer_id", id)
        .limit(1);

      if (invoices && invoices.length > 0) {
        throw new Error(
          "Cannot delete customer with associated invoices. Please remove or reassign invoices first."
        );
      }

      if (workOrders && workOrders.length > 0) {
        throw new Error(
          "Cannot delete customer with associated work orders. Please remove or reassign work orders first."
        );
      }

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
      toast.success("Customer deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting customer:", error);
      toast.error(error.message || "Failed to delete customer");
    },
  });

  // Search customers
  const searchCustomers = async (query: string): Promise<Customer[]> => {
    if (!orgId) return [];

    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("org_id", orgId)
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
      .order("name", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error searching customers:", error);
      return [];
    }

    return data as Customer[];
  };

  return {
    customers,
    isLoading,
    orgId,
    useCustomer,
    createCustomer: createCustomer.mutateAsync,
    updateCustomer: updateCustomer.mutateAsync,
    deleteCustomer: deleteCustomer.mutateAsync,
    searchCustomers,
    refetch: async () => { await refetch(); },
  };
}
