import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ChecklistField } from "@/components/forms/ChecklistField";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { SignatureField } from "@/components/forms/SignatureField";
import { AddressField, AddressValue } from "@/components/forms/AddressField";
import { SmartFormImport } from "@/components/SmartFormImport";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileDown, FileText, LogIn, User, Plus, X, Phone } from "lucide-react";
import { toast } from "sonner";
import { generateFormPDF } from "@/lib/form-pdf-generator";
import { generateFormDOCX } from "@/lib/form-docx-generator";
import { useNavigate } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const OVERRUN_TEMPLATE_ID = "06ef6c3a-84ad-4b01-b18b-be8647e94b26";

interface FormTemplate {
  id: string;
  name: string;
  schema: any;
}

export default function PublicOverrunReport() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [signature, setSignature] = useState<any>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const [saving, setSaving] = useState(false);
  const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>({});
  const [showEntryLabels, setShowEntryLabels] = useState<Record<string, boolean>>({});
  const [orgId, setOrgId] = useState<string | null>(null);

  // Auth detection
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      
      // Fetch org_id when user logs in
      if (session?.user) {
        setTimeout(() => {
          fetchUserOrgId(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserOrgId = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();
    
    if (profile?.organization_id) {
      setOrgId(profile.organization_id);
    }
  };

  // Fetch template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        // First check if template exists at all (without single())
        const { data: allData, error: listError } = await supabase
          .from("form_templates")
          .select("id, name, is_global, is_active, org_id")
          .eq("id", OVERRUN_TEMPLATE_ID);

        console.log("🔍 Template search results:", {
          found: allData?.length || 0,
          templates: allData,
          listError: listError
        });

        if (allData && allData.length > 0) {
          console.log("✅ Template EXISTS but RLS might be blocking .single():", allData[0]);
        } else {
          console.log("❌ Template does NOT exist in database or RLS blocks even listing");
        }

        // Now try to get the template with .single()
        const { data, error } = await supabase
          .from("form_templates")
          .select("id, name, schema, is_global, is_active")
          .eq("id", OVERRUN_TEMPLATE_ID)
          .single();

        if (error) {
          console.error("❌ Supabase .single() error:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log("✅ Template loaded successfully:", {
          id: data.id,
          name: data.name,
          is_global: data.is_global,
          is_active: data.is_active
        });
        setTemplate(data as FormTemplate);
      } catch (err) {
        console.error("Failed to load template:", err);
        toast.error("Failed to load form template. Check console for details.");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, []);

  // Initialize repeat counts
  useEffect(() => {
    if (!template?.schema?.sections) return;

    const next: Record<string, number> = {};
    template.schema.sections.forEach((section: any) => {
      (section.fields || []).forEach((field: any) => {
        if (field?.type === "repeating_group") {
          const existing = answers?.[field.key] as any[] | undefined;
          const count = Array.isArray(existing) ? existing.length : (field.minInstances || 1);
          next[field.key] = Math.max(count || 1, 1);
        }
      });
    });

    const same = Object.keys(next).length === Object.keys(repeatCounts).length &&
      Object.keys(next).every((k) => repeatCounts[k] === next[k]);

    if (!same) setRepeatCounts(next);
  }, [template, answers]);

  const handleFieldChange = (key: string, value: any) => {
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

  // Build mock submission for PDF/DOCX generation
  const buildMockSubmission = () => ({
    id: "public-form",
    answers,
    signature,
    form_templates: {
      name: template?.name || "Overrun Report",
      schema: template?.schema
    },
    metadata: { entryLabelPreferences: showEntryLabels }
  });

  const handleDownloadPDF = async () => {
    if (!template) return;
    setGenerating("pdf");
    try {
      const mockSubmission = buildMockSubmission();
      const pdf = await generateFormPDF(mockSubmission as any, { includePhotos: true, includeSignature: true });
      pdf.save(`${template.name || "overrun-report"}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!template) return;
    setGenerating("docx");
    try {
      const mockSubmission = buildMockSubmission();
      const blob = await generateFormDOCX(mockSubmission as any, { includePhotos: true, includeSignature: true });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${template.name || "overrun-report"}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Word document downloaded");
    } catch (err) {
      console.error("DOCX generation failed:", err);
      toast.error("Failed to generate Word document");
    } finally {
      setGenerating(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !template) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("form_submissions")
        .insert({
          form_template_id: template.id,
          created_by: user.id,
          org_id: orgId,
          answers,
          signature,
          status: "draft",
          metadata: { entryLabelPreferences: showEntryLabels }
        });

      if (error) throw error;
      toast.success("Draft saved");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !template) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("form_submissions")
        .insert({
          form_template_id: template.id,
          created_by: user.id,
          org_id: orgId,
          answers,
          signature,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          metadata: { entryLabelPreferences: showEntryLabels }
        });

      if (error) throw error;
      toast.success("Form submitted successfully");
      navigate("/forms");
    } catch (err) {
      console.error("Submit failed:", err);
      toast.error("Failed to submit form");
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = () => {
    // Store current form data in sessionStorage before redirecting
    sessionStorage.setItem("publicOverrunFormData", JSON.stringify({ answers, signature, showEntryLabels }));
    navigate("/auth?redirect=/private/overrun");
  };

  // Restore form data after login
  useEffect(() => {
    const savedData = sessionStorage.getItem("publicOverrunFormData");
    if (savedData && isAuthenticated) {
      try {
        const { answers: savedAnswers, signature: savedSig, showEntryLabels: savedLabels } = JSON.parse(savedData);
        if (savedAnswers) setAnswers(savedAnswers);
        if (savedSig) setSignature(savedSig);
        if (savedLabels) setShowEntryLabels(savedLabels);
        sessionStorage.removeItem("publicOverrunFormData");
      } catch (e) {
        console.error("Failed to restore form data:", e);
      }
    }
  }, [isAuthenticated]);

  // Helper function to check if a field is a phone number field
  const isPhoneField = (label: string): boolean => {
    const normalized = label.toLowerCase();
    return normalized.includes('phone') || 
           normalized.includes('tn') || 
           normalized.includes('tel') || 
           normalized.includes('number');
  };

  // Render a single field
  const renderField = (field: any) => {
    const value = answers[field.key];

    switch (field.type) {
      case "text":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
            <Input
              placeholder={field.placeholder}
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              type={isPhoneField(field.label || '') ? 'tel' : 'text'}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
            <Textarea
              placeholder={field.placeholder}
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              rows={field.rows || 3}
            />
          </div>
        );

      case "number":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
            <Input
              type="number"
              placeholder={field.placeholder}
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );

      case "date":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
            <Input
              type="date"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );

      case "time":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
            <Input
              type="time"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );

      case "select":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
            <Select value={value || ""} onValueChange={(v) => handleFieldChange(field.key, v)}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "radio":
        return (
          <div key={field.key} className="space-y-2">
            {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
            <RadioGroup value={value || ""} onValueChange={(v) => handleFieldChange(field.key, v)}>
              {(field.options || []).map((opt: string) => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`${field.key}-${opt}`} />
                  <Label htmlFor={`${field.key}-${opt}`}>{opt}</Label>
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
            <Label htmlFor={field.key} className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>
          </div>
        );

      case "switch":
        return (
          <div key={field.key} className="flex items-center justify-between">
            <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>
            <Switch
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.key, checked)}
            />
          </div>
        );

      case "checklist":
        return (
          <ChecklistField
            key={field.key}
            items={field.items || field.options || []}
            options={field.statusOptions || ["OK", "DEV", "N/A"]}
            value={value || {}}
            onChange={(v) => handleFieldChange(field.key, v)}
            label={!field.hideLabel ? field.label : undefined}
          />
        );

      case "file":
        return (
          <FileUploadField
            key={field.key}
            maxFiles={field.maxFiles || 10}
            accept={field.accept || ["image/*"]}
            allowCaptions={field.allowCaptions || false}
            value={value || []}
            onChange={(v) => handleFieldChange(field.key, v)}
            orgId={orgId || "public"}
            submissionId="public-form"
            label={!field.hideLabel ? field.label : undefined}
          />
        );

      case "signature":
        return (
          <SignatureField
            key={field.key}
            value={signature}
            onChange={setSignature}
            required={field.required}
          />
        );

      case "address":
        return (
          <AddressField
            key={field.key}
            value={value as AddressValue}
            onChange={(v) => handleFieldChange(field.key, v)}
            label={field.label}
          />
        );

      case "smart_import":
        return (
          <SmartFormImport
            key={field.key}
            formType="overrun-report"
            onDataExtracted={(data) => {
              // Handle imported data
              console.log("Imported data:", data);
            }}
          />
        );

      case "repeating_group":
        return renderRepeatingGroup(field);

      default:
        return null;
    }
  };

  // Render repeating group
  const renderRepeatingGroup = (field: any) => {
    const count = repeatCounts[field.key] || 1;
    const entries = (answers[field.key] as any[]) || [];

    return (
      <div key={field.key} className="space-y-4">
        <div className="flex items-center justify-between">
          {!field.hideLabel && (
            <Label className={cn("text-lg font-semibold", field.boldText && 'font-bold')}>
              {field.label}
            </Label>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleEntryLabels(field.key)}
            >
              {showEntryLabels[field.key] ? "Hide Labels" : "Show Labels"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddInstance(field.key)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          </div>
        </div>

        {Array.from({ length: count }).map((_, idx) => (
          <Card key={idx} className={cn(
            "relative",
            field.alternatingBackground && idx % 2 === 1 && "bg-muted/50"
          )}>
            <CardContent className="pt-4 space-y-4">
              {showEntryLabels[field.key] && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Entry {idx + 1}</span>
                  {count > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInstance(field.key, idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {(field.fields || []).map((subField: any) => renderSubField(subField, field.key, idx))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render sub-field within repeating group
  const renderSubField = (subField: any, parentKey: string, instanceIndex: number) => {
    const currentEntries = (answers[parentKey] as any[]) || [];
    const entryData = currentEntries[instanceIndex] || {};
    const value = entryData[subField.key];

    const handleNestedChange = (subKey: string, newValue: any) => {
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
            {!subField.hideLabel && <Label className={subField.boldText ? 'font-bold' : ''}>{subField.label}</Label>}
            <Input
              placeholder={subField.placeholder}
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
              type={isPhoneField(subField.label || '') ? 'tel' : 'text'}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={subField.key} className="space-y-2">
            {!subField.hideLabel && <Label className={subField.boldText ? 'font-bold' : ''}>{subField.label}</Label>}
            <Textarea
              placeholder={subField.placeholder}
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
              rows={subField.rows || 3}
            />
          </div>
        );

      case "time":
        return (
          <div key={subField.key} className="space-y-2">
            {!subField.hideLabel && <Label className={subField.boldText ? 'font-bold' : ''}>{subField.label}</Label>}
            <Input
              type="time"
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
            />
          </div>
        );

      case "date":
        return (
          <div key={subField.key} className="space-y-2">
            {!subField.hideLabel && <Label className={subField.boldText ? 'font-bold' : ''}>{subField.label}</Label>}
            <Input
              type="date"
              value={value || ""}
              onChange={(e) => handleNestedChange(subField.key, e.target.value)}
            />
          </div>
        );

      case "select":
        return (
          <div key={subField.key} className="space-y-2">
            {!subField.hideLabel && <Label className={subField.boldText ? 'font-bold' : ''}>{subField.label}</Label>}
            <Select value={value || ""} onValueChange={(v) => handleNestedChange(subField.key, v)}>
              <SelectTrigger>
                <SelectValue placeholder={subField.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {(subField.options || []).map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "table_layout":
        return renderTableLayout(subField, parentKey, instanceIndex);

      case "smart_import":
        return (
          <SmartFormImport
            key={subField.key}
            formType="overrun-report"
            onDataExtracted={(data: any) => {
              const techRows = data.technicianRows || [];
              if (techRows.length > 0) {
                // Import first tech into current entry
                const firstTech = techRows[0];
                const updatedEntries = [...currentEntries];
                if (!updatedEntries[instanceIndex]) {
                  updatedEntries[instanceIndex] = {};
                }
                
                // Map imported data to table layout
                const tableKey = (subField.fields || []).find((f: any) => f.type === 'table_layout')?.key;
                if (tableKey) {
                  updatedEntries[instanceIndex][tableKey] = {
                    '0-0': firstTech.name || '',
                    '0-1': firstTech.id || '',
                    '1-0': firstTech.type || '',
                    '1-1': firstTech.tn || ''
                  };
                }
                
                setAnswers(prev => ({
                  ...prev,
                  [parentKey]: updatedEntries
                }));
                
                toast.success(`Imported ${techRows.length} technician(s)`);
              }
            }}
          />
        );

      default:
        return null;
    }
  };

  // Render table layout field
  const renderTableLayout = (field: any, parentKey: string, instanceIndex: number) => {
    const currentEntries = (answers[parentKey] as any[]) || [];
    const entryData = currentEntries[instanceIndex] || {};
    const tableData = entryData[field.key] || {};
    const rows = field.tableRows || 2;
    const cols = field.tableColumns || 2;

    const handleCellChange = (cellKey: string, value: string) => {
      const updatedEntries = [...currentEntries];
      if (!updatedEntries[instanceIndex]) {
        updatedEntries[instanceIndex] = {};
      }
      if (!updatedEntries[instanceIndex][field.key]) {
        updatedEntries[instanceIndex][field.key] = {};
      }
      updatedEntries[instanceIndex][field.key][cellKey] = value;
      setAnswers(prev => ({
        ...prev,
        [parentKey]: updatedEntries
      }));
    };

    return (
      <div key={field.key} className="space-y-2">
        {!field.hideLabel && <Label className={field.boldText ? 'font-bold' : ''}>{field.label}</Label>}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const cellKey = `${r}-${c}`;
              const cellConfig = field.tableCells?.[cellKey];
              const cellLabel = cellConfig?.field?.label || `Cell ${r}-${c}`;
              const isPhone = isPhoneField(cellLabel);

              return (
                <div key={cellKey} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{cellLabel}</Label>
                  <Input
                    placeholder={cellConfig?.field?.placeholder || ""}
                    value={tableData[cellKey] || ""}
                    onChange={(e) => handleCellChange(cellKey, e.target.value)}
                    type={isPhone ? 'tel' : 'text'}
                    className="h-9"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Form Not Found</h1>
          <p className="text-muted-foreground mt-2">The Overrun Report form could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{template.name}</h1>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleLogin}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign in to save
            </Button>
          )}
        </div>
      </header>

      {/* Form Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6">
          {template.schema?.sections?.map((section: any, sectionIdx: number) => (
            <div key={sectionIdx} className="space-y-4">
              {!section.hideTitle && (
                <>
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <Separator />
                </>
              )}
              
              <div className="space-y-4">
                {(section.fields || []).map((field: any) => renderField(field))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sticky Footer Actions */}
      <footer className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
            {/* Always show download buttons */}
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={generating !== null}
            >
              {generating === "pdf" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownloadDOCX}
              disabled={generating !== null}
            >
              {generating === "docx" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Download Word
            </Button>

            {/* Show save/submit only when authenticated */}
            {isAuthenticated && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Draft
                </Button>
                
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Submit
                </Button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
