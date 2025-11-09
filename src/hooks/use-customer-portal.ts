import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomerPortalToken {
  id: string;
  customer_id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  last_accessed_at: string | null;
  is_active: boolean;
  created_by: string | null;
  meta: any;
}

export interface CustomerPortalData {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: any;
  };
  workOrders: any[];
  invoices: any[];
}

// Hook for managing customer portal tokens (for org members)
export function useCustomerPortalTokens(customerId?: string) {
  const queryClient = useQueryClient();

  // Fetch tokens for a customer
  const { data: tokens, isLoading } = useQuery({
    queryKey: ["customer-portal-tokens", customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from("customer_portal_tokens")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomerPortalToken[];
    },
    enabled: !!customerId,
  });

  // Generate new token
  const generateToken = useMutation({
    mutationFn: async ({
      customerId,
      expiresInDays,
    }: {
      customerId: string;
      expiresInDays?: number;
    }) => {
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("customer_portal_tokens")
        .insert({
          customer_id: customerId,
          expires_at: expiresAt,
          created_by: userData?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-portal-tokens"] });
      toast.success("Portal link generated successfully");
    },
    onError: (error) => {
      console.error("Error generating portal token:", error);
      toast.error("Failed to generate portal link");
    },
  });

  // Deactivate token
  const deactivateToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("customer_portal_tokens")
        .update({ is_active: false })
        .eq("id", tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-portal-tokens"] });
      toast.success("Portal access revoked");
    },
    onError: (error) => {
      console.error("Error deactivating token:", error);
      toast.error("Failed to revoke portal access");
    },
  });

  // Delete token
  const deleteToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("customer_portal_tokens")
        .delete()
        .eq("id", tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-portal-tokens"] });
      toast.success("Portal link deleted");
    },
    onError: (error) => {
      console.error("Error deleting token:", error);
      toast.error("Failed to delete portal link");
    },
  });

  // Update token last accessed time
  const updateLastAccessed = async (tokenId: string) => {
    await supabase
      .from("customer_portal_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", tokenId);
  };

  // Generate portal URL
  const getPortalUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/portal/${token}`;
  };

  return {
    tokens,
    isLoading,
    generateToken: generateToken.mutateAsync,
    deactivateToken: deactivateToken.mutateAsync,
    deleteToken: deleteToken.mutateAsync,
    updateLastAccessed,
    getPortalUrl,
  };
}

// Hook for accessing portal data (for customers via token)
export function useCustomerPortalAccess(token?: string) {
  const queryClient = useQueryClient();

  // Validate token and fetch customer data
  const {
    data: portalData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customer-portal-access", token],
    queryFn: async (): Promise<CustomerPortalData | null> => {
      if (!token) return null;

      // Verify token exists and is active
      const { data: tokenData, error: tokenError } = await supabase
        .from("customer_portal_tokens")
        .select("customer_id, is_active, expires_at")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        throw new Error("Invalid or expired portal link");
      }

      if (!tokenData.is_active) {
        throw new Error("This portal link has been deactivated");
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        throw new Error("This portal link has expired");
      }

      const customerId = tokenData.customer_id;

      // Fetch customer details
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, name, email, phone, address")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;

      // Fetch work orders for this customer
      const { data: workOrders, error: workOrdersError } = await supabase
        .from("work_orders")
        .select(`
          *,
          profiles:completed_by(full_name, email)
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (workOrdersError) throw workOrdersError;

      // Fetch invoices for this customer
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerId)
        .order("issue_date", { ascending: false });

      if (invoicesError) throw invoicesError;

      // Update last accessed timestamp
      await supabase
        .from("customer_portal_tokens")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("token", token);

      return {
        customer,
        workOrders: workOrders || [],
        invoices: invoices || [],
      };
    },
    enabled: !!token,
    retry: false,
  });

  return {
    portalData,
    isLoading,
    error: error as Error | null,
    isValidToken: !!portalData,
  };
}
