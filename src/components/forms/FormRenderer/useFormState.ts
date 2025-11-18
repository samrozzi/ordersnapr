import { useState, useRef } from 'react';
import { FormSubmission } from '@/hooks/use-form-submissions';
import { FormState } from './types';

/**
 * Custom hook to manage FormRenderer state
 * Consolidates all state management in one place
 */
export function useFormState(initialSubmission?: FormSubmission) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialSubmission?.answers || {});
  const [signature, setSignature] = useState(initialSubmission?.signature || null);
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
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);

  const creatingDraftRef = useRef(false);

  return {
    // State
    answers,
    signature,
    userId,
    orgId,
    orgThemeColor,
    draftSubmission,
    repeatCounts,
    showEntryLabels,
    lastSaved,
    lastSyncedToCloud,
    isSaving,
    showRecoveryDialog,
    recoverableData,
    showUpgradeDialog,
    pendingImportData,
    creatingDraftRef,

    // Setters
    setAnswers,
    setSignature,
    setUserId,
    setOrgId,
    setOrgThemeColor,
    setDraftSubmission,
    setRepeatCounts,
    setShowEntryLabels,
    setLastSaved,
    setLastSyncedToCloud,
    setIsSaving,
    setShowRecoveryDialog,
    setRecoverableData,
    setShowUpgradeDialog,
    setPendingImportData,
  };
}
