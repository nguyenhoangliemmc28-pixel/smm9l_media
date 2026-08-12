import { useEffect, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchCategories } from '@/lib/services';
import type { ICategory } from '@/lib/types';
import { Card } from '@/components/ui/Card';

export function ModuleHubPage() {
  const [items, setItems] = useState<ICategory[]>([]);
  const navigate = useNavigate();
  useEffect(() => { fetchCategories().then(setItems).catch(() => setItems([])); }, []);
  return <div className="min-h-screen bg-[#050914] text-white px-4 py-10 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8"><div className="mb-2 flex items-center gap-2 text-primary-300 text-sm font-semibold"><Sparkles className="h-4 w-4"/> 9L MEDIA SERVICES</div><h1 className="text-3xl sm:text-4xl font-black tracking-tight">DỊCH VỤ & MODULE</h1><p className="mt-2 text-text-muted">Chọn module để khám phá hệ thống dịch vụ.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c, i) => <Card key={c.id} onClick={() => c.status && navigate(`/module/${c.slug}`)} className={`group relative overflow-hidden ${c.status ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} border-white/[.07] bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-primary-400/30 hover:shadow-[0_0_35px_rgba(59,130,246,.12)]`}>
          <div className="flex items-start justify-between"><div className="h-11 w-11 rounded-xl flex items-center justify-center text-primary-300 font-bold" style={{background:`${c.icon_glow_color || c.color || '#3b82f6'}22`}}>{c.icon || '✦'}</div><div className="flex items-center gap-2 text-xs"><span className={`rounded-full px-2 py-1 ${c.status ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-text-dim'}`}>{c.status ? 'OPEN' : 'CLOSED'}</span><span className="text-text-dim font-mono">{c.code_number || String(i + 1).padStart(2,'0')}</span></div></div>
          <div className="mt-7"><h2 className="text-lg font-black tracking-wide">{c.name.toUpperCase()}</h2><p className="mt-2 min-h-10 text-sm text-text-muted">{c.description || 'Khám phá các dịch vụ trong module này.'}</p></div>
          <div className="mt-6 flex items-center justify-between text-xs font-semibold"><span className="text-text-dim">ENTER MODULE</span><span className="flex items-center gap-1 text-primary-300 group-hover:text-white">KHÁM PHÁ <ArrowUpRight className="h-3.5 w-3.5"/></span></div>
        </Card>)}
      </div>
    </div>
  </div>;
}
