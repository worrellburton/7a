import { useEffect, useRef, useState } from 'react';

function useCountUp(end: number, duration: number, started: boolean, decimals = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    let raf: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * end).toFixed(decimals)));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started, decimals]);

  return value;
}

function AnimatedStat({
  value,
  suffix,
  secondaryValue,
  secondarySuffix,
  label,
  started,
  delay,
  decimals,
}: {
  value: number;
  suffix?: string;
  secondaryValue?: number;
  secondarySuffix?: string;
  label: string;
  started: boolean;
  delay: number;
  decimals?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!started) return;
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [started, delay]);

  const count = useCountUp(value, 1800, show, decimals);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="text-3xl lg:text-4xl font-bold text-white"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {decimals ? count.toFixed(decimals) : count}
        {suffix && <span className="text-white/60">{suffix}</span>}
        {secondaryValue !== undefined && (
          <>
            <span className="text-white/60">{secondarySuffix}</span>
            {secondaryValue}
          </>
        )}
      </div>
      <div
        className="text-white/70 text-sm mt-1"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </div>
    </div>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-16 bg-primary" aria-label="Key statistics">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <AnimatedStat
            value={4.9}
            suffix="/5"
            label="Google Rating"
            started={started}
            delay={0}
            decimals={1}
          />
          <AnimatedStat
            value={90}
            suffix="+"
            label="Day Programs Available"
            started={started}
            delay={150}
          />
          <AnimatedStat
            value={6}
            suffix=":1"
            label="Client to Staff Ratio"
            started={started}
            delay={300}
          />
          <AnimatedStat
            value={24}
            suffix="/7"
            label="Admissions Support"
            started={started}
            delay={450}
          />
        </div>
      </div>
    </section>
  );
}
