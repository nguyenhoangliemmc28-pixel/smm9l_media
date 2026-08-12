import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, RefreshCw, XCircle, Clock, ChevronRight, Sparkles, SlidersHorizontal, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useQuery } from '@/lib/useQuery';
import { fetchServices, fetchCategories } from '@/lib/services';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import type { IService, ICategory } from '@/lib/types';

export function ServicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [copied, setCopied] = useState('');
  const { data: categories } = useQuery(() => fetchCategories(), []);
  const { data: services, loading } = useQuery(() => fetchServices(), []);
  const catList = (categories ?? []) as ICategory[];
  const svcList = (services ?? []) as IService[];
  const filtered = useMemo(() => svcList.filter(s => (activeCat === 'all' || s.category_id === activeCat) && s.name.toLowerCase().includes(search.toLowerCase())), [search, activeCat, svcList]);
  const copyId = async (id: string) => { await navigator.clipboard?.writeText(id); setCopied(id); setTimeout(() => setCopied(''), 1500); };

  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/10 via-bg-card to-secondary-500/10 p-5 sm:p-6">
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary-500/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-300 mb-2"><Sparkles className="h-3.5 w-3.5" /> 9L Media Services</div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Kho dịch vụ</h1><p className="text-sm text-text-muted mt-1.5">Tìm dịch vụ nhanh, xem giá và đặt đơn ngay trong một giao diện.</p></div>
        <div className="flex items-center gap-2 text-xs text-text-muted rounded-xl border border-border bg-bg-card/70 px-3 py-2"><SlidersHorizontal className="h-3.5 w-3.5" /> {svcList.length} dịch vụ · {catList.length} danh mục</div>
      </div>
    </div>

    <div className="sticky top-0 z-10 -mx-1 rounded-xl border border-border bg-bg-base/90 backdrop-blur-xl p-2 shadow-lg">
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="flex-1"><Input placeholder="Tìm dịch vụ, nền tảng hoặc từ khóa..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} /></div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">{[['all','Tất cả'], ...catList.map(c => [c.id,c.name])].map(([id,label]) => <button key={id} onClick={() => setActiveCat(id)} className={cn('shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all', activeCat === id ? 'bg-primary-500/15 text-primary-200 border-primary-500/40 shadow-glow' : 'bg-bg-card border-border text-text-muted hover:text-white hover:border-border-strong')}>{label}</button>)}</div>
      </div>
    </div>

    {loading ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({length:9}).map((_,i)=><div key={i} className="skeleton rounded-card h-72" />)}</div> : filtered.length === 0 ? <Card className="py-20 text-center"><Search className="h-8 w-8 mx-auto mb-3 text-text-dim" /><p className="text-white font-medium">Không tìm thấy dịch vụ</p><p className="text-sm text-text-muted mt-1">Thử từ khóa hoặc danh mục khác.</p></Card> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {filtered.map((s,i)=><motion.div key={s.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:(i%9)*.035}} whileHover={{y:-4}}>
        <Card hover className="p-5 h-full flex flex-col overflow-hidden relative">
          {s.featured && <div className="absolute right-0 top-0 rounded-bl-xl bg-warning/15 border-l border-b border-warning/20 px-2.5 py-1.5 text-[10px] font-semibold text-warning-300"><Star className="inline h-3 w-3 fill-current mr-1"/>NỔI BẬT</div>}
          <div className="flex items-center justify-between mb-3 pr-16"><div className="flex items-center gap-2"><div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 border border-primary-500/20 flex items-center justify-center text-primary-200 font-bold">{s.name.charAt(0).toUpperCase()}</div><div><div className="text-[10px] uppercase tracking-wider text-text-dim">Service ID</div><button onClick={()=>copyId(s.id)} className="flex items-center gap-1 font-mono text-xs text-primary-300 hover:text-white">#{s.id.slice(0,8)} {copied===s.id?<Check className="h-3 w-3 text-success-400"/>:<Copy className="h-3 w-3"/>}</button></div></div></div>
          <h3 className="text-[15px] font-semibold text-white leading-snug">{s.name}</h3>
          <p className="mt-1.5 text-xs leading-5 text-text-dim line-clamp-2 min-h-10">{s.description || 'Dịch vụ mạng xã hội chất lượng cao từ 9L Media.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-border bg-bg-soft/45 px-3 py-2"><div className="text-[10px] text-text-dim uppercase">Min</div><div className="text-sm font-semibold text-white mt-0.5">{formatNumber(s.minimum)}</div></div><div className="rounded-xl border border-border bg-bg-soft/45 px-3 py-2"><div className="text-[10px] text-text-dim uppercase">Max</div><div className="text-sm font-semibold text-white mt-0.5">{formatNumber(s.maximum)}</div></div></div>
          <div className="mt-3 flex flex-wrap gap-1.5">{s.refill&&<Badge tone="success" size="sm"><RefreshCw className="h-3 w-3"/> Refill</Badge>}{s.cancel&&<Badge tone="danger" size="sm"><XCircle className="h-3 w-3"/> Cancel</Badge>}{s.average_time&&<Badge tone="neutral" size="sm"><Clock className="h-3 w-3"/> {s.average_time}</Badge>}</div>
          <div className="mt-auto pt-5 flex items-end justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-text-dim">Giá từ</div><div className="text-xl font-bold text-gradient-primary">{formatCurrency(Number(s.price)*1000)}<span className="text-xs text-text-dim font-normal"> / 1K</span></div></div><Button size="sm" onClick={()=>{navigate('/dashboard/new-order');}} >Đặt đơn <ChevronRight className="h-3.5 w-3.5"/></Button></div>
        </Card>
      </motion.div>)}
    </div>}
  </div>;
}
