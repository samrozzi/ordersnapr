import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface AddressValue {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

interface AddressFieldProps {
  label?: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  required?: boolean;
}

export function AddressField({ label, value, onChange, required }: AddressFieldProps) {
  const handleChange = (field: keyof AddressValue, newValue: string) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  return (
    <div className="space-y-4">
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="street" className="text-sm text-muted-foreground">
            Street Address {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="street"
            value={value?.street || ""}
            onChange={(e) => handleChange("street", e.target.value)}
            placeholder="123 Main St"
            required={required}
          />
        </div>

        <div>
          <Label htmlFor="street2" className="text-sm text-muted-foreground">
            Street Address Line 2
          </Label>
          <Input
            id="street2"
            value={value?.street2 || ""}
            onChange={(e) => handleChange("street2", e.target.value)}
            placeholder="Apt, Suite, Unit, Building, Floor, etc."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city" className="text-sm text-muted-foreground">
              City {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="city"
              value={value?.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="San Francisco"
              required={required}
            />
          </div>

          <div>
            <Label htmlFor="state" className="text-sm text-muted-foreground">
              State/Province {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="state"
              value={value?.state || ""}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="CA"
              required={required}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="zip" className="text-sm text-muted-foreground">
              ZIP/Postal Code {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="zip"
              value={value?.zip || ""}
              onChange={(e) => handleChange("zip", e.target.value)}
              placeholder="94102"
              required={required}
            />
          </div>

          <div>
            <Label htmlFor="country" className="text-sm text-muted-foreground">
              Country
            </Label>
            <Input
              id="country"
              value={value?.country || ""}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="USA"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
