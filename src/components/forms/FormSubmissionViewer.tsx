import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChecklistField } from "./ChecklistField";
import { SignatureField } from "./SignatureField";
import { FormSubmission } from "@/hooks/use-form-submissions";
import { Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface FormSubmissionViewerProps {
  submission: FormSubmission;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FormSubmissionViewer({
  submission,
  onEdit,
  onDelete,
}: FormSubmissionViewerProps) {
  const schema = submission.form_templates?.schema;
  const canEdit = submission.status === "draft" && onEdit;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "submitted":
        return "default";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const renderFieldValue = (field: any) => {
    const value = submission.answers[field.key];

    if (!value && value !== 0) return <p className="text-muted-foreground">—</p>;

    switch (field.type) {
      case "checklist":
        return (
          <ChecklistField
            items={field.items}
            options={field.options}
            value={value}
            onChange={() => {}}
            readOnly
          />
        );

      case "file":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {value.map((file: any, index: number) => (
              <div key={index} className="border rounded-lg overflow-hidden bg-card">
                {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={file.url} alt={file.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-muted">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  {file.caption && (
                    <p className="text-xs text-muted-foreground mt-1">{file.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case "textarea":
        return (
          <div className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-lg">
            {value}
          </div>
        );

      default:
        return <p className="text-sm">{value}</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{schema?.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Created by User</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
        </div>
        <Badge variant={getStatusColor(submission.status)}>
          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
        </Badge>
      </div>

      {submission.submitted_at && (
        <div className="text-sm text-muted-foreground">
          Submitted on {format(new Date(submission.submitted_at), "MMMM d, yyyy 'at' h:mm a")}
        </div>
      )}

      <Separator />

      {schema?.sections.map((section: any, index: number) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.fields.map((field: any) => (
              <div key={field.key} className="space-y-2">
                <h4 className="font-medium text-sm">{field.label}</h4>
                {renderFieldValue(field)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {submission.signature && (
        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureField
              value={submission.signature}
              onChange={() => {}}
              readOnly
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex gap-3 justify-end">
        {onDelete && (
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
        {canEdit && (
          <Button onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
