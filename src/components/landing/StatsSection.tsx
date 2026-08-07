import { motion } from 'framer-motion';
import { Counter } from '@/components/landing/Counter';

const stats = [
  { value: 120000, suffix: '+', label: 'Khách hàng' },
  { value: 18000000, suffix: '+', label: 'Đơn hàng' },
  { value: 9999, suffix: '%', label: 'Thời gian hoạt động' },
  { value: 5000, suffix: '+', label: 'Dịch vụ' },
];

export function StatsSection() {
  return (
    <section className="relative py-20 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gradient mb-2">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="text-sm text-white/60">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
