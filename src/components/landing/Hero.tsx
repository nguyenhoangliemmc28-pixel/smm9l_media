import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Star, TrendingUp, Wallet, Activity, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroDashboardPreview } from '@/components/landing/HeroDashboardPreview';

interface IHeroProps {
  onNavigate: (path: string) => void;
}

export function Hero({ onNavigate }: IHeroProps) {
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 grid-pattern opacity-60" />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary-500/20 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/15 blur-[120px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-base" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-white/70 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} />
              Nền tảng SMM #1 Việt Nam
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Nền tảng <span className="text-gradient">Social Media Marketing</span> hàng đầu Việt Nam
            </h1>

            <p className="text-lg text-white/65 max-w-xl leading-relaxed">
              Hơn 5.000 dịch vụ Facebook, TikTok, Instagram, YouTube, Telegram, Threads, Shopee.
              Đặt đơn trong 5 giây, theo dõi realtime, thanh toán tự động.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => onNavigate('/register')} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Đăng ký ngay
              </Button>
              <Button variant="secondary" size="lg" onClick={() => onNavigate('/login')}>
                Đăng nhập
              </Button>
              <a href="#pricing">
                <Button variant="outline" size="lg">
                  Xem bảng giá
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex -space-x-2">
                {['from-primary-500 to-primary-700', 'from-accent-500 to-accent-600', 'from-success to-success', 'from-warning to-danger', 'from-primary-400 to-accent-500'].map((g, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} border-2 border-bg-base`} />
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-xs text-white/50 mt-0.5">Được tin dùng bởi 120.000+ khách hàng</p>
              </div>
            </div>
          </motion.div>

          {/* Right - dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          >
            <HeroDashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export const heroIcons = { TrendingUp, Wallet, Activity, ShoppingCart };
