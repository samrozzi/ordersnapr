import { FormTemplate, FormSubmission } from "@/hooks/use-form-submissions";

export interface FormRendererProps {
  template: FormTemplate;
  submission?: FormSubmission;
  onSuccess: () => void;
  onCancel: () => void;
  previewMode?: boolean;
}

export interface FormState {
  answers: Record<string, any>;
  signature: any;
  userId: string | null;
  orgId: string | null;
  orgThemeColor: string | null;
  draftSubmission: FormSubmission | null;
  repeatCounts: Record<string, number>;
  showEntryLabels: Record<string, boolean>;
  lastSaved: Date | null;
  lastSyncedToCloud: Date | null;
  isSaving: boolean;
  showRecoveryDialog: boolean;
  recoverableData: any;
  showUpgradeDialog: boolean;
  pendingImportData: any;
}
