import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  bpc: z.string().max(50, "BPC must be less than 50 characters").optional(),
  ban: z.string().max(50, "BAN must be less than 50 characters").optional(),
  package: z.string().max(100, "Package must be less than 100 characters").optional(),
  job_id: z.string().max(100, "Job ID must be less than 100 characters").optional(),
  customer_name: z.string().min(1, "Customer name is required").max(100, "Customer name must be less than 100 characters"),
  contact_info: z.string().max(100, "Contact info must be less than 100 characters").optional(),
  address: z.string().max(500, "Address must be less than 500 characters").optional(),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").optional(),
  scheduled_date: z.date().optional(),
  scheduled_time: z.string().optional(),
  access_required: z.boolean().default(false),
  access_notes: z.string().max(1000, "Access notes must be less than 1000 characters").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface WorkOrderFormProps {
  onSuccess: () => void;
  workOrder?: {
    id: string;
    bpc: string | null;
    ban: string | null;
    package: string | null;
    job_id: string | null;
    customer_name: string;
    contact_info: string | null;
    address: string | null;
    notes: string | null;
    scheduled_date: string | null;
    scheduled_time: string | null;
    photos: string[] | null;
    access_required: boolean | null;
    access_notes: string | null;
  };
}

export function WorkOrderForm({ onSuccess, workOrder }: WorkOrderFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bpc: workOrder?.bpc || "",
      ban: workOrder?.ban || "",
      package: workOrder?.package || "",
      job_id: workOrder?.job_id || "",
      customer_name: workOrder?.customer_name || "",
      contact_info: workOrder?.contact_info || "",
      address: workOrder?.address || "",
      notes: workOrder?.notes || "",
      scheduled_date: workOrder?.scheduled_date ? parseISO(workOrder.scheduled_date) : undefined,
      scheduled_time: workOrder?.scheduled_time || "",
      access_required: workOrder?.access_required || false,
      access_notes: workOrder?.access_notes || "",
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photoFiles.length + photoPreviewUrls.length > 5) {
      toast({
        title: "Too many photos",
        description: "Maximum 5 photos allowed per work order",
        variant: "destructive",
      });
      return;
    }

    setPhotoFiles([...photoFiles, ...files]);
    
    // Create preview URLs for new files
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    if (index < (workOrder?.photos?.length || 0)) {
      // Removing an existing photo
      setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index));
    } else {
      // Removing a new photo
      const newPhotoIndex = index - (workOrder?.photos?.length || 0);
      setPhotoFiles(photoFiles.filter((_, i) => i !== newPhotoIndex));
      setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index));
    }
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    if (photoFiles.length === 0) {
      return workOrder?.photos || [];
    }

    const uploadedUrls: string[] = [...(workOrder?.photos || [])];

    for (const file of photoFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('work-order-photos')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create a signed URL that expires in 1 year (31536000 seconds)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('work-order-photos')
        .createSignedUrl(fileName, 31536000);

      if (signedUrlError) {
        throw signedUrlError;
      }

      uploadedUrls.push(signedUrlData.signedUrl);
    }

    return uploadedUrls;
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to manage work orders",
          variant: "destructive",
        });
        return;
      }

      // Get user's organization_id (optional - free tier users may not have one)
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      // Upload photos first
      const photoUrls = await uploadPhotos(user.id);

      const orderData = {
        bpc: data.bpc || null,
        ban: data.ban || null,
        package: data.package || null,
        job_id: data.job_id || null,
        customer_name: data.customer_name,
        contact_info: data.contact_info || null,
        address: data.address || null,
        notes: data.notes || null,
        scheduled_date: data.scheduled_date ? format(data.scheduled_date, 'yyyy-MM-dd') : null,
        scheduled_time: data.scheduled_time || null,
        status: data.scheduled_date ? "scheduled" : "pending",
        photos: photoUrls,
        access_required: data.access_required,
        access_notes: data.access_required ? (data.access_notes || null) : null,
      };

      if (workOrder) {
        // Update existing work order
        const { data: updatedData, error } = await supabase
          .from("work_orders")
          .update(orderData)
          .eq("id", workOrder.id)
          .select()
          .single();

        if (error) {
          console.error("Update error:", error);
          throw error;
        }

        console.log("Updated work order:", updatedData);
        console.log("New scheduled_date:", updatedData?.scheduled_date);

        toast({
          title: "Success",
          description: "Work order updated successfully",
        });
        
        // Wait a moment for the database to commit, then refresh
        await new Promise(resolve => setTimeout(resolve, 100));
        onSuccess();
      } else {
        // Create new work order
        const { error } = await supabase.from("work_orders").insert([{
          ...orderData,
          user_id: user.id,
          organization_id: profile?.organization_id || null,
        }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Work order created successfully",
        });
        
        form.reset();
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving work order:", error);
      toast({
        title: "Error",
        description: `Failed to ${workOrder ? "update" : "create"} work order`,
        variant: "destructive",
      });
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
            name="bpc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BPC</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ban"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BAN</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="package"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PACKAGE</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="job_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>JOB ID</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="contact_info"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Info</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Not yet scheduled</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
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

        {(form.watch("scheduled_date") || form.watch("scheduled_time")) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.setValue("scheduled_date", undefined, { shouldDirty: true, shouldValidate: true });
              form.setValue("scheduled_time", "", { shouldDirty: true, shouldValidate: true });
            }}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Unschedule
          </Button>
        )}

        <FormField
          control={form.control}
          name="access_required"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Access Requirements?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === "yes")}
                  value={field.value ? "yes" : "no"}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="access-no" />
                    <Label htmlFor="access-no">No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="access-yes" />
                    <Label htmlFor="access-yes">Yes</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("access_required") && (
          <FormField
            control={form.control}
            name="access_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Information</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Enter any necessary access information..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

        {/* Photo Upload */}
        <div className="space-y-2">
          <Label>Photos (Optional, max 5)</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('photo-upload')?.click()}
              disabled={photoPreviewUrls.length >= 5}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Photos
            </Button>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />
            <span className="text-sm text-muted-foreground">
              {photoPreviewUrls.length} / 5 photos
            </span>
          </div>

          {photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting 
            ? (workOrder ? "Updating..." : "Creating...") 
            : (workOrder ? "Update Work Order" : "Create Work Order")
          }
        </Button>
      </form>
    </Form>
  );
}
