import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';

const faqs = [
  { q: 'SMMBoost là gì?', a: 'SMMBoost là nền tảng Social Media Marketing cung cấp hơn 5.000 dịch vụ tăng tương tác cho Facebook, TikTok, Instagram, YouTube, Telegram và nhiều nền tảng khác.' },
  { q: 'Làm thế nào để đặt đơn?', a: 'Bạn chỉ cần đăng ký tài khoản, nạp tiền vào ví, chọn dịch vụ, dán link và số lượng, rồi nhấn đặt đơn. Toàn bộ quá trình mất dưới 5 giây.' },
  { q: 'Thanh toán có tự động không?', a: 'Có. Hệ thống đối soát chuyển khoản tự động qua VietQR và nhiều ngân hàng. Tiền được cộng vào ví ngay sau khi chuyển khoản thành công.' },
  { q: 'Đơn hàng có được bảo hành?', a: 'Nhiều dịch vụ có bảo hành refill (bù lượt) trong thời gian nhất định. Bạn có thể yêu cầu refill trực tiếp từ trang quản lý đơn hàng.' },
  { q: 'Có API cho nhà phát triển không?', a: 'Có. Mỗi tài khoản đều có API key để tích hợp đặt đơn, kiểm tra trạng thái và đồng bộ dịch vụ qua REST API.' },
  { q: 'Chính sách affiliate thế nào?', a: 'Bạn nhận hoa hồng theo phần trăm cho mỗi giao dịch của người được giới thiệu. Rút tiền khi đạt mức tối thiểu cấu hình.' },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">Câu hỏi thường gặp</h2>
          <p className="text-white/60">Mọi điều bạn cần biết về SMMBoost.</p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-btn overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-white">{f.q}</span>
                <motion.div animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.2 }}>
                  <Plus className="w-5 h-5 text-primary-300" strokeWidth={1.8} />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <p className="px-5 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
