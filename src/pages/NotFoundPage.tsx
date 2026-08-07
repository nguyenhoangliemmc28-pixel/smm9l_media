import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="absolute top-1/3 left-1/3 h-96 w-96 rounded-full bg-primary-500/20 blur-[120px]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative text-center">
        <Logo size="lg" className="justify-center mb-8" />
        <div className="text-[120px] sm:text-[160px] font-extrabold leading-none text-gradient tracking-tighter">404</div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Trang không tồn tại</h1>
        <p className="mt-2 text-text-muted max-w-md mx-auto">Trang bạn tìm kiếm có thể đã bị di chuyển hoặc không tồn tại.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => navigate('/')}><Home className="h-4 w-4" /> Về trang chủ</Button>
          <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
        </div>
      </motion.div>
    </div>
  );
}
