import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Server, Wifi, Download, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea, Select } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchProviders, createProvider, updateProvider, deleteProvider, testProviderConnection, importProviderServices, syncProviderPrices } from '@/lib/admin';
import type { IProvider } from '@/lib/types';

const emptyForm = { name: '', api_url: '', api_key: '', status: 'ACTIVE', description: '' };

export function AdminProvidersPage() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IProvider | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: providers, loading, refetch } = useQuery(() => fetchProviders(), []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: IProvider) => { setEditing(p); setForm({ name: p.name, api_url: p.api_url, api_key: p.api_key, status: p.status, description: p.description ?? '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.api_url || !form.api_key) { toast('Vui lòng nhập đủ thông tin', 'error'); return; }
    setSaving(true);
    try {
      if (editing) await updateProvider(editing.id, form.name, form.api_url, form.api_key, form.status, form.description);
      else await createProvider(form.name, form.api_url, form.api_key, form.description);
      toast(editing ? 'Đã cập nhật provider' : 'Đã tạo provider', 'success');
      setModalOpen(false); refetch();
    } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteProvider(id); toast('Đã xóa provider', 'success'); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
  };

  const testConnection = async (p: IProvider) => {
    setTesting(p.id);
    try {
      const result = await testProviderConnection(p.id);
      if (result.success) toast(result.message ?? `Kết nối thành công: ${p.name}`, 'success');
      else toast(result.message ?? 'Kết nối thất bại', 'error');
    } catch (e: any) { toast(e.message ?? 'Không thể kết nối', 'error'); }
    finally { setTesting(null); }
  };

  const handleImport = async (p: IProvider) => {
    setImporting(p.id);
    try {
      const result = await importProviderServices(p.id);
      if (result.success) toast(`Đã import ${result.imported ?? 0} dịch vụ mới`, 'success');
      else toast(result.message ?? 'Import thất bại', 'error');
    } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setImporting(null); }
  };

  const handleSyncPrices = async (p: IProvider) => {
    setSyncing(p.id);
    try {
      const result = await syncProviderPrices(p.id);
      if (result.success) toast(`Đã đồng bộ giá ${result.synced ?? 0} dịch vụ`, 'success');
      else toast(result.message ?? 'Đồng bộ thất bại', 'error');
    } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setSyncing(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý Provider" subtitle={`${providers?.length ?? 0} nhà cung cấp`} action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Thêm provider</Button>} />

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-card" />)}</div>
      ) : (providers ?? []).length === 0 ? (
        <Card><EmptyState icon={Server} title="Chưa có provider" description="Thêm nhà cung cấp API đầu tiên" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(providers ?? []).map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/10 flex items-center justify-center"><Server className="h-5 w-5 text-primary-300" /></div>
                    <div><h3 className="text-sm font-semibold text-white">{p.name}</h3><Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" dot>{p.status}</Badge></div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteId(p.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-text-muted"><span className="text-text-dim">URL:</span> <code className="truncate flex-1 text-text">{p.api_url}</code></div>
                  <div className="flex items-center gap-2 text-text-muted"><span className="text-text-dim">Key:</span> <code className="truncate flex-1 text-text">{p.api_key.slice(0, 8)}••••••</code></div>
                  {p.description && <p className="text-text-muted pt-1">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" loading={testing === p.id} leftIcon={<Wifi className="h-3.5 w-3.5" />} onClick={() => testConnection(p)}>Test</Button>
                  <Button variant="ghost" size="sm" loading={importing === p.id} leftIcon={<Download className="h-3.5 w-3.5" />} onClick={() => handleImport(p)}>Import</Button>
                  <Button variant="ghost" size="sm" loading={syncing === p.id} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => handleSyncPrices(p)}>Sync</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa provider' : 'Thêm provider'} size="lg">
        <div className="space-y-4">
          <Input label="Tên provider" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="API URL" value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://api.provider.com/v2" />
          <Input label="API Key" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
          <Select label="Trạng thái" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
          <Textarea label="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button><Button loading={saving} onClick={handleSave}>{editing ? 'Lưu' : 'Tạo'}</Button></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && handleDelete(deleteId)} title="Xóa provider" message="Xóa provider này? Dịch vụ liên quan sẽ mất liên kết." confirmLabel="Xóa" danger />
    </div>
  );
}
