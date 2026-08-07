import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAllCategories, saveCategory, deleteCategory } from '@/lib/admin';
import type { ICategory } from '@/lib/types';

const emptyForm = { name: '', slug: '', icon: '', color: '#6D5BFF', sort_order: 0, status: true };

export function AdminCategoriesPage() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ICategory | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, loading, refetch } = useQuery(() => fetchAllCategories(), []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: ICategory) => { setEditing(c); setForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', color: c.color ?? '#6D5BFF', sort_order: c.sort_order, status: c.status }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast('Vui lòng nhập tên và slug', 'error'); return; }
    setSaving(true);
    try { await saveCategory({ ...form, id: editing?.id }); toast(editing ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục', 'success'); setModalOpen(false); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCategory(id); toast('Đã xóa danh mục', 'success'); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý danh mục" subtitle={`${categories?.length ?? 0} danh mục`} action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Thêm danh mục</Button>} />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : (categories ?? []).length === 0 ? (
          <EmptyState icon={FolderTree} title="Chưa có danh mục" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                  <th className="font-medium py-3 px-4">Tên</th><th className="font-medium py-3 px-4">Slug</th><th className="font-medium py-3 px-4">Màu</th><th className="font-medium py-3 px-4">Thứ tự</th><th className="font-medium py-3 px-4">Trạng thái</th><th className="font-medium py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {(categories ?? []).map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                    <td className="py-3 px-4"><div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (c.color ?? '#6D5BFF') + '20' }}><div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color ?? '#6D5BFF' }} /></div><span className="text-white font-medium">{c.name}</span></div></td>
                    <td className="py-3 px-4 text-text-muted font-mono text-xs">{c.slug}</td>
                    <td className="py-3 px-4"><code className="text-xs text-text-muted">{c.color}</code></td>
                    <td className="py-3 px-4 text-text-muted">{c.sort_order}</td>
                    <td className="py-3 px-4"><Badge tone={c.status ? 'success' : 'neutral'} size="sm" dot>{c.status ? 'Active' : 'Off'}</Badge></td>
                    <td className="py-3 px-4"><div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(c)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]"><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteId(c.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button></div></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa danh mục' : 'Thêm danh mục'} size="md">
        <div className="space-y-4">
          <Input label="Tên danh mục" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} hint="VD: facebook, tiktok" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Icon (Lucide)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            <div><label className="block text-sm font-medium text-white/80 mb-1.5">Màu</label><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-11 rounded-input border border-border bg-bg-card cursor-pointer" /></div>
          </div>
          <Input label="Thứ tự sắp xếp" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          <Toggle checked={form.status} onChange={(v) => setForm({ ...form, status: v })} label="Hoạt động" />
          <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button><Button loading={saving} onClick={handleSave}>{editing ? 'Lưu' : 'Tạo'}</Button></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && handleDelete(deleteId)} title="Xóa danh mục" message="Không thể xóa nếu danh mục đang có dịch vụ." confirmLabel="Xóa" danger />
    </div>
  );
}
