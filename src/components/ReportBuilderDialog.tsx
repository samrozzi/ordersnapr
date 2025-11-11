/**
 * Report Builder Dialog
 * Interactive interface for creating custom reports
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Play, Save, Filter } from 'lucide-react';
import type {
  ReportConfiguration,
  ReportEntity,
  ReportField,
  ReportFilter,
  ReportAggregation,
  ChartType,
  FilterOperator,
  AggregationFunction,
} from '@/lib/report-builder-types';
import { REPORT_FIELDS } from '@/lib/report-builder-types';

interface ReportBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (config: ReportConfiguration) => void;
  onSave: (config: ReportConfiguration) => void;
  initialConfig?: Partial<ReportConfiguration>;
}

export function ReportBuilderDialog({
  open,
  onOpenChange,
  onExecute,
  onSave,
  initialConfig,
}: ReportBuilderDialogProps) {
  const [config, setConfig] = useState<Partial<ReportConfiguration>>({
    name: '',
    description: '',
    entity: 'work_orders',
    fields: [],
    filters: [],
    aggregations: [],
    chartType: 'table',
    ...initialConfig,
  });

  const [newFilter, setNewFilter] = useState<Partial<ReportFilter>>({
    field: '',
    operator: 'equals',
    value: '',
  });

  const entityFields = config.entity ? REPORT_FIELDS[config.entity] : [];
  const filterableFields = entityFields.filter(f => f.filterable);
  const aggregatableFields = entityFields.filter(f => f.aggregatable);

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.operator) {
      setConfig({
        ...config,
        filters: [
          ...(config.filters || []),
          {
            id: `filter-${Date.now()}`,
            field: newFilter.field,
            operator: newFilter.operator as FilterOperator,
            value: newFilter.value,
          },
        ],
      });
      setNewFilter({ field: '', operator: 'equals', value: '' });
    }
  };

  const handleRemoveFilter = (id: string) => {
    setConfig({
      ...config,
      filters: config.filters?.filter(f => f.id !== id),
    });
  };

  const handleAddAggregation = (field: string, func: AggregationFunction) => {
    setConfig({
      ...config,
      aggregations: [
        ...(config.aggregations || []),
        {
          field,
          function: func,
          label: `${func}(${field})`,
        },
      ],
    });
  };

  const handleRemoveAggregation = (index: number) => {
    setConfig({
      ...config,
      aggregations: config.aggregations?.filter((_, i) => i !== index),
    });
  };

  const handleFieldToggle = (fieldName: string, checked: boolean) => {
    const currentFields = config.fields || [];
    if (checked) {
      setConfig({ ...config, fields: [...currentFields, fieldName] });
    } else {
      setConfig({ ...config, fields: currentFields.filter(f => f !== fieldName) });
    }
  };

  const handleExecute = () => {
    onExecute(config as ReportConfiguration);
  };

  const handleSave = () => {
    if (!config.name) {
      alert('Please enter a report name');
      return;
    }
    onSave(config as ReportConfiguration);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Report Builder</DialogTitle>
          <DialogDescription>
            Create custom reports with filters, aggregations, and visualizations
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="aggregations">Aggregations</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Basic Settings */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-name">Report Name</Label>
                <Input
                  id="report-name"
                  value={config.name || ''}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="My Custom Report"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-description">Description</Label>
                <Textarea
                  id="report-description"
                  value={config.description || ''}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Describe what this report shows..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity">Data Source</Label>
                <Select
                  value={config.entity}
                  onValueChange={(value) =>
                    setConfig({ ...config, entity: value as ReportEntity, fields: [], filters: [], aggregations: [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work_orders">Work Orders</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="properties">Properties</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                    <SelectItem value="payments">Payments</SelectItem>
                    <SelectItem value="form_submissions">Form Submissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chart-type">Visualization Type</Label>
                <Select
                  value={config.chartType}
                  onValueChange={(value) => setConfig({ ...config, chartType: value as ChartType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Fields Selection */}
            <TabsContent value="fields" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Fields to Include</Label>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {entityFields.map((field) => (
                        <div key={field.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`field-${field.name}`}
                            checked={config.fields?.includes(field.name)}
                            onCheckedChange={(checked) =>
                              handleFieldToggle(field.name, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`field-${field.name}`}
                            className="flex-1 cursor-pointer font-normal"
                          >
                            {field.label}
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({field.type})
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Filters */}
            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Filter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={newFilter.field}
                      onValueChange={(value) => setNewFilter({ ...newFilter, field: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterableFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={newFilter.operator}
                      onValueChange={(value) => setNewFilter({ ...newFilter, operator: value as FilterOperator })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="is_null">Is Null</SelectItem>
                        <SelectItem value="is_not_null">Is Not Null</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      value={newFilter.value}
                      onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                      placeholder="Value"
                    />
                  </div>

                  <Button onClick={handleAddFilter} size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
                </CardContent>
              </Card>

              {/* Active Filters */}
              {config.filters && config.filters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {config.filters.map((filter) => (
                        <div
                          key={filter.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{filter.field}</Badge>
                            <span className="text-sm text-muted-foreground">{filter.operator}</span>
                            <Badge>{filter.value}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFilter(filter.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Aggregations */}
            <TabsContent value="aggregations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Aggregation</CardTitle>
                  <CardDescription>
                    Aggregate numeric fields for summary statistics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aggregatableFields.map((field) => (
                    <div key={field.name} className="flex items-center justify-between">
                      <Label>{field.label}</Label>
                      <div className="flex gap-1">
                        {(['count', 'sum', 'avg', 'min', 'max'] as AggregationFunction[]).map((func) => (
                          <Button
                            key={func}
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddAggregation(field.name, func)}
                          >
                            {func}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Active Aggregations */}
              {config.aggregations && config.aggregations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Aggregations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {config.aggregations.map((agg, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <Badge variant="secondary">
                            {agg.function}({agg.field})
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAggregation(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
          <Button onClick={handleExecute}>
            <Play className="h-4 w-4 mr-2" />
            Run Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
