import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChecklistField } from "./ChecklistField";
import { FileUploadField } from "./FileUploadField";
import { SignatureField } from "./SignatureField";
import { FormTemplate } from "@/hooks/use-form-templates";
import { FormSubmission, useCreateSubmission, useUpdateSubmission } from "@/hooks/use-form-submissions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FormRendererProps {
  template: FormTemplate;
  submission?: FormSubmission;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FormRenderer({ template, submission, onSuccess, onCancel }: FormRendererProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(submission?.answers || {});
  const [signature, setSignature] = useState(submission?.signature || null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  
  const createMutation = useCreateSubmission();
  const updateMutation = useUpdateSubmission();

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
        }
      }
    };
    fetchUser();
  }, []);

  // Auto-save draft every 10 seconds
  useEffect(() => {
    if (!submission || submission.status !== "draft") return;
    
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
  }, [answers, signature, submission]);

  const handleFieldChange = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
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

    if (submission?.id) {
      await updateMutation.mutateAsync({
        id: submission.id,
        answers,
        signature,
        status: "draft" as const,
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
    };

    if (submission?.id) {
      await updateMutation.mutateAsync({
        id: submission.id,
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
  };

  const renderField = (field: any) => {
    const value = answers[field.key];

    switch (field.type) {
      case "text":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.key}
              value={value || field.default || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.key}
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              rows={4}
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
            <Label htmlFor={field.key}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.key}
              type="number"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value) || null)}
              min={field.min}
              max={field.max}
            />
          </div>
        );

      case "date":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.key}
              type="date"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );

      case "time":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.key}
              type="time"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );

      case "checklist":
        return (
          <ChecklistField
            key={field.key}
            label={field.label}
            items={field.items}
            options={field.options}
            value={value || {}}
            onChange={(newValue) => handleFieldChange(field.key, newValue)}
          />
        );

      case "file":
        return orgId && submission?.id ? (
          <FileUploadField
            key={field.key}
            label={field.label}
            maxFiles={field.maxFiles || 10}
            accept={field.accept || [".jpg", ".jpeg", ".png"]}
            allowCaptions={field.allowCaptions || false}
            value={value || []}
            onChange={(newValue) => handleFieldChange(field.key, newValue)}
            orgId={orgId}
            submissionId={submission.id}
          />
        ) : null;

      default:
        return null;
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
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map(renderField)}
          </CardContent>
        </Card>
      ))}

      {template.schema.require_signature && (
        <Card>
          <CardHeader>
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
        <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Draft
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </div>
    </div>
  );
}
