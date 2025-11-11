/**
 * Report Builder Type Definitions
 * Comprehensive types for custom report building and analytics
 */

// ============================================================================
// Report Configuration Types
// ============================================================================

export type ReportEntity =
  | 'work_orders'
  | 'customers'
  | 'properties'
  | 'invoices'
  | 'payments'
  | 'form_submissions';

export type AggregationFunction =
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'count_distinct';

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null';

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'area'
  | 'scatter'
  | 'table';

export type DateGrouping =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

// ============================================================================
// Report Field Definitions
// ============================================================================

export interface ReportField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  entity: ReportEntity;
  aggregatable?: boolean;
  groupable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  enumValues?: string[];
}

export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ReportGrouping {
  field: string;
  dateGrouping?: DateGrouping;
}

export interface ReportAggregation {
  field: string;
  function: AggregationFunction;
  label?: string;
}

export interface ReportSorting {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// Report Configuration
// ============================================================================

export interface ReportConfiguration {
  id?: string;
  name: string;
  description?: string;
  entity: ReportEntity;
  fields: string[]; // Field names to include
  filters: ReportFilter[];
  groupBy?: ReportGrouping[];
  aggregations: ReportAggregation[];
  sorting?: ReportSorting[];
  chartType: ChartType;
  dateRange?: {
    start?: string;
    end?: string;
    preset?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all_time';
  };
  limit?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  orgId?: string;
}

// ============================================================================
// Saved Report
// ============================================================================

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  configuration: ReportConfiguration;
  is_public: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  organization_id: string;
  last_run_at?: string;
  run_count: number;
}

// ============================================================================
// Report Schedule
// ============================================================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduleFormat = 'pdf' | 'xlsx' | 'csv';

