# Custom Fields System - Technical Specification

**Date:** 2025-11-11
**Priority:** ⭐⭐⭐⭐⭐ (Highest Impact)
**Estimated Time:** 2-3 weeks

---

## 🎯 Overview

The Custom Fields System allows organizations to extend any entity (Work Orders, Customers, Properties, Invoices) with custom fields specific to their industry and business needs.

**Example Use Cases:**
- HVAC company adds "System Type", "BTU Rating", "Filter Size" to Work Orders
- Plumbing company adds "Pipe Material", "Diameter", "Installation Date" to Properties
- Electrical company adds "Panel Type", "Amperage", "Circuit Count" to Work Orders

---

## 🗄️ Database Schema

### Table: `custom_fields`

Defines the custom fields available for each organization and entity type.

```sql
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'work_orders', 'customers', 'properties', 'invoices'
  field_name TEXT NOT NULL, -- Display name: "System Type"
  field_key TEXT NOT NULL, -- Internal key: "system_type" (lowercase, underscores)
  field_type TEXT NOT NULL, -- 'text', 'number', 'date', 'dropdown', 'checkbox', 'textarea', 'file'
  field_config JSONB DEFAULT '{}', -- Type-specific configuration
  display_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT unique_field_key_per_entity UNIQUE (org_id, entity_type, field_key),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('work_orders', 'customers', 'properties', 'invoices')),
  CONSTRAINT valid_field_type CHECK (field_type IN ('text', 'number', 'date', 'datetime', 'dropdown', 'checkbox', 'textarea', 'file', 'email', 'phone', 'url'))
);

-- Indexes
CREATE INDEX idx_custom_fields_org_entity ON custom_fields(org_id, entity_type);
CREATE INDEX idx_custom_fields_active ON custom_fields(org_id, entity_type, is_active);

-- RLS Policies
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom fields for their org"
  ON custom_fields FOR SELECT
  USING (org_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT active_org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Org admins can manage custom fields"
  ON custom_fields FOR ALL
  USING (
    org_id IN (
      SELECT om.organization_id
      FROM org_memberships om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'org_admin')
    )
  );
```

### Field Configuration (`field_config` JSONB)

Different field types have different configurations:

```typescript
// Text field
{
  "placeholder": "Enter system type",
  "maxLength": 100,
  "pattern": "^[A-Za-z0-9 ]+$", // Optional regex validation
  "helpText": "e.g., Central Air, Heat Pump"
}

// Number field
{
  "min": 0,
  "max": 10000,
  "step": 0.01,
  "unit": "BTU", // Optional display unit
  "helpText": "System capacity in BTU"
}

// Dropdown field
{
  "options": [
    { "value": "central_air", "label": "Central Air" },
    { "value": "heat_pump", "label": "Heat Pump" },
    { "value": "mini_split", "label": "Mini Split" }
  ],
  "allowMultiple": false,
  "allowCustom": false // Allow users to add new options
}

// Date/DateTime field
{
  "minDate": "2020-01-01",
  "maxDate": "2030-12-31",
  "includeTime": false,
  "helpText": "Installation date"
}

// Checkbox field
{
  "label": "Under warranty",
  "defaultValue": false
}

// File field
{
  "allowedTypes": ["image/*", "application/pdf"],
  "maxSize": 10485760, // 10MB in bytes
  "maxFiles": 5,
  "helpText": "Upload warranty documents"
}
```

### Table: `custom_field_values`

Stores the actual values for custom fields on specific entities.

```sql
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL, -- ID of work_order, customer, property, or invoice
  value JSONB NOT NULL, -- Stores the actual value (flexible for different types)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_field_per_entity UNIQUE (custom_field_id, entity_id),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('work_orders', 'customers', 'properties', 'invoices'))
);

-- Indexes
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_values_field ON custom_field_values(custom_field_id);
CREATE INDEX idx_custom_field_values_value ON custom_field_values USING GIN (value);

-- RLS Policies
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom field values for their org entities"
  ON custom_field_values FOR SELECT
  USING (
    custom_field_id IN (
      SELECT id FROM custom_fields
      WHERE org_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
        UNION
        SELECT active_org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage custom field values for their org entities"
  ON custom_field_values FOR ALL
  USING (
    custom_field_id IN (
      SELECT id FROM custom_fields
      WHERE org_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
        UNION
        SELECT active_org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
```

