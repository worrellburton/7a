import { Link } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';

export default function Hero() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[600px] lg:min-h-[85vh] flex items-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background image with subtle zoom */}
      <div className="absolute inset-0 z-0">
        <img
          src="/7a/images/facility-exterior-mountains.jpg"
          alt="Seven Arrows Recovery facility with Swisshelm Mountains"
          className="w-full h-full object-cover transition-transform duration-[8000ms] ease-out"
          style={{ transform: visible ? 'scale(1.05)' : 'scale(1)' }}
        />
        {/* Layered overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          {/* Label line */}
          <div
            className="overflow-hidden mb-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}
          >
            <p className="section-label">Drug Rehab in Arizona</p>
          </div>

          {/* Heading with staggered word reveal */}
          <h1
            id="hero-heading"
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-8"
          >
            <span
              className="inline-block"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
              }}
            >
              A Place
            </span>{' '}
            <span
              className="inline-block"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.55s',
              }}
            >
              to
            </span>{' '}
            <span
              className="inline-block"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.7s',
              }}
            >
              Heal.
            </span>
          </h1>

          {/* Description */}
          <p
            className="text-lg lg:text-xl text-foreground/80 leading-relaxed mb-10 max-w-xl"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.9s',
            }}
          >
            Find out why Seven Arrows Recovery is considered one of the best drug
            rehabs in Arizona. We provide clinical and residential treatment to ensure
            lasting recovery in a small group setting, nestled at the base of the tranquil
            Swisshelm mountains.
          </p>

          {/* CTA Button */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 1.1s',
            }}
          >
            <Link href="/admissions" className="btn-primary text-base group">
              <span className="relative z-10">Get Started</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
