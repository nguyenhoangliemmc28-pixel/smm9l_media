import { type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ISelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export function Select({ label, error, hint, containerClassName, className = '', children, id, ...rest }: ISelectProps) {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>}
      <div className="relative">
        <select
          id={id}
          className={cn(
            'w-full h-11 bg-bg-card border border-border rounded-input text-white transition-all duration-200 focus:outline-none focus:border-primary-500/60 focus:shadow-[0_0_0_3px_rgba(109,91,255,.12)] appearance-none cursor-pointer pl-4 pr-10',
            error && 'border-danger/60 focus:border-danger',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

interface ITextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export function Textarea({ label, error, hint, containerClassName, className = '', id, ...rest }: ITextareaProps) {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>}
      <textarea
        id={id}
        className={cn(
          'w-full min-h-[80px] bg-bg-card border border-border rounded-input text-white px-4 py-3 placeholder:text-white/30 transition-all duration-200 focus:outline-none focus:border-primary-500/60 focus:shadow-[0_0_0_3px_rgba(109,91,255,.12)] resize-y',
          error && 'border-danger/60',
          className,
        )}
        {...rest}
      />
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

interface IToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: IToggleProps) {
  return (
    <div className="flex items-center justify-between">
      {label && <label className="text-sm font-medium text-white/80">{label}</label>}
      <button type="button" onClick={() => onChange(!checked)} className={cn('relative h-7 w-12 rounded-full transition-colors', checked ? 'bg-primary-500' : 'bg-white/10')}>
        <motion.span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white', checked ? 'left-6' : 'left-1')} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
      </button>
    </div>
  );
}
