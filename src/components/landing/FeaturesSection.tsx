import { motion } from 'framer-motion';
import {
  Zap, Timer, Activity, CreditCard, Headphones, Gift,
  Shield, Webhook, Radio, Receipt, Ticket, BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

const features = [
  { icon: Zap, title: 'API tốc độ cao', desc: 'Tích hợp API nhanh, đáp ứng mọi nhu cầu tự động hóa.' },
  { icon: Timer, title: 'Đặt đơn trong 5 giây', desc: 'Giao diện tối ưu, đặt đơn chỉ trong vài cú chạm.' },
  { icon: Activity, title: 'Theo dõi realtime', desc: 'Cập nhật trạng thái đơn hàng theo thời gian thực.' },
  { icon: CreditCard, title: 'Thanh toán tự động', desc: 'Đối soát chuyển khoản tức thì, không cần chờ đợi.' },
  { icon: Headphones, title: 'Hỗ trợ 24/7', desc: 'Đội ngũ hỗ trợ sẵn sàng mọi lúc, mọi nơi.' },
  { icon: Gift, title: 'Affiliate', desc: 'Kiếm hoa hồng hấp dẫn khi giới thiệu bạn bè.' },
  { icon: Shield, title: 'Bảo mật cao', desc: 'Mã hóa toàn diện, 2FA, bảo vệ tài khoản tối đa.' },
  { icon: Webhook, title: 'Webhook', desc: 'Nhận thông báo sự kiện qua webhook tùy chỉnh.' },
  { icon: Radio, title: 'Socket Realtime', desc: 'Cập nhật tức thì qua Socket.IO, không cần F5.' },
  { icon: Receipt, title: 'Lịch sử giao dịch', desc: 'Lưu trữ đầy đủ, minh bạch, dễ đối chiếu.' },
  { icon: Ticket, title: 'Ticket hỗ trợ', desc: 'Hệ thống ticket chuyên nghiệp, theo dõi dễ dàng.' },
  { icon: BarChart3, title: 'Thống kê chi tiết', desc: 'Báo cáo và biểu đồ trực quan về hoạt động.' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">Tính năng nổi bật</h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Mọi thứ bạn cần để quản lý chiến dịch Social Media Marketing hiệu quả.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.4 }}
              >
                <Card hover className="p-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary-300" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                      <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
