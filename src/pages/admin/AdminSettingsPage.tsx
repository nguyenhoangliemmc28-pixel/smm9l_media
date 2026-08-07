import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Settings as SettingsIcon, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAllSettings, updateSetting, deleteSetting } from '@/lib/admin';
import { formatDate } from '@/lib/utils';
import type { ISetting } from '@/lib/types';

export function AdminSettingsPage() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: settings, loading, refetch } = useQuery(() => fetchAllSettings(), []);

  useEffect(() => {
    if (settings) {
      const m: Record<string, string> = {};
      settings.forEach((s) => { m[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value); });
      setValues(m);
    }
  }, [settings]);

  const handleSave = async (key: string) => {
    setSaving(key);
    try { let val: unknown = values[key]; try { val = JSON.parse(val as string); } catch { /* keep as string */ } await updateSetting(key, val); toast('Đã lưu cài đặt', 'success'); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setSaving(null); }
  };

  const handleAdd = async () => {
    if (!newKey) { toast('Vui lòng nhập key', 'error'); return; }
    setSaving(newKey);
    try { let val: unknown = newValue; try { val = JSON.parse(newValue); } catch { /* keep as string */ } await updateSetting(newKey, val); toast('Đã thêm cài đặt', 'success'); setNewKey(''); setNewValue(''); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setSaving(null); }
  };

  const handleDelete = async (key: string) => {
    setDeleting(key);
    try { await deleteSetting(key); toast('Đã xóa cài đặt', 'success'); setConfirmDelete(null); refetch(); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Cài đặt hệ thống" subtitle={`${settings?.length ?? 0} cấu hình`} />

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Thêm cài đặt mới</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input containerClassName="flex-1" placeholder="key (VD: site_name)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Input containerClassName="flex-1" placeholder='value (VD: "BoostHub" hoặc 15)' value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Button loading={saving === newKey} leftIcon={<Plus className="h-4 w-4" />} onClick={handleAdd}>Thêm</Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-card" />)}</div>
      ) : (settings ?? []).length === 0 ? (
        <Card><EmptyState icon={SettingsIcon} title="Chưa có cài đặt" /></Card>
      ) : (
        <div className="space-y-3">
          {(settings ?? []).map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="sm:w-48 shrink-0"><code className="text-sm font-mono font-medium text-primary-300">{s.key}</code><p className="text-xs text-text-dim mt-0.5">Cập nhật: {formatDate(s.updated_at)}</p></div>
                  <Input containerClassName="flex-1" value={values[s.key] ?? ''} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" loading={saving === s.key} leftIcon={<Save className="h-3.5 w-3.5" />} onClick={() => handleSave(s.key)}>Lưu</Button>
                    {confirmDelete === s.key ? (
                      <>
                        <Button variant="danger" size="sm" loading={deleting === s.key} onClick={() => handleDelete(s.key)}>Xóa</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Hủy</Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(s.key)}>Xóa</Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
