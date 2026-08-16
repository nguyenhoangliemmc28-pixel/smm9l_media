import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Server, Wifi, Download, RefreshCw, Activity, ShieldCheck, ExternalLink, DollarSign, KeyRound } from 'lucide-react';
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
  const list = providers ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: IProvider) => {
    setEditing(p);
    setForm({ name: p.name, api_url: p.api_url, api_key: '', status: p.status, description: p.description ?? '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.api_url.trim()) {
      toast('Vui lòng nhập tên và API URL', 'error');
      return;
    }
    if (!editing && !form.api_key.trim()) {
      toast('Vui lòng nhập API key', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // An empty API key intentionally preserves the encrypted/hidden provider credential server-side.
        await updateProvider(editing.id, form.name, form.api_url, form.api_key, form.status, form.description);
      } else {
        await createProvider(form.name, form.api_url, form.api_key, form.description);
      }
      toast(editing ? 'Đã cập nhật provider' : 'Đã tạo provider', 'success');
      setModalOpen(false);
      refetch();
    } catch (e: any) {
      toast(e.message ?? 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProvider(id);
      toast('Đã xóa provider', 'success');
      refetch();
    } catch (e: any) {
      toast(e.message ?? 'Lỗi', 'error');
    }
  };

  const testConnection = async (p: IProvider) => {
    setTesting(p.id);
    try {
      const r = await testProviderConnection(p.id);
      r.success ? toast(r.message ?? `Kết nối ${p.name} thành công`, 'success') : toast(r.message ?? 'Kết nối thất bại', 'error');
    } catch (e: any) {
      toast(e.message ?? 'Không thể kết nối', 'error');
    } finally {
      setTesting(null);
    }
  };

  const handleImport = async (p: IProvider) => {
    setImporting(p.id);
    try {
      const r = await importProviderServices(p.id);
      r.success ? toast(`Đã import ${r.imported ?? 0} dịch vụ`, 'success') : toast(r.message ?? 'Import thất bại', 'error');
      if (r.success) refetch();
    } catch (e: any) {
      toast(e.message ?? 'Lỗi', 'error');
    } finally {
      setImporting(null);
    }
  };

  const handleSyncPrices = async (p: IProvider) => {
    setSyncing(p.id);
    try {
      const r = await syncProviderPrices(p.id);
      r.success ? toast(`Đã đồng bộ ${r.synced ?? 0} giá dịch vụ`, 'success') : toast(r.message ?? 'Đồng bộ thất bại', 'error');
      if (r.success) refetch();
    } catch (e: any) {
      toast(e.message ?? 'Lỗi', 'error');
    } finally {
      setSyncing(null);
    }
  };

  const active = list.filter(p => p.status === 'ACTIVE').length;

  return <div className="space-y-6">
    <PageHeader title="Quản lý Provider" subtitle="Kết nối và điều khiển các nhà cung cấp dịch vụ API" action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Thêm provider</Button>} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-primary-500/10 flex items-center justify-center"><Server className="h-4 w-4 text-primary-300"/></div><div><div className="text-xs text-text-dim">Tổng provider</div><div className="text-xl font-bold text-white">{list.length}</div></div></div></Card>
      <Card className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center"><Activity className="h-4 w-4 text-success-400"/></div><div><div className="text-xs text-text-dim">Đang hoạt động</div><div className="text-xl font-bold text-white">{active}</div></div></div></Card>
      <Card className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-warning/10 flex items-center justify-center"><DollarSign className="h-4 w-4 text-warning-400"/></div><div><div className="text-xs text-text-dim">Đồng bộ</div><div className="text-sm font-semibold text-white mt-1">Sẵn sàng</div></div></div></Card>
      <Card className="p-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-secondary-500/10 flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-secondary-300"/></div><div><div className="text-xs text-text-dim">Credential</div><div className="text-sm font-semibold text-white mt-1">Không hiển thị</div></div></div></Card>
    </div>

    {loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton h-64 rounded-card"/>)}</div> : list.length===0 ? <Card><EmptyState icon={Server} title="Chưa có provider" description="Thêm nhà cung cấp API đầu tiên để bắt đầu đồng bộ dịch vụ." /></Card> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {list.map((p,i)=><motion.div key={p.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.04}} whileHover={{y:-3}}>
        <Card hover className="p-5 h-full flex flex-col overflow-hidden relative">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary-500/5 blur-2xl"/>
          <div className="relative flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/10 border border-primary-500/15 flex items-center justify-center"><Server className="h-5 w-5 text-primary-300"/></div><div><h3 className="text-sm font-semibold text-white">{p.name}</h3><Badge tone={p.status==='ACTIVE'?'success':'neutral'} size="sm" dot>{p.status==='ACTIVE'?'ONLINE':'OFFLINE'}</Badge></div></div><div className="flex gap-1"><button onClick={()=>openEdit(p)} aria-label={`Sửa ${p.name}`} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[.06]"><Pencil className="h-4 w-4"/></button><button onClick={()=>setDeleteId(p.id)} aria-label={`Xóa ${p.name}`} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4"/></button></div></div>
          <div className="mt-4 rounded-xl border border-border bg-bg-soft/40 p-3 space-y-2.5"><div className="flex items-center gap-2 text-xs"><span className="text-text-dim w-12">URL</span><code className="truncate flex-1 text-text-muted">{p.api_url}</code><a href={p.api_url} target="_blank" rel="noreferrer" aria-label={`Mở API ${p.name}`} className="text-text-dim hover:text-primary-300"><ExternalLink className="h-3.5 w-3.5"/></a></div><div className="flex items-center gap-2 text-xs"><KeyRound className="h-3.5 w-3.5 text-text-dim"/><span className="text-text-dim">API key</span><span className="text-success-400">Đã lưu an toàn</span></div></div>
          {p.description&&<p className="mt-3 text-xs leading-5 text-text-muted line-clamp-2">{p.description}</p>}
          <div className="mt-auto flex flex-wrap gap-2 pt-4"><Button variant="outline" size="sm" loading={testing===p.id} leftIcon={<Wifi className="h-3.5 w-3.5"/>} onClick={()=>testConnection(p)}>Kiểm tra</Button><Button variant="ghost" size="sm" loading={importing===p.id} leftIcon={<Download className="h-3.5 w-3.5"/>} onClick={()=>handleImport(p)}>Import</Button><Button variant="ghost" size="sm" loading={syncing===p.id} leftIcon={<RefreshCw className="h-3.5 w-3.5"/>} onClick={()=>handleSyncPrices(p)}>Sync giá</Button></div>
        </Card>
      </motion.div>)}
    </div>}

    <Card className="p-5 border-primary-500/15 bg-gradient-to-r from-primary-500/[.04] to-secondary-500/[.03]"><div className="flex flex-col md:flex-row md:items-center gap-4"><div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0"><ShieldCheck className="h-5 w-5 text-primary-300"/></div><div><h3 className="text-sm font-semibold text-white">Provider API được xử lý qua server</h3><p className="text-xs text-text-muted mt-1">API key không được tải về trình duyệt. Test, Import và Sync đi qua Edge Function; khi sửa provider, để trống API key sẽ giữ nguyên credential hiện tại.</p></div></div></Card>

    <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Sửa provider':'Thêm provider'} size="lg"><div className="space-y-4"><Input label="Tên provider" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="VD: Provider 01"/><Input label="API URL" value={form.api_url} onChange={e=>setForm({...form,api_url:e.target.value})} placeholder="https://api.provider.com/v2"/><Input label="API Key" type="password" value={form.api_key} onChange={e=>setForm({...form,api_key:e.target.value})} placeholder={editing?'Để trống để giữ API key hiện tại':'Nhập API key'}/>{editing&&<p className="-mt-2 text-xs text-text-dim">Credential hiện tại không được trả về giao diện. Chỉ nhập key mới nếu muốn thay key.</p>}<Select label="Trạng thái" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select><Textarea label="Mô tả" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ghi chú provider..."/><div className="flex justify-end gap-3 pt-2"><Button variant="secondary" onClick={()=>setModalOpen(false)}>Hủy</Button><Button loading={saving} onClick={handleSave}>{editing?'Lưu thay đổi':'Tạo provider'}</Button></div></div></Modal>
    <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={()=>deleteId&&handleDelete(deleteId)} title="Xóa provider" message="Xóa provider này? Hãy đảm bảo không còn service quan trọng đang phụ thuộc." confirmLabel="Xóa provider" danger />
  </div>;
}