export interface ReportSchedule {
  id: string;
  report_id: string;
  name: string;
  frequency: ScheduleFrequency;
  day_of_week?: number; // 0-6 for weekly
  day_of_month?: number; // 1-31 for monthly
  time: string; // HH:MM format
  format: ScheduleFormat;
  recipients: string[]; // Email addresses
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

// ============================================================================
// Report Results
// ============================================================================

export interface ReportRow {
  [key: string]: any;
}

export interface ReportResults {
  data: ReportRow[];
  totalRows: number;
  generatedAt: string;
  configuration: ReportConfiguration;
  executionTime?: number; // milliseconds
}

// ============================================================================
// Chart Data
// ============================================================================

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ChartData {
  data: ChartDataPoint[];
  xAxisKey: string;
  yAxisKeys: string[];
  colors?: string[];
}

// ============================================================================
// Report Field Registry
// ============================================================================

export const REPORT_FIELDS: Record<ReportEntity, ReportField[]> = {
  work_orders: [
    { name: 'id', label: 'ID', type: 'string', entity: 'work_orders', filterable: true, sortable: true },
    { name: 'job_id', label: 'Job ID', type: 'string', entity: 'work_orders', filterable: true, sortable: true },
    { name: 'bpc', label: 'BPC', type: 'string', entity: 'work_orders', filterable: true, groupable: true },
    { name: 'ban', label: 'BAN', type: 'string', entity: 'work_orders', filterable: true, groupable: true },
    { name: 'customer_name', label: 'Customer Name', type: 'string', entity: 'work_orders', filterable: true, groupable: true },
    { name: 'status', label: 'Status', type: 'enum', entity: 'work_orders', filterable: true, groupable: true, enumValues: ['New', 'Scheduled', 'In Progress', 'Complete', 'Cancelled'] },
    { name: 'type', label: 'Type', type: 'string', entity: 'work_orders', filterable: true, groupable: true },
    { name: 'scheduled_date', label: 'Scheduled Date', type: 'date', entity: 'work_orders', filterable: true, sortable: true, groupable: true },
    { name: 'created_at', label: 'Created Date', type: 'date', entity: 'work_orders', filterable: true, sortable: true, groupable: true },
    { name: 'address', label: 'Address', type: 'string', entity: 'work_orders', filterable: true },
  ],
  customers: [
    { name: 'id', label: 'ID', type: 'string', entity: 'customers', filterable: true, sortable: true },
    { name: 'name', label: 'Name', type: 'string', entity: 'customers', filterable: true, groupable: true, sortable: true },
    { name: 'email', label: 'Email', type: 'string', entity: 'customers', filterable: true },
    { name: 'phone', label: 'Phone', type: 'string', entity: 'customers', filterable: true },
    { name: 'address', label: 'Address', type: 'string', entity: 'customers', filterable: true },
    { name: 'created_at', label: 'Created Date', type: 'date', entity: 'customers', filterable: true, sortable: true, groupable: true },
  ],
  properties: [
    { name: 'id', label: 'ID', type: 'string', entity: 'properties', filterable: true, sortable: true },
    { name: 'property_name', label: 'Property Name', type: 'string', entity: 'properties', filterable: true, groupable: true, sortable: true },
    { name: 'address', label: 'Address', type: 'string', entity: 'properties', filterable: true },
    { name: 'contact', label: 'Contact', type: 'string', entity: 'properties', filterable: true },
    { name: 'created_at', label: 'Created Date', type: 'date', entity: 'properties', filterable: true, sortable: true, groupable: true },
  ],
  invoices: [
    { name: 'id', label: 'ID', type: 'string', entity: 'invoices', filterable: true, sortable: true },
    { name: 'invoice_number', label: 'Invoice Number', type: 'string', entity: 'invoices', filterable: true, sortable: true },
    { name: 'customer_name', label: 'Customer Name', type: 'string', entity: 'invoices', filterable: true, groupable: true },
    { name: 'status', label: 'Status', type: 'enum', entity: 'invoices', filterable: true, groupable: true, enumValues: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'] },
    { name: 'payment_status', label: 'Payment Status', type: 'enum', entity: 'invoices', filterable: true, groupable: true, enumValues: ['unpaid', 'partial', 'paid'] },
    { name: 'total_cents', label: 'Total Amount', type: 'number', entity: 'invoices', filterable: true, sortable: true, aggregatable: true },
    { name: 'paid_amount_cents', label: 'Paid Amount', type: 'number', entity: 'invoices', filterable: true, sortable: true, aggregatable: true },
    { name: 'due_date', label: 'Due Date', type: 'date', entity: 'invoices', filterable: true, sortable: true, groupable: true },
    { name: 'issue_date', label: 'Issue Date', type: 'date', entity: 'invoices', filterable: true, sortable: true, groupable: true },
    { name: 'created_at', label: 'Created Date', type: 'date', entity: 'invoices', filterable: true, sortable: true, groupable: true },
  ],
  payments: [
    { name: 'id', label: 'ID', type: 'string', entity: 'payments', filterable: true, sortable: true },
    { name: 'amount_cents', label: 'Amount', type: 'number', entity: 'payments', filterable: true, sortable: true, aggregatable: true },
    { name: 'payment_method_type', label: 'Payment Method', type: 'enum', entity: 'payments', filterable: true, groupable: true, enumValues: ['card', 'ach', 'cash', 'check'] },
    { name: 'status', label: 'Status', type: 'enum', entity: 'payments', filterable: true, groupable: true, enumValues: ['pending', 'succeeded', 'failed', 'refunded'] },
    { name: 'created_at', label: 'Payment Date', type: 'date', entity: 'payments', filterable: true, sortable: true, groupable: true },
  ],
  form_submissions: [
    { name: 'id', label: 'ID', type: 'string', entity: 'form_submissions', filterable: true, sortable: true },
    { name: 'form_template_name', label: 'Form Template', type: 'string', entity: 'form_submissions', filterable: true, groupable: true },
    { name: 'status', label: 'Status', type: 'enum', entity: 'form_submissions', filterable: true, groupable: true, enumValues: ['draft', 'submitted', 'approved', 'rejected'] },
    { name: 'created_at', label: 'Submitted Date', type: 'date', entity: 'form_submissions', filterable: true, sortable: true, groupable: true },
  ],
};

// ============================================================================
// Preset Reports
// ============================================================================

export const PRESET_REPORTS: Partial<ReportConfiguration>[] = [
  {
    name: 'Work Orders by Status',
    entity: 'work_orders',
    fields: ['status', 'count'],
    groupBy: [{ field: 'status' }],
    aggregations: [{ field: '*', function: 'count', label: 'Count' }],
    chartType: 'pie',
  },
  {
    name: 'Monthly Invoice Trends',
    entity: 'invoices',
    fields: ['created_at', 'total_cents'],
    groupBy: [{ field: 'created_at', dateGrouping: 'month' }],
    aggregations: [
      { field: 'total_cents', function: 'sum', label: 'Total Invoiced' },
      { field: '*', function: 'count', label: 'Invoice Count' },
    ],
    chartType: 'line',
  },
  {
    name: 'Top Customers by Revenue',
    entity: 'invoices',
    fields: ['customer_name', 'paid_amount_cents'],
    groupBy: [{ field: 'customer_name' }],
    aggregations: [{ field: 'paid_amount_cents', function: 'sum', label: 'Total Paid' }],
    sorting: [{ field: 'paid_amount_cents', direction: 'desc' }],
    chartType: 'bar',
    limit: 10,
  },
  {
    name: 'Payment Methods Distribution',
    entity: 'payments',
    fields: ['payment_method_type', 'amount_cents'],
    groupBy: [{ field: 'payment_method_type' }],
    aggregations: [
      { field: 'amount_cents', function: 'sum', label: 'Total Amount' },
      { field: '*', function: 'count', label: 'Payment Count' },
    ],
    chartType: 'pie',
  },
];
