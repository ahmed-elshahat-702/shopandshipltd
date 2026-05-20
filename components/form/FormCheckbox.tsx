import { forwardRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface FormCheckboxProps {
  label?: string;
  error?: string;
  helperText?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
}

export const FormCheckbox = forwardRef<HTMLButtonElement, FormCheckboxProps>(
  ({ label, error, helperText, checked, onCheckedChange, id }, ref) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            ref={ref}
            checked={checked}
            onCheckedChange={onCheckedChange}
            id={id}
          />
          {label && <Label htmlFor={id}>{label}</Label>}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';