### Value Storage (`value` JSONB)

Values are stored differently based on field type:

```typescript
// Text, Textarea, Email, Phone, URL
{ "text": "Central Air Conditioning" }

// Number
{ "number": 12000 }

// Date
{ "date": "2023-05-15" }

// DateTime
{ "datetime": "2023-05-15T14:30:00Z" }

// Checkbox
{ "boolean": true }

// Dropdown (single)
{ "selected": "central_air" }

// Dropdown (multiple)
{ "selected": ["central_air", "heat_pump"] }

// File
{
  "files": [
    {
      "id": "uuid",
      "name": "warranty.pdf",
      "url": "https://storage.../warranty.pdf",
      "size": 1024576,
      "type": "application/pdf",
      "uploadedAt": "2023-05-15T14:30:00Z"
    }
  ]
}
```

---

## 🎨 UI Components

### 1. Custom Field Builder (Admin UI)

**Location:** Settings → Organization → Custom Fields

**Features:**
- List all custom fields grouped by entity type
- Add new field with:
  - Field name (user-friendly label)
  - Field type selector
  - Type-specific configuration
  - Required toggle
  - Display order (drag & drop)
- Edit existing fields
- Delete fields (with warning if data exists)
- Enable/disable fields
- Preview how field will appear in forms

**Component:** `src/components/CustomFieldBuilder.tsx`

```typescript
interface CustomFieldBuilderProps {
  entityType: 'work_orders' | 'customers' | 'properties' | 'invoices';
}

// Sub-components:
// - CustomFieldList (displays existing fields)
// - CustomFieldForm (create/edit field)
// - FieldTypeSelector (choose field type)
// - FieldConfigEditor (type-specific config)
// - FieldPreview (shows how field will render)
```

### 2. Dynamic Form Renderer

**Location:** Embedded in entity forms (WorkOrderForm, CustomerForm, etc.)

**Features:**
- Automatically injects custom fields into forms
- Renders appropriate input based on field type
- Handles validation (required, pattern, min/max, etc.)
- Manages field values in form state
- Displays help text and labels

**Component:** `src/components/CustomFieldRenderer.tsx`

```typescript
interface CustomFieldRendererProps {
  entityType: 'work_orders' | 'customers' | 'properties' | 'invoices';
  entityId?: string; // For editing existing entities
  values: Record<string, any>; // Current field values
  onChange: (fieldKey: string, value: any) => void;
  errors?: Record<string, string>;
}

// Sub-components for each field type:
// - TextFieldInput
// - NumberFieldInput
// - DateFieldInput
// - DropdownFieldInput
// - CheckboxFieldInput
// - TextareaFieldInput
// - FileFieldInput
```

### 3. Custom Field Display

**Location:** Entity detail views (WorkOrderDetails, CustomerDetails, etc.)

**Features:**
- Displays custom field values in a readable format
- Groups fields logically
- Shows empty state for optional unfilled fields
- Formats values appropriately (dates, numbers, etc.)

**Component:** `src/components/CustomFieldDisplay.tsx`

```typescript
interface CustomFieldDisplayProps {
  entityType: 'work_orders' | 'customers' | 'properties' | 'invoices';
  entityId: string;
  layout?: 'grid' | 'list'; // How to display fields
}
```

---

## 🔧 Hooks

### `useCustomFields`

Manages custom field definitions for an organization.

