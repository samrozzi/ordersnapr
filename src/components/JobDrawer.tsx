import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, X, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useConvertWorkOrderToInvoice } from "@/hooks/use-convert-workorder-to-invoice";

const formSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  type: z.string().optional(),
  status: z.string(),
  assigned_to: z.string().optional(),
  scheduled_date: z.date().optional(),
  scheduled_time: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  custom_data: z.record(z.any()).optional(),
  checklist: z.array(z.object({
    text: z.string(),
    completed: z.boolean()
  })).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface JobDrawerProps {
  onSuccess: () => void;
  workOrder?: any;
  config: {
    types?: string[];
    statuses?: string[];
    custom_fields?: Array<{ key: string; label: string; type: string; options?: string[] }>;
  };
}

export function JobDrawer({ onSuccess, workOrder, config }: JobDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklistItems, setChecklistItems] = useState<Array<{ text: string; completed: boolean }>>(
    workOrder?.checklist || []
  );
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const { convertToInvoice, isConverting } = useConvertWorkOrderToInvoice();

  const { data: orgUsers } = useQuery({
    queryKey: ['org-users'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', profile.organization_id)
        .eq('approval_status', 'approved');

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: workOrder?.customer_name || "",
      type: workOrder?.type || "",
      status: workOrder?.status || (config?.statuses?.[0] || "New"),
      assigned_to: workOrder?.assigned_to || "",
      scheduled_date: workOrder?.scheduled_date ? parseISO(workOrder.scheduled_date) : undefined,
      scheduled_time: workOrder?.scheduled_time || "",
      address: workOrder?.address || "",
      notes: workOrder?.notes || "",
      custom_data: workOrder?.custom_data || {},
    },
  });

  // Reset form when workOrder changes to handle switching between edit and create modes
  useEffect(() => {
    form.reset({
      customer_name: workOrder?.customer_name || "",
      type: workOrder?.type || "",
      status: workOrder?.status || (config?.statuses?.[0] || "New"),
      assigned_to: workOrder?.assigned_to || "",
      scheduled_date: workOrder?.scheduled_date ? parseISO(workOrder.scheduled_date) : undefined,
      scheduled_time: workOrder?.scheduled_time || "",
      address: workOrder?.address || "",
      notes: workOrder?.notes || "",
      custom_data: workOrder?.custom_data || {},
    });
    setChecklistItems(workOrder?.checklist || []);
  }, [workOrder, form, config]);

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, { text: newChecklistItem, completed: false }]);
      setNewChecklistItem("");
    }
  };

  const toggleChecklistItem = (index: number) => {
    const updated = [...checklistItems];
    updated[index].completed = !updated[index].completed;
    setChecklistItems(updated);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleConvertToInvoice = async () => {
    if (!workOrder) return;

    try {
      await convertToInvoice({
        workOrder,
        options: {
          lineItemDescription: `${workOrder.type || 'Service'}: ${workOrder.customer_name}${workOrder.address ? '\nLocation: ' + workOrder.address : ''}`,
          lineItemRate: 0, // User will need to fill in the rate
          dueInDays: 30,
        },
      });
    } catch (error) {
      // Error is handled by the hook
      console.error("Conversion error:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization");

      const orderData = {
        customer_name: data.customer_name,
        type: data.type || null,
        status: data.status,
        assigned_to: data.assigned_to || null,
        scheduled_date: data.scheduled_date ? format(data.scheduled_date, 'yyyy-MM-dd') : null,
        scheduled_time: data.scheduled_time || null,
        address: data.address || null,
        notes: data.notes || null,
        custom_data: data.custom_data || {},
        checklist: checklistItems,
      };

      if (workOrder) {
        const { error } = await supabase
          .from("work_orders")
          .update(orderData)
          .eq("id", workOrder.id);

        if (error) throw error;
        toast.success("Job updated successfully");
      } else {
        const { error } = await supabase
          .from("work_orders")
          .insert([{
            ...orderData,
            user_id: user.id,
            organization_id: profile.organization_id,
          }]);

        if (error) throw error;
        toast.success("Job created successfully");
        form.reset();
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving job:", error);
      toast.error(`Failed to ${workOrder ? "update" : "create"} job`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {config?.types && config.types.length > 0 && (
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {config.types.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(config?.statuses || ['New', 'Scheduled', 'Complete']).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {orgUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduled_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Scheduled Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduled_time"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Scheduled Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Checklist */}
        <div className="space-y-2">
          <Label>Checklist</Label>
          <div className="space-y-2">
            {checklistItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleChecklistItem(index)}
                />
                <span className={cn("flex-1", item.completed && "line-through text-muted-foreground")}>
                  {item.text}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChecklistItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
              placeholder="Add checklist item..."
            />
            <Button type="button" onClick={addChecklistItem} size="sm">
              Add
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Saving..." : workOrder ? "Update Job" : "Create Job"}
          </Button>
          {workOrder && (
            <Button
              type="button"
              variant="outline"
              onClick={handleConvertToInvoice}
              disabled={isConverting}
            >
              <Receipt className="h-4 w-4 mr-2" />
              {isConverting ? "Converting..." : "Convert to Invoice"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
