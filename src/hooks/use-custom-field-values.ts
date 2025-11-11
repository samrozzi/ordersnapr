/**
 * useCustomFieldValues Hook
 *
 * Manages custom field values for a specific entity instance.
 * Handles fetching and saving values for an entity.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCustomFields } from './use-custom-fields';
import type { CustomFieldValues, CustomFieldValue, EntityType, FieldValue } from '@/types/custom-fields';

interface UseCustomFieldValuesOptions {
  entityType: EntityType;
  entityId?: string;
  orgId?: string;
}

export function useCustomFieldValues({ entityType, entityId, orgId }: UseCustomFieldValuesOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fields } = useCustomFields({ entityType, orgId });

  // Fetch values for this entity
  const {
    data: values = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: ['custom-field-values', entityType, entityId],
    queryFn: async () => {
      if (!entityId || fields.length === 0) return {};

      const { data, error } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;

      // Convert to key-value map
      const valueMap: CustomFieldValues = {};

      data.forEach((val: CustomFieldValue) => {
        const field = fields.find(f => f.id === val.custom_field_id);
        if (field) {
          valueMap[field.field_key] = val.value;
        }
      });

      return valueMap;
    },
    enabled: !!entityId && fields.length > 0,
  });

  // Save values mutation
  const saveValuesMutation = useMutation({
    mutationFn: async ({ entityId: targetEntityId, values: valuesToSave }: { entityId: string; values: CustomFieldValues }) => {
      // Convert key-value map to custom_field_values rows
      const rows = Object.entries(valuesToSave)
        .map(([key, value]) => {
          const field = fields.find(f => f.field_key === key);
          if (!field) return null;

          return {
            custom_field_id: field.id,
            entity_type: entityType,
            entity_id: targetEntityId,
            value,
          };
        })
        .filter(Boolean);

      if (rows.length === 0) return;

      // Upsert all values
      const { error } = await supabase
        .from('custom_field_values')
        .upsert(rows, {
          onConflict: 'custom_field_id,entity_id',
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['custom-field-values', entityType, variables.entityId],
      });
    },
    onError: (error: Error) => {
      console.error('Save values error:', error);
      toast({
        title: 'Error',
        description: `Failed to save custom field values: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete value mutation (for clearing a single field)
  const deleteValueMutation = useMutation({
    mutationFn: async ({ fieldKey }: { fieldKey: string }) => {
      const field = fields.find(f => f.field_key === fieldKey);
      if (!field || !entityId) return;

      const { error } = await supabase
        .from('custom_field_values')
        .delete()
        .eq('custom_field_id', field.id)
        .eq('entity_id', entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['custom-field-values', entityType, entityId],
      });
    },
    onError: (error: Error) => {
      console.error('Delete value error:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear field value',
        variant: 'destructive',
      });
    },
  });

  // Helper to get value for a specific field key
  const getValue = (fieldKey: string): any => {
    return values[fieldKey];
  };

  // Helper to set value for a specific field key
  const setValue = async (fieldKey: string, value: any) => {
    if (!entityId) return;

    const newValues = { ...values, [fieldKey]: value };

    await saveValuesMutation.mutateAsync({
      entityId,
      values: newValues,
    });
  };

  return {
    values,
    isLoading,
    error,
    saveValues: saveValuesMutation.mutate,
    deleteValue: deleteValueMutation.mutate,
    getValue,
    setValue,
    isSaving: saveValuesMutation.isPending,
  };
}
