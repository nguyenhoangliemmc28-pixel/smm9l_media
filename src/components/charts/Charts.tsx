import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AreaChartProps {
  data?: number[];
  labels?: string[];
  height?: number;
}

const defaultData = [320, 410, 380, 520, 480, 610, 580, 720, 680, 810, 760, 920];
const defaultLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export function AreaChart({ data = defaultData, labels = defaultLabels, height = 240 }: AreaChartProps) {
  const max = Math.max(...data) * 1.1 || 1;
  const min = Math.min(...data) * 0.9 || 0;
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return { x, y, value: v, label: labels[i] };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D5BFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6D5BFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8A6DFF" />
            <stop offset="100%" stopColor="#6EE7FF" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.2" />
        ))}
        <motion.path d={areaPath} fill="url(#areaFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
        <motion.path d={linePath} fill="none" stroke="url(#areaLine)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
      </svg>
    </div>
  );
}

interface BarChartProps {
  data?: { label: string; value: number }[];
  height?: number;
}

const defaultBars = [
  { label: 'FB', value: 420 }, { label: 'TT', value: 380 }, { label: 'IG', value: 310 },
  { label: 'YT', value: 280 }, { label: 'TG', value: 190 }, { label: 'DC', value: 140 },
];

export function BarChart({ data = defaultBars, height = 240 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <div className="relative w-full flex items-end justify-center h-full">
            <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / max) * 100}%` }} transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }} className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-primary-500/40 to-primary-500" style={{ minHeight: 4 }} />
          </div>
          <span className="text-[11px] text-white/40">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  segments?: { label: string; value: number; color: string }[];
  size?: number;
}

const defaultSegments = [
  { label: 'Facebook', value: 42, color: '#6D5BFF' },
  { label: 'TikTok', value: 28, color: '#6EE7FF' },
  { label: 'Instagram', value: 18, color: '#22C55E' },
  { label: 'Khác', value: 12, color: '#F59E0B' },
];

export function DonutChart({ segments = defaultSegments, size = 160 }: DonutChartProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circumference;
          const dash = `${len} ${circumference - len}`;
          const el = (
            <motion.circle key={i} cx="50" cy="50" r={radius} fill="none" stroke={seg.color} strokeWidth="10" strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
            <span className="text-white/60">{seg.label}</span>
            <span className="text-white font-semibold ml-auto">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
