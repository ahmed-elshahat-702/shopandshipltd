import { forwardRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  options: Option[];
  value?: string;
  onValueChange?: (value: string) => void;
}

export const FormSelect = forwardRef<HTMLButtonElement, FormSelectProps>(
  ({ label, placeholder, error, helperText, options, value, onValueChange }, ref) => {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger ref={ref} className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
