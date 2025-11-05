import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ChecklistField } from "./ChecklistField";
import { FileUploadField } from "./FileUploadField";
import { SignatureField } from "./SignatureField";
import { AddressField, AddressValue } from "./AddressField";
import { SmartFormImport } from "@/components/SmartFormImport";
import { FormTemplate } from "@/hooks/use-form-templates";
import { FormSubmission, useCreateSubmission, useUpdateSubmission } from "@/hooks/use-form-submissions";
import { Loader2, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FormRendererProps {
  template: FormTemplate;
  submission?: FormSubmission;
  onSuccess: () => void;
  onCancel: () => void;
  previewMode?: boolean;
}

export function FormRenderer({ template, submission, onSuccess, onCancel, previewMode = false }: FormRendererProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(submission?.answers || {});
  const [signature, setSignature] = useState(submission?.signature || null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgThemeColor, setOrgThemeColor] = useState<string | null>(null);
  const [draftSubmission, setDraftSubmission] = useState<FormSubmission | null>(null);
  const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>({});
  const [showEntryLabels, setShowEntryLabels] = useState<Record<string, boolean>>({});
  
  const createMutation = useCreateSubmission();
  const updateMutation = useUpdateSubmission();
  const creatingDraftRef = useRef(false);

  // Helper function to initialize checklist with N/A defaults
  const getDefaultChecklistValue = (items: string[]) => {
    const defaultValue: Record<number, string> = {};
    items.forEach((_, index) => {
      defaultValue[index] = "N/A";
    });
    return defaultValue;
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setOrgId(profile.organization_id);
          
          // Fetch organization theme color if useOrgTheme is enabled
          if (template.schema?.use_org_theme || template.schema?.useOrgTheme) {
            const { data: settings } = await supabase
              .from("organization_settings")
              .select("custom_theme_color")
              .eq("organization_id", profile.organization_id)
              .maybeSingle();
            
            if (settings?.custom_theme_color) {
              setOrgThemeColor(settings.custom_theme_color);
            }
          }
        }
      }
    };
    fetchUser();
  }, [template.schema]);

  // Initialize entry label preferences from submission metadata
  useEffect(() => {
    if (submission?.metadata?.entryLabelPreferences) {
      setShowEntryLabels(submission.metadata.entryLabelPreferences);
    }
  }, [submission]);

  // Lazy draft creation - only create when user actually interacts
  const ensureDraft = async (): Promise<string | null> => {
    if (previewMode) return null;
    
    // If we already have a submission or draft, return its ID
    const existingId = submission?.id || draftSubmission?.id;
    if (existingId) return existingId;
    
    // Prevent duplicate creation during rapid interactions
    if (creatingDraftRef.current) {
      // Wait for the in-flight creation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      return submission?.id || draftSubmission?.id || null;
    }
    
    // Only create if we have the required IDs
    if (!userId || !orgId) return null;
    
    creatingDraftRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from("form_submissions")
        .insert({
          org_id: orgId,
          form_template_id: template.id,
          created_by: userId,
          answers: {},
          status: "draft"
        })
        .select()
        .single();

      if (error) throw error;
      setDraftSubmission(data as unknown as FormSubmission);
      return data.id;
    } catch (error) {
      console.error("Error creating draft submission:", error);
      return null;
    } finally {
      creatingDraftRef.current = false;
    }
  };

  // Initialize repeat counts from submission data or defaults (stable)
  useEffect(() => {
    const next: Record<string, number> = {};

    try {
      template.schema.sections.forEach((section: any) => {
        (section.fields || []).forEach((field: any) => {
          if (field?.type === "repeating_group") {
            const existing = answers?.[field.key] as any[] | undefined;
            const count = Array.isArray(existing) ? existing.length : (field.minInstances || 1);
            next[field.key] = Math.max(count || 1, 1);
          }
        });
      });
    } catch (e) {
      console.error("repeatCounts init error", e);
    }

    // Shallow equality check to avoid unnecessary renders
    const same = Object.keys(next).length === Object.keys(repeatCounts).length &&
      Object.keys(next).every((k) => repeatCounts[k] === next[k]);

    if (!same) setRepeatCounts(next);
  }, [template, answers, repeatCounts]);

  // Auto-save draft every 10 seconds
  useEffect(() => {
    if (previewMode || !submission || submission.status !== "draft") return;
    
    const interval = setInterval(() => {
      if (submission?.id && Object.keys(answers).length > 0) {
        updateMutation.mutate({
          id: submission.id,
          answers,
          signature,
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [answers, signature, submission, previewMode]);

  const handleFieldChange = async (key: string, value: any) => {
    // Ensure draft exists on first interaction
    await ensureDraft();
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleAddInstance = (fieldKey: string) => {
    setRepeatCounts(prev => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] || 1) + 1
    }));
    
    const currentEntries = (answers[fieldKey] as any[]) || [];
    setAnswers(prev => ({
      ...prev,
      [fieldKey]: [...currentEntries, {}]
    }));
  };

  const handleRemoveInstance = (fieldKey: string, instanceIndex: number) => {
    setRepeatCounts(prev => ({
      ...prev,
      [fieldKey]: Math.max((prev[fieldKey] || 1) - 1, 1)
    }));
    
    const currentEntries = (answers[fieldKey] as any[]) || [];
    const newEntries = currentEntries.filter((_, idx) => idx !== instanceIndex);
    setAnswers(prev => ({
      ...prev,
      [fieldKey]: newEntries
    }));
  };

  const toggleEntryLabels = (fieldKey: string) => {
    setShowEntryLabels(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const renderRepeatingSubField = (
    subField: any,
    value: any,
    parentKey: string,
    instanceIndex: number
  ) => {
    const handleNestedChange = (subKey: string, newValue: any) => {
      const currentEntries = (answers[parentKey] as any[]) || [];
      const updatedEntries = [...currentEntries];
      
      if (!updatedEntries[instanceIndex]) {
        updatedEntries[instanceIndex] = {};
      }
      
      updatedEntries[instanceIndex][subKey] = newValue;
      
      setAnswers(prev => ({
        ...prev,
        [parentKey]: updatedEntries
      }));
    };
    
    switch (subField.type) {
      case "text":
        return (
          <div key={subField.key} className="space-y-2">
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`}>
              {subField.label}
            </Label>
            <Input
              id={`${parentKey}-${instanceIndex}-${subField.key}`}
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
              placeholder={subField.placeholder}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={subField.key} className="space-y-2">
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`}>
              {subField.label}
            </Label>
            <Textarea
              id={`${parentKey}-${instanceIndex}-${subField.key}`}
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
              placeholder={subField.placeholder}
              rows={3}
            />
          </div>
        );
        
      case "number":
        return (
          <div key={subField.key} className="space-y-2">
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`}>
              {subField.label}
            </Label>
            <Input
              id={`${parentKey}-${instanceIndex}-${subField.key}`}
              type="number"
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, parseInt(e.target.value) || null)}
              placeholder={subField.placeholder}
              min={subField.min}
              max={subField.max}
            />
          </div>
        );

      case "date":
        return (
          <div key={subField.key} className="space-y-2">
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`}>
              {subField.label}
            </Label>
            <Input
              id={`${parentKey}-${instanceIndex}-${subField.key}`}
              type="date"
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
            />
          </div>
        );

      case "time":
        return (
          <div key={subField.key} className="space-y-2">
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`}>
              {subField.label}
            </Label>
            <Input
              id={`${parentKey}-${instanceIndex}-${subField.key}`}
              type="time"
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
            />
          </div>
        );
        
      case "select":
        return (
          <div key={subField.key} className="space-y-2">
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`}>
              {subField.label}
            </Label>
            <Select
              value={value || ""}
              onValueChange={(val) => handleNestedChange(subField.key, val)}
            >
              <SelectTrigger id={`${parentKey}-${instanceIndex}-${subField.key}`}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {(subField.options || []).map((option: string, idx: number) => (
                  <SelectItem key={idx} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "radio":
        return (
          <div key={subField.key} className="space-y-2">
            <Label>{subField.label}</Label>
            <RadioGroup
              value={value || ""}
              onValueChange={(val) => handleNestedChange(subField.key, val)}
            >
              {(subField.options || []).map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${parentKey}-${instanceIndex}-${subField.key}-${idx}`} />
                  <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}-${idx}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "checkbox":
        return (
          <div key={subField.key} className="flex items-center space-x-2">
            <Checkbox
              id={`${parentKey}-${instanceIndex}-${subField.key}`}
              checked={value || false}
              onCheckedChange={(checked) => handleNestedChange(subField.key, checked)}
            />
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`} className="font-normal cursor-pointer">
              {subField.label}
            </Label>
          </div>
        );

      case "address":
        return (
          <AddressField
            key={subField.key}
            label={subField.label}
            value={value || {}}
            onChange={(newValue) => handleNestedChange(subField.key, newValue)}
            required={subField.required}
          />
        );
        
      default:
        return (
          <div key={subField.key} className="p-2 border border-dashed rounded text-xs text-muted-foreground">
            Unsupported sub-field type: {subField.type}
          </div>
        );
    }
  };

  const validateForm = () => {
    const schema = template.schema;
    
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.required && !answers[field.key]) {
          toast.error(`${field.label} is required`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!userId || !orgId) {
      toast.error("User not authenticated");
      return;
    }

    // Ensure draft exists
    const existingId = await ensureDraft();

    if (existingId) {
      await updateMutation.mutateAsync({
        id: existingId,
        answers,
        signature,
        status: "draft" as const,
        metadata: { entryLabelPreferences: showEntryLabels },
      });
      toast.success("Draft saved");
    } else {
      await createMutation.mutateAsync({
        org_id: orgId,
        form_template_id: template.id,
        created_by: userId,
        answers,
        signature,
        status: "draft" as const,
        metadata: { entryLabelPreferences: showEntryLabels },
      });
      toast.success("Draft created");
    }
    onSuccess();
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!userId || !orgId) {
      toast.error("User not authenticated");
      return;
    }

    const submissionData = {
      answers,
      signature,
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
      metadata: { entryLabelPreferences: showEntryLabels },
    };

    try {
      // Ensure draft exists
      const existingId = await ensureDraft();
      
      if (existingId) {
        await updateMutation.mutateAsync({
          id: existingId,
          ...submissionData,
        });
      } else {
        await createMutation.mutateAsync({
          org_id: orgId,
          form_template_id: template.id,
          created_by: userId,
          ...submissionData,
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form");
    }
  };

  const renderField = (field: any) => {
    const value = answers[field.key];

    switch (field.type) {
      case "text":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Input
              id={field.key}
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              aria-label={field.hideLabel ? field.label : undefined}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Textarea
              id={field.key}
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              rows={4}
              aria-label={field.hideLabel ? field.label : undefined}
            />
            {field.maxLength && (
              <p className="text-xs text-muted-foreground">
                {(value || "").length} / {field.maxLength}
              </p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Input
              id={field.key}
              type="number"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value) || null)}
              min={field.min}
              max={field.max}
              aria-label={field.hideLabel ? field.label : undefined}
            />
          </div>
        );

      case "date":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Input
              id={field.key}
              type="date"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              aria-label={field.hideLabel ? field.label : undefined}
            />
          </div>
        );

      case "time":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Input
              id={field.key}
              type="time"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              aria-label={field.hideLabel ? field.label : undefined}
            />
          </div>
        );

      case "select":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Select
              value={value || ""}
              onValueChange={(val) => handleFieldChange(field.key, val)}
            >
              <SelectTrigger id={field.key} aria-label={field.hideLabel ? field.label : undefined}>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((option, idx) => (
                  <SelectItem key={idx} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "radio":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <RadioGroup
              value={value || ""}
              onValueChange={(val) => handleFieldChange(field.key, val)}
              aria-label={field.hideLabel ? field.label : undefined}
            >
              {(field.options || []).map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.key}-${idx}`} />
                  <Label htmlFor={`${field.key}-${idx}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "checkbox":
        return (
          <div key={field.key} className="flex items-center space-x-2">
            <Checkbox
              id={field.key}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.key, checked)}
            />
            <Label htmlFor={field.key} className="font-normal cursor-pointer">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
          </div>
        );

      case "checklist":
        return (
          <ChecklistField
            key={field.key}
            label={field.hideLabel ? undefined : field.label}
            items={field.items || field.options || []}
            options={field.responseOptions || ["OK", "DEV", "N/A"]}
            value={value || getDefaultChecklistValue(field.items || field.options || [])}
            onChange={(newValue) => handleFieldChange(field.key, newValue)}
          />
        );

      case "file":
        const fileSubmissionId = submission?.id || draftSubmission?.id;
        
        // Show loading state if orgId is not ready
        if (!orgId) {
          return (
            <div key={field.key} className="space-y-2">
              {!field.hideLabel && <Label>{field.label}</Label>}
              <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                Loading...
              </div>
            </div>
          );
        }
        
        return (
          <FileUploadField
            key={field.key}
            label={field.hideLabel ? undefined : field.label}
            maxFiles={field.maxFiles || 10}
            accept={field.accept || [".jpg", ".jpeg", ".png"]}
            allowCaptions={field.allowCaptions || false}
            value={value || []}
            onChange={(newValue) => handleFieldChange(field.key, newValue)}
            orgId={orgId}
            submissionId={fileSubmissionId}
            onPrepare={ensureDraft}
          />
        );

      case "job_lookup":
        // Render as text input for backwards compatibility
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label htmlFor={field.key}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <Input
              id={field.key}
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder || "Enter job ID or search..."}
              aria-label={field.hideLabel ? field.label : undefined}
            />
          </div>
        );

      case "address":
        return (
          <AddressField
            key={field.key}
            label={field.hideLabel ? undefined : field.label}
            value={value || {}}
            onChange={(newValue) => handleFieldChange(field.key, newValue)}
            required={field.required}
          />
        );

      case "smart_import":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            {field.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {field.description}
              </p>
            )}
            <SmartFormImport
              formType="job-audit"
              onDataExtracted={(data) => {
                // Create a mapping of extracted keys to form field keys
                const keyMapping: Record<string, string> = {};
                
                // Build mapping by finding fields with matching labels or keys
                template.schema.sections.forEach((section: any) => {
                  (section.fields || []).forEach((f: any) => {
                    const label = f.label?.toLowerCase().replace(/\s+/g, '');
                    const fieldKey = f.key;
                    
                    // Map common extracted keys to form field keys
                    if (label?.includes('technician') || fieldKey?.includes('technician') || fieldKey?.includes('tech')) {
                      keyMapping['technicianName'] = fieldKey;
                    }
                    if (label?.includes('account') || label?.includes('ban') || fieldKey?.includes('ban') || fieldKey?.includes('account')) {
                      keyMapping['accountNumber'] = fieldKey;
                    }
                    if (label?.includes('service') && label?.includes('date') || fieldKey?.includes('servicedate') || fieldKey?.includes('service_date')) {
                      keyMapping['serviceDate'] = fieldKey;
                    }
                    if (label?.includes('address') || fieldKey?.includes('address')) {
                      keyMapping['address'] = fieldKey;
                    }
                    if ((label?.includes('customer') && label?.includes('name')) || 
                        (label?.includes('customer') && !label?.includes('address')) ||
                        fieldKey?.toLowerCase().includes('customer') ||
                        label?.includes('name') && !label?.includes('technician') && !label?.includes('observer')) {
                      keyMapping['customerName'] = fieldKey;
                    }
                    if (label?.includes('reached') || fieldKey?.includes('reach')) {
                      keyMapping['canBeReached'] = fieldKey;
                    }
                    if (label?.includes('observer') || fieldKey?.includes('observer') || fieldKey?.includes('reported')) {
                      keyMapping['observerName'] = fieldKey;
                      keyMapping['reportedBy'] = fieldKey;
                    }
                    if (fieldKey?.includes('date') && !fieldKey?.includes('service')) {
                      keyMapping['date'] = fieldKey;
                    }
                    if (label?.includes('start') && label?.includes('time') || fieldKey?.includes('starttime') || fieldKey?.includes('start_time')) {
                      keyMapping['startTime'] = fieldKey;
                    }
                    if (label?.includes('end') && label?.includes('time') || fieldKey?.includes('endtime') || fieldKey?.includes('end_time')) {
                      keyMapping['endTime'] = fieldKey;
                    }
                  });
                });
                
                console.log('Smart Import - Field mapping:', keyMapping);
                console.log('Smart Import - Extracted data:', data);
                
                // Apply extracted data to form fields using mapping
                Object.entries(data).forEach(([extractedKey, value]) => {
                  const formFieldKey = keyMapping[extractedKey];
                  if (formFieldKey && value) {
                    console.log(`Mapping ${extractedKey} -> ${formFieldKey}:`, value);
                    
                    // Special handling for address fields
                    if (extractedKey === 'address' && typeof value === 'string') {
                      // Parse address string into components
                      const addressValue: any = {
                        street: '',
                        city: '',
                        state: '',
                        zip: ''
                      };
                      
                      // Try to extract zip code (5 digits or 5+4 format)
                      const zipMatch = value.match(/\b(\d{5}(?:-\d{4})?)\b/);
                      if (zipMatch) {
                        addressValue.zip = zipMatch[1];
                      }
                      
                      // Try to extract state code (2 uppercase letters)
                      const stateMatch = value.match(/\b([A-Z]{2})\b/);
                      if (stateMatch) {
                        addressValue.state = stateMatch[1];
                      }
                      
                      // Split by comma to get street, city
                      const addressParts = value.split(',').map(p => p.trim());
                      if (addressParts.length > 0) {
                        addressValue.street = addressParts[0];
                      }
                      if (addressParts.length > 1) {
                        // Second part might contain city, or city + state + zip
                        // Remove state and zip from city if present
                        let cityPart = addressParts[1];
                        if (addressValue.state) {
                          cityPart = cityPart.replace(addressValue.state, '').trim();
                        }
                        if (addressValue.zip) {
                          cityPart = cityPart.replace(addressValue.zip, '').trim();
                        }
                        addressValue.city = cityPart;
                      }
                      
                      console.log('Parsed address:', addressValue);
                      handleFieldChange(formFieldKey, addressValue);
                    } else {
                      handleFieldChange(formFieldKey, value);
                    }
                  } else {
                    console.warn(`No mapping found for extracted key: ${extractedKey}`);
                  }
                });
                
                toast.success(`Applied ${Object.keys(data).length} fields to form`);
              }}
            />
          </div>
        );

      case "repeating_group":
        const instanceCount = repeatCounts[field.key] || field.minInstances || 1;
        const entries = (value as any[]) || [];
        
        return (
          <div key={field.key} className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">{field.label}</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor={`labels-toggle-${field.key}`} className="text-sm text-muted-foreground">
                  Labels {showEntryLabels[field.key] ? "On" : "Off"}
                </Label>
                <Switch
                  id={`labels-toggle-${field.key}`}
                  checked={showEntryLabels[field.key] || false}
                  onCheckedChange={() => toggleEntryLabels(field.key)}
                />
              </div>
            </div>
            
            {Array.from({ length: instanceCount }).map((_, instanceIndex) => (
              <Card key={`${field.key}-${instanceIndex}`} className="relative">
                {instanceIndex >= (field.minInstances || 1) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 z-10"
                    onClick={() => handleRemoveInstance(field.key, instanceIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {showEntryLabels[field.key] && (
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Entry {instanceIndex + 1}
                    </CardTitle>
                  </CardHeader>
                )}
                <CardContent className={showEntryLabels[field.key] ? "space-y-3" : "pt-6 space-y-3"}>
                  {(field.fields || []).map((subField: any) => {
                    const subValue = entries[instanceIndex]?.[subField.key];
                    return renderRepeatingSubField(
                      subField,
                      subValue,
                      field.key,
                      instanceIndex
                    );
                  })}
                </CardContent>
              </Card>
            ))}
            
            {instanceCount < (field.maxInstances || 20) && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleAddInstance(field.key)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another {field.label}
              </Button>
            )}
          </div>
        );

      default:
        // Defensive rendering for unknown field types
        return (
          <div key={field.key} className="p-3 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              Unsupported field type: {field.type}
            </p>
          </div>
        );
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{template.schema.title}</h2>
        <p className="text-muted-foreground">{template.schema.description}</p>
      </div>

      {template.schema.sections.map((section: any, index: number) => (
        <Card key={index}>
          {!section.hideTitle && (
            <CardHeader 
              style={orgThemeColor ? { 
                backgroundColor: orgThemeColor,
                color: 'white'
              } : undefined}
              className={orgThemeColor ? "text-white" : undefined}
            >
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
          )}
          <CardContent className="space-y-4">
            {section.fields.map(renderField)}
          </CardContent>
        </Card>
      ))}

      {template.schema.require_signature && !["job-audit","ride-along"].includes((template.slug || template.name || "").toLowerCase()) && (
        <Card>
          <CardHeader
            style={orgThemeColor ? { 
              backgroundColor: orgThemeColor,
              color: 'white'
            } : undefined}
            className={orgThemeColor ? "text-white" : undefined}
          >
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureField
              value={signature}
              onChange={setSignature}
              required={template.schema.require_signature}
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        {!previewMode && (
          <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Draft
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isLoading || previewMode}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </div>
    </div>
  );
}
