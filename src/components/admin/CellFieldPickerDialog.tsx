import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fieldTypes, type FieldType } from "./FieldPalette";

interface CellFieldPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFieldSelect: (fieldType: FieldType) => void;
}

const allowedTableFieldTypes: FieldType[] = [
  'text',
  'number',
  'date',
  'time',
  'select',
  'checkbox',
  'radio'
];

export function CellFieldPickerDialog({
  open,
  onOpenChange,
  onFieldSelect,
}: CellFieldPickerDialogProps) {
  const allowedFields = fieldTypes.filter(ft => 
    allowedTableFieldTypes.includes(ft.type)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Field to Cell</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {allowedFields.map((field) => {
            const Icon = field.icon;
            return (
              <Button
                key={field.type}
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => {
                  onFieldSelect(field.type);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{field.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {field.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
