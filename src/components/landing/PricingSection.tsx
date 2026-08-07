import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const tiers = [
  {
    name: 'Starter',
    price: '0',
    period: '/miễn phí',
    desc: 'Dành cho cá nhân bắt đầu',
    features: ['Truy cập 5.000+ dịch vụ', 'Đặt đơn không giới hạn', 'API key cá nhân', 'Hỗ trợ qua ticket', 'Theo dõi realtime'],
    cta: 'Đăng ký miễn phí',
    highlight: false,
  },
  {
    name: 'Reseller',
    price: '299K',
    period: '/tháng',
    desc: 'Dành cho đại lý, reseller',
    features: ['Tất cả tính năng Starter', 'Giá dịch vụ giảm 5-15%', 'API rate limit cao hơn', 'Hỗ trợ ưu tiên 24/7', 'Webhook & Socket', 'Báo cáo nâng cao'],
    cta: 'Nâng cấp Reseller',
    highlight: true,
  },
  {
    name: 'VIP',
    price: '999K',
    period: '/tháng',
    desc: 'Dành cho doanh nghiệp',
    features: ['Tất cả tính năng Reseller', 'Giá dịch vụ giảm 20-30%', 'API không giới hạn', 'Hỗ trợ riêng 1:1', 'Tích hợp tùy chỉnh', 'SLA 99.99%'],
    cta: 'Liên hệ VIP',
    highlight: false,
  },
];

export function PricingSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section id="pricing" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">Bảng giá</h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Gói linh hoạt phù hợp mọi nhu cầu, từ cá nhân đến doanh nghiệp.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card
                gradient={t.highlight}
                className={`p-6 h-full flex flex-col ${t.highlight ? 'shadow-glow' : ''}`}
              >
                <div className="mb-5">
                  <h3 className="text-lg font-bold mb-1">{t.name}</h3>
                  <p className="text-sm text-white/55">{t.desc}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{t.price}</span>
                  <span className="text-white/50 text-sm">{t.period}</span>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check className="w-4 h-4 text-success mt-0.5 shrink-0" strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={t.highlight ? 'primary' : 'secondary'}
                  size="lg"
                  className="w-full"
                  onClick={() => onNavigate('/register')}
                >
                  {t.cta}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
