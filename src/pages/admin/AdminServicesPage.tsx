import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Copy, Star, ArrowUpDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select, Textarea, Toggle } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { TablePagination, EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAllServices, saveService, deleteService, duplicateService, fetchProviders } from '@/lib/admin';
import { fetchCategories } from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import type { IService, ICategory, IProvider } from '@/lib/types';

const PER_PAGE = 10;
type SortKey = 'name' | 'price' | 'sort_order' | 'created_at';

const emptyForm: Partial<IService> = {
  name: '', category_id: '', provider_id: null, description: '', price: 0, cost: 0,
  minimum: 1, maximum: 1000, refill: false, cancel: false, average_time: '', estimated_time: '',
  average_speed: '', featured: false, status: true, visibility: true, sort_order: 0, icon: '', tags: [], api_type: 'DEFAULT',
};

export function AdminServicesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IService | null>(null);
  const [form, setForm] = useState<Partial<IService>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const { data: services, loading, refetch } = useQuery(() => fetchAllServices(500, 0), []);
  const { data: categories } = useQuery(() => fetchCategories(), []);
  const { data: providers } = useQuery(() => fetchProviders(), []);

  const catMap = useMemo(() => {
    const m = new Map<string, string>();
    (categories ?? []).forEach((c: ICategory) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    let list = (services ?? []).slice();
    if (search) list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    if (categoryFilter !== 'all') list = list.filter((s) => s.category_id === categoryFilter);
    if (statusFilter !== 'all') list = list.filter((s) => (statusFilter === 'active' ? s.status : !s.status));
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'price') cmp = a.price - b.price;
      else if (sortKey === 'sort_order') cmp = a.sort_order - b.sort_order;
      else if (sortKey === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [services, search, categoryFilter, statusFilter, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setTagInput(''); setModalOpen(true); };
  const openEdit = (s: IService) => { setEditing(s); setForm({ ...s }); setTagInput((s.tags ?? []).join(', ')); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.category_id) { toast('Vui lòng nhập tên và danh mục', 'error'); return; }
    setSaving(true);
    try {
      const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
      await saveService({ ...form, tags, id: editing?.id });
      toast(editing ? 'Đã cập nhật dịch vụ' : 'Đã tạo dịch vụ mới', 'success');
      setModalOpen(false);
      refetch();
    } catch (e: any) { toast(e.message ?? 'Lỗi khi lưu', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteService(id); toast('Đã xóa dịch vụ', 'success'); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi khi xóa', 'error'); }
  };

  const handleDuplicate = async (id: string) => {
    try { await duplicateService(id); toast('Đã nhân bản dịch vụ', 'success'); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi khi nhân bản', 'error'); }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý dịch vụ" subtitle={`${filtered.length} dịch vụ`} action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Thêm dịch vụ</Button>} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input placeholder="Tìm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} containerClassName="w-40">
            <option value="all">Tất cả danh mục</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} containerClassName="w-36">
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm tắt</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : paginated.length === 0 ? (
          <EmptyState title="Chưa có dịch vụ" description="Tạo dịch vụ đầu tiên cho hệ thống" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                    <th className="font-medium py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('name')}><span className="inline-flex items-center gap-1">Tên <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="font-medium py-3 px-4">Danh mục</th>
                    <th className="font-medium py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('price')}><span className="inline-flex items-center gap-1">Giá <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="font-medium py-3 px-4">Min/Max</th>
                    <th className="font-medium py-3 px-4">Trạng thái</th>
                    <th className="font-medium py-3 px-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => (
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {s.featured && <Star className="h-3.5 w-3.5 text-warning fill-warning" />}
                          <div>
                            <div className="text-white font-medium">{s.name}</div>
                            {s.provider_name && <div className="text-xs text-text-dim">{s.provider_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-muted">{s.category_name ?? catMap.get(s.category_id) ?? '-'}</td>
                      <td className="py-3 px-4 text-white font-medium">{formatCurrency(s.price)}<span className="text-text-dim text-xs">/1000</span></td>
                      <td className="py-3 px-4 text-text-muted text-xs">{s.minimum} - {s.maximum}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <Badge tone={s.status ? 'success' : 'neutral'} size="sm" dot>{s.status ? 'Active' : 'Off'}</Badge>
                          {s.visibility ? <Badge tone="info" size="sm">Hiển thị</Badge> : <Badge tone="neutral" size="sm">Ẩn</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(s)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]" title="Sửa"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDuplicate(s.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]" title="Nhân bản"><Copy className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteId(s.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10" title="Xóa"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} perPage={PER_PAGE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'} size="xl">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Tên dịch vụ" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Icon (tên Lucide)" value={form.icon ?? ''} onChange={(e) => setForm({ ...form, icon: e.target.value })} hint="VD: Facebook, Music2" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Danh mục" value={form.category_id ?? ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Chọn danh mục...</option>
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Provider" value={form.provider_id ?? ''} onChange={(e) => setForm({ ...form, provider_id: e.target.value || null })}>
              <option value="">Không có provider</option>
              {(providers ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Giá (per 1000)" type="number" step="0.01" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            <Input label="Giá vốn" type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} />
            <Input label="Lợi nhuận" type="number" disabled value={((form.price ?? 0) - (form.cost ?? 0)).toFixed(2)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Số lượng tối thiểu" type="number" value={form.minimum ?? 1} onChange={(e) => setForm({ ...form, minimum: parseInt(e.target.value) || 1 })} />
            <Input label="Số lượng tối đa" type="number" value={form.maximum ?? 1000} onChange={(e) => setForm({ ...form, maximum: parseInt(e.target.value) || 1000 })} />
          </div>
          <Textarea label="Mô tả" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Thời gian ước tính" value={form.estimated_time ?? ''} onChange={(e) => setForm({ ...form, estimated_time: e.target.value })} placeholder="VD: 0-30 phút" />
            <Input label="Tốc độ trung bình" value={form.average_speed ?? ''} onChange={(e) => setForm({ ...form, average_speed: e.target.value })} placeholder="VD: 5000/ngày" />
            <Input label="Thời gian TB" value={form.average_time ?? ''} onChange={(e) => setForm({ ...form, average_time: e.target.value })} placeholder="VD: 0-1 giờ" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Tags (phân tách bằng dấu phẩy)" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="VD: cheap, fast, hq" />
            <Select label="API Type" value={form.api_type ?? 'DEFAULT'} onChange={(e) => setForm({ ...form, api_type: e.target.value })}>
              <option value="DEFAULT">Default</option><option value="CUSTOM">Custom</option><option value="SUBSCRIPTION">Subscription</option><option value="MENTIONS">Mentions</option><option value="COMMENT_LIKES">Comment Likes</option>
            </Select>
          </div>
          <Input label="Thứ tự sắp xếp" type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-bg-soft/40 border border-border">
            <Toggle checked={form.status ?? true} onChange={(v) => setForm({ ...form, status: v })} label="Hoạt động" />
            <Toggle checked={form.visibility ?? true} onChange={(v) => setForm({ ...form, visibility: v })} label="Hiển thị" />
            <Toggle checked={form.featured ?? false} onChange={(v) => setForm({ ...form, featured: v })} label="Nổi bật" />
            <Toggle checked={form.refill ?? false} onChange={(v) => setForm({ ...form, refill: v })} label="Hỗ trợ Refill" />
            <Toggle checked={form.cancel ?? false} onChange={(v) => setForm({ ...form, cancel: v })} label="Hỗ trợ Hủy" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button loading={saving} onClick={handleSave}>{editing ? 'Lưu thay đổi' : 'Tạo dịch vụ'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && handleDelete(deleteId)} title="Xóa dịch vụ" message="Bạn có chắc muốn xóa dịch vụ này? Hành động không thể hoàn tác." confirmLabel="Xóa" danger />
    </div>
  );
}
