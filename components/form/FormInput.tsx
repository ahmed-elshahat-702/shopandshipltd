import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <Input
          ref={ref}
          className={error ? 'border-red-500' : ''}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
