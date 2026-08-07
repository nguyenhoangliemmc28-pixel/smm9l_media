import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { sendPasswordResetEmail } from '@/lib/services';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    setError('');
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
      toast(signInError, 'error');
    } else {
      toast('Đăng nhập thành công!', 'success');
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary-500/20 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-card glass-strong shadow-card-hover p-7 sm:p-8">
          <Link to="/" className="flex justify-center mb-6">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-center">Đăng nhập</h1>
          <p className="mt-1 text-sm text-text-muted text-center">Chào mừng bạn quay lại</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="minhan@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Mật khẩu"
              name="password"
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="hover:text-white">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={error || undefined}
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                <input type="checkbox" className="accent-primary-500" />
                Ghi nhớ đăng nhập
              </label>
              <button type="button" onClick={() => { setForgotOpen(true); setResetSent(false); }} className="text-sm text-primary-300 hover:underline">Quên mật khẩu?</button>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              Đăng nhập
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary-300 font-medium hover:underline">
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setForgotOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-card glass-strong shadow-card-hover p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setForgotOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-xl font-bold text-white mb-1">Đặt lại mật khẩu</h2>
              <p className="text-sm text-text-muted mb-5">Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
              {resetSent ? (
                <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-sm text-success-300">
                  Email đặt lại mật khẩu đã được gửi đến <strong>{resetEmail}</strong>. Vui lòng kiểm tra hộp thư của bạn.
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resetEmail) { toast('Vui lòng nhập email', 'error'); return; }
                  setResetLoading(true);
                  const result = await sendPasswordResetEmail(resetEmail);
                  setResetLoading(false);
                  if (result.success) { setResetSent(true); toast('Email đặt lại mật khẩu đã được gửi', 'success'); }
                  else toast(result.message ?? 'Lỗi khi gửi email', 'error');
                }} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="minhan@gmail.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                  />
                  <Button type="submit" fullWidth loading={resetLoading} leftIcon={<Send className="h-4 w-4" />}>Gửi email đặt lại</Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
