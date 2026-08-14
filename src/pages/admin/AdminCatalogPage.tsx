import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/Table';

type Cat = any;
type Svc = any;

const emptyCat = { code_number: '', title: '', description: '', icon: '', icon_glow_color: '#3b82f6', status: true, slug: '', sort_order: 0 };
const emptySvc = { category_id: '', platform: 'FACEBOOK', sub_category_type: '', name: '', description: '', icon: '', price: 0, min_qty: 0, max_qty: 1000, badges: '', is_available: true, sort_order: 0 };

export function AdminCatalogPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [cat, setCat] = useState<any>({ ...emptyCat });
  const [svc, setSvc] = useState<any>({ ...emptySvc });
  const [editCat, setEditCat] = useState<string | null>(null);
  const [editSvc, setEditSvc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const [categoriesResult, servicesResult] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('services').select('*').order('sort_order'),
    ]);
    if (categoriesResult.error || servicesResult.error) {
      setError(categoriesResult.error?.message ?? servicesResult.error?.message ?? 'Không thể tải catalog');
      return;
    }
    setCats(categoriesResult.data ?? []);
    setSvcs(servicesResult.data ?? []);
  };

  useEffect(() => { void load(); }, []);

  const saveCategory = async () => {
    setSaving(true); setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('admin_save_category', {
        p_id: editCat, p_code_number: cat.code_number, p_title: cat.title, p_description: cat.description,
        p_icon: cat.icon, p_icon_glow_color: cat.icon_glow_color, p_status: cat.status,
        p_slug: cat.slug || null, p_sort_order: Number(cat.sort_order) || 0,
      });
      if (rpcError) throw rpcError;
      setCat({ ...emptyCat }); setEditCat(null); await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu danh mục');
    } finally { setSaving(false); }
  };

  const saveService = async () => {
    setSaving(true); setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('admin_save_subservice', {
        p_id: editSvc, p_category_id: svc.category_id, p_platform: svc.platform,
        p_sub_category_type: svc.sub_category_type, p_name: svc.name, p_description: svc.description,
        p_icon: svc.icon, p_price: Number(svc.price) || 0, p_min_qty: Number(svc.min_qty) || 0,
        p_max_qty: Number(svc.max_qty) || 0,
        p_badges: String(svc.badges ?? '').split(',').map((x: string) => x.trim()).filter(Boolean),
        p_is_available: svc.is_available, p_sort_order: Number(svc.sort_order) || 0,
      });
      if (rpcError) throw rpcError;
      setSvc({ ...emptySvc }); setEditSvc(null); await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu dịch vụ');
    } finally { setSaving(false); }
  };

  const deleteCategory = async (id: string) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_delete_category', { p_id: id });
    if (rpcError) { setError(rpcError.message); return; }
    await load();
  };

  const deleteService = async (id: string) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_delete_subservice', { p_id: id });
    if (rpcError) { setError(rpcError.message); return; }
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Catalog 2 cấp" subtitle="Quản lý động Module Hub và dịch vụ con" />
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex justify-between"><h2 className="font-bold">Danh mục chính</h2><Button size="sm" onClick={() => { setCat({ ...emptyCat }); setEditCat(null); }}><Plus className="h-4 w-4" /> Thêm</Button></div>
          <div className="grid gap-3">
            <Input label="Số thứ tự" value={cat.code_number} onChange={e => setCat({ ...cat, code_number: e.target.value })} />
            <Input label="Tên danh mục" value={cat.title} onChange={e => setCat({ ...cat, title: e.target.value })} />
            <Input label="Slug" value={cat.slug} onChange={e => setCat({ ...cat, slug: e.target.value })} />
            <Textarea label="Mô tả" value={cat.description} onChange={e => setCat({ ...cat, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3"><Input label="Icon" value={cat.icon} onChange={e => setCat({ ...cat, icon: e.target.value })} /><Input label="Màu Glow" value={cat.icon_glow_color} onChange={e => setCat({ ...cat, icon_glow_color: e.target.value })} /></div>
            <Input label="Sort order" type="number" value={cat.sort_order} onChange={e => setCat({ ...cat, sort_order: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cat.status} onChange={e => setCat({ ...cat, status: e.target.checked })} /> OPEN</label>
            <Button disabled={saving} onClick={saveCategory}><Save className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu danh mục'}</Button>
          </div>
          <div className="mt-6 space-y-2">{cats.map(c => <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/[.06] p-3"><div><b>{c.code_number || '--'} · {c.name ?? c.title}</b><div className="text-xs text-text-dim">/{c.slug}</div></div><div className="flex gap-1"><button className="p-2" onClick={() => { setEditCat(c.id); setCat({ ...emptyCat, ...c, title: c.name ?? c.title ?? '' }); }}><Pencil className="h-4 w-4" /></button><button className="p-2 text-danger" onClick={() => void deleteCategory(c.id)}><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex justify-between"><h2 className="font-bold">Dịch vụ con</h2><Button size="sm" onClick={() => { setSvc({ ...emptySvc }); setEditSvc(null); }}><Plus className="h-4 w-4" /> Thêm</Button></div>
          <div className="grid gap-3">
            <Select label="Danh mục" value={svc.category_id} onChange={e => setSvc({ ...svc, category_id: e.target.value })}><option value="">Chọn module...</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name ?? c.title}</option>)}</Select>
            <Select label="Nền tảng" value={svc.platform} onChange={e => setSvc({ ...svc, platform: e.target.value })}>{['FACEBOOK', 'TIKTOK', 'INSTAGRAM', 'YOUTUBE', 'TELEGRAM', 'SPOTIFY', 'WHATSAPP', 'BIGO', 'THREADS'].map(p => <option key={p}>{p}</option>)}</Select>
            <Input label="Nhóm dịch vụ" value={svc.sub_category_type} onChange={e => setSvc({ ...svc, sub_category_type: e.target.value })} />
            <Input label="Tên dịch vụ" value={svc.name} onChange={e => setSvc({ ...svc, name: e.target.value })} />
            <Textarea label="Mô tả" value={svc.description} onChange={e => setSvc({ ...svc, description: e.target.value })} />
            <div className="grid grid-cols-3 gap-3"><Input label="Giá" type="number" value={svc.price} onChange={e => setSvc({ ...svc, price: e.target.value })} /><Input label="Min" type="number" value={svc.min_qty} onChange={e => setSvc({ ...svc, min_qty: e.target.value })} /><Input label="Max" type="number" value={svc.max_qty} onChange={e => setSvc({ ...svc, max_qty: e.target.value })} /></div>
            <Input label="Badges (HOT,MỚI)" value={svc.badges} onChange={e => setSvc({ ...svc, badges: e.target.value })} /><Input label="Icon" value={svc.icon} onChange={e => setSvc({ ...svc, icon: e.target.value })} /><Input label="Sort order" type="number" value={svc.sort_order} onChange={e => setSvc({ ...svc, sort_order: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={svc.is_available} onChange={e => setSvc({ ...svc, is_available: e.target.checked })} /> Hiển thị</label>
            <Button disabled={saving} onClick={saveService}><Save className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu dịch vụ'}</Button>
          </div>
          <div className="mt-6 space-y-2">{svcs.map(s => <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/[.06] p-3"><div><b>{s.name}</b><div className="text-xs text-text-dim">{s.platform} · {s.sub_category_type || 'Dịch vụ'} · {Number(s.price).toLocaleString('vi-VN')}₫</div></div><div className="flex gap-1"><button className="p-2" onClick={() => { setEditSvc(s.id); setSvc({ ...emptySvc, ...s, badges: Array.isArray(s.badges) ? s.badges.join(',') : String(s.badges ?? '') }); }}><Pencil className="h-4 w-4" /></button><button className="p-2 text-danger" onClick={() => void deleteService(s.id)}><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
        </Card>
      </div>
    </div>
  );
}