```typescript
export function useCustomFields(entityType: EntityType) {
  const { activeOrgId } = useActiveOrg();

  // Fetch custom fields for entity type
  const { data: fields, isLoading } = useQuery({
    queryKey: ['custom-fields', activeOrgId, entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('org_id', activeOrgId)
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as CustomField[];
    },
    enabled: !!activeOrgId,
  });

  // Create field
  const createField = async (field: Partial<CustomField>) => { ... };

  // Update field
  const updateField = async (id: string, updates: Partial<CustomField>) => { ... };

  // Delete field
  const deleteField = async (id: string) => { ... };

  // Reorder fields
  const reorderFields = async (fieldIds: string[]) => { ... };

  return {
    fields: fields || [],
    isLoading,
    createField,
    updateField,
    deleteField,
    reorderFields,
  };
}
```

### `useCustomFieldValues`

Manages custom field values for a specific entity instance.

```typescript
export function useCustomFieldValues(entityType: EntityType, entityId?: string) {
  const { fields } = useCustomFields(entityType);

  // Fetch values for this entity
  const { data: values, isLoading } = useQuery({
    queryKey: ['custom-field-values', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!);

      if (error) throw error;

      // Convert to key-value map
      return data.reduce((acc, val) => {
        const field = fields.find(f => f.id === val.custom_field_id);
        if (field) {
          acc[field.field_key] = val.value;
        }
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: !!entityId && fields.length > 0,
  });

  // Save values
  const saveValues = async (values: Record<string, any>) => {
    // Convert key-value map to custom_field_values rows
    const rows = Object.entries(values).map(([key, value]) => {
      const field = fields.find(f => f.field_key === key);
      if (!field) return null;

      return {
        custom_field_id: field.id,
        entity_type: entityType,
        entity_id: entityId!,
        value,
      };
    }).filter(Boolean);

    // Upsert all values
    const { error } = await supabase
      .from('custom_field_values')
      .upsert(rows, {
        onConflict: 'custom_field_id,entity_id',
      });

    if (error) throw error;
  };

  return {
    values: values || {},
    isLoading,
    saveValues,
  };
}
```

---

## 📝 Integration Points

### Work Orders

**Form Integration:**
```typescript
// In WorkOrderForm.tsx
import { CustomFieldRenderer } from '@/components/CustomFieldRenderer';

function WorkOrderForm({ workOrder, onSuccess }: WorkOrderFormProps) {
  const [customFieldValues, setCustomFieldValues] = useState({});

  // ... existing form logic

  return (
    <form onSubmit={handleSubmit}>
      {/* Existing fields */}
      <Input label="Customer Name" ... />
      <Input label="Address" ... />

      {/* Custom Fields Section */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-medium mb-4">Additional Information</h3>
        <CustomFieldRenderer
          entityType="work_orders"
          entityId={workOrder?.id}
          values={customFieldValues}
          onChange={(key, value) => {
            setCustomFieldValues(prev => ({ ...prev, [key]: value }));
          }}
        />
      </div>

      {/* Submit button */}
    </form>
  );
}
```

**Detail View Integration:**
```typescript
// In WorkOrderDetails.tsx
import { CustomFieldDisplay } from '@/components/CustomFieldDisplay';

function WorkOrderDetails({ workOrder }: WorkOrderDetailsProps) {
  return (
    <div>
      {/* Existing details */}
      <div>Customer: {workOrder.customer_name}</div>
      <div>Status: {workOrder.status}</div>

      {/* Custom Fields Section */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-medium mb-4">Additional Information</h3>
        <CustomFieldDisplay
          entityType="work_orders"
          entityId={workOrder.id}
          layout="grid"
        />
      </div>
    </div>
  );
}
```

### Similar Integration for:
- **Customers** (`CustomerForm.tsx`, `CustomerDetails.tsx`)
- **Properties** (`PropertyForm.tsx`, Property detail view)
- **Invoices** (`InvoiceForm.tsx`, `InvoiceDetails.tsx`)

---

## 🔍 Search & Filter Integration

Custom fields should be searchable and filterable:

