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
import { Loader2, Plus, X, CloudOff, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveFormDataLocally, getFormDataLocally, markFormAsSynced, deleteFormDataLocally } from "@/lib/offline-storage";
import { addToSyncQueue } from "@/lib/sync-queue";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Helper: Normalize label for matching
const normalizeLabel = (label: string): string => {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
};

// Helper: Find table cell fields by label
const findTableCellsByLabel = (tableField: any) => {
  const cells: Record<string, any> = {};
  if (!tableField.tableCells) return cells;
  
  Object.entries(tableField.tableCells).forEach(([cellKey, cell]: [string, any]) => {
    if (cell.field?.label) {
      const normalized = normalizeLabel(cell.field.label);
      // Map common variations
      if (normalized.includes('name') || normalized === 'tech_name') {
        cells.name = { cellKey, field: cell.field };
      } else if (normalized.includes('id') || normalized === 'tech_id') {
        cells.id = { cellKey, field: cell.field };
      } else if (normalized.includes('type') || normalized === 'tech_type') {
        cells.type = { cellKey, field: cell.field };
      } else if (normalized.includes('tn') || normalized.includes('phone') || normalized.includes('tel')) {
        cells.tn = { cellKey, field: cell.field };
      }
    }
  });
  
  return cells;
};

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSyncedToCloud, setLastSyncedToCloud] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoverableData, setRecoverableData] = useState<any>(null);
  
  const { isOnline, lastOnline } = useOnlineStatus();
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
        
        // Check for unsaved local data
        if (!previewMode) {
          const submissionId = submission?.id || 'pending';
          const localData = await getFormDataLocally(submissionId);
          
          if (localData && !localData.synced) {
            const localTimestamp = localData.timestamp || 0;
            const cloudTimestamp = submission?.updated_at ? new Date(submission.updated_at).getTime() : 0;
            
            if (localTimestamp > cloudTimestamp) {
              setRecoverableData(localData);
              setShowRecoveryDialog(true);
            }
          }
        }
      }
    };
    fetchUser();
  }, [template.schema, submission, previewMode]);

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
    
    // Only create if we have the required user ID
    if (!userId) return null;
    
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

  // Auto-save with local-first approach
  useEffect(() => {
    if (previewMode) return;
    
    const currentSubmissionId = submission?.id || draftSubmission?.id;
    
    // Only auto-save drafts or new forms that have been interacted with
    if (!currentSubmissionId) return;
    if (submission && submission.status !== "draft") return;
    
    const interval = setInterval(async () => {
      if (currentSubmissionId && Object.keys(answers).length > 0 && userId && orgId) {
        setIsSaving(true);
        
        try {
          // ALWAYS save locally first (instant, never fails)
          await saveFormDataLocally({
            id: currentSubmissionId,
            answers,
            signature: signature || undefined,
            metadata: { entryLabelPreferences: showEntryLabels },
            synced: false,
            userId,
            templateId: template.id,
          });
          
          setLastSaved(new Date());
          
          // Try to sync to cloud if online
          if (isOnline) {
            try {
              await updateMutation.mutateAsync({
                id: currentSubmissionId,
                answers,
                signature,
                metadata: { entryLabelPreferences: showEntryLabels },
              });
              
              // Mark as synced
              await markFormAsSynced(currentSubmissionId);
              setLastSyncedToCloud(new Date());
            } catch (error) {
              // Add to sync queue for retry
              await addToSyncQueue({
                id: `save-${currentSubmissionId}-${Date.now()}`,
                type: 'save',
                data: {
                  submissionId: currentSubmissionId,
                  answers,
                  signature,
                  metadata: { entryLabelPreferences: showEntryLabels },
                },
              });
              
              console.warn("Cloud sync failed, queued for retry:", error);
            }
          }
        } catch (error) {
          console.error("Local save failed:", error);
          toast.error("Failed to save changes");
        } finally {
          setIsSaving(false);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [answers, signature, submission, draftSubmission, showEntryLabels, previewMode, isOnline, userId, orgId, template.id]);

  // Helper function to generate className string for field formatting
  const getFieldClasses = (field: any) => {
    const classes = [];
    if (field.boldText) classes.push('font-bold');
    if (field.underlineText) classes.push('underline');
    if (field.fontSize) {
      // Map font sizes to Tailwind classes
      const sizeMap: Record<string, string> = {
        '8pt': 'text-xs',
        '9pt': 'text-sm',
        '10pt': 'text-base',
        '11pt': 'text-base',
        '12pt': 'text-lg',
        '14pt': 'text-xl',
        '16pt': 'text-2xl',
        '18pt': 'text-3xl',
      };
      classes.push(sizeMap[field.fontSize] || 'text-base');
    }
    return classes.join(' ');
  };

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
    
    // Support table_layout inside repeating_group
    if (subField.type === 'table_layout') {
      const rows = subField.tableRows || 2;
      const cols = subField.tableColumns || 2;
      const tableCells = subField.tableCells || {};
      const tableValue = value || {};

      return (
        <div key={subField.key} className="space-y-2">
          {subField.label && (
            <Label className="text-sm font-medium">{subField.label}</Label>
          )}
          <div 
            className="grid gap-2 border rounded-lg p-4"
            style={{ 
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`
            }}
          >
            {Array.from({ length: rows }).map((_, rowIdx) =>
              Array.from({ length: cols }).map((_, colIdx) => {
                const cellKey = `${rowIdx}-${colIdx}`;
                const cell = tableCells[cellKey];
                const cellValue = tableValue[cellKey];

                if (!cell || !cell.field) {
                  return (
                    <div key={cellKey} className="border rounded p-2 bg-muted/30 min-h-[60px]" />
                  );
                }

                const cellField = cell.field;
                const handleCellChange = (newValue: any) => {
                  handleNestedChange(subField.key, {
                    ...tableValue,
                    [cellKey]: newValue
                  });
                };

                return (
                  <div key={cellKey} className="border rounded p-2 space-y-1">
                    {cellField.label && (
                      <Label className="text-xs">{cellField.label}</Label>
                    )}
                    {cellField.type === 'text' && (
                      <Input
                        value={cellValue || ''}
                        onChange={(e) => handleCellChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                    )}
                    {cellField.type === 'number' && (
                      <Input
                        type="number"
                        value={cellValue || ''}
                        onChange={(e) => handleCellChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                    )}
                    {cellField.type === 'date' && (
                      <Input
                        type="date"
                        value={cellValue || ''}
                        onChange={(e) => handleCellChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // Support smart_import inside repeating_group
    if (subField.type === 'smart_import') {
      return (
        <div key={subField.key} className="space-y-2">
          <SmartFormImport
            formType="ride-along"
            onDataExtracted={(importData) => {
              const techRows = (importData as any).technicianRows || [];
              if (techRows.length > 0) {
                toast.success('Data extracted! Populating fields...');
              }
            }}
          />
        </div>
      );
    }
    
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
              className={getFieldClasses(subField)}
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
              className={getFieldClasses(subField)}
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
              className={getFieldClasses(subField)}
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
              className={getFieldClasses(subField)}
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
              className={getFieldClasses(subField)}
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
              <SelectTrigger id={`${parentKey}-${instanceIndex}-${subField.key}`} className={getFieldClasses(subField)}>
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
              className={getFieldClasses(subField)}
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
            <Label htmlFor={`${parentKey}-${instanceIndex}-${subField.key}`} className={`font-normal cursor-pointer ${getFieldClasses(subField)}`}>
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
    if (!userId) {
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
    
    if (!userId) {
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
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error(error?.message || "Failed to submit form");
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
              className={getFieldClasses(field)}
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
              className={getFieldClasses(field)}
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
              className={getFieldClasses(field)}
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
              className={getFieldClasses(field)}
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
              className={getFieldClasses(field)}
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
              <SelectTrigger id={field.key} aria-label={field.hideLabel ? field.label : undefined} className={getFieldClasses(field)}>
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
              className={getFieldClasses(field)}
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
            <Label htmlFor={field.key} className={`font-normal cursor-pointer ${getFieldClasses(field)}`}>
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
                console.log('Smart Import - Raw extracted data:', data);

                // Handle dynamic population for technicianRows (if detected)
                const technicianRows = (data as any).technicianRows;
                if (technicianRows && Array.isArray(technicianRows) && technicianRows.length > 0) {
                  console.log(`Found ${technicianRows.length} technician(s) - populating data`);
                  
                  // Find a repeating group with table layout or direct fields
                  let targetRepeatingGroup: any = null;
                  let targetTableField: any = null;
                  
                  // Look for repeating_group containing table_layout
                  for (const section of template.schema.sections) {
                    for (const field of section.fields) {
                      if (field.type === 'repeating_group' && field.subFields) {
                        const tableSubField = field.subFields.find((sf: any) => sf.type === 'table_layout');
                        if (tableSubField) {
                          targetRepeatingGroup = field;
                          targetTableField = tableSubField;
                          break;
                        }
                      }
                    }
                    if (targetRepeatingGroup) break;
                  }
                  
                  // If found, populate the repeating group
                  if (targetRepeatingGroup && targetTableField) {
                    const fieldKey = targetRepeatingGroup.key;
                    const tableKey = targetTableField.key;
                    const maxInstances = targetRepeatingGroup.maxInstances || 50;
                    const actualCount = Math.min(technicianRows.length, maxInstances);
                    
                    if (technicianRows.length > maxInstances) {
                      toast.warning(`Created ${actualCount} of ${technicianRows.length} entries (max limit: ${maxInstances})`);
                    }
                    
                    // Set repeat count to match number of technicians
                    setRepeatCounts(prev => ({
                      ...prev,
                      [fieldKey]: actualCount
                    }));
                    
                    // Populate each instance
                    const newAnswers: any = {};
                    technicianRows.slice(0, actualCount).forEach((tech: any, idx: number) => {
                      if (!newAnswers[fieldKey]) newAnswers[fieldKey] = [];
                      if (!newAnswers[fieldKey][idx]) newAnswers[fieldKey][idx] = {};
                      
                      // Find the cell fields by their labels
                      const cellFields = findTableCellsByLabel(targetTableField);
                      const tableCellData: Record<string, any> = {};
                      
                      if (cellFields.name) {
                        tableCellData[cellFields.name.cellKey] = tech.techName || '';
                      }
                      if (cellFields.id) {
                        tableCellData[cellFields.id.cellKey] = tech.techId || '';
                      }
                      if (cellFields.type) {
                        tableCellData[cellFields.type.cellKey] = tech.techType || '';
                      }
                      if (cellFields.tn) {
                        tableCellData[cellFields.tn.cellKey] = tech.techPhone || tech.techTn || '';
                      }
                      
                      newAnswers[fieldKey][idx][tableKey] = tableCellData;
                    });
                    
                    setAnswers(prev => ({
                      ...prev,
                      ...newAnswers
                    }));
                    
                    toast.success(`Created ${actualCount} technician ${actualCount === 1 ? 'entry' : 'entries'}!`);
                  } else {
                    // Fallback: Look for a top-level table_layout
                    let topLevelTable: any = null;
                    for (const section of template.schema.sections) {
                      const tableField = section.fields.find((f: any) => f.type === 'table_layout');
                      if (tableField) {
                        topLevelTable = tableField;
                        break;
                      }
                    }
                    
                    if (topLevelTable) {
                      const firstTech = technicianRows[0];
                      const cellFields = findTableCellsByLabel(topLevelTable);
                      const tableCellData: Record<string, any> = {};
                      
                      if (cellFields.name) {
                        tableCellData[cellFields.name.cellKey] = firstTech.techName || '';
                      }
                      if (cellFields.id) {
                        tableCellData[cellFields.id.cellKey] = firstTech.techId || '';
                      }
                      if (cellFields.type) {
                        tableCellData[cellFields.type.cellKey] = firstTech.techType || '';
                      }
                      if (cellFields.tn) {
                        tableCellData[cellFields.tn.cellKey] = firstTech.techPhone || firstTech.techTn || '';
                      }
                      
                      setAnswers(prev => ({
                        ...prev,
                        [topLevelTable.key]: tableCellData
                      }));
                      
                      if (technicianRows.length > 1) {
                        toast.warning(`Populated table with first technician. Add a Repeating Group with Table Layout for all ${technicianRows.length} entries.`);
                      } else {
                        toast.success('Table populated with technician data!');
                      }
                    } else {
                      toast.error("No compatible field found. Add a Repeating Group with Table Layout to your form.");
                    }
                  }
                }

                // Create a mapping of extracted keys to form field keys
                const keyMapping: Record<string, string> = {};
                
                // Build mapping by finding fields with matching labels or keys (including table cells)
                template.schema.sections.forEach((section: any) => {
                  (section.fields || []).forEach((f: any) => {
                    const label = f.label?.toLowerCase().replace(/\s+/g, '');
                    const fieldKey = f.key;
                    
                    // Handle table layout fields - extract cell fields
                    if (f.type === 'table_layout' && f.tableCells) {
                      Object.entries(f.tableCells).forEach(([cellKey, cell]: [string, any]) => {
                        if (cell?.field) {
                          const cellLabel = cell.field.label?.toLowerCase().replace(/\s+/g, '');
                          const cellFieldKey = cell.field.key;
                          
                          // Map common extracted keys to table cell field keys
                          if (cellLabel?.includes('technician') || cellFieldKey?.includes('technician') || cellFieldKey?.includes('tech')) {
                            keyMapping['technicianName'] = cellFieldKey;
                          }
                          if (cellLabel?.includes('account') || cellLabel?.includes('ban') || cellFieldKey?.includes('ban') || cellFieldKey?.includes('account')) {
                            keyMapping['accountNumber'] = cellFieldKey;
                          }
                          if (cellLabel?.includes('service') && cellLabel?.includes('date') || cellFieldKey?.includes('servicedate') || cellFieldKey?.includes('service_date')) {
                            keyMapping['serviceDate'] = cellFieldKey;
                          }
                          if (cellLabel?.includes('address') || cellFieldKey?.includes('address')) {
                            keyMapping['address'] = cellFieldKey;
                          }
                          if ((cellLabel?.toLowerCase().includes('customer') && cellLabel?.toLowerCase().includes('name')) || 
                              cellFieldKey?.toLowerCase().includes('customer_name')) {
                            keyMapping['customerName'] = cellFieldKey;
                          }
                          if (cellLabel?.includes('reached') || cellFieldKey?.includes('reach')) {
                            keyMapping['canBeReached'] = cellFieldKey;
                          }
                          if (cellLabel?.includes('observer') || cellFieldKey?.includes('observer') || cellFieldKey?.includes('reported')) {
                            keyMapping['observerName'] = cellFieldKey;
                            keyMapping['reportedBy'] = cellFieldKey;
                          }
                          if (cellLabel?.includes('start') && cellLabel?.includes('time') || cellFieldKey?.includes('starttime') || cellFieldKey?.includes('start_time')) {
                            keyMapping['startTime'] = cellFieldKey;
                          }
                          if (cellLabel?.includes('end') && cellLabel?.includes('time') || cellFieldKey?.includes('endtime') || cellFieldKey?.includes('end_time')) {
                            keyMapping['endTime'] = cellFieldKey;
                          }
                        }
                      });
                    }
                    
                    // Map regular fields
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
                    // Customer name mapping - be very specific to avoid conflicts with other name fields
                    if ((label?.toLowerCase().includes('customer') && label?.toLowerCase().includes('name')) || 
                        fieldKey?.toLowerCase().includes('customer_name') ||
                        (label?.toLowerCase() === 'customer name')) {
                      keyMapping['customerName'] = fieldKey;
                      console.log('Mapped customerName to field:', fieldKey, 'label:', label);
                    }
                    // Also check for standalone "name" field if not technician/observer/reported
                    if (label?.toLowerCase() === 'name' || 
                        (label?.toLowerCase().includes('name') && 
                         !label?.toLowerCase().includes('technician') && 
                         !label?.toLowerCase().includes('observer') && 
                         !label?.toLowerCase().includes('reported') &&
                         !label?.toLowerCase().includes('customer'))) {
                      if (!keyMapping['customerName']) {
                        keyMapping['name'] = fieldKey;
                        console.log('Mapped name to field:', fieldKey, 'label:', label);
                      }
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
                      console.log('Raw address value:', value);
                      
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
                      
                      // Split by comma to get parts
                      const addressParts = value.split(',').map(p => p.trim());
                      
                      if (addressParts.length > 0) {
                        addressValue.street = addressParts[0];
                      }
                      
                      // Look for state code near the zip - check last few parts for pattern like "NC" or "NC 28215"
                      // State should be 2 letters that are NOT part of street names (like LN, ST, DR, etc.)
                      const commonStreetSuffixes = ['LN', 'ST', 'DR', 'RD', 'AVE', 'CT', 'PL', 'WAY', 'BLVD', 'CIR'];
                      for (let i = addressParts.length - 1; i >= 0; i--) {
                        const part = addressParts[i];
                        // Look for 2-letter code that's not a street suffix and appears standalone or before zip
                        const stateMatch = part.match(/\b([A-Z]{2})(?:\s+\d{5}|\s*$)/);
                        if (stateMatch && !commonStreetSuffixes.includes(stateMatch[1])) {
                          addressValue.state = stateMatch[1];
                          break;
                        }
                      }
                      
                      // Extract city - typically second part or before state/zip
                      if (addressParts.length > 1) {
                        let cityPart = addressParts[1];
                        // Remove state and zip from city if present
                        if (addressValue.state) {
                          cityPart = cityPart.replace(new RegExp(`\\b${addressValue.state}\\b`, 'g'), '').trim();
                        }
                        if (addressValue.zip) {
                          cityPart = cityPart.replace(addressValue.zip, '').trim();
                        }
                        // Remove any remaining extra parts
                        cityPart = cityPart.replace(/\s*,\s*$/, '').trim();
                        addressValue.city = cityPart;
                      }
                      
                      console.log('Parsed address:', addressValue);
                      handleFieldChange(formFieldKey, addressValue);
                    } else if (extractedKey === 'customerName' || extractedKey === 'customer') {
                      // Ensure customer name gets to the right field
                      console.log('Customer name extracted:', extractedKey, '=', value);
                      const customerFieldKey = keyMapping['customerName'] || keyMapping['name'];
                      console.log('Looking for customer field key:', customerFieldKey);
                      if (customerFieldKey) {
                        console.log('Applying customer name to field:', customerFieldKey);
                        handleFieldChange(customerFieldKey, value);
                      } else {
                        console.warn('No customer name field found in mapping!');
                        handleFieldChange(formFieldKey, value);
                      }
                    } else {
                      console.log('Applying field:', extractedKey, '=', value, 'to', formFieldKey);
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

      case "table_layout":
        const rows = field.tableRows || 2;
        const columns = field.tableColumns || 2;
        const tableCells = field.tableCells || {};
        const borderStyle = field.borderStyle || 'all';
        const tableValue = value || {};

        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && (
              <Label>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <div className="overflow-x-auto">
              <table className={cn(
                "w-full border-collapse",
                borderStyle === 'all' && "border border-border",
                borderStyle === 'outer' && "border-2 border-border"
              )}>
                <tbody>
                  {Array.from({ length: rows }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: columns }).map((_, colIndex) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        const cell = tableCells[cellKey];
                        const cellField = cell?.field;
                        
                        if (!cellField) {
                          return (
                            <td
                              key={colIndex}
                              className={cn(
                                "p-3 min-w-[120px] bg-muted/20",
                                borderStyle === 'all' && "border border-border"
                              )}
                            >
                              {/* Empty cell */}
                            </td>
                          );
                        }

                        const cellValue = tableValue[cellKey];
                        const cellId = `${field.key}-${cellKey}-${cellField.key}`;

                        return (
                          <td
                            key={colIndex}
                            className={cn(
                              "p-3 min-w-[120px]",
                              borderStyle === 'all' && "border border-border"
                            )}
                          >
                            {/* Render cell field */}
                            {cellField.type === "text" && (
                              <div className="space-y-1">
                                {!cellField.hideLabel && (
                                  <Label htmlFor={cellId} className="text-xs">
                                    {cellField.label}
                                  </Label>
                                )}
                                <Input
                                  id={cellId}
                                  value={cellValue || ""}
                                  onChange={(e) => {
                                    const newTableValue = {
                                      ...tableValue,
                                      [cellKey]: e.target.value,
                                    };
                                    handleFieldChange(field.key, newTableValue);
                                  }}
                                  placeholder={cellField.placeholder}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                            
                            {cellField.type === "number" && (
                              <div className="space-y-1">
                                {!cellField.hideLabel && (
                                  <Label htmlFor={cellId} className="text-xs">
                                    {cellField.label}
                                  </Label>
                                )}
                                <Input
                                  id={cellId}
                                  type="number"
                                  value={cellValue || ""}
                                  onChange={(e) => {
                                    const newTableValue = {
                                      ...tableValue,
                                      [cellKey]: parseInt(e.target.value) || null,
                                    };
                                    handleFieldChange(field.key, newTableValue);
                                  }}
                                  min={cellField.min}
                                  max={cellField.max}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}

                            {cellField.type === "date" && (
                              <div className="space-y-1">
                                {!cellField.hideLabel && (
                                  <Label htmlFor={cellId} className="text-xs">
                                    {cellField.label}
                                  </Label>
                                )}
                                <Input
                                  id={cellId}
                                  type="date"
                                  value={cellValue || ""}
                                  onChange={(e) => {
                                    const newTableValue = {
                                      ...tableValue,
                                      [cellKey]: e.target.value,
                                    };
                                    handleFieldChange(field.key, newTableValue);
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}

                            {cellField.type === "time" && (
                              <div className="space-y-1">
                                {!cellField.hideLabel && (
                                  <Label htmlFor={cellId} className="text-xs">
                                    {cellField.label}
                                  </Label>
                                )}
                                <Input
                                  id={cellId}
                                  type="time"
                                  value={cellValue || ""}
                                  onChange={(e) => {
                                    const newTableValue = {
                                      ...tableValue,
                                      [cellKey]: e.target.value,
                                    };
                                    handleFieldChange(field.key, newTableValue);
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}

                            {cellField.type === "select" && (
                              <div className="space-y-1">
                                {!cellField.hideLabel && (
                                  <Label htmlFor={cellId} className="text-xs">
                                    {cellField.label}
                                  </Label>
                                )}
                                <Select
                                  value={cellValue || ""}
                                  onValueChange={(val) => {
                                    const newTableValue = {
                                      ...tableValue,
                                      [cellKey]: val,
                                    };
                                    handleFieldChange(field.key, newTableValue);
                                  }}
                                >
                                  <SelectTrigger id={cellId} className="h-8 text-sm">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(cellField.options || []).map((option, idx) => (
                                      <SelectItem key={idx} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

  const handleRestoreLocalData = () => {
    if (recoverableData) {
      setAnswers(recoverableData.answers || {});
      setSignature(recoverableData.signature || null);
      setShowEntryLabels(recoverableData.metadata?.entryLabelPreferences || {});
      toast.success("Unsaved changes restored");
    }
    setShowRecoveryDialog(false);
  };

  const handleDiscardLocalData = async () => {
    if (recoverableData) {
      await deleteFormDataLocally(recoverableData.id);
    }
    setShowRecoveryDialog(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Connection status banner */}
      {!isOnline && (
        <Alert variant="default" className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <CloudOff className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-400">Working Offline</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-500">
            Your changes are being saved locally and will sync when connection returns.
            {lastOnline && ` Last online: ${formatDistanceToNow(lastOnline, { addSuffix: true })}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Recovery dialog */}
      <AlertDialog open={showRecoveryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes Found</AlertDialogTitle>
            <AlertDialogDescription>
              We found local changes from {recoverableData?.timestamp ? formatDistanceToNow(recoverableData.timestamp, { addSuffix: true }) : 'recently'} 
              that weren't synced to the cloud. Would you like to restore them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardLocalData}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreLocalData}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h2 className="text-2xl font-bold">{template.schema.title}</h2>
        <p className="text-muted-foreground">{template.schema.description}</p>
        {!previewMode && (submission?.id || draftSubmission?.id) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                {isOnline && lastSyncedToCloud ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Saved to cloud at {lastSyncedToCloud.toLocaleTimeString()}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-yellow-600" />
                    <span className="text-yellow-600">Saved locally at {lastSaved.toLocaleTimeString()} (will sync when online)</span>
                  </>
                )}
              </>
            ) : null}
          </div>
        )}
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
