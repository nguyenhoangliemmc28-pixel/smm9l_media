import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface IPaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({ page, perPage, total, onPageChange }: IPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-xs text-text-dim">{Math.min((page - 1) * perPage + 1, total)}-{Math.min(page * perPage, total)} / {total}</p>
      <div className="flex gap-1">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text-muted hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Trước</button>
        <span className="px-3 py-1.5 text-sm text-white/70">{page} / {totalPages}</span>
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text-muted hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Sau</button>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description }: { icon?: typeof Inbox; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4"><Icon className="h-7 w-7 text-text-dim" strokeWidth={1.5} /></div>
      <p className="text-sm font-medium text-white/80">{title}</p>
      {description && <p className="text-xs text-text-dim mt-1 max-w-xs">{description}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
