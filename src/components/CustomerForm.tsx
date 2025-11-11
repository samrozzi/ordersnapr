import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import { useCustomers, type Customer, type CustomerAddress } from "@/hooks/use-customers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CustomFieldRenderer } from "@/components/custom-fields/CustomFieldRenderer";
import { useCustomFields } from "@/hooks/use-custom-fields";
import type { CustomFieldValues } from "@/types/custom-fields";

interface CustomerFormProps {
  customer?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const { createCustomer, updateCustomer } = useCustomers();
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>();
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({});

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: {
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      street: customer?.address?.street || "",
      city: customer?.address?.city || "",
      state: customer?.address?.state || "",
      zip: customer?.address?.zip || "",
      country: customer?.address?.country || "USA",
    }
  });

  // Load org ID and existing custom field values
  useEffect(() => {
    const loadOrgAndCustomFields = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_org_id")
        .eq("id", user.id)
        .single();

      if (profile?.active_org_id) {
        setOrgId(profile.active_org_id);

        // Load existing custom field values if editing
        if (customer?.id) {
          const { data: values } = await supabase
            .from("custom_field_values")
            .select("value, custom_field_id, custom_fields(field_key)")
            .eq("entity_type", "customers")
            .eq("entity_id", customer.id);

          if (values) {
            const valueMap: CustomFieldValues = {};
            values.forEach((v: any) => {
              if (v.custom_fields?.field_key) {
                valueMap[v.custom_fields.field_key] = v.value;
              }
            });
            setCustomFieldValues(valueMap);
          }
        }
      }
    };

    loadOrgAndCustomFields();
  }, [customer?.id]);

  const onSubmit = async (data: CustomerFormData) => {
    setLoading(true);

    try {
      const address: CustomerAddress = {
        street: data.street || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip: data.zip || undefined,
        country: data.country || "USA",
      };

      // Remove undefined values from address
      const cleanedAddress = Object.entries(address).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== "") {
          acc[key as keyof CustomerAddress] = value;
        }
        return acc;
      }, {} as CustomerAddress);

      const customerData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: Object.keys(cleanedAddress).length > 0 ? cleanedAddress : null,
      };

      let customerId: string;

      if (customer) {
        await updateCustomer({ id: customer.id, updates: customerData });
        customerId = customer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert([{ 
            ...customerData, 
            org_id: orgId!,
            address: customerData.address ? JSON.parse(JSON.stringify(customerData.address)) : null
          }])
          .select()
          .single();
        customerId = newCustomer!.id;
      }

      // Save custom field values if any
      if (orgId && Object.keys(customFieldValues).length > 0) {
        const { data: fields } = await supabase
          .from("custom_fields")
          .select("id, field_key")
          .eq("org_id", orgId)
          .eq("entity_type", "customers")
          .eq("is_active", true);

        if (fields && fields.length > 0) {
          const valuesToUpsert = Object.entries(customFieldValues)
            .map(([fieldKey, value]) => {
              const field = fields.find(f => f.field_key === fieldKey);
              if (!field) return null;

              return {
                custom_field_id: field.id,
                entity_type: "customers" as const,
                entity_id: customerId,
                value,
              };
            })
            .filter((item): item is { custom_field_id: string; entity_type: "customers"; entity_id: string; value: any } => item !== null);

          if (valuesToUpsert.length > 0) {
            await supabase
              .from("custom_field_values")
              .upsert(valuesToUpsert, {
                onConflict: "custom_field_id,entity_id",
              });
          }
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving customer:", error);
      // Error toast is already handled by the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="John Doe"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Required for portal access
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street</Label>
            <Input
              id="street"
              {...register("street")}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="San Francisco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                {...register("state")}
                placeholder="CA"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                {...register("zip")}
                placeholder="94102"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              {...register("country")}
              placeholder="USA"
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      {orgId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomFieldRenderer
              entityType="customers"
              orgId={orgId}
              values={customFieldValues}
              onChange={(fieldKey, value) => {
                setCustomFieldValues(prev => ({ ...prev, [fieldKey]: value }));
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {customer ? "Update Customer" : "Create Customer"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
