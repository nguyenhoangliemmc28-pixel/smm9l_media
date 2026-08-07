import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface ICounterProps {
  to: number;
  suffix?: string;
  duration?: number;
}

export function Counter({ to, suffix = '', duration = 2000 }: ICounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(to);
    };
    requestAnimationFrame(step);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString('vi-VN')}
      {suffix}
    </span>
  );
}
