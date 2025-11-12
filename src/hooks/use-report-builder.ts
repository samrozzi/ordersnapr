/**
 * React hooks for report builder functionality
 * Handles report execution, saved reports, and schedules
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveOrg } from '@/hooks/use-active-org';
import type {
  ReportConfiguration,
  ReportResults,
  ReportRow,
  SavedReport,
  ReportSchedule,
  ReportEntity,
} from '@/lib/report-builder-types';

// ============================================================================
// Execute Report Hook
// ============================================================================

export function useExecuteReport() {
  const { activeOrg } = useActiveOrg();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeReport = useCallback(
    async (configuration: ReportConfiguration): Promise<ReportResults> => {
      if (!activeOrg?.id) {
        throw new Error('No active organization');
      }

      setIsExecuting(true);
      setError(null);

      try {
        const startTime = Date.now();

        // Build the query based on configuration
        const query = buildSupabaseQuery(configuration, activeOrg.id);

        // Execute the query
        const { data, error: queryError, count } = await query;

        if (queryError) throw queryError;

        const executionTime = Date.now() - startTime;

        // Transform data based on aggregations and grouping
        const transformedData = transformReportData(data || [], configuration);

        const results: ReportResults = {
          data: transformedData,
          totalRows: count || transformedData.length,
          generatedAt: new Date().toISOString(),
          configuration,
          executionTime,
        };

        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to execute report');
        setError(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [activeOrg]
  );

  return {
    executeReport,
    isExecuting,
    error,
  };
}

// ============================================================================
// Saved Reports Hook
// ============================================================================

export function useSavedReports() {
  const { activeOrg } = useActiveOrg();
  const queryClient = useQueryClient();

  const { data: savedReports, isLoading } = useQuery({
    queryKey: ['saved_reports', activeOrg?.id],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('organization_id', activeOrg.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as SavedReport[]) || [];
    },
    enabled: !!activeOrg?.id,
  });

  const saveReport = useMutation({
    mutationFn: async (report: Partial<SavedReport>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!activeOrg?.id) throw new Error('No active organization');

      const { data, error } = await supabase
        .from('saved_reports')
        .insert([{
          name: report.name,
          description: report.description,
          configuration: report.configuration as any,
          is_public: report.is_public || false,
          is_favorite: report.is_favorite || false,
          created_by: user.id,
          organization_id: activeOrg.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_reports'] });
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SavedReport> }) => {
      const { data, error } = await supabase
        .from('saved_reports')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_reports'] });
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_reports'] });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('saved_reports')
        .update({ is_favorite: isFavorite })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_reports'] });
    },
  });

  return {
    savedReports: savedReports || [],
    isLoading,
    saveReport: saveReport.mutateAsync,
    updateReport: updateReport.mutateAsync,
    deleteReport: deleteReport.mutateAsync,
    toggleFavorite: toggleFavorite.mutateAsync,
  };
}

// ============================================================================
// Report Schedules Hook
// ============================================================================

export function useReportSchedules() {
  const { activeOrg } = useActiveOrg();
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['report_schedules', activeOrg?.id],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('organization_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as ReportSchedule[]) || [];
    },
    enabled: !!activeOrg?.id,
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Partial<ReportSchedule>) => {
      if (!activeOrg?.id) throw new Error('No active organization');

      const { data, error } = await supabase
        .from('report_schedules')
        .insert([{
          ...schedule as any,
          organization_id: activeOrg.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ReportSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_schedules'] });
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReportSchedule> }) => {
      const { data, error } = await supabase
        .from('report_schedules')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ReportSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_schedules'] });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_schedules'] });
    },
  });

  return {
    schedules: schedules || [],
    isLoading,
    createSchedule: createSchedule.mutateAsync,
    updateSchedule: updateSchedule.mutateAsync,
    deleteSchedule: deleteSchedule.mutateAsync,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildSupabaseQuery(config: ReportConfiguration, orgId: string) {
  const { entity, fields, filters, sorting, limit } = config;

  // Start building the query
  let query = supabase
    .from(entity)
    .select(fields.join(', '), { count: 'exact' })
    .eq('organization_id', orgId);

  // Apply filters
  if (filters && filters.length > 0) {
    filters.forEach(filter => {
      query = applyFilter(query, filter);
    });
  }

  // Apply sorting
  if (sorting && sorting.length > 0) {
    sorting.forEach(sort => {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    });
  }

  // Apply limit
  if (limit) {
    query = query.limit(limit);
  }

  return query;
}

function applyFilter(query: any, filter: any) {
  const { field, operator, value } = filter;

  switch (operator) {
    case 'equals':
      return query.eq(field, value);
    case 'not_equals':
      return query.neq(field, value);
    case 'contains':
      return query.ilike(field, `%${value}%`);
    case 'not_contains':
      return query.not(field, 'ilike', `%${value}%`);
    case 'starts_with':
      return query.ilike(field, `${value}%`);
    case 'ends_with':
      return query.ilike(field, `%${value}`);
    case 'greater_than':
      return query.gt(field, value);
    case 'less_than':
      return query.lt(field, value);
    case 'greater_than_or_equal':
      return query.gte(field, value);
    case 'less_than_or_equal':
      return query.lte(field, value);
    case 'in':
      return query.in(field, value);
    case 'not_in':
      return query.not(field, 'in', value);
    case 'is_null':
      return query.is(field, null);
    case 'is_not_null':
      return query.not(field, 'is', null);
    default:
      return query;
  }
}

function transformReportData(data: any[], config: ReportConfiguration): ReportRow[] {
  // If no grouping or aggregations, return raw data
  if (!config.groupBy || config.groupBy.length === 0) {
    return data;
  }

  // Group and aggregate data
  const grouped = new Map<string, ReportRow>();

  data.forEach(row => {
    // Create group key
    const groupKey = config.groupBy!
      .map(g => {
        const value = row[g.field];
        if (g.dateGrouping && value) {
          return formatDateGrouping(value, g.dateGrouping);
        }
        return value;
      })
      .join('|');

    if (!grouped.has(groupKey)) {
      const groupRow: ReportRow = {};

      // Add group fields
      config.groupBy!.forEach((g, idx) => {
        groupRow[g.field] = groupKey.split('|')[idx];
      });

      // Initialize aggregations
      config.aggregations.forEach(agg => {
        groupRow[agg.label || agg.field] = 0;
      });

      grouped.set(groupKey, groupRow);
    }

    const groupRow = grouped.get(groupKey)!;

    // Apply aggregations
    config.aggregations.forEach(agg => {
      const label = agg.label || agg.field;
      const value = row[agg.field];

      switch (agg.function) {
        case 'count':
          groupRow[label] = (groupRow[label] as number) + 1;
          break;
        case 'sum':
          groupRow[label] = (groupRow[label] as number) + (value || 0);
          break;
        case 'avg':
          // Store sum and count separately for average calculation
          groupRow[`${label}_sum`] = ((groupRow[`${label}_sum`] as number) || 0) + (value || 0);
          groupRow[`${label}_count`] = ((groupRow[`${label}_count`] as number) || 0) + 1;
          break;
        case 'min':
          groupRow[label] = Math.min(groupRow[label] as number || Infinity, value || Infinity);
          break;
        case 'max':
          groupRow[label] = Math.max(groupRow[label] as number || -Infinity, value || -Infinity);
          break;
      }
    });
  });

  // Calculate averages
  grouped.forEach(row => {
    config.aggregations.forEach(agg => {
      if (agg.function === 'avg') {
        const label = agg.label || agg.field;
        const sum = row[`${label}_sum`] as number;
        const count = row[`${label}_count`] as number;
        row[label] = count > 0 ? sum / count : 0;
        delete row[`${label}_sum`];
        delete row[`${label}_count`];
      }
    });
  });

  return Array.from(grouped.values());
}

function formatDateGrouping(date: string, grouping: string): string {
  const d = new Date(date);

  switch (grouping) {
    case 'day':
      return d.toISOString().split('T')[0];
    case 'week':
      // Get week start (Monday)
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      return weekStart.toISOString().split('T')[0];
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    case 'quarter':
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `${d.getFullYear()}-Q${quarter}`;
    case 'year':
      return String(d.getFullYear());
    default:
      return date;
  }
}
