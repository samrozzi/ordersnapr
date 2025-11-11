/**
 * CustomFieldDisplay - Read-only display of custom field values
 * Used in detail views to show custom field data
 */

import { useCustomFieldValues } from '@/hooks/use-custom-field-values';
import { EntityType } from '@/types/custom-fields';
import { Loader2, FileIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CustomFieldDisplayProps {
  entityType: EntityType;
  entityId: string;
  orgId?: string;
  layout?: 'grid' | 'list';
}

export function CustomFieldDisplay({
  entityType,
  entityId,
  orgId,
  layout = 'grid',
}: CustomFieldDisplayProps) {
  const { values, isLoading } = useCustomFieldValues({
    entityType,
    entityId,
    orgId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasValues = Object.keys(values).length > 0;

  if (!hasValues) {
    return (
      <p className="text-sm text-muted-foreground">No custom fields data</p>
    );
  }

  // Format value for display based on type
  const formatValue = (value: any): React.ReactNode => {
    if (!value) return <span className="text-muted-foreground">—</span>;

    // Text fields
    if (value.text !== undefined) {
      return <span>{value.text || <span className="text-muted-foreground">—</span>}</span>;
    }

    // Number fields
    if (value.number !== undefined) {
      return <span>{value.number}</span>;
    }

    // Date fields
    if (value.date !== undefined) {
      return <span>{new Date(value.date).toLocaleDateString()}</span>;
    }

    // DateTime fields
    if (value.datetime !== undefined) {
      return <span>{new Date(value.datetime).toLocaleString()}</span>;
    }

    // Boolean fields
    if (value.boolean !== undefined) {
      return (
        <Badge variant={value.boolean ? 'default' : 'outline'}>
          {value.boolean ? 'Yes' : 'No'}
        </Badge>
      );
    }

    // Dropdown single
    if (typeof value.selected === 'string') {
      return <Badge variant="secondary">{value.selected}</Badge>;
    }

    // Dropdown multiple
    if (Array.isArray(value.selected)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.selected.map((item, i) => (
            <Badge key={i} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      );
    }

    // File fields
    if (value.files) {
      return (
        <div className="space-y-1">
          {value.files.map((file: any, i: number) => (
            <a
              key={i}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileIcon className="h-4 w-4" />
              {file.name}
            </a>
          ))}
        </div>
      );
    }

    return <span className="text-muted-foreground">—</span>;
  };

  const containerClass = layout === 'grid'
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
    : 'space-y-3';

  return (
    <div className={containerClass}>
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <dt className="text-sm font-medium text-muted-foreground mb-1">
            {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </dt>
          <dd className="text-sm">
            {formatValue(value)}
          </dd>
        </div>
      ))}
    </div>
  );
}
