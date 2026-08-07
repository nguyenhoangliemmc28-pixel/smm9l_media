import type { ReactNode } from 'react';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
type Size = 'sm' | 'md';

interface IBadgeProps {
  tone?: Tone;
  size?: Size;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-white/5 text-white/70 border-border',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const dotColors: Record<Tone, string> = {
  primary: 'bg-primary-400', accent: 'bg-accent', success: 'bg-success',
  warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-white/40', info: 'bg-blue-400',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ tone = 'neutral', size = 'md', dot, className, children }: IBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border font-medium', toneClasses[tone], sizeClasses[size], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[tone])} />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { tone: Tone; label: string }> = {
    PENDING: { tone: 'warning', label: 'Chờ xử lý' },
    PROCESSING: { tone: 'primary', label: 'Đang chạy' },
    COMPLETED: { tone: 'success', label: 'Hoàn thành' },
    PARTIAL: { tone: 'accent', label: 'Một phần' },
    CANCELED: { tone: 'neutral', label: 'Đã hủy' },
    REFUNDED: { tone: 'accent', label: 'Đã hoàn tiền' },
    FAILED: { tone: 'danger', label: 'Lỗi' },
    PAUSED: { tone: 'warning', label: 'Tạm dừng' },
  };
  const { tone, label } = map[status] ?? { tone: 'neutral' as Tone, label: status };
  return <Badge tone={tone}>{label}</Badge>;
}
