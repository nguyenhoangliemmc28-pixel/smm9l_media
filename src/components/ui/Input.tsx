import { forwardRef, type InputHTMLAttributes, type ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  rightSlot?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, IInputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, rightSlot, containerClassName, className = '', type = 'text', id, name, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;
  const inputId = id ?? name;
  const hasRight = rightIcon || rightSlot || isPassword;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          className={cn(
            'w-full h-11 bg-bg-card border border-border rounded-input text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none focus:border-primary-500/60 focus:shadow-[0_0_0_3px_rgba(109,91,255,.12)]',
            leftIcon ? 'pl-11' : 'pl-4',
            hasRight ? 'pr-11' : 'pr-4',
            error && 'border-danger/60 focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,.12)]',
            className,
          )}
          {...rest}
        />
        {isPassword ? (
          <button type="button" onClick={() => setShow((s) => !s)} tabIndex={-1} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
            {show ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
          </button>
        ) : (rightIcon ?? rightSlot) ? (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">{rightIcon ?? rightSlot}</span>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-white/40">{hint}</p>
      ) : null}
    </div>
  );
});
