import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeUp?: boolean;
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  index?: number;
}

const toneStyles = {
  primary: { icon: 'from-primary-500/25 to-primary-500/5 text-primary-300', glow: 'from-primary-500/10' },
  accent: { icon: 'from-accent/25 to-accent/5 text-accent', glow: 'from-accent/10' },
  success: { icon: 'from-success/25 to-success/5 text-success', glow: 'from-success/10' },
  warning: { icon: 'from-warning/25 to-warning/5 text-warning', glow: 'from-warning/10' },
  danger: { icon: 'from-danger/25 to-danger/5 text-danger', glow: 'from-danger/10' },
};

export function StatCard({ label, value, icon: Icon, change, changeUp = true, tone = 'primary', index = 0 }: StatCardProps) {
  const s = toneStyles[tone];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.4 }} whileHover={{ y: -4 }} className="group relative rounded-card glass p-5 overflow-hidden transition-shadow hover:shadow-card-hover">
      <div className={cn('absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-0 group-hover:opacity-100 transition-opacity', s.glow)} />
      <div className="relative flex items-start justify-between mb-4">
        <div className={cn('h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center', s.icon)}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        {change && (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-md', changeUp ? 'text-success bg-success/10' : 'text-danger bg-danger/10')}>
            {changeUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {change}
          </span>
        )}
      </div>
      <div className="relative">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        <div className="text-sm text-white/50 mt-1">{label}</div>
      </div>
    </motion.div>
  );
}
