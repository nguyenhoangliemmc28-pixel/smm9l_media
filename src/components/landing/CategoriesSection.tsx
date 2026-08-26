import { motion } from 'framer-motion';
import { Facebook, Music2, Instagram, Youtube, Send, MessageCircle, Music, ShoppingBag, Globe, Star, Twitter, type LucideIcon } from 'lucide-react';
import { useQuery } from '@/lib/useQuery';
import { fetchCategories } from '@/lib/services';
import type { ICategory } from '@/lib/types';

const iconMap: Record<string, LucideIcon> = { Facebook, Music2, Instagram, Youtube, Send, MessageCircle, Music, ShoppingBag, Globe, Star, Twitter };
const colorMap: Record<string, string> = { facebook: 'text-blue-400', tiktok: 'text-pink-400', instagram: 'text-fuchsia-400', youtube: 'text-red-400', telegram: 'text-sky-400', discord: 'text-indigo-400', threads: 'text-slate-300', spotify: 'text-green-400', shopee: 'text-orange-400', 'website-traffic': 'text-cyan-400', 'google-review': 'text-amber-400', twitter: 'text-slate-200', pinterest: 'text-red-400', linkedin: 'text-blue-500' };

export function CategoriesSection() {
  const { data: categories, loading } = useQuery(() => fetchCategories());
  return <section id="services" className="relative py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto mb-12">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">Danh mục dịch vụ</span><h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Mọi nền tảng, <span className="text-gradient-primary">một nơi</span></h2><p className="mt-3 text-text-muted">Hơn 5.000 dịch vụ trải dài trên 14 nền tảng mạng xã hội — tốc độ cao, giá tốt, hỗ trợ refill.</p>
    </motion.div>
    {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">{Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton rounded-card h-32" />)}</div> : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">{(categories ?? []).map((cat: ICategory, i) => { const Icon = iconMap[cat.icon ?? ''] ?? Globe; const color = colorMap[cat.slug] ?? 'text-text-muted'; return <motion.button key={cat.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ delay: (i % 4) * 0.06, duration: 0.4 }} whileHover={{ y: -6 }} className="group relative rounded-card glass p-5 text-left overflow-hidden transition-shadow hover:shadow-card-hover"><div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" /><div className="relative flex items-center justify-between mb-4"><div className="h-11 w-11 rounded-xl bg-white/[0.04] border border-border flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"><Icon className={`h-5 w-5 ${color}`} strokeWidth={1.8} /></div></div><div className="relative"><h3 className="text-base font-semibold text-white group-hover:text-gradient-primary transition-all">{cat.name}</h3><p className="mt-1 text-xs text-text-dim">Khởi tạo tức thì · Refill</p></div></motion.button>; })}</div>}
  </div></section>;
}