```sql
-- Search across custom field values
SELECT DISTINCT w.*
FROM work_orders w
JOIN custom_field_values cfv ON cfv.entity_id = w.id AND cfv.entity_type = 'work_orders'
WHERE cfv.value::text ILIKE '%search_term%';

-- Filter by specific custom field value
SELECT w.*
FROM work_orders w
JOIN custom_field_values cfv ON cfv.entity_id = w.id AND cfv.entity_type = 'work_orders'
JOIN custom_fields cf ON cf.id = cfv.custom_field_id
WHERE cf.field_key = 'system_type'
  AND cfv.value->>'selected' = 'central_air';
```

---

## 📊 Export Integration

Custom fields should be included in CSV/Excel exports:

```typescript
// In export-csv.ts
export async function buildExportColumns<T>(
  entityType: EntityType,
  standardColumns: ExportColumn<T>[],
  orgId: string
): Promise<ExportColumn<T>[]> {
  // Fetch custom fields for this entity type
  const { data: customFields } = await supabase
    .from('custom_fields')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .order('display_order');

  // Convert to export columns
  const customColumns = customFields.map(field => ({
    key: `custom_fields.${field.field_key}`,
    label: field.field_name,
    format: (value: any) => formatCustomFieldValue(field, value),
  }));

  return [...standardColumns, ...customColumns];
}
```

---

## ✅ Validation

Field-level validation:

```typescript
export function validateCustomFieldValue(
  field: CustomField,
  value: any
): string | null {
  // Required check
  if (field.is_required && !value) {
    return `${field.field_name} is required`;
  }

  // Type-specific validation
  switch (field.field_type) {
    case 'text':
    case 'textarea':
      const config = field.field_config as TextFieldConfig;
      if (config.maxLength && value.length > config.maxLength) {
        return `${field.field_name} must be less than ${config.maxLength} characters`;
      }
      if (config.pattern && !new RegExp(config.pattern).test(value)) {
        return `${field.field_name} format is invalid`;
      }
      break;

    case 'number':
      const numConfig = field.field_config as NumberFieldConfig;
      const num = parseFloat(value);
      if (isNaN(num)) {
        return `${field.field_name} must be a number`;
      }
      if (numConfig.min !== undefined && num < numConfig.min) {
        return `${field.field_name} must be at least ${numConfig.min}`;
      }
      if (numConfig.max !== undefined && num > numConfig.max) {
        return `${field.field_name} must be at most ${numConfig.max}`;
      }
      break;

    // ... more type-specific validations
  }

  return null; // Valid
}
```

---

## 🚀 Implementation Plan

### Phase 1: Database & Core Hooks (Week 1)
1. ✅ Create database schema
2. ✅ Write and test migrations
3. ✅ Implement `useCustomFields` hook
4. ✅ Implement `useCustomFieldValues` hook
5. ✅ Add TypeScript types

### Phase 2: UI Components (Week 2)
1. ✅ Build CustomFieldBuilder component
2. ✅ Build FieldTypeSelector
3. ✅ Build FieldConfigEditor for each type
4. ✅ Build CustomFieldRenderer
5. ✅ Build individual field input components
6. ✅ Build CustomFieldDisplay

### Phase 3: Integration (Week 3)
1. ✅ Integrate into WorkOrders
2. ✅ Integrate into Customers
3. ✅ Integrate into Properties
4. ✅ Integrate into Invoices
5. ✅ Add to search/filter
6. ✅ Add to exports
7. ✅ Testing & bug fixes

---

## 🎯 Success Metrics

- Organizations can create custom fields without code
- Custom fields appear in forms automatically
- Values persist correctly
- Export includes custom fields
- Search/filter works with custom fields
- UI is intuitive and performant

---

## 🔮 Future Enhancements

- **Conditional Logic:** Show/hide fields based on other field values
- **Computed Fields:** Fields calculated from other fields
- **Field Templates:** Pre-built field sets for industries (HVAC, Plumbing, etc.)
- **Field History:** Track changes to custom field values
- **Bulk Import:** Import custom field values from CSV
- **API Access:** Expose custom fields in public API

---

**Ready to implement!** 🚀
