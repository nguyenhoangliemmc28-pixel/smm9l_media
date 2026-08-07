import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Globe, Shield, Mail, Phone, Camera, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { changePassword, uploadAvatar, fetchNotificationPrefs, saveNotificationPrefs } from '@/lib/services';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'profile', label: 'Hồ sơ', icon: User },
  { key: 'security', label: 'Bảo mật', icon: Lock },
  { key: 'notifications', label: 'Thông báo', icon: Bell },
  { key: 'appearance', label: 'Giao diện', icon: Globe },
];

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ order: true, payment: true, ticket: true, news: false });
  const [notifLoading, setNotifLoading] = useState(false);

  // Language
  const [lang, setLang] = useState(profile?.language ?? 'vi');

  useEffect(() => {
    fetchNotificationPrefs().then(setNotifPrefs).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ username, phone, country }).eq('id', profile?.id);
    setSaving(false);
    if (error) toast('Cập nhật thất bại: ' + error.message, 'error');
    else { toast('Đã lưu thay đổi', 'success'); refreshProfile(); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('File quá lớn (tối đa 2MB)', 'error'); return; }
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      if (url) {
        await supabase.from('profiles').update({ avatar: url }).eq('id', profile?.id);
        setAvatarUrl(url);
        refreshProfile();
        toast('Đã cập nhật ảnh đại diện', 'success');
      }
    } catch (err: any) { toast(err.message ?? 'Upload thất bại', 'error'); }
    finally { setUploadingAvatar(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast('Mật khẩu phải tối thiểu 8 ký tự', 'error'); return; }
    if (newPassword !== confirmPassword) { toast('Mật khẩu xác nhận không khớp', 'error'); return; }
    setPasswordLoading(true);
    const result = await changePassword(newPassword);
    setPasswordLoading(false);
    if (result.success) { toast('Đã đổi mật khẩu thành công', 'success'); setNewPassword(''); setConfirmPassword(''); }
    else toast(result.message ?? 'Đổi mật khẩu thất bại', 'error');
  };

  const handleNotifPrefChange = (key: string, value: boolean) => {
    setNotifPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleSaveNotifPrefs = async () => {
    setNotifLoading(true);
    try { await saveNotificationPrefs(notifPrefs); toast('Đã lưu tùy chọn thông báo', 'success'); }
    catch (e: any) { toast(e.message ?? 'Lỗi khi lưu', 'error'); }
    finally { setNotifLoading(false); }
  };

  const handleSaveLanguage = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ language: lang }).eq('id', profile?.id);
    setSaving(false);
    if (error) toast('Lỗi khi lưu', 'error');
    else toast('Đã lưu ngôn ngữ', 'success');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-sm text-text-muted mt-1">Quản lý tài khoản và tùy chỉnh</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="p-3 h-fit lg:sticky lg:top-20">
          <div className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActive(t.key)} className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0', active === t.key ? 'bg-primary-500/15 text-primary-300' : 'text-text-muted hover:text-white hover:bg-white/[0.04]')}>
                <t.icon className="h-4 w-4" />{t.label}
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3">
          <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {active === 'profile' && (
              <Card className="p-6">
                <h3 className="text-base font-semibold text-white mb-5">Thông tin cá nhân</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-2xl font-bold text-white">
                        {profile?.username?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarUpload} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} className="absolute bottom-0 right-0 h-7 w-7 rounded-full glass-strong flex items-center justify-center text-text-muted hover:text-white disabled:opacity-50">
                      {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Ảnh đại diện</p>
                    <p className="text-xs text-text-dim">PNG, JPG tối đa 2MB</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)} />
                  <Input label="Email" value={profile?.email ?? ''} disabled leftIcon={<Mail className="h-4 w-4" />} />
                  <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone className="h-4 w-4" />} />
                  <Input label="Mã giới thiệu" value={profile?.referral_code ?? ''} disabled />
                  <Input label="Quốc gia" value={country} onChange={(e) => setCountry(e.target.value)} />
                  <Input label="Múi giờ" value={profile?.timezone ?? ''} disabled />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button loading={saving} onClick={handleSaveProfile}>Lưu thay đổi</Button>
                </div>
              </Card>
            )}

            {active === 'security' && (
              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-white mb-5">Đổi mật khẩu</h3>
                  <div className="space-y-4 max-w-md">
                    <Input label="Mật khẩu mới" type="password" leftIcon={<Lock className="h-4 w-4" />} hint="Tối thiểu 8 ký tự" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <Input label="Xác nhận mật khẩu" type="password" leftIcon={<Lock className="h-4 w-4" />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                  <div className="mt-6"><Button loading={passwordLoading} onClick={handleChangePassword}>Cập nhật mật khẩu</Button></div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Xác thực hai yếu tố (2FA)</h3>
                        <p className="text-sm text-text-muted">Bảo vệ tài khoản bằng mã TOTP</p>
                      </div>
                    </div>
                    <Badge tone="neutral" size="sm">Sắp ra mắt</Badge>
                  </div>
                </Card>
              </div>
            )}

            {active === 'notifications' && (
              <Card className="p-6">
                <h3 className="text-base font-semibold text-white mb-5">Tùy chọn thông báo</h3>
                <div className="space-y-1">
                  {([
                    ['order', 'Đơn hàng', 'Thông báo khi đơn hoàn thành, lỗi, hoặc bị hủy'],
                    ['payment', 'Thanh toán', 'Thông báo khi nạp tiền, hoàn tiền, hoa hồng'],
                    ['ticket', 'Ticket', 'Thông báo khi support trả lời ticket'],
                    ['news', 'Tin tức', 'Dịch vụ mới, khuyến mãi, cập nhật hệ thống'],
                  ] as const).map(([key, title, desc]) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-white">{title}</p>
                        <p className="text-xs text-text-dim">{desc}</p>
                      </div>
                      <button onClick={() => handleNotifPrefChange(key, !notifPrefs[key])} className={cn('relative h-7 w-12 rounded-full transition-colors', notifPrefs[key] ? 'bg-primary-500' : 'bg-white/10')}>
                        <motion.span layout className={cn('absolute top-1 h-5 w-5 rounded-full bg-white', notifPrefs[key] ? 'left-6' : 'left-1')} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button loading={notifLoading} onClick={handleSaveNotifPrefs}>Lưu tùy chọn</Button>
                </div>
              </Card>
            )}

            {active === 'appearance' && (
              <Card className="p-6">
                <h3 className="text-base font-semibold text-white mb-5">Giao diện</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Chủ đề</label>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <div className={cn('relative p-4 rounded-xl border-2 border-primary-500')}>
                        <div className="h-16 rounded-lg mb-2 bg-bg-card" />
                        <span className="text-sm font-medium text-white">Tối</span>
                        <Check className="absolute top-3 right-3 h-4 w-4 text-primary-300" />
                      </div>
                      <div className={cn('relative p-4 rounded-xl border-2 border-border opacity-50')}>
                        <div className="h-16 rounded-lg mb-2 bg-white" />
                        <span className="text-sm font-medium text-white">Sáng (sắp ra mắt)</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Ngôn ngữ</label>
                    <div className="flex gap-2 max-w-md">
                      {[{ key: 'vi', label: 'Tiếng Việt' }, { key: 'en', label: 'English' }].map((l) => (
                        <button key={l.key} onClick={() => setLang(l.key)} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium', lang === l.key ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'glass text-text-muted hover:text-white')}>
                          <Globe className="h-4 w-4" />{l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button loading={saving} onClick={handleSaveLanguage}>Lưu</Button>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
