import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { box: 'h-7 w-7', icon: 'h-4 w-4', text: 'text-base' },
  md: { box: 'h-9 w-9', icon: 'h-5 w-5', text: 'text-lg' },
  lg: { box: 'h-11 w-11', icon: 'h-6 w-6', text: 'text-xl' },
};

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 shadow-glow', s.box)}>
        <Zap className={cn('text-white', s.icon)} strokeWidth={2.5} />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight text-white', s.text)}>
          Boost<span className="text-gradient-primary">Hub</span>
        </span>
      )}
    </div>
  );
}
