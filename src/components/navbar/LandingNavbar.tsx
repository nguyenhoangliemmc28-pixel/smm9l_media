import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const navLinks = [
  { label: 'Trang chủ', href: '#home' },
  { label: 'Dịch vụ', href: '#services' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'Tính năng', href: '#features' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNavbar({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'glass-strong shadow-card' : 'bg-transparent'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-20'}`}>
          <a href="#home" className="flex items-center gap-2.5 shrink-0" aria-label="9L Media">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold tracking-tight">9L<span className="text-gradient-primary"> MEDIA</span></span>
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="px-3 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={() => onNavigate('/login')}>Đăng nhập</Button>
            <Button size="md" onClick={() => onNavigate('/register')}>Đăng ký</Button>
          </div>

          <button className="lg:hidden p-2 text-white/80 hover:text-white" onClick={() => setMobileOpen((s) => !s)} aria-label="Menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden pb-4 pt-2 border-t border-border"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" size="md" className="flex-1" onClick={() => onNavigate('/login')}>Đăng nhập</Button>
                  <Button size="md" className="flex-1" onClick={() => onNavigate('/register')}>Đăng ký</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
