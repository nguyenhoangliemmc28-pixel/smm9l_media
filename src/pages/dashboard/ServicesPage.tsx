import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, RefreshCw, XCircle, Clock, ChevronRight } from 'lucide-react';
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
  const { data: categories } = useQuery(() => fetchCategories(), []);
  const { data: services, loading } = useQuery(() => fetchServices(), []);

  const catList = (categories ?? []) as ICategory[];
  const svcList = (services ?? []) as IService[];

  const filtered = useMemo(() => {
    return svcList.filter((s) => {
      const matchCat = activeCat === 'all' || s.category_id === activeCat;
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCat, svcList]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dịch vụ</h1>
        <p className="text-sm text-text-muted mt-1">{svcList.length} dịch vụ trên {catList.length} nền tảng</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Tìm theo tên dịch vụ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveCat('all')}
            className={cn(
              'shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
              activeCat === 'all'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'glass text-text-muted hover:text-white',
            )}
          >
            Tất cả
          </button>
          {catList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={cn(
                'shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                activeCat === cat.id
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'glass text-text-muted hover:text-white',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton rounded-card h-64" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <p>Không tìm thấy dịch vụ phù hợp</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i % 6) * 0.04 }}
              whileHover={{ y: -4 }}
            >
              <Card hover className="p-5 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-dim">#{s.id.slice(0, 6)}</span>
                    {s.featured && (
                      <Badge tone="warning" size="sm">
                        <Star className="h-3 w-3 fill-warning" /> Nổi bật
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-semibold text-white leading-snug">{s.name}</h3>
                <p className="mt-1 text-xs text-text-dim line-clamp-2">{s.description ?? ''}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-bg-soft/50 px-2.5 py-1.5">
                    <span className="text-text-dim">Tối thiểu</span>
                    <div className="font-semibold text-white">{formatNumber(s.minimum)}</div>
                  </div>
                  <div className="rounded-lg bg-bg-soft/50 px-2.5 py-1.5">
                    <span className="text-text-dim">Tối đa</span>
                    <div className="font-semibold text-white">{formatNumber(s.maximum)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.refill && (
                    <Badge tone="success" size="sm"><RefreshCw className="h-3 w-3" /> Refill</Badge>
                  )}
                  {s.cancel && (
                    <Badge tone="danger" size="sm"><XCircle className="h-3 w-3" /> Cancel</Badge>
                  )}
                  {s.average_time && (
                    <Badge tone="neutral" size="sm"><Clock className="h-3 w-3" /> {s.average_time}</Badge>
                  )}
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-dim">Giá / 1000</div>
                    <div className="text-lg font-bold text-gradient-primary">{formatCurrency(Number(s.price) * 1000)}</div>
                  </div>
                  <Button size="sm" onClick={() => navigate('/dashboard/new-order')}>
                    Đặt đơn
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
