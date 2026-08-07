import { Zap, Facebook, Twitter, Instagram, Youtube, Send } from 'lucide-react';

const links = {
  'Dịch vụ': ['Facebook', 'TikTok', 'Instagram', 'YouTube', 'Telegram'],
  'Công ty': ['Giới thiệu', 'Liên hệ', 'Tuyển dụng', 'Blog', 'Điều khoản'],
  'Hỗ trợ': ['Hướng dẫn', 'API Docs', 'Affiliate', 'Câu hỏi thường gặp', 'Báo lỗi'],
};

export function Footer({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <footer id="contact" className="relative border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <a href="#home" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-lg font-bold">SMMBoost</span>
            </a>
            <p className="text-sm text-white/55 max-w-xs leading-relaxed mb-4">
              Nền tảng Social Media Marketing hàng đầu Việt Nam. Hơn 5.000 dịch vụ, 120.000+ khách hàng tin dùng.
            </p>
            <div className="flex gap-2">
              {[Facebook, Twitter, Instagram, Youtube, Send].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center text-white/60 hover:text-white hover:border-primary-500/40 transition-colors"
                  aria-label="Social"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.8} />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-white/55 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <p className="text-xs text-white/40">© 2026 SMMBoost. Mọi quyền được bảo lưu.</p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <a href="#" className="hover:text-white/70 transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-white/70 transition-colors">Chính sách bảo mật</a>
            <button onClick={() => onNavigate('/register')} className="hover:text-white/70 transition-colors">
              Bắt đầu
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
