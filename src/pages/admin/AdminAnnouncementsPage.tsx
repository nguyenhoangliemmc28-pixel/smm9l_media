import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Megaphone, Bell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea, Select } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAnnouncements, saveAnnouncement, deleteAnnouncement, broadcastNotification } from '@/lib/admin';
import { formatDate } from '@/lib/utils';
import type { IAnnouncement } from '@/lib/types';

const emptyForm = { title: '', content: '', type: 'INFO', status: 'ACTIVE', starts_at: '', ends_at: '' };

export function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IAnnouncement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', content: '', type: 'INFO' });
  const [broadcasting, setBroadcasting] = useState(false);

  const { data: announcements, loading, refetch } = useQuery(() => fetchAnnouncements(), []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a: IAnnouncement) => { setEditing(a); setForm({ title: a.title, content: a.content, type: a.type, status: a.status, starts_at: a.starts_at ? a.starts_at.slice(0, 16) : '', ends_at: a.ends_at ? a.ends_at.slice(0, 16) : '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast('Vui lòng nhập tiêu đề và nội dung', 'error'); return; }
    setSaving(true);
    try { await saveAnnouncement({ ...form, id: editing?.id }); toast(editing ? 'Đã cập nhật' : 'Đã tạo thông báo', 'success'); setModalOpen(false); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { try { await deleteAnnouncement(id); toast('Đã xóa', 'success'); refetch(); } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); } };

  const handleBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.content) { toast('Vui lòng nhập đủ', 'error'); return; }
    setBroadcasting(true);
    try { await broadcastNotification(broadcastForm.title, broadcastForm.content, broadcastForm.type); toast('Đã gửi thông báo toàn hệ thống', 'success'); setBroadcastOpen(false); setBroadcastForm({ title: '', content: '', type: 'INFO' }); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setBroadcasting(false); }
  };

  const typeTone: Record<string, 'info' | 'success' | 'warning' | 'danger'> = { INFO: 'info', SUCCESS: 'success', WARNING: 'warning', ERROR: 'danger' };

  return (
    <div className="space-y-5">
      <PageHeader title="Thông báo" subtitle={`${announcements?.length ?? 0} thông báo`} action={<div className="flex gap-2"><Button variant="secondary" leftIcon={<Bell className="h-4 w-4" />} onClick={() => setBroadcastOpen(true)}>Gửi toàn hệ thống</Button><Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Tạo thông báo</Button></div>} />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-card" />)}</div>
      ) : (announcements ?? []).length === 0 ? (
        <Card><EmptyState icon={Megaphone} title="Chưa có thông báo" /></Card>
      ) : (
        <div className="space-y-3">
          {(announcements ?? []).map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2"><Badge tone={typeTone[a.type] ?? 'info'} size="sm">{a.type}</Badge><Badge tone={a.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" dot>{a.status}</Badge></div>
                    <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-text-dim mt-2">{formatDate(a.created_at)}</p>
                  </div>
                  <div className="flex gap-1"><button onClick={() => openEdit(a)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]"><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteId(a.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button></div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa thông báo' : 'Tạo thông báo'} size="lg">
        <div className="space-y-4">
          <Input label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Nội dung" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-4"><Select label="Loại" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="INFO">Info</option><option value="SUCCESS">Success</option><option value="WARNING">Warning</option><option value="ERROR">Error</option></Select><Select label="Trạng thái" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></div>
          <div className="grid sm:grid-cols-2 gap-4"><Input label="Bắt đầu (tùy chọn)" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /><Input label="Kết thúc (tùy chọn)" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button><Button loading={saving} onClick={handleSave}>{editing ? 'Lưu' : 'Tạo'}</Button></div>
        </div>
      </Modal>

      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Gửi thông báo toàn hệ thống" size="md">
        <div className="space-y-4">
          <Input label="Tiêu đề" value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} />
          <Textarea label="Nội dung" value={broadcastForm.content} onChange={(e) => setBroadcastForm({ ...broadcastForm, content: e.target.value })} />
          <Select label="Loại" value={broadcastForm.type} onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}><option value="INFO">Info</option><option value="SUCCESS">Success</option><option value="WARNING">Warning</option><option value="ERROR">Error</option></Select>
          <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" onClick={() => setBroadcastOpen(false)}>Hủy</Button><Button loading={broadcasting} onClick={handleBroadcast}>Gửi</Button></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && handleDelete(deleteId)} title="Xóa thông báo" message="Xóa thông báo này?" confirmLabel="Xóa" danger />
    </div>
  );
}
