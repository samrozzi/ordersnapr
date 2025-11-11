/**
 * Report Visualization Component
 * Renders reports as tables or various chart types
 */

import { useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF, exportToPDFWithChart } from '@/lib/report-export';
import { useToast } from '@/hooks/use-toast';
import type { ReportResults, ChartType } from '@/lib/report-builder-types';

interface ReportVisualizationProps {
  results: ReportResults | null;
  isLoading?: boolean;
}

const CHART_COLORS = [
  '#0EA5E9', // sky-500
  '#8B5CF6', // violet-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#EC4899', // pink-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
];

export function ReportVisualization({ results, isLoading }: ReportVisualizationProps) {
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    if (!results || !results.data) return null;

    const { data, configuration } = results;

    // Identify the keys for chart rendering
    const numericKeys = Object.keys(data[0] || {}).filter(key => {
      const value = data[0]?.[key];
      return typeof value === 'number';
    });

    const stringKeys = Object.keys(data[0] || {}).filter(key => {
      const value = data[0]?.[key];
      return typeof value === 'string';
    });

    // Use first string column as X-axis, numeric columns as Y-axis
    const xKey = configuration.groupBy?.[0]?.field || stringKeys[0] || 'name';
    const yKeys = numericKeys.length > 0 ? numericKeys : [];

    return {
      data,
      xKey,
      yKeys,
    };
  }, [results]);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!results) return;

    try {
      switch (format) {
        case 'csv':
          exportToCSV(results);
          break;
        case 'xlsx':
          exportToExcel(results);
          break;
        case 'pdf':
          // Try to get chart canvas for PDF export
          const canvas = chartRef.current?.querySelector('canvas');
          if (canvas && results.configuration.chartType !== 'table') {
            await exportToPDFWithChart(results, canvas);
          } else {
            exportToPDF(results);
          }
          break;
      }
      toast({
        title: "Export Successful",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export report",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!results || !results.data || results.data.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center text-muted-foreground">
          No data available. Adjust your filters or date range.
        </CardContent>
      </Card>
    );
  }

  const chartType = results.configuration.chartType || 'table';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{results.configuration.name || 'Report Results'}</CardTitle>
            {results.configuration.description && (
              <CardDescription>{results.configuration.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {results.totalRows} row{results.totalRows !== 1 ? 's' : ''}
            </Badge>
            {results.executionTime && (
              <Badge variant="secondary">{results.executionTime}ms</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={chartRef}>
        {chartType === 'table' && <TableView data={results.data} />}
        {chartType === 'bar' && chartData && <BarChartView {...chartData} />}
        {chartType === 'line' && chartData && <LineChartView {...chartData} />}
        {chartType === 'pie' && chartData && <PieChartView {...chartData} />}
        {chartType === 'area' && chartData && <AreaChartView {...chartData} />}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Table View
// ============================================================================

function TableView({ data }: { data: any[] }) {
  if (data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col}>{formatColumnName(col)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={col}>{formatCellValue(row[col])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Bar Chart View
// ============================================================================

function BarChartView({ data, xKey, yKeys }: { data: any[]; xKey: string; yKeys: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={xKey}
          className="text-xs"
          tickFormatter={(value) => formatAxisValue(value)}
        />
        <YAxis className="text-xs" tickFormatter={(value) => formatNumber(value)} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: any) => formatNumber(value)}
          labelFormatter={(label) => formatAxisValue(label)}
        />
        <Legend />
        {yKeys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            fill={CHART_COLORS[idx % CHART_COLORS.length]}
            name={formatColumnName(key)}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Line Chart View
// ============================================================================

function LineChartView({ data, xKey, yKeys }: { data: any[]; xKey: string; yKeys: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={xKey}
          className="text-xs"
          tickFormatter={(value) => formatAxisValue(value)}
        />
        <YAxis className="text-xs" tickFormatter={(value) => formatNumber(value)} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: any) => formatNumber(value)}
          labelFormatter={(label) => formatAxisValue(label)}
        />
        <Legend />
        {yKeys.map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            strokeWidth={2}
            name={formatColumnName(key)}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Pie Chart View
// ============================================================================

function PieChartView({ data, xKey, yKeys }: { data: any[]; xKey: string; yKeys: string[] }) {
  const yKey = yKeys[0]; // Use first numeric column for pie chart

  if (!yKey) {
    return <div className="text-center py-10 text-muted-foreground">No numeric data for pie chart</div>;
  }

  // Transform data for pie chart
  const pieData = data.map((row) => ({
    name: String(row[xKey]),
    value: Number(row[yKey]) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => formatNumber(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Area Chart View
// ============================================================================

function AreaChartView({ data, xKey, yKeys }: { data: any[]; xKey: string; yKeys: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <defs>
          {yKeys.map((key, idx) => (
            <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={CHART_COLORS[idx % CHART_COLORS.length]}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS[idx % CHART_COLORS.length]}
                stopOpacity={0.1}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={xKey}
          className="text-xs"
          tickFormatter={(value) => formatAxisValue(value)}
        />
        <YAxis className="text-xs" tickFormatter={(value) => formatNumber(value)} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: any) => formatNumber(value)}
          labelFormatter={(label) => formatAxisValue(label)}
        />
        <Legend />
        {yKeys.map((key, idx) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            fill={`url(#gradient-${key})`}
            name={formatColumnName(key)}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatColumnName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (value % 1 !== 0) {
    return value.toFixed(2);
  }
  return value.toLocaleString();
}

function formatAxisValue(value: any): string {
  if (typeof value === 'string' && value.length > 15) {
    return value.substring(0, 12) + '...';
  }
  return String(value);
}
