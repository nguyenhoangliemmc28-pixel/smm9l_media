import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Hash, RefreshCw, XCircle, Clock, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchServices, fetchCategories, createOrder } from '@/lib/services';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import type { IService, ICategory } from '@/lib/types';

export function NewOrderPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { data: categories } = useQuery(() => fetchCategories(), []);
  const { data: services } = useQuery(() => fetchServices(), []);

  const catList = (categories ?? []) as ICategory[];
  const svcList = (services ?? []) as IService[];

  const [categoryId, setCategoryId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (catList.length > 0 && !categoryId) {
      setCategoryId(catList[0].id);
    }
  }, [catList, categoryId]);

  useEffect(() => {
    const filtered = svcList.filter((s) => s.category_id === categoryId);
    if (filtered.length > 0 && !serviceId) {
      setServiceId(filtered[0].id);
    }
  }, [categoryId, svcList, serviceId]);

  const categoryServices = svcList.filter((s) => s.category_id === categoryId);
  const service = svcList.find((s) => s.id === serviceId);

  const charge = useMemo(() => {
    if (!service) return 0;
    return (Number(service.price) * quantity) / 1000;
  }, [service, quantity]);

  const balance = profile?.balance ?? 0;
  const linkError = link && !link.match(/^https?:\/\/.+/) ? 'Link không hợp lệ. Phải bắt đầu bằng http(s)://' : '';
  const qtyError = quantity > 0 && service && (quantity < service.minimum || quantity > service.maximum)
    ? `Số lượng phải từ ${formatNumber(service.minimum)} đến ${formatNumber(service.maximum)}` : '';
  const balanceError = charge > balance ? 'Số dư không đủ. Vui lòng nạp tiền.' : '';
  const canSubmit = link && !linkError && !qtyError && !balanceError && quantity > 0 && service && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !service) return;
    setSubmitting(true);
    setSuccess(false);
    const result = await createOrder(service.id, link, quantity);
    setSubmitting(false);
    if (result.success) {
      setSuccess(true);
      toast('Đơn hàng đã được tạo thành công!', 'success');
      refreshProfile();
      setLink('');
      setQuantity(100);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      toast(result.message ?? 'Tạo đơn hàng thất bại', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tạo đơn hàng</h1>
        <p className="text-sm text-text-muted mt-1">Đặt đơn trong 5 giây, theo dõi realtime</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          {svcList.length === 0 ? (
            <div className="text-center py-12 text-text-muted">Đang tải dịch vụ...</div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Danh mục</label>
                <div className="flex flex-wrap gap-1.5">
                  {catList.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(c.id);
                        const first = svcList.find((s) => s.category_id === c.id);
                        setServiceId(first?.id ?? '');
                      }}
                      className={cn(
                        'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                        categoryId === c.id
                          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                          : 'glass text-text-muted hover:text-white',
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Dịch vụ</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full h-11 rounded-input bg-bg-soft/80 border border-border px-3.5 text-sm text-white focus:outline-none focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20"
                >
                  {categoryServices.map((s) => (
                    <option key={s.id} value={s.id} className="bg-bg-soft">
                      {s.name} — {formatCurrency(Number(s.price) * 1000)}/1000
                    </option>
                  ))}
                </select>
              </div>

              {service && (
                <div className="rounded-xl border border-border bg-bg-soft/40 p-4 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {service.refill && <Badge tone="success" size="sm"><RefreshCw className="h-3 w-3" /> Refill</Badge>}
                    {service.cancel && <Badge tone="danger" size="sm"><XCircle className="h-3 w-3" /> Cancel</Badge>}
                    {service.average_time && <Badge tone="neutral" size="sm"><Clock className="h-3 w-3" /> {service.average_time}</Badge>}
                  </div>
                  <p className="text-sm text-text-muted">{service.description ?? ''}</p>
                </div>
              )}

              <Input
                label="Link"
                name="link"
                placeholder="https://facebook.com/your-page"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                leftIcon={<Link2 className="h-4 w-4" />}
                error={linkError || undefined}
              />

              <Input
                label="Số lượng"
                name="quantity"
                type="number"
                placeholder="100"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                leftIcon={<Hash className="h-4 w-4" />}
                hint={service ? `Tối thiểu: ${formatNumber(service.minimum)} · Tối đa: ${formatNumber(service.maximum)}` : ''}
                error={qtyError || undefined}
              />

              {balanceError && (
                <div className="flex items-center gap-2 text-sm text-danger-400">
                  <AlertCircle className="h-4 w-4" />
                  {balanceError}
                </div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-success-400 rounded-lg bg-success/10 border border-success/30 px-3 py-2.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Đơn hàng đã được tạo thành công! Xem trong trang Đơn hàng.
                </motion.div>
              )}

              <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!canSubmit}>
                {charge > 0 ? `Đặt đơn — ${formatCurrency(charge)}` : 'Đặt đơn'}
              </Button>
            </form>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Tóm tắt đơn hàng</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Dịch vụ</span>
                <span className="text-white font-medium text-right">{service?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Giá / 1000</span>
                <span className="text-white font-medium">{service ? formatCurrency(Number(service.price) * 1000) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Số lượng</span>
                <span className="text-white font-medium">{formatNumber(quantity)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between">
                <span className="text-text-muted">Tổng phí</span>
                <span className="text-lg font-bold text-gradient-primary">{formatCurrency(charge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Số dư hiện tại</span>
                <span className="text-white font-medium">{formatCurrency(balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Số dư sau đơn</span>
                <span className="text-white font-medium">{formatCurrency(balance - charge)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Lưu ý</h3>
            <ul className="space-y-2 text-xs text-text-muted">
              <li>• Đảm bảo link chính xác trước khi đặt.</li>
              <li>• Số lượng phải nằm trong khoảng min/max.</li>
              <li>• Đơn được hoàn tiền nếu provider lỗi.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
