import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    setError('');
    const { error: signUpError } = await signUp(email, password, username);
    setLoading(false);
    if (signUpError) {
      setError(signUpError);
      toast(signUpError, 'error');
    } else {
      toast('Tài khoản đã tạo thành công! Vui lòng đăng nhập.', 'success');
      navigate('/login');
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
          <h1 className="text-2xl font-bold tracking-tight text-center">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-text-muted text-center">Đăng ký miễn phí, không cần thẻ tín dụng</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              label="Tên đăng nhập"
              name="username"
              placeholder="minhan2026"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
            />
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

            <div className="flex items-start gap-2 pt-1">
              <input type="checkbox" id="terms" className="mt-0.5 accent-primary-500" required />
              <label htmlFor="terms" className="text-xs text-text-muted">
                Tôi đồng ý với <span className="text-primary-300 hover:underline cursor-pointer">Điều khoản</span> và{' '}
                <span className="text-primary-300 hover:underline cursor-pointer">Chính sách bảo mật</span>
              </label>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              Tạo tài khoản
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary-300 font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
